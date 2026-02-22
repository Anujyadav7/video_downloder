import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

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
       * PURE DATA TUNNEL:
       * Don't pass the original 'request' headers. 
       * Only send what the backend strictly needs.
       */
      fetchResponse = await worker.fetch("http://tunnel.internal/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: cobaltPayload
      });
    }

    const responseText = await fetchResponse.text();
    
    try {
      const data = JSON.parse(responseText);
      if (data.status === "error") return NextResponse.json({ error: data.text || "API Error" }, { status: 502 });
      return NextResponse.json(data);
    } catch (e) {
      // If we see 1003 in response, it means the worker failed to purge its own fetch
      if (responseText.includes("1003")) {
          return NextResponse.json({ error: "Internal Bridge Security Intercept (1003). Check Worker Logs." }, { status: 502 });
      }
      return NextResponse.json({ error: "Backend returned invalid response format" }, { status: 502 });
    }

  } catch (err: any) {
    return NextResponse.json({ error: "Bridge Error", message: err.message }, { status: 500 });
  }
}
