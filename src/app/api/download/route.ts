import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  try {
    const { url: videoUrl, isAudioOnly } = await request.json();
    const ctx = getRequestContext();
    const env = ctx.env as any;

    // 1. Environment Detection
    const isDevelopment = process.env.NODE_ENV === 'development';

    // ---------------------------------------------------------
    // 2. Localhost Logic
    // ---------------------------------------------------------
    if (isDevelopment) {
      console.log("[Download] Dev Mode: Using localhost:9000");
      const localResponse = await fetch("http://localhost:9000/api/json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: videoUrl, filenameStyle: "pretty" })
      });
      const data = await localResponse.json();
      return NextResponse.json(data);
    }

    // ---------------------------------------------------------
    // 3. Production Logic (Strict Service Binding)
    // ---------------------------------------------------------
    if (env.COBALT_WORKER) {
      console.log("[Download] Production Mode: Using Service Binding");
      
      const response = await env.COBALT_WORKER.fetch(new Request("https://internal.cobalt/api/json", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0",
          "Host": "cobalt-server.infoanuj74.workers.dev", // Fixes Error 1003
          "Origin": "https://video-downloder.pages.dev"
        },
        body: JSON.stringify({ 
          url: videoUrl, 
          filenameStyle: "pretty",
          ...(isAudioOnly ? { isAudioOnly: true } : {})
        })
      }));

      const data = await response.json();
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: "Service Binding not found" }, { status: 500 });

  } catch (error: any) {
    console.error("[Download] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
