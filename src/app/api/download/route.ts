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

    // 2. Production Logic (Direct Public API Fetch)
    const ctx = getRequestContext();
    const env = ctx.env as any;
    const apiUrl = env.COBALT_API_URL || "https://api.cobalt.tools/api/json";

    console.log(`[Download] Production Mode: Fetching from ${apiUrl}`);

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0"
      },
      body: JSON.stringify({ 
        url: videoUrl, 
        filenameStyle: "pretty",
        ...(isAudioOnly ? { isAudioOnly: true } : {})
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Cloudflare API error (${response.status}): ${errorText}`);
    }

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
