import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

/**
 * Transcription config for Cloudflare Edge Runtime.
 */
export const runtime = "edge";
export const maxDuration = 45; // Transcription can take time

const GROQ_API_URL = "https://api.groq.com/openai/v1/audio/transcriptions";

/**
 * Transcription Handler:
 * 1. Extracts internal media URL via Cobalt.
 * 2. Fetches audio bytes.
 * 3. Transcribes via Groq (Whisper v3).
 */
export async function POST(request: NextRequest) {
  const isDev = process.env.NODE_ENV === "development";
  
  try {
    const { url } = await request.json();
    if (!url) return NextResponse.json({ error: "Media URL is required" }, { status: 400 });

    const ctx = getRequestContext();
    const env = ctx?.env as any;

    let mediaUrl: string | null = null;

    // --- 1. MEDIA EXTRACTION (COBALT) ---
    // Use the same professional proxy logic as the download route.
    const cobaltBody = { url, videoQuality: "144" }; // Low quality for faster download

    try {
        let cobaltResponse: Response;
        if (isDev) {
            cobaltResponse = await fetch("http://127.0.0.1:9000/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(cobaltBody),
            });
        } else {
            const binding = env?.COBALT_SERVICE || env?.COBALT_WORKER;
            if (!binding) throw new Error("Cloudflare bindings missing");
            
            cobaltResponse = await binding.fetch(new Request("https://internal.cobalt/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(cobaltBody),
            }));
        }

        const data = await cobaltResponse.json() as any;
        mediaUrl = data.url || data.audio;
    } catch (e: any) {
        console.error("[Transcribe] Cobalt extraction failed:", e.message);
    }

    if (!mediaUrl) {
      return NextResponse.json({ error: "Failed to extract media for transcription." }, { status: 422 });
    }

    // --- 2. AUDIO DOWNLOAD & TRANSCRIPTION ---
    const audioResponse = await fetch(mediaUrl);
    if (!audioResponse.ok) throw new Error("Failed to download audio bytes from source.");
    const audioBuffer = await audioResponse.arrayBuffer();

    const groqKey = process.env.GROQ_API_KEY || env?.GROQ_API_KEY;
    if (!groqKey) throw new Error("GROQ_API_KEY configuration missing.");

    const formData = new FormData();
    formData.append("file", new Blob([audioBuffer], { type: "audio/mp3" }), "audio.mp3");
    formData.append("model", "whisper-large-v3");
    formData.append("prompt", "Transcribe this in Roman Hindi/Hinglish language exactly as spoken.");
    formData.append("response_format", "json");

    const groqResponse = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: { "Authorization": `Bearer ${groqKey}` },
        body: formData
    });

    const transcription = await groqResponse.json();
    return NextResponse.json({ script: transcription.text });

  } catch (error: any) {
    console.error(`[Transcribe Error] ${error.message}`);
    return NextResponse.json({ error: "Transcription processor failure" }, { status: 500 });
  }
}
