import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

/**
 * Professional Proxy Handler for Video Downloads
 * Uses internal Cloudflare Service Bindings to bypass public WAF and 1003 errors.
 */
export async function POST(request: NextRequest) {
  const isDev = process.env.NODE_ENV === "development";
  
  try {
    const incomingBody = await request.json();
    const { url } = incomingBody;

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Expert Fix: Construct only the minimal payload required by Cobalt v10.
    const cobaltBody = { 
      url,
      videoQuality: "1080", // Default High Quality
      filenameStyle: "pretty"
    };

    let fetchResponse: Response;

    if (isDev) {
      // Development: Direct call to local docker gateway
      const localEndpoint = "http://127.0.0.1:9000/";
      console.log(`[Proxy] Dev Mode: Forwarding to ${localEndpoint}`);
      
      fetchResponse = await fetch(localEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cobaltBody),
      });
    } else {
      // Production: EXPERT BINDING LOGIC
      const ctx = getRequestContext();
      const env = ctx?.env as any;

      // FIX: Check for Service Binding first (Highly Recommended)
      const service = env?.COBALT_WORKER;
      
      if (!service) {
        console.error("[Proxy] Critical Error: COBALT_WORKER service binding is missing.");
        return NextResponse.json({ 
          error: "Infrastructure Error", 
          details: "Internal Service Binding 'COBALT_WORKER' not configured in Pages settings." 
        }, { status: 500 });
      }

      console.log("[Proxy] Production Mode: Using private service binding route...");

      // Use the internal routing domain to ensure no public DNS/WAF interference
      fetchResponse = await service.fetch(new Request("https://internal-gateway.cobalt/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "User-Agent": "CobaltInternalProxy/1.0"
        },
        body: JSON.stringify(cobaltBody),
        // No manual Host header here; Cloudflare handles internal routing automatically
      }));
    }

    const rawText = await fetchResponse.text();
    
    // Safety check: Catch Cloudflare HTML error pages (Loops/1003/etc)
    if (rawText.trim().startsWith("<!DOCTYPE") || !fetchResponse.ok) {
        console.error("[Proxy] Upstream Error Detected:", rawText.slice(0, 300));
        return NextResponse.json({ 
            error: "Backend Communication Error", 
            code: `STATUS_${fetchResponse.status}`,
            details: "The internal server returned HTML instead of media data."
        }, { status: 502 });
    }

    return NextResponse.json(JSON.parse(rawText));

  } catch (err: any) {
    console.error("[Fatal Error] Download Handler:", err.message);
    return NextResponse.json({ 
        error: "Internal Server Error", 
        details: err.message 
    }, { status: 500 });
  }
}
