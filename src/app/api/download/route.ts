import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge"; // Mandatory for Cloudflare Workers/Pages

// --- Configuration ---
// Note: In Cloudflare Workers, process.env is replaced by global env variables
// However, Next.js Edge Runtime handles process.env correctly via build-time inlining or runtime binding.
const COBALT_INSTANCES = [
  process.env.COBALT_API_URL, 
  "https://api.cobalt.tools", // Official API (POST /)
  "https://co.wuk.sh/api/json", // Wuk.sh API (POST /api/json required)
  "https://cobalt.kwiatekmiki.com", // Try root, might fail if needs /api/json
  "https://cobalt.tools/api/json" // Frontend path variant
].filter(Boolean) as string[];

type CobaltResponse = {
  status: "redirect" | "stream" | "success" | "rate-limit" | "error" | "picker";
  url?: string;
  filename?: string;
  picker?: any[];
  audio?: string;
  thumb?: string;
  text?: string;
};

// --- Main Handler ---
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, isAudioOnly } = body;
    const cleanUrl = url ? url.split("?")[0] : url;

    console.log(`[Download] Processing: ${cleanUrl}`);

    // --- Primary Strategy: Cobalt (Supports IG, YT, TikTok, Twitter, Facebook) ---
    // We try multiple instances for redundancy.
    let lastError = null;

    for (const instance of COBALT_INSTANCES) {
      try {
        let endpoint = instance;
        // if (!endpoint.endsWith("/")) endpoint += "/"; // Don't force slash for API paths like /api/json

        console.log(`[Download] Trying provider: ${endpoint}`);

        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          },
          body: JSON.stringify({
            url: cleanUrl,
            videoQuality: "max",
            audioFormat: "mp3",
            filenameStyle: "basic",
            downloadMode: isAudioOnly ? "audio" : "auto",
            youtubeVideoCodec: "h264",
            alwaysProxy: true // Request proxying to bypass geo-restrictions
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
           const errorText = await response.text();
           console.warn(`[Download] Provider ${endpoint} failed: ${response.status} - ${errorText.substring(0, 100)}`);
           lastError = new Error(`HTTP ${response.status}: ${errorText}`);
           continue; // Try next instance
        }

        const data: any = await response.json();

        // Validate Response
        if (data.status === "error" || data.status === "rate-limit") {
          throw new Error(data.text || "Provider returned error status");
        }

        // --- Handle Carousel (Picker) ---
        if (data.status === "picker" && data.picker && data.picker.length > 0) {
            console.log(`[Download] Carousel found with ${data.picker.length} items`);
            
            // Map picker items responsibly
            const pickerItems = data.picker.map((item: any) => {
                const itemUrl = item.url;
                const isPhoto = itemUrl.includes('.jpg') || itemUrl.includes('.jpeg') || 
                               itemUrl.includes('.png') || itemUrl.includes('.heic') ||
                               itemUrl.includes('.webp');
                
                return {
                    url: itemUrl,
                    type: isPhoto ? 'photo' : 'video',
                    thumb: item.thumb || itemUrl
                };
            });
            
            return NextResponse.json({
                status: "picker",
                picker: pickerItems,
                // Fallback URL usually first item's URL
                url: pickerItems[0]?.url 
            });
        }

        // --- Handle Direct Download ---
        if (data.url || data.status === "redirect" || data.status === "stream") {
            const mediaUrl = data.url;
            
            // Intelligent Filename Generation
            const isPhoto = mediaUrl.includes('.jpg') || mediaUrl.includes('.jpeg') || 
                           mediaUrl.includes('.png') || mediaUrl.includes('.heic') ||
                           mediaUrl.includes('.webp');
            const isVideo = mediaUrl.includes('.mp4') || mediaUrl.includes('.m3u8') || mediaUrl.includes('.webm');
            
            // Use random ID for filename to avoid collisions
            const randomId = Math.random().toString(36).substring(2, 10);
            const extension = isAudioOnly ? "mp3" : (isPhoto ? "jpg" : "mp4");
            const filename = `download_${randomId}.${extension}`;

            return NextResponse.json({
                status: "success",
                url: mediaUrl,
                filename: filename,
                thumb: data.thumb
            });
        }
        
        throw new Error("Invalid response format from provider");

      } catch (e: any) {
        lastError = e;
        console.warn(`[Download] Provider error: ${e.message}`);
        // Continue to next instance loop
      }
    }

    // If all failed
    return NextResponse.json(
      { error: `Download failed. All providers exhausted. Last error: ${lastError?.message || "Unknown"}` },
      { status: 500 }
    );

  } catch (error: any) {
    console.error("[Download] Critical Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
