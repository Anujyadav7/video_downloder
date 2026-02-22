import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

/**
 * Cobalt v10 Download Bridge (Feb 2026 Production)
 * Strictly follows the Cobalt v10 standard JSON body.
 */
export async function POST(request: NextRequest) {
  const isDev = process.env.NODE_ENV === "development" || request.headers.get("host")?.includes("localhost");
  
  try {
    const body = await request.json();
    const url = body.url;

    if (!url) {
      return NextResponse.json({ status: "error", text: "URL is required" }, { status: 400 });
    }

    /**
     * STATED COBALT V10 PAYLOAD:
     * Only include officially supported fields. 
     * Do NOT add 'externalProxy' or 'proxy' to the body, as it triggers 'error.api.invalid_body'.
     */
    const cobaltPayload = JSON.stringify({
      url: url,
      videoQuality: "720",
      filenameStyle: "nerdy",
      downloadMode: body.mode || "auto"
    });

    let fetchResponse: Response;

    if (isDev) {
      fetchResponse = await fetch("http://127.0.0.1:9000/", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: cobaltPayload,
      });
    } else {
      const worker = (process.env as any).COBALT_WORKER || (getRequestContext()?.env as any)?.COBALT_WORKER;

      if (!worker) {
        return NextResponse.json({ 
          status: "error", 
          text: "Infrastructure Error: COBALT_WORKER binding not found." 
        }, { status: 500 });
      }

      fetchResponse = await worker.fetch("http://cobalt.internal/api/json", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: cobaltPayload
      });
    }

    const responseText = await fetchResponse.text();

    try {
      const data = JSON.parse(responseText);
      if (data.status === "error") {
        // Normalize nested error objects to strings
        const errorDetail = typeof data.error === 'object' ? (data.error.message || data.error.code) : data.error;
        return NextResponse.json({ 
            status: "error", 
            text: errorDetail || data.text || "Backend Engine Error" 
        }, { status: 502 });
      }
      return NextResponse.json(data);
    } catch (e) {
      if (responseText.includes("1003")) {
        return NextResponse.json({ status: "error", text: "Cloudflare Bridge Blocked (1003)." }, { status: 502 });
      }
      return NextResponse.json({ status: "error", text: "Invalid JSON from engine." }, { status: 502 });
    }

  } catch (err: any) {
    return NextResponse.json({ status: "error", text: `Bridge Fatal: ${err.message}` }, { status: 500 });
  }
}
