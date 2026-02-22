import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";
export const maxDuration = 45;

const GROQ_API_URL = "https://api.groq.com/openai/v1/audio/transcriptions";

/**
 * Transcription Route - V16-Ultra-Clean (Feb 2026)
 * Uses Zero-Identity bridge to bypass Error 1003.
 */
export async function POST(request: NextRequest) {
  const isDev = process.env.NODE_ENV === "development" || request.headers.get("host")?.includes("localhost");
  
  try {
    const body = await request.json();
    if (!body.url) return NextResponse.json({ error: "Media URL is required" }, { status: 400 });

    const cobaltPayload = JSON.stringify({
      url: body.url,
      videoQuality: "720",
      filenameStyle: "nerdy"
    });

    let mediaUrl: string | null = null;

    // --- 1. MEDIA EXTRACTION (Using V16 Clean Tunnel) ---
    try {
        let cobaltResponse: Response;
        if (isDev) {
            cobaltResponse = await fetch("http://127.0.0.1:9000/", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Accept": "application/json" },
                body: cobaltPayload,
            });
        } else {
            const ctx = getRequestContext();
            const worker = (ctx?.env as any)?.COBALT_WORKER;
            if (!worker) throw new Error("Service Binding (COBALT_WORKER) Missing");
            
            // AGGRESSIVE PURGING for Transcribe
            const cleanHeaders = new Headers();
            cleanHeaders.set("Content-Type", "application/json");

            cobaltResponse = await worker.fetch("http://transcribe.internal/", {
                method: "POST",
                headers: cleanHeaders,
                body: cobaltPayload,
                credentials: 'omit',
                redirect: 'manual'
            } as any);
        }

        const responseText = await cobaltResponse.text();
        
        try {
            const data = JSON.parse(responseText);
            mediaUrl = data.url || data.audio || (data.picker?.[0]?.url);
            if (!mediaUrl && data.status === "error") throw new Error(data.text || "COBALT_FAIL");
        } catch (e) {
            if (responseText.includes("1003")) throw new Error("Cloudflare Firewall Block (1003) during transcribe extraction.");
            throw e;
        }
    } catch (e: any) {
        return NextResponse.json({ error: "Extraction Failed", details: e.message }, { status: 502 });
    }

    if (!mediaUrl) return NextResponse.json({ error: "No direct media link found." }, { status: 422 });

    // --- 2. AUDIO DOWNLOAD & TRANSCRIPTION ---
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
    formData.append("prompt", "Transcribe this audio strictly into Hinglish (Hindi + English mix) using only Roman script (English alphabet). Do not use Devanagari or Hindi script. Example style: 'Yaar mere profession ka naam...'. Ensure every word is in English characters.");
    formData.append("response_format", "json");

    const groqResponse = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: { "Authorization": `Bearer ${groqKey}` },
        body: formData
    });

    const transcription = await groqResponse.json();
    return NextResponse.json({ script: transcription.text || "No speech detected." });

  } catch (error: any) {
    return NextResponse.json({ error: "Transcription processor failure", message: error.message }, { status: 500 });
  }
}
