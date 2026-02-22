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

      fetchResponse = await worker.fetch("http://tunnel.internal/", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: cobaltPayload
      });
    }

    const responseText = await fetchResponse.text();
    
    try {
      const data = JSON.parse(responseText);
      
      // Improved Error Handling: Show what the engine actually said
      if (data.status === "error") {
          const detail = data.text || data.error?.message || data.error?.code || "Unknown Engine Error";
          return NextResponse.json({ error: `Engine Response: ${detail}` }, { status: 502 });
      }
      
      return NextResponse.json(data);
    } catch (e) {
      // Direct 1003 check (should be gone now, but kept for safety)
      if (responseText.includes("1003")) {
          return NextResponse.json({ error: "Cloudflare Firewall (1003) still active on worker." }, { status: 502 });
      }
      return NextResponse.json({ error: "Backend sent non-JSON. Possible worker crash.", raw: responseText.slice(0, 100) }, { status: 502 });
    }

  } catch (err: any) {
    return NextResponse.json({ error: "Internal Gateway Error", details: err.message }, { status: 500 });
  }
}
