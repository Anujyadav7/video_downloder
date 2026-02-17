import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge"; // Mandatory for Cloudflare Workers/Pages
export const maxDuration = 30; // 30s max duration

// --- Configuration ---
const GROQ_API_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const COBALT_INSTANCES = [
  process.env.NODE_ENV === 'development' ? "http://127.0.0.1:9000" : null,
  "https://api.cobalt.tools", // POST / works
  "https://co.wuk.sh/api/json", // POST /api/json works
  "https://cobalt.kwiatekmiki.com",
  "https://cobalt.tools/api/json"
].filter(Boolean) as string[];

// --- Helper Functions ---
async function fetchAudioBuffer(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
  });
  if (!response.ok) throw new Error(`Failed to fetch audio: ${response.status}`);
  return await response.arrayBuffer();
}

// --- Main Handler ---
export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    if (!url) return NextResponse.json({ error: "URL is required" }, { status: 400 });

    console.log(`[Transcribe] Processing: ${url}`);

    // 1. Get Audio URL via Cobalt (Extraction)
    let audioUrl: string | null = null;

    for (const instance of COBALT_INSTANCES) {
      try {
        let endpoint = instance.endsWith("/") ? instance : `${instance}/`;
        
        console.log(`[Transcribe] Extracting audio via ${endpoint}`);
        
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { 
            "Accept": "application/json", 
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          },
          body: JSON.stringify({
            url: url,
            downloadMode: "audio",
            audioFormat: "mp3", 
            filenameStyle: "basic"
          })
        });

        const data: any = await response.json();
        
        if (data.url || data.audio) {
            audioUrl = data.url || data.audio;
            break; 
        }
      } catch (e) {
        console.warn(`[Transcribe] Extraction failed on ${instance}`, e);
      }
    }

    if (!audioUrl) {
      return NextResponse.json({ error: "Could not extract audio from video. Try another link." }, { status: 422 });
    }

    // 2. Download Audio Stream (In-Memory Buffer)
    // Note: Edge Workers have memory limits. Large files may fail.
    const audioBuffer = await fetchAudioBuffer(audioUrl);
    
    // 3. Send to Groq API (Direct Fetch, No SDK)
    const formData = new FormData();
    // Create a Blob from buffer to simulate file upload
    const audioBlob = new Blob([audioBuffer], { type: "audio/mp3" });
    formData.append("file", audioBlob, "audio.mp3");
    formData.append("model", "whisper-large-v3");
    formData.append("language", "en"); // Transliteration hint
    formData.append("temperature", "0");
    formData.append("response_format", "json");
    
    // Strict Hinglish Prompt
    formData.append("prompt", `RULE: TRANSLITERATE ONLY. NO TRANSLATION.
Write EXACTLY what you hear in Roman letters.

FORBIDDEN:
❌ Translation (aapko≠you, hai≠is)
❌ Devanagari
❌ Grammar fixes

MANDATORY:
✓ Hindi words in Roman script (aapko, chahiye, mein, hai)
✓ English words as-is

OUTPUT: Sounds only. Zero translation!`);

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) throw new Error("GROQ_API_KEY is missing in env vars");

    const groqResponse = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${groqKey}`
        },
        body: formData
    });

    if (!groqResponse.ok) {
        const errText = await groqResponse.text();
        throw new Error(`Groq API Error: ${groqResponse.status} - ${errText}`);
    }

    const transcription = await groqResponse.json();
    return NextResponse.json({ script: transcription.text, cached: false });

  } catch (error: any) {
    console.error(`[Transcribe] Error: ${error.message}`);
    return NextResponse.json(
      { error: error.message || "Transcription failed" },
      { status: 500 }
    );
  }
}
