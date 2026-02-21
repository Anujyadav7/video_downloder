import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  const isDev = process.env.NODE_ENV === "development";
  
  try {
    const body = await request.json();
    const { url } = body;
    if (!url) return NextResponse.json({ error: "URL is required" }, { status: 400 });

    const cobaltBody = { url, videoQuality: "1080", filenameStyle: "pretty" };
    
    // STRICT HEADERS FOR COBALT V10
    const headers = { 
      "Content-Type": "application/json",
      "Accept": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    };

    let fetchResponse: Response;

    if (isDev) {
      // Direct Local Container
      fetchResponse = await fetch("http://127.0.0.1:9000/", {
        method: "POST",
        headers: headers,
        body: JSON.stringify(cobaltBody),
      });
    } else {
      // Production Gateway (V5)
      const ctx = getRequestContext();
      const env = ctx?.env as any;
      const binding = env?.COBALT_SERVICE || env?.COBALT_WORKER;

      if (!binding) return NextResponse.json({ error: "Cloudflare Binding Missing" }, { status: 500 });

      const id = binding.idFromName ? binding.idFromName("global-prod-relay-v5-stable") : null;
      const target = id ? binding.get(id) : binding;

      fetchResponse = await target.fetch(new Request("https://internal.gateway/", {
        method: "POST",
        headers: headers,
        body: JSON.stringify(cobaltBody),
      }));
    }

    const rawText = await fetchResponse.text();
    
    // Guard against security blocks (HTML)
    if (rawText.trim().startsWith("<!DOCTYPE") || rawText.includes("error code: 1003")) {
        return NextResponse.json({ 
            error: "Security Blocked", 
            message: "The backend returned HTML instead of JSON (1003 Error)."
        }, { status: 502 });
    }

    // Standard Success Block
    try {
        const data = JSON.parse(rawText);
        // Ensure even error responses from Cobalt are parsed correctly
        return NextResponse.json(data);
    } catch (parseErr) {
        return NextResponse.json({ error: "Parse Failure", raw: rawText.slice(0, 100) }, { status: 500 });
    }

  } catch (err: any) {
    return NextResponse.json({ error: "Server Error", details: err.message }, { status: 500 });
  }
}
