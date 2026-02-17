import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return new NextResponse("Missing URL parameter", { status: 400 });
  }

  // Basic validation to prevent obvious abuse (e.g., only allow media domains)
  if (!url.startsWith("http")) {
      return new NextResponse("Invalid URL", { status: 400 });
  }

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://www.instagram.com/" // Crucial for Instagram CDN
      }
    });

    if (!response.ok) {
      return new NextResponse(`Upstream Error: ${response.status}`, { status: response.status });
    }

    // Clone headers to strip sensitive ones if needed, or modify them
    const newHeaders = new Headers(response.headers);
    newHeaders.set("Access-Control-Allow-Origin", "*"); // Allow frontend access
    
    // Cloudflare handles streams automatically
    return new NextResponse(response.body, {
      status: response.status,
      headers: newHeaders
    });

  } catch (error: any) {
    return new NextResponse(`Proxy Error: ${error.message}`, { status: 500 });
  }
}
