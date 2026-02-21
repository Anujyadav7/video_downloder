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

      if (!binding) return NextResponse.json({ error: "Infrastructure missing" }, { status: 500 });

      // Pointing to V8 Stable
      const id = binding.idFromName("global-prod-relay-v8-final-stable");
      const stub = binding.get(id);

      // Cleanest possible request to avoid 403 blocks
      const cleanRequest = new Request("http://localhost-internal/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/123.0.0.0"
        },
        body: JSON.stringify(cobaltBody),
      });

      fetchResponse = await stub.fetch(cleanRequest);
    }

    const responseText = await fetchResponse.text();

    return new Response(responseText, {
        status: fetchResponse.status,
        headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    return NextResponse.json({ error: "Sync Error", details: err.message }, { status: 500 });
  }
}
