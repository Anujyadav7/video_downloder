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
      // Local remains IPv4 for Docker compatibility
      fetchResponse = await fetch("http://127.0.0.1:9000/", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: cobaltPayload
      });
    } else {
      const ctx = getRequestContext();
      const worker = (ctx?.env as any)?.COBALT_WORKER;

      if (!worker) return NextResponse.json({ error: "Cloudflare Binding Failed" }, { status: 500 });

      // AGGRESSIVE V17 STRIPPING: No Metadata, Browser Mimic
      const cleanHeaders = new Headers();
      cleanHeaders.set("Content-Type", "application/json");
      cleanHeaders.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36");

      fetchResponse = await worker.fetch("http://cobalt-v17.internal/", {
        method: "POST",
        headers: cleanHeaders,
        body: cobaltPayload,
        credentials: 'omit',
        redirect: 'manual'
      } as any);
    }

    const responseText = await fetchResponse.text();
    
    try {
      const data = JSON.parse(responseText);
      if (data.status === "error") return NextResponse.json({ error: data.text || "Bridge Error" }, { status: 502 });
      return NextResponse.json(data);
    } catch (e) {
      if (responseText.includes("1003")) {
          return NextResponse.json({ error: "Cloudflare Firewall Intercept (V17). Identity still leaking." }, { status: 502 });
      }
      return NextResponse.json({ error: "Non-JSON response received from bridge.", raw: responseText.slice(0, 50) }, { status: 502 });
    }

  } catch (err: any) {
    return NextResponse.json({ error: "Bridge Fatal", details: err.message }, { status: 500 });
  }
}
