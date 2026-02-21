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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cobaltBody),
      });
    } else {
      const ctx = getRequestContext();
      const env = ctx?.env as any;
      const binding = env?.COBALT_SERVICE;

      if (!binding) return NextResponse.json({ error: "Service Binding Missing", details: "Check Cloudflare Pages settings for COBALT_SERVICE binding." }, { status: 500 });

      // Pointing to V9 - A fresh state for the GitHub-linked deployment
      const id = binding.idFromName("global-prod-relay-v9-github-stable");
      const stub = binding.get(id);

      // Create a fresh request with zero inherited metadata to skip Error 1003
      const cleanRequest = new Request("http://localhost/api", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0"
        },
        body: JSON.stringify(cobaltBody),
      });

      fetchResponse = await stub.fetch(cleanRequest);
    }

    const responseText = await fetchResponse.text();
    
    // Safety check for HTML blocks
    if (responseText.includes("error code: 1003") || responseText.trim().startsWith("<!DOCTYPE")) {
        return NextResponse.json({ 
            status: "error", 
            error: { code: "BEYOND_WAF_BLOCK", message: "Internal communication blocked by Cloudflare. Check your Service Binding configuration." }
        }, { status: 502 });
    }

    return new Response(responseText, {
        status: fetchResponse.status,
        headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    return NextResponse.json({ error: "Gateway Error", details: err.message }, { status: 500 });
  }
}
