import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  const isDev = process.env.NODE_ENV === "development";
  
  try {
    const cobaltBody = await request.json();
    
    // Stop retries if message is empty or invalid
    if (!cobaltBody.url) {
      return NextResponse.json({ status: "error", error: { code: "invalid.url" } }, { status: 400 });
    }

    let fetchResponse: Response;

    if (isDev) {
      // Local development fallback
      fetchResponse = await fetch("http://127.0.0.1:9000/", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          "Accept": "application/json" 
        },
        body: JSON.stringify(cobaltBody),
      });
    } else {
      const ctx = getRequestContext();
      const env = ctx?.env as any;
      const worker = env?.COBALT_WORKER;

      if (!worker) {
        return NextResponse.json({ 
          status: "error", 
          error: { code: "binding.missing", message: "Internal Service Binding (COBALT_WORKER) not found." } 
        }, { status: 500 });
      }

      /**
       * INTERNAL FETCH via Service Binding
       * Using an internal-only URL to prevent Cloudflare from intercepting 
       * as a public request (avoids 1003 Direct Access error).
       */
      fetchResponse = await worker.fetch("http://cobalt-internal/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "User-Agent": "FastVideoSave-Internal/1.0"
        },
        body: JSON.stringify(cobaltBody),
      });
    }

    // Safety check for non-JSON responses (WAF blocks etc)
    const contentType = fetchResponse.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const errorText = await fetchResponse.text();
      console.error("[INTERNAL ERROR]", errorText);
      return NextResponse.json({ 
        status: "error", 
        error: { 
          code: "server.blocked", 
          message: "Internal communication received non-JSON response. Check Cloudflare WAF/Service Bindings." 
        } 
      }, { status: 502 });
    }

    const data = await fetchResponse.json();
    return NextResponse.json(data);

  } catch (err: any) {
    console.error("[GATEWAY FATAL]", err);
    return NextResponse.json({ 
      status: "error", 
      error: { code: "gateway.fatal", message: err.message } 
    }, { status: 500 });
  }
}
