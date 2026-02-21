import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  try {
    const { url: videoUrl, isAudioOnly } = await request.json();
    
    // 1. Local Development Logic
    // process.env.NODE_ENV is set by Next.js
    if (process.env.NODE_ENV === 'development') {
      console.log("[Download] Dev Mode: Fetching from http://localhost:9000/api/json");
      const localResponse = await fetch("http://localhost:9000/api/json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          url: videoUrl, 
          filenameStyle: "pretty",
          ...(isAudioOnly ? { isAudioOnly: true } : {})
        })
      });
      const data = await localResponse.json();
      return NextResponse.json(data);
    }

    // 2. Production Logic (Strict Service Binding)
    // Always use getRequestContext to access Cloudflare bindings in Next.js
    const ctx = getRequestContext();
    const env = ctx.env as any;

    if (!env || !env.COBALT_WORKER) {
      console.error("[Download] Production Error: Service Binding 'COBALT_WORKER' not found");
      return NextResponse.json({ error: "Service Binding COBALT_WORKER not found" }, { status: 500 });
    }

    // Use the internal container URL from environment variables
    const apiUrl = env.COBALT_API_URL || "http://cobalt-server:9000/api/json";
    
    console.log(`[Download] Production Mode: Routing to container at ${apiUrl}`);

    // Call the container directly via the COBALT_WORKER service binding
    const response = await env.COBALT_WORKER.fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0"
      },
      body: JSON.stringify({ 
        url: videoUrl, 
        filenameStyle: "pretty",
        ...(isAudioOnly ? { isAudioOnly: true } : {})
      })
    });

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error("[Download] Processing Error:", error);
    return NextResponse.json({ 
      error: "Download failed", 
      details: error.message 
    }, { status: 500 });
  }
}
