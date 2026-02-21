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

    console.log("[Download] Production Mode: Using Service Binding bridge");

    // This Request bypasses public DNS (fixes Error 1003) by talking directly to the Worker
    const response = await env.COBALT_WORKER.fetch(new Request("https://internal.cobalt/api/json", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Host": "cobalt-server.infoanuj74.workers.dev", // Fixes 1003 by identifying the target service
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0"
      },
      body: JSON.stringify({ 
        url: videoUrl, 
        filenameStyle: "pretty",
        ...(isAudioOnly ? { isAudioOnly: true } : {})
      })
    }));

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
