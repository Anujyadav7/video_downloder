import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

/**
 * Cobalt v10 Download Bridge (Feb 2026 Production)
 * Strictly uses internal Service Bindings to bypass Cloudflare's public WAF.
 */
export async function POST(request: NextRequest) {
  const isDev = process.env.NODE_ENV === "development";
  
  try {
    const body = await request.json();
    const url = body.url;

    if (!url) {
      return NextResponse.json({ status: "error", error: "URL is required" }, { status: 400 });
    }

    const cobaltPayload = JSON.stringify({
      url: url,
      videoQuality: "720",
      filenameStyle: "nerdy",
      downloadMode: body.mode || "auto"
    });

    let fetchResponse: Response;

    if (isDev) {
      // Local: Direct call to docker container
      fetchResponse = await fetch("http://127.0.0.1:9000/", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: cobaltPayload,
      });
    } else {
      // Production: Strictly use the Service Binding (COBALT_WORKER)
      const context = getRequestContext();
      const env = context.env as any;
      const worker = env.COBALT_WORKER;

      if (!worker) {
        return NextResponse.json({ 
          status: "error", 
          error: "Infrastructure Error: COBALT_WORKER binding not found." 
        }, { status: 500 });
      }

      /**
       * TO BYPASS 1003:
       * We hit the service binding using a generic internal URL.
       * We do NOT pass the original request object to prevent header leakage.
       */
      fetchResponse = await worker.fetch("http://cobalt.internal/api/json", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: cobaltPayload
      });
    }

    const responseText = await fetchResponse.text();

    try {
      const data = JSON.parse(responseText);
      
      // Handle "error" status from Cobalt v10 or our worker
      if (data.status === "error") {
        return NextResponse.json(data, { status: 502 });
      }

      return NextResponse.json(data);
    } catch (e) {
      // If we see 1003 in the response text, it means the firewall blocked the bridge.
      if (responseText.includes("1003")) {
        return NextResponse.json({ 
          status: "error", 
          error: "Bridge Interception (1003). Please contact support." 
        }, { status: 502 });
      }

      return NextResponse.json({ 
        status: "error", 
        error: "Non-JSON response from backend engine." 
      }, { status: 502 });
    }

  } catch (err: any) {
    // GRACEFUL ERROR HANDLING: Prevents frontend loops by returning a structured error.
    return NextResponse.json({ 
      status: "error", 
      error: `Bridge Fatal: ${err.message}` 
    }, { status: 500 });
  }
}
