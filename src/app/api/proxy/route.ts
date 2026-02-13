import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoUrl = searchParams.get("url");
    const filename = searchParams.get("filename") || "instagram_video.mp4";

    if (!videoUrl) {
      return NextResponse.json(
        { error: "Video URL is required" },
        { status: 400 }
      );
    }

    console.log(`[Proxy Download] Streaming video from: ${videoUrl.substring(0, 100)}...`);

    // Fetch the video from Instagram CDN
    const response = await fetch(videoUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "*/*",
      },
    });

    if (!response.ok) {
      console.error(`[Proxy Download] Failed to fetch: ${response.status}`);
      return NextResponse.json(
        { error: "Failed to fetch video" },
        { status: response.status }
      );
    }

    // Get content length for progress tracking
    const contentLength = response.headers.get("content-length");
    
    console.log(`[Proxy Download] Starting stream, size: ${contentLength ? (parseInt(contentLength) / 1024 / 1024).toFixed(2) + 'MB' : 'unknown'}`);

    // Stream the response directly to the client
    const headers = new Headers();
    response.headers.forEach((value, key) => headers.set(key, value));

    // Force specific headers
    const contentType = response.headers.get("content-type") || "application/octet-stream";
    headers.set("Content-Type", contentType);
    
    // Handle download vs display
    // Handle download vs display
    const isDownload = searchParams.get("download") === "true";
    if (isDownload) {
        headers.set("Content-Disposition", `attachment; filename="${filename}"`);
    } else {
        headers.set("Content-Disposition", `inline; filename="${filename}"`);
    }

    // Pass content length
    if (contentLength) {
        headers.set("Content-Length", contentLength);
    }
    
    headers.set("Cache-Control", "public, max-age=3600");

    return new NextResponse(response.body, {
      status: 200,
      headers: headers,
    });
  } catch (error: any) {
    console.error("[Proxy Download] Error:", error);
    return NextResponse.json(
      { error: "Failed to download video", details: error.message },
      { status: 500 }
    );
  }
}
