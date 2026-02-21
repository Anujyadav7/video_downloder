import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

/**
 * PRODUCTION-GRADE DOWNLOAD PROXY
 * This route acts as a secure bridge between the frontend and the internal Cobalt container.
 */
export async function POST(request: NextRequest) {
  const isDev = process.env.NODE_ENV === "development";
  
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Expert Body: Minimal structure for Cobalt v10
    const cobaltBody = { 
      url,
      videoQuality: "1080",
      filenameStyle: "pretty"
    };

    let fetchResponse: Response;

    if (isDev) {
      // Local Development: Standard Docker bridge
      const localEndpoint = "http://127.0.0.1:9000/";
      fetchResponse = await fetch(localEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cobaltBody),
      });
    } else {
      // Production: Service Binding Logic
      const ctx = getRequestContext();
      const env = ctx?.env as any;
      const service = env?.COBALT_WORKER;

      if (!service) {
        return NextResponse.json({ 
          error: "Service Binding Missing", 
          details: "COBALT_WORKER binding not found in environment." 
        }, { status: 500 });
      }

      /**
       * CRITICAL FIX for Error 1003:
       * When calling a worker via Service Binding, use a placeholder domain 
       * but ensure we don't pass problematic headers that confuse Cloudflare's WAF.
       */
      fetchResponse = await service.fetch(new Request("http://cobalt-internal.local/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "User-Agent": "CobaltProxy/2026"
        },
        body: JSON.stringify(cobaltBody),
      }));
    }

    const rawText = await fetchResponse.text();
    
    // Check if we hit a security wall (HTML response)
    if (rawText.trim().startsWith("<!DOCTYPE") || !fetchResponse.ok) {
        console.error(`[Proxy] Backend Error ${fetchResponse.status}:`, rawText.slice(0, 300));
        return NextResponse.json({ 
            error: "Backend Security/Network Error", 
            status: fetchResponse.status,
            details: "The internal server returned an invalid response (likely Error 1003). Check Service Binding configuration."
        }, { status: 502 });
    }

    return NextResponse.json(JSON.parse(rawText));

  } catch (err: any) {
    console.error("[Fatal Error] Download API:", err.message);
    return NextResponse.json({ error: "Internal Server Error", details: err.message }, { status: 500 });
  }
}
