import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  const isDev = process.env.NODE_ENV === "development";
  
  try {
    const cobaltBody = await request.json();
    let fetchResponse: Response;

    if (isDev) {
      fetchResponse = await fetch("http://127.0.0.1:9000/", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(cobaltBody),
      });
    } else {
      const ctx = getRequestContext();
      const env = ctx?.env as any;
      const binding = env?.COBALT_SERVICE;

      if (!binding) return NextResponse.json({ error: "Infrastructure missing", details: "COBALT_SERVICE binding not found." }, { status: 500 });

      // V10 - Fresh identity to break any persistent 1003 blocks
      const id = binding.idFromName("production-v10-final");
      const stub = binding.get(id);

      /**
       * TO FIX 1003 ERROR:
       * 1. Use a standard public-looking URL for the internal fetch.
       * 2. DO NOT pass any headers from the original request.
       * 3. Only send minimal JSON headers.
       */
      fetchResponse = await stub.fetch("https://api.internal/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/123.0.0.0"
        },
        body: JSON.stringify(cobaltBody),
      });
    }

    const responseText = await fetchResponse.text();
    
    // If we get HTML (1003 error), return the raw HTML so we can debug it in the console
    if (responseText.includes("error code: 1003") || responseText.trim().startsWith("<!DOCTYPE")) {
        return new Response(responseText, {
            status: 403,
            headers: { "Content-Type": "text/html" }
        });
    }

    return new Response(responseText, {
        status: fetchResponse.status,
        headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    return NextResponse.json({ error: "Gateway Fatal", details: err.message }, { status: 500 });
  }
}
