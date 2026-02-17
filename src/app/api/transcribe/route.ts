import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge"; // Mandatory for Cloudflare Workers/Pages
export const maxDuration = 30; // 30s max duration

// --- Configuration ---
const GROQ_API_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const COBALT_INSTANCES = [
  process.env.NODE_ENV === 'development' ? "http://127.0.0.1:9000" : null,
  process.env.COBALT_API_URL,
  "https://api.cobalt.tools", 
  "https://cobalt.tools/api/json",
  "https://cobalt.kwiatekmiki.com/api/json"
].filter(Boolean) as string[];

// --- Helper Functions ---
async function fetchAudioBuffer(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url); // Simple fetch
  if (!response.ok) throw new Error(`Failed to fetch audio: ${response.status}`);
  return await response.arrayBuffer();
}

// --- Main Handler ---
export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    if (!url) return NextResponse.json({ error: "URL is required" }, { status: 400 });

    console.log(`[Transcribe] Processing: ${url}`);


    // 1. Get Media URL via Cobalt
    // Strategy: Try to get Audio first. If fails, get Video and let Groq extract audio.
    let mediaUrl: string | null = null;
    let isVideo = false;

    for (const instance of COBALT_INSTANCES) {
      try {
        const endpoint = instance;
        console.log(`[Transcribe] Requesting media via ${endpoint}`);
        
        // Request "auto" mode (Video/Audio) to ensure we get SOMETHING
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { 
            "Accept": "application/json", 
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            url: url,
            videoQuality: "144", // Request lowest quality video to save bandwidth/size
            filenameStyle: "basic"
          })
        });

        const data: any = await response.json();
        console.log(`[Transcribe] Response from ${instance}: status=${data.status}, url=${data.url ? 'yes' : 'no'}`);

        if (data.url || data.audio) {
            mediaUrl = data.url || data.audio;
            // Guess type based on extension or explicit audio field
            if (data.audio) isVideo = false;
            else if (mediaUrl?.includes('.mp4')) isVideo = true;
            
            console.log(`[Transcribe] Successfully extracted URL: ${mediaUrl} (Is Video: ${isVideo})`);
            break; 
        }
      } catch (e: any) {
        console.warn(`[Transcribe] Extraction failed on ${instance}`, e.message);
      }
    }

    if (!mediaUrl) {
      return NextResponse.json({ error: "Could not extract media (video/audio) from link." }, { status: 422 });
    }

    // 2. Download Stream (In-Memory Buffer)
    const mediaBuffer = await fetchAudioBuffer(mediaUrl);
    
    // 3. Send to Groq API
    const formData = new FormData();
    // Name it video.mp4 if video, or audio.mp3
    const filename = isVideo ? "video.mp4" : "audio.mp3";
    const mimeType = isVideo ? "video/mp4" : "audio/mp3";
    
    const mediaBlob = new Blob([mediaBuffer], { type: mimeType });
    formData.append("file", mediaBlob, filename);
    formData.append("model", "whisper-large-v3");
    formData.append("language", "en"); 
    formData.append("temperature", "0");
    formData.append("response_format", "json");
    
    // Strict Hinglish Prompt for Whisper
    // Whisper uses prompt as "previous context". Providing Hinglish examples forces the style.
    const hinglishPrompt = `Hinglish Transcript:
    Namaste dosto, swagat hai aapka. Aaj hum baat karenge ek naye topic ke baare mein.
    Bilkul exact words likhna hai. Translation nahi karna hai.
    Agar koi English word bole toh English mein likho, aur Hindi bole toh Roman Hindi mein.
    Common words: aap, hum, kaise, theek, bhai, video, like, share, subscribe.
    DO NOT TRANSLATE. WRITE EXACTLY WHAT YOU HEAR.`;

    formData.append("prompt", hinglishPrompt);

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
