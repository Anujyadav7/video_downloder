import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

// Helper for professional sleep/delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(request: NextRequest) {
  try {
    const { url: videoUrl, isAudioOnly } = await request.json();
    const MAX_RETRIES = 2;
    const RETRY_DELAY_MS = 5000;
    const FETCH_TIMEOUT_MS = 10000;

    // 1. Local Development Logic
    if (process.env.NODE_ENV === 'development') {
      const localUrl = "http://127.0.0.1:9000/api/json";

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          if (attempt > 0) {
            console.log(`[Download] Dev Mode: Retry attempt ${attempt}/${MAX_RETRIES} after 5s delay...`);
            await delay(RETRY_DELAY_MS);
          } else {
            console.log(`[Download] Dev Mode: Fetching from ${localUrl}`);
          }

          const localResponse = await fetch(localUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              url: videoUrl, 
              filenameStyle: "pretty",
              ...(isAudioOnly ? { isAudioOnly: true } : {})
            }),
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) 
          });
          
          const data = await localResponse.json();
          return NextResponse.json(data);

        } catch (err: any) {
          const errorMessage = err.message || "Timeout or Network Error";
          const errorCode = err.code || (err.name === 'TimeoutError' ? 'ETIMEDOUT' : 'NETWORK_ERROR');
          console.error(`[Download] Local Dev Attempt ${attempt} failed [Code: ${errorCode}]:`, errorMessage);
          
          if (attempt === MAX_RETRIES) {
            return NextResponse.json({ 
              error: "Local Server Unreachable", 
              code: errorCode,
              message: errorMessage,
              details: `Connection failed after ${MAX_RETRIES} retries with 5s delays. Is Cobalt running?`
            }, { status: 503 });
          }
        }
      }
    }

    // 2. Production Logic (Durable Object Container Binding)
    const ctx = getRequestContext();
    const env = ctx.env as any;

    if (!env || !env.COBALT_SERVICE) {
      console.error("[Download] Production Error: Durable Object binding 'COBALT_SERVICE' is missing.");
      return NextResponse.json({ 
        error: "Configuration Error", 
        details: "Durable Object binding 'COBALT_SERVICE' not found." 
      }, { status: 500 });
    }

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`[Download] Production Mode: Retry attempt ${attempt}/${MAX_RETRIES} after 5s delay...`);
          await delay(RETRY_DELAY_MS);
        } else {
          console.log("[Download] Production Mode: Calling Durable Object stub");
        }

        const id = env.COBALT_SERVICE.idFromName('global');
        const stub = env.COBALT_SERVICE.get(id);

        const response = await stub.fetch(new Request("https://cobalt-server.infoanuj74.workers.dev/api/json", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Host": "cobalt-server.infoanuj74.workers.dev",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0"
          },
          body: JSON.stringify({ 
            url: videoUrl, 
            filenameStyle: "pretty",
            ...(isAudioOnly ? { isAudioOnly: true } : {})
          }),
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
        }));

        const responseText = await response.text();
        
        if (responseText.trim().startsWith("<!DOCTYPE html") || responseText.includes("Error 1003")) {
          console.warn(`[Download] Loop Detected on attempt ${attempt}. Retrying...`);
          if (attempt === MAX_RETRIES) {
            return NextResponse.json({ 
              error: "Cloudflare Loop Detected", 
              details: "The worker is reaching its public limit or looping. 127.0.0.1 routing required in DO."
            }, { status: 502 });
          }
          continue; // Retry on loop error
        }

        if (!response.ok) {
          let errorData;
          try {
            errorData = JSON.parse(responseText);
          } catch (e) {
            throw new Error(`Upstream returned ${response.status}: ${responseText.slice(0, 100)}`);
          }
          return NextResponse.json({ 
            error: "Backend Service Error", 
            details: errorData.text || errorData.error || errorData.message || "DO error"
          }, { status: response.status });
        }

        const data = JSON.parse(responseText);
        return NextResponse.json(data);

      } catch (err: any) {
        const errorMessage = err.message || "DO communication failure";
        console.error(`[Download] Production Attempt ${attempt} failed:`, errorMessage);
        
        if (attempt === MAX_RETRIES) {
          return NextResponse.json({ 
            error: "Durable Object Exception", 
            message: errorMessage,
            code: err.code || "PRODUCTION_RETRY_FAILED"
          }, { status: 502 });
        }
      }
    }

  } catch (error: any) {
    console.error("[Download] Critical Error:", error);
    return NextResponse.json({ error: "Download failed", details: error.message }, { status: 500 });
  }
}
