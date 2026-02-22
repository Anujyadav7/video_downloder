import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  const isDev = process.env.NODE_ENV === "development" || request.headers.get("host")?.includes("localhost");

  try {
    const rawBody = await request.json();
    if (!rawBody.url) return NextResponse.json({ status: "error", text: "URL is required" }, { status: 400 });

    const cobaltPayload = JSON.stringify({
      url: rawBody.url,
      videoQuality: "720",
      filenameStyle: "nerdy",
      downloadMode: rawBody.mode || "auto"
    });

    let fetchResponse: Response;

    if (isDev) {
      fetchResponse = await fetch("http://127.0.0.1:9000/", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: cobaltPayload
      });
    } else {
      /**
       * PRODUCTION MODE:
       * Since dashboard is managed by wrangler.toml, COBALT_WORKER is strictly available.
       */
      const worker = (process.env as any).COBALT_WORKER || (getRequestContext()?.env as any)?.COBALT_WORKER;

      if (!worker) {
        return NextResponse.json({ 
          status: "error", 
          text: "Internal Error: COBALT_WORKER Service Binding not detected by Edge Runtime." 
        }, { status: 500 });
      }

      // NO original headers pass through here - 1003 Mitigation
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
          return NextResponse.json({ 
            status: "error", 
            text: data.text || "Backend Engine Failure" 
          }, { status: 502 });
      }
      return NextResponse.json(data);
    } catch (e) {
      if (responseText.includes("1003")) {
          return NextResponse.json({ 
            status: "error", 
            text: "Firewall Intercept (1003). Dashboard bindings syncing, please try in 30s." 
          }, { status: 502 });
      }
      return NextResponse.json({ 
        status: "error", 
        text: `Engine returned non-JSON data: ${responseText.slice(0, 50)}` 
      }, { status: 502 });
    }

  } catch (err: any) {
    return NextResponse.json({ 
      status: "error", 
      text: `Bridge Fatal: ${err.message}` 
    }, { status: 500 });
  }
}
