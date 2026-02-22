import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";
export const maxDuration = 45;

const GROQ_API_URL = "https://api.groq.com/openai/v1/audio/transcriptions";

/**
 * Transcription Route - V2026 Optimized
 */
export async function POST(request: NextRequest) {
  const isDev = process.env.NODE_ENV === "development" || request.headers.get("host")?.includes("localhost");
  
  try {
    const body = await request.json();
    if (!body.url) return NextResponse.json({ status: "error", text: "Media URL is required" }, { status: 400 });

    const cobaltPayload = JSON.stringify({
      url: body.url,
      videoQuality: "720",
      filenameStyle: "nerdy"
    });

    let mediaUrl: string | null = null;

    // --- 1. MEDIA EXTRACTION (Internal Bridge) ---
    try {
        let cobaltResponse: Response;
        if (isDev) {
            cobaltResponse = await fetch("http://127.0.0.1:9000/", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Accept": "application/json" },
                body: cobaltPayload,
            });
        } else {
            const context = getRequestContext();
            const worker = (context.env as any).COBALT_WORKER;

            if (!worker) throw new Error("COBALT_WORKER Binding Missing");
            
            cobaltResponse = await worker.fetch("http://cobalt.internal/api/json", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Accept": "application/json" },
                body: cobaltPayload
            });
        }

        const data = await cobaltResponse.json() as any;
        mediaUrl = data.url || data.audio || (data.picker?.[0]?.url);
        
        if (!mediaUrl && data.status === "error") {
            const errDetail = typeof data.error === 'object' ? (data.error.message || data.error.code) : (data.error || data.text);
            throw new Error(errDetail || "COBALT_FAIL");
        }
    } catch (e: any) {
        return NextResponse.json({ status: "error", text: `Extraction Failed: ${e.message}` }, { status: 502 });
    }

    if (!mediaUrl) return NextResponse.json({ status: "error", text: "No direct media link found." }, { status: 422 });

    // --- 2. TRANSCRIPTION ---
    const audioResponse = await fetch(mediaUrl);
    if (!audioResponse.ok) throw new Error("Audio download failed.");
    const audioBuffer = await audioResponse.arrayBuffer();

    let groqKey = process.env.GROQ_API_KEY;
    if (!isDev) {
        groqKey = groqKey || (getRequestContext()?.env as any)?.GROQ_API_KEY;
    }
    if (!groqKey) throw new Error("GROQ_API_KEY Missing.");

    const formData = new FormData();
    formData.append("file", new Blob([audioBuffer], { type: "audio/mp3" }), "audio.mp3");
    formData.append("model", "whisper-large-v3");
    formData.append("prompt", "Transcribe this audio strictly into Hinglish (Hindi + English mix) using only Roman script (English alphabet). Do not use Devanagari or Hindi script. Example style: 'Yaar mere profession ka naam...'.");
    formData.append("response_format", "json");

    const groqResponse = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: { "Authorization": `Bearer ${groqKey}` },
        body: formData
    });

    const transcription = await groqResponse.json();
    return NextResponse.json({ script: transcription.text || "No speech detected." });

  } catch (error: any) {
    return NextResponse.json({ status: "error", text: `Transcription Fatal: ${error.message}` }, { status: 500 });
  }
}
