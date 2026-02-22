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

      if (!worker) return NextResponse.json({ error: "Infrastructure Error: COBALT_WORKER missing" }, { status: 500 });

      // Production: Clean tunnel fetch
      fetchResponse = await worker.fetch("http://tunnel.internal/", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: cobaltPayload
      });
    }

    const responseText = await fetchResponse.text();
    
    try {
      const data = JSON.parse(responseText);
      if (data.status === "error") return NextResponse.json({ error: data.text || "Backend Engine Error" }, { status: 502 });
      return NextResponse.json(data);
    } catch (e) {
      // Direct 1003 check
      if (responseText.includes("1003")) {
          return NextResponse.json({ 
            status: "error", 
            error: { code: "cloudflare.1003", message: "Cloudflare Bridge Blocked. Try reloading in 10 seconds." } 
          }, { status: 502 });
      }
      return NextResponse.json({ error: "Backend sent non-JSON response." }, { status: 502 });
    }

  } catch (err: any) {
    return NextResponse.json({ error: "Internal Gateway Error", details: err.message }, { status: 500 });
  }
}
