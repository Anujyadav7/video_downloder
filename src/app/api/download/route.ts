import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

/**
 * Cobalt v10 Server-Side Bridge (Feb 2026 Stable)
 * Explicitly optimized for v10 internal and local fetches.
 */
export async function POST(request: NextRequest) {
  const isDev = process.env.NODE_ENV === "development" || request.headers.get("host")?.includes("localhost");

  try {
    const rawBody = await request.json();
    if (!rawBody.url) return NextResponse.json({ error: "No URL provided" }, { status: 400 });

    const cobaltPayload = {
      url: rawBody.url,
      videoQuality: "720",
      filenameStyle: "nerdy",
      downloadMode: rawBody.mode || "auto"
    };

    let fetchResponse: Response;

    if (isDev) {
      /**
       * LOCAL DEVELOPMENT
       * Cobalt v10 MANDATES the 'Accept: application/json' header.
       */
      fetchResponse = await fetch("http://127.0.0.1:9000/", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json" 
        },
        body: JSON.stringify(cobaltPayload)
      });
    } else {
      const ctx = getRequestContext();
      const env = ctx?.env as any;
      const worker = env?.COBALT_WORKER;

      if (!worker) {
        return NextResponse.json({ error: "Cloudflare Binding (COBALT_WORKER) missing" }, { status: 500 });
      }

      // Production fetch via Service Binding
      fetchResponse = await worker.fetch("http://cobalt-service/", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(cobaltPayload)
      });
    }

    const responseText = await fetchResponse.text();
    
    try {
      const data = JSON.parse(responseText);
      if (data.status === "error") {
          return NextResponse.json({ error: data.text || data.error?.code || "API Error" }, { status: 502 });
      }
      return NextResponse.json(data);
    } catch (e) {
      // Direct IP / 1003 check
      if (responseText.includes("1003")) return NextResponse.json({ error: "Cloudflare Firewall Block (1003)" }, { status: 502 });
      
      return NextResponse.json({ error: "Non-JSON response from backend" }, { status: 502 });
    }

  } catch (err: any) {
    return NextResponse.json({ error: "Bridge Error", message: err.message }, { status: 500 });
  }
}
