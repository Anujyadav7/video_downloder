
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import Groq from "groq-sdk";
import Redis from "ioredis";

// ---------------------------------------------------------
// CONFIGURATION
// ---------------------------------------------------------
const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GROQ_API_KEY) {
    console.error("CRITICAL: GROQ_API_KEY is missing in .env.local");
}

const groq = new Groq({
    apiKey: GROQ_API_KEY,
});

// Redis Client (Soft Fail)
let redis: Redis | null = null;
try {
    redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
        lazyConnect: true,
        connectTimeout: 2000,
        maxRetriesPerRequest: 1,
        retryStrategy: (times) => null, 
    });
    
    redis.on("error", (err) => {
        // Suppress connection errors
        redis = null;
    });
} catch (e) {
    console.warn("Redis Initialization Error:", e);
}

// ---------------------------------------------------------
// HELPER FUNCTIONS
// ---------------------------------------------------------
async function getFileHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash("sha256");
        const stream = fs.createReadStream(filePath);
        stream.on("error", (err) => reject(err));
        stream.on("data", (chunk) => hash.update(chunk));
        stream.on("end", () => resolve(hash.digest("hex")));
    });
}

// ---------------------------------------------------------
// API HANDLER
// ---------------------------------------------------------
export async function POST(request: NextRequest) {
    let videoPath: string | null = null;

    try {
        const { url } = await request.json();

        if (!url) {
            return NextResponse.json({ error: "URL is required" }, { status: 400 });
        }

        console.log(`[Groq Engine] Processing: ${url}`);
        const session_id = crypto.randomUUID().slice(0, 8);
        const TMP_DIR = path.join(os.tmpdir(), "groq_transcribe");
        if (!fs.existsSync(TMP_DIR)) {
            fs.mkdirSync(TMP_DIR, { recursive: true });
        }

        videoPath = path.join(TMP_DIR, `${session_id}_input.mp4`);

        // 1. Download Video
        let fetchUrl = url;
        try {
            if (url.startsWith("/")) {
                const u = new URL(url, "http://base");
                if (u.searchParams.get("url")) fetchUrl = u.searchParams.get("url");
            }
        } catch (e) {}

        const res = await fetch(fetchUrl);
        if (!res.ok) throw new Error(`Failed to fetch video: ${res.statusText}`);
        
        const arrayBuffer = await res.arrayBuffer();
        fs.writeFileSync(videoPath, Buffer.from(arrayBuffer));
        
        // 2. Hash & Check Cache (Zero-Cost Layer)
        const fileHash = await getFileHash(videoPath);
        
        if (redis) {
            try {
                if (redis.status !== 'ready' && redis.status !== 'connecting') {
                     await redis.connect().catch(() => {}); 
                }
                
                if (redis.status === 'ready') {
                    const cached = await redis.get(`transcript:${fileHash}`);
                    if (cached) {
                        console.log(`[Groq Engine] Cache Hit! ($0 Cost)`);
                        return NextResponse.json(JSON.parse(cached));
                    }
                }
            } catch (e) {} 
        }

        // 3. Transcription (Direct MP4 to Groq)
        // INFO: Sending MP4 directly to avoid FFmpeg dependency issues.
        // Groq supports MP4 and charges by duration, so cost is identical.
        console.log(`[Groq Engine] Sending to Groq Cloud (Direct MP4)...`);
        
        const transcription = await groq.audio.transcriptions.create({
            file: fs.createReadStream(videoPath),
            model: "whisper-large-v3", 
            prompt: "Namaste dosto, swagat hai aapka is nayi video mein. Aaj hum baat karenge AI, Tech, aur viral content ke baare mein.",
            temperature: 0.0,
            response_format: "json",
        });

        // 4. LLM Formatting (Expert Hinglish Scriptwriter)
        console.log(`[Groq Engine] Formatting with Llama 3...`);
        let formatted = transcription.text;
        
        try {
            const completion = await groq.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: `# Role: Romanized Hinglish Scriptwriter

## CRITICAL RULE (Zero Tolerance):
- NEVER use Devanagari/Hindi characters (like अ, आ, क, ख, "चिंता", "जरूर").
- ONLY use English Alphabets (A-Z) to write everything.
- If you use even one Hindi script character, the output is useless.

## Task:
Convert the provided input into a "WhatsApp-style" Hinglish script.

## Language Guidelines:
1. **Transliteration:** Write Hindi words using English letters (e.g., "Sikhna hai" instead of "सीखना है").
2. **Key Terms:** Keep technical terms in English (Trading, Books, Movies, Scam, Psychology).
3. **Tone:** Conversational, like an Indian YouTuber or Instagram Creator.

## Reference Examples (Follow this style):
- **Input:** "ट्रेडिंग सीखना है लेकिन बुक्स पढ़ने में मौत आती है।"
- **Output:** "Trading seekhna hai lekin books padhne mein maut aati hai."

- **Input:** "इंडिया का सबसे बड़ा स्टॉक मार्केट स्कैम।"
- **Output:** "India ka sabse bada stock market scam."

## Script Structure (Output ONLY this):
- Hook line in Roman Hinglish.
- 3-4 Bullet points (brief) in Roman Hinglish.
- Final CTA in Roman Hinglish.`
                    },
                    {
                        role: "user",
                        content: `Convert this text to Romanized Hinglish:\n\n${transcription.text}`
                    }
                ],
                model: "llama3-8b-8192", 
                temperature: 0.0,
                max_tokens: 1024,
            });
            
            formatted = completion.choices[0]?.message?.content || transcription.text;
        } catch (llmError) {
            console.error("LLM Formatting Failed:", llmError);
            // Fallback to raw transcript if LLM fails
        }

        const result = {
            raw_transcript: transcription.text,
            formatted_script: formatted
        };

        // 4. Save to Cache
        if (redis && redis.status === 'ready') {
            await redis.set(`transcript:${fileHash}`, JSON.stringify(result), 'EX', 60 * 60 * 24 * 7); // 7 Days
        }

        console.log(`[Groq Engine] Success! Length: ${transcription.text.length}`);
        return NextResponse.json(result);

    } catch (error: any) {
        console.error("[Groq Engine] Error:", error);
        return NextResponse.json({ 
            error: error.message || "Processing Failed",
            details: error.toString()
        }, { status: 500 });
    } finally {
        // Cleanup
        try {
            if (videoPath && fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
        } catch (e) {}
    }
}
