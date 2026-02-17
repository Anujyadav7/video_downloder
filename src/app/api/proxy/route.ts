import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

async function handler(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return new NextResponse("Missing URL parameter", { status: 400 });
  }

  // Basic validation
  if (!url.startsWith("http")) {
      return new NextResponse("Invalid URL", { status: 400 });
  }

  try {
    const headers = new Headers();
    headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
    
    // Forward Range header for video seeking/buffering
    const range = request.headers.get("range");
    if (range) {
        headers.set("Range", range);
    }

    // Smart Referer: Only add for meta domains to bypass blocking, otherwise let it be
    if (url.includes("instagram.com") || url.includes("facebook.com") || url.includes("cdninstagram") || url.includes("fbcdn")) {
        headers.set("Referer", "https://www.instagram.com/");
        headers.set("Origin", "https://www.instagram.com");
    }

    const response = await fetch(url, {
      method: request.method, // Forward GET or HEAD
      headers: headers
    });

    // Create response headers
    const newHeaders = new Headers(response.headers);
    newHeaders.set("Access-Control-Allow-Origin", "*"); 
    
    // Ensure critical headers for video playback are passed
    if (response.headers.has("Content-Type")) newHeaders.set("Content-Type", response.headers.get("Content-Type")!);
    if (response.headers.has("Content-Length")) newHeaders.set("Content-Length", response.headers.get("Content-Length")!);
    if (response.headers.has("Content-Range")) newHeaders.set("Content-Range", response.headers.get("Content-Range")!);
    if (response.headers.has("Accept-Ranges")) newHeaders.set("Accept-Ranges", response.headers.get("Accept-Ranges")!);

    return new NextResponse(request.method === "HEAD" ? null : response.body, {
      status: response.status,
      headers: newHeaders
    });

  } catch (error: any) {
    console.error("Proxy Error:", error);
    return new NextResponse(`Proxy Error: ${error.message}`, { status: 500 });
  }
}

export { handler as GET, handler as HEAD };
