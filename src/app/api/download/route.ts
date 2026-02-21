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

    // 2. Production Logic (Durable Object Container Binding)
    const ctx = getRequestContext();
    const env = ctx.env as any;

    if (!env || !env.COBALT_SERVICE) {
      console.error("[Download] Production Error: Durable Object binding 'COBALT_SERVICE' is missing.");
      return NextResponse.json({ 
        error: "Configuration Error", 
        details: "Durable Object binding 'COBALT_SERVICE' not found. Please check your Cloudflare Pages settings." 
      }, { status: 500 });
    }

    console.log("[Download] Production Mode: Calling Durable Object stub");

    try {
      // Get the Durable Object stub
      const id = env.COBALT_SERVICE.idFromName('global');
      const stub = env.COBALT_SERVICE.get(id);

      // Perform the fetch directly on the Durable Object
      const response = await stub.fetch(new Request("https://internal.cobalt/api/json", {
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
      }));

      const responseText = await response.text();
      
      if (!response.ok) {
        console.error("[Download] DO Backend Error:", responseText);
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch (e) {
          return NextResponse.json({ 
            error: "Backend Service Error", 
            details: `DO returned ${response.status}: ${responseText.slice(0, 200)}`
          }, { status: response.status });
        }
        return NextResponse.json({ 
          error: "Backend Service Error", 
          details: errorData.text || errorData.error || errorData.message || "DO error"
        }, { status: response.status });
      }

      const data = JSON.parse(responseText);
      return NextResponse.json(data);

    } catch (err: any) {
      console.error("[Download] Durable Object Fetch Exception:", err);
      return NextResponse.json({ 
        error: "Durable Object Exception", 
        details: err.message 
      }, { status: 502 });
    }

  } catch (error: any) {
    console.error("[Download] Processing Error:", error);
    return NextResponse.json({ 
      error: "Download failed", 
      details: error.message 
    }, { status: 500 });
  }
}
