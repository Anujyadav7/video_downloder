import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

/**
 * Next.js Edge Runtime configuration for Cloudflare Pages Compatibility.
 */
export const runtime = "edge";

/**
 * Handle POST requests for video metadata extraction via Cobalt.
 */
export async function POST(request: NextRequest) {
  const isDev = process.env.NODE_ENV === "development";
  
  try {
    const body = await request.json();
    const { url, mode } = body;

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Expert Fix: Construct the exact minimal body required by Cobalt v10 mirrors.
    // Redundant or non-standard fields often trigger "error.api.invalid_body".
    const cobaltBody: Record<string, any> = { url };
    if (mode === "audio") {
      cobaltBody.isAudioOnly = true;
    }

    let fetchResponse: Response;

    if (isDev) {
      // Local Development - Direct fetch to local container gateway.
      // Cobalt v10 standardizes on the root path '/'.
      const localEndpoint = "http://127.0.0.1:9000/";
      console.log(`[Proxy] Dev: Forwarding to ${localEndpoint}`);
      
      fetchResponse = await fetch(localEndpoint, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(cobaltBody),
      });
    } else {
      // Production - Use Cloudflare Internal Service Binding.
      // This bypasses public DNS, reduces latency, and prevents Error 1003.
      const ctx = getRequestContext();
      const env = ctx?.env as any;
      const binding = env?.COBALT_SERVICE || env?.COBALT_WORKER;

      if (!binding) {
        console.error("[Proxy] Production Error: Service Bindings not found.");
        return NextResponse.json({ error: "System Configuration Error" }, { status: 500 });
      }

      // Internal fetch call stays within Cloudflare's private network stack.
      fetchResponse = await binding.fetch(new Request("https://internal.cobalt/", {
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
    
    // Safety check: Detect if Cloudflare or the container returned an HTML error page.
    if (rawText.trim().startsWith("<!DOCTYPE") || !fetchResponse.ok) {
        let errorPayload;
        try {
            errorPayload = JSON.parse(rawText);
        } catch {
            errorPayload = { error: "Upstream Error", details: rawText.slice(0, 100) };
        }
        return NextResponse.json(errorPayload, { status: fetchResponse.status || 502 });
    }

    // Success: Return clean JSON to the frontend.
    return NextResponse.json(JSON.parse(rawText));

  } catch (err: any) {
    console.error("[Fatal Error] Download Route:", err.message);
    return NextResponse.json({ 
        error: "Internal Server Error", 
        details: err.message 
    }, { status: 500 });
  }
}
