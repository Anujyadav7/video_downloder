import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  const isDev = process.env.NODE_ENV === "development";
  
  try {
    const { url } = await request.json();
    if (!url) return NextResponse.json({ error: "URL is required" }, { status: 400 });

    const cobaltBody = { url, videoQuality: "1080", filenameStyle: "pretty" };
    let fetchResponse: Response;

    if (isDev) {
      // Local is simple
      fetchResponse = await fetch("http://127.0.0.1:9000/", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(cobaltBody),
      });
    } else {
      // PRODUCTION: Bypassing 1003 Error
      const ctx = getRequestContext();
      const env = ctx?.env as any;
      const binding = env?.COBALT_SERVICE || env?.COBALT_WORKER;

      if (!binding) throw new Error("Infrastructure missing: COBALT_SERVICE not found.");

      // Use a completely fresh identity v6 to break any 1003 stuck state
      const id = binding.idFromName("global-prod-relay-v6-final");
      const stub = binding.get(id);

      /**
       * CRITICAL FIX FOR 1003: 
       * We strip ALL existing headers and only send what Cobalt needs.
       * We use a dummy domain to satisfy the Request constructor without triggering WAF.
       */
      const internalRequest = new Request("https://api.internal/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36"
        },
        body: JSON.stringify(cobaltBody),
      });

      fetchResponse = await stub.fetch(internalRequest);
    }

    const rawText = await fetchResponse.text();
    
    // If we still get 1003, it means the DO itself is blocked fetching the container
    if (rawText.includes("error code: 1003") || rawText.trim().startsWith("<!DOCTYPE")) {
        console.error("[Download] Critical 1003 Bypass failed. Raw:", rawText.slice(0, 100));
        return NextResponse.json({ 
            status: "error", 
            error: { 
                code: "CLOUD_BLOCK", 
                message: "Cloudflare is blocking internal communication. Please ensure Service Bindings are active." 
            }
        }, { status: 502 });
    }

    return new Response(rawText, {
        status: fetchResponse.status,
        headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    return NextResponse.json({ error: "Gateway Error", details: err.message }, { status: 500 });
  }
}
