import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

/**
 * Cobalt v10 Clean-Tunnel Bridge (V16-Ultra-Clean Feb 2026)
 * Strictly removes all metadata to bypass Cloudflare's Error 1003.
 */
export async function POST(request: NextRequest) {
  const isDev = process.env.NODE_ENV === "development" || request.headers.get("host")?.includes("localhost");

  try {
    const rawBody = await request.json();
    if (!rawBody.url) return NextResponse.json({ error: "No URL provided" }, { status: 400 });

    const cobaltPayload = JSON.stringify({
      url: rawBody.url,
      videoQuality: "720",
      filenameStyle: "nerdy",
      downloadMode: rawBody.mode || "auto"
    });

    let fetchResponse: Response;

    if (isDev) {
      // Local development remains direct
      fetchResponse = await fetch("http://127.0.0.1:9000/", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: cobaltPayload
      });
    } else {
      const ctx = getRequestContext();
      const worker = (ctx?.env as any)?.COBALT_WORKER;

      if (!worker) return NextResponse.json({ error: "COBALT_WORKER Binding Missing" }, { status: 500 });

      /**
       * V16 AGGRESSIVE STRIPPING:
       * We create a completely fresh Headers object.
       * We MUST NOT pass any cf-* headers or x-forwarded-* headers.
       */
      const cleanHeaders = new Headers();
      cleanHeaders.set("Content-Type", "application/json");
      cleanHeaders.set("Accept", "application/json");

      fetchResponse = await worker.fetch("http://cobalt.internal/", {
        method: "POST",
        headers: cleanHeaders,
        body: cobaltPayload,
        // credentials: 'omit' is crucial in 2026 to prevent automatic identity leakage
        credentials: 'omit',
        redirect: 'manual'
      } as any);
    }

    const responseText = await fetchResponse.text();
    
    try {
      const data = JSON.parse(responseText);
      if (data.status === "error") return NextResponse.json({ error: data.text || "Backend Engine Error" }, { status: 502 });
      return NextResponse.json(data);
    } catch (e) {
      // If we see 1003, it means the identity leak happened further down the pipe
      if (responseText.includes("1003") || responseText.includes("Direct IP access")) {
          return NextResponse.json({ 
            status: "error", 
            error: { code: "cloudflare.1003", message: "Clean-Tunnel intercept (1003). Identity leaking in Worker-Container bridge." } 
          }, { status: 502 });
      }
      return NextResponse.json({ error: "Backend sent non-JSON response.", raw: responseText.slice(0, 100) }, { status: 502 });
    }

  } catch (err: any) {
    return NextResponse.json({ error: "Internal Gateway Error", details: err.message }, { status: 500 });
  }
}
