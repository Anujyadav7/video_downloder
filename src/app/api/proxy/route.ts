import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) return NextResponse.json({ error: "No URL provided" }, { status: 400 });

  try {
    // Mimic real browser headers to bypass Instagram/CDN security
    const headers = new Headers();
    headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36");
    headers.set("Referer", "https://www.instagram.com/");
    headers.set("Accept", "*/*");

    const response = await fetch(targetUrl, { headers });

    // Stream the content back with original content-type
    const contentType = response.headers.get("content-type") || "application/octet-stream";
    
    // Add CORS for frontend displays (e.g., video tags)
    const newHeaders = new Headers();
    newHeaders.set("Content-Type", contentType);
    newHeaders.set("Access-Control-Allow-Origin", "*");
    newHeaders.set("Cache-Control", "public, max-age=86400"); // Cache for 24h

    return new Response(response.body, {
      status: response.status,
      headers: newHeaders,
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Proxy Failed", details: err.message }, { status: 500 });
  }
}
