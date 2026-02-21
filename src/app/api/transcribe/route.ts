import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";
export const maxDuration = 45;

const GROQ_API_URL = "https://api.groq.com/openai/v1/audio/transcriptions";

export async function POST(request: NextRequest) {
  const isDev = process.env.NODE_ENV === "development";
  
  try {
    const { url } = await request.json();
    if (!url) return NextResponse.json({ error: "Media URL is required" }, { status: 400 });

    const cobaltHeaders = { 
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    };
    
    // Cobalt Extraction Body - Using Standard Video mode as it's more stable for Instagram extraction
    const cobaltBody = { url, videoQuality: "720" };

    let mediaUrl: string | null = null;

    // --- 1. MEDIA EXTRACTION ---
    try {
        let cobaltResponse: Response;
        if (isDev) {
            cobaltResponse = await fetch("http://127.0.0.1:9000/", {
                method: "POST",
                headers: cobaltHeaders,
                body: JSON.stringify(cobaltBody),
            });
        } else {
            const ctx = getRequestContext();
            const env = ctx?.env as any;
            const binding = env?.COBALT_SERVICE || env?.COBALT_WORKER;
            if (!binding) throw new Error("Service Binding Missing");
            
            const id = binding.idFromName ? binding.idFromName("global-prod-relay-v5-stable") : null;
            const target = id ? binding.get(id) : binding;
            
            cobaltResponse = await target.fetch(new Request("https://internal.gateway/", {
                method: "POST",
                headers: cobaltHeaders,
                body: JSON.stringify(cobaltBody),
            }));
        }

        const data = await cobaltResponse.json() as any;
        mediaUrl = data.url || data.audio || (data.picker?.[0]?.url);
        
        if (!mediaUrl && data.status === "error") {
            throw new Error(`Engine Error: ${data.error?.code || 'COBALT_FAIL'}`);
        }
    } catch (e: any) {
        console.error("[Transcribe] Cobalt Link Failed:", e.message);
        return NextResponse.json({ error: "Could not retrieve media link.", details: e.message }, { status: 502 });
    }

    if (!mediaUrl) return NextResponse.json({ error: "No direct media link found." }, { status: 422 });

    // --- 2. TRANSCRIPTION ---
    const audioResponse = await fetch(mediaUrl);
    if (!audioResponse.ok) throw new Error("Audio download failed from resolved link.");
    const audioBuffer = await audioResponse.arrayBuffer();

    let groqKey = process.env.GROQ_API_KEY;
    if (!isDev) {
        groqKey = groqKey || (getRequestContext()?.env as any)?.GROQ_API_KEY;
    }
    if (!groqKey) throw new Error("GROQ_API_KEY Missing.");

    const formData = new FormData();
    formData.append("file", new Blob([audioBuffer], { type: "audio/mp3" }), "audio.mp3");
    formData.append("model", "whisper-large-v3");
    formData.append("prompt", "Transcribe exactly as spoken in the audio.");
    formData.append("response_format", "json");

    const groqResponse = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: { "Authorization": `Bearer ${groqKey}` },
        body: formData
    });

    const transcription = await groqResponse.json();
    return NextResponse.json({ script: transcription.text || "No speech detected." });

  } catch (error: any) {
    console.error(`[Fatal Transcribe Error] ${error.message}`);
    return NextResponse.json({ error: "Transcription processor failure", message: error.message }, { status: 500 });
  }
}
