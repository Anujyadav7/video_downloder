import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  try {
    const { url: videoUrl, isAudioOnly } = await request.json();
    
    // 1. Local Development Logic
    if (process.env.NODE_ENV === 'development') {
      const localUrl = "http://127.0.0.1:9000/api/json";
      console.log(`[Download] Dev Mode: Fetching from ${localUrl}`);
      
      try {
        const localResponse = await fetch(localUrl, {
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
      } catch (err: any) {
        console.error("[Download] Local Dev Error: Is the Cobalt server running on port 9000?", err.message);
        return NextResponse.json({ 
          error: "Local Server Unreachable", 
          details: "Please ensure your local Cobalt server is running on http://127.0.0.1:9000" 
        }, { status: 503 });
      }
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
      const id = env.COBALT_SERVICE.idFromName('global');
      const stub = env.COBALT_SERVICE.get(id);

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

      // Read raw text first for debugging HTML responses (requested by user)
      const responseText = await response.text();
      console.log("[Download] Raw Backend Response:", responseText);
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch (e) {
          return NextResponse.json({ 
            error: "Backend Service Error", 
            details: `Raw Response (Status ${response.status}): ${responseText.slice(0, 500)}`
          }, { status: response.status });
        }
        return NextResponse.json({ 
          error: "Backend Service Error", 
          details: errorData.text || errorData.error || errorData.message || "DO error"
        }, { status: response.status });
      }

      // Parse JSON from the text we already read
      try {
        const data = JSON.parse(responseText);
        return NextResponse.json(data);
      } catch (parseErr) {
        console.error("[Download] JSON Parse Error:", parseErr);
        return NextResponse.json({ 
          error: "JSON Parse Error", 
          details: "Response was not valid JSON even though status was OK." 
        }, { status: 500 });
      }

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
