import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  const isDev = process.env.NODE_ENV === "development";
  
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const cobaltBody = { url, videoQuality: "1080", filenameStyle: "pretty" };
    let fetchResponse: Response;

    if (isDev) {
      // Local Dev: Direct to docker bridge
      fetchResponse = await fetch("http://127.0.0.1:9000/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cobaltBody),
      });
    } else {
      // Production: Direct Durable Object Binding Communication
      const ctx = getRequestContext();
      const env = ctx?.env as any;
      const doNamespace = env?.COBALT_SERVICE;

      if (!doNamespace) {
        return NextResponse.json({ error: "Infrastructure Error", details: "COBALT_SERVICE binding missing." }, { status: 500 });
      }

      // Communication through the direct stub (No public IP access involved)
      const id = doNamespace.idFromName("global-production-v1");
      const stub = doNamespace.get(id);

      fetchResponse = await stub.fetch(new Request("https://internal.local/", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (DownloadProxy/1.0)"
        },
        body: JSON.stringify(cobaltBody),
      }));
    }

    const rawText = await fetchResponse.text();
    
    // JSON Safety Guard: Prevent parsing HTML (Error 1003 pages)
    if (rawText.trim().startsWith("<!DOCTYPE") || rawText.includes("<html")) {
        console.error("[Route] Backend returned HTML instead of JSON.");
        return NextResponse.json({ 
            error: "Internal Proxy Error", 
            message: "The backend returned HTML instead of JSON" 
        }, { status: 502 });
    }

    // Attempt to return the parsed JSON safely
    try {
        const data = JSON.parse(rawText);
        return NextResponse.json(data);
    } catch (parseErr) {
        return NextResponse.json({ error: "Invalid JSON from Backend", raw: rawText.slice(0, 100) }, { status: 500 });
    }

  } catch (err: any) {
    return NextResponse.json({ error: "Major Handler Failure", details: err.message }, { status: 500 });
  }
}
