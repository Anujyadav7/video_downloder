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
      const binding = env?.COBALT_SERVICE || env?.COBALT_WORKER;

      if (!binding) return NextResponse.json({ error: "Infrastructure missing" }, { status: 500 });

      const id = binding.idFromName("global-prod-relay-v7-final");
      const stub = binding.get(id);

      // Create a fresh request to strip any problematic headers (Referer, Host, etc.)
      const cleanRequest = new Request("https://internal.gw", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36"
        },
        body: JSON.stringify(cobaltBody),
      });

      fetchResponse = await stub.fetch(cleanRequest);
    }

    const responseText = await fetchResponse.text();

    // Direct return - if it's JSON from Cobalt, user sees JSON. 
    // If Cloudflare blocks it, we proxy the raw error so we know EXACTLY what's happening.
    return new Response(responseText, {
        status: fetchResponse.status,
        headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    return NextResponse.json({ error: "Pipe Error", details: err.message }, { status: 500 });
  }
}
