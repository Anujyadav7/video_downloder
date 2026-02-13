
import { NextRequest, NextResponse } from "next/server";

// Cobalt API Response Types
export interface CobaltResponse {
  status: "stream" | "redirect" | "picker" | "error" | "tunnel";
  url?: string;
  filename?: string;
  text?: string; 
  picker?: Array<{
    url: string;
    type: "photo" | "video";
    thumb?: string;
  }>;
}

// List of Cobalt Instances (Prioritized)
const COBALT_INSTANCES = [
    "https://api.cobalt.tools",             // Official (Strict)
    "https://cobalt.api.kwiatekmiki.pl",    // Reliable Public Mirror
    "https://dl.khames.com/api",            // Backup Mirror
    "http://127.0.0.1:9000"                 // Local Fallback
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, mode = "auto" } = body; 

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    console.log(`[Cobalt Manager] Processing: ${url}`);

    // Prepare Payload
    const cobaltPayload: any = { url };
    if (mode === "audio") {
      cobaltPayload.isAudioOnly = true;
      cobaltPayload.aFormat = "mp3"; 
    }

    let finalData: CobaltResponse | null = null;
    let successInstance = "";

    // ---------------------------------------------------------
    // MULTI-INSTANCE FALLBACK LOOP
    // ---------------------------------------------------------
    for (const instanceUrl of COBALT_INSTANCES) {
        if (!instanceUrl) continue;
        
        try {
            console.log(`[Cobalt Manager] Trying instance: ${instanceUrl}`);
            
            const response = await fetch(instanceUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify(cobaltPayload),
                signal: AbortSignal.timeout(10000) // 10s timeout per instance
            });

            if (!response.ok) {
                console.warn(`[Cobalt Manager] ${instanceUrl} failed with status ${response.status}`);
                continue; 
            }

            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("json")) {
                console.warn(`[Cobalt Manager] ${instanceUrl} returned non-JSON`);
                continue;
            }

            const data: CobaltResponse = await response.json();
            
            // Validate Logic
            if (data.status === "error") {
                console.warn(`[Cobalt Manager] ${instanceUrl} returned error: ${data.text}`);
                // If it's a specific "content not found" error, maybe don't retry? 
                // But often one instance is blocked while another isn't. Retry is safer.
                continue; 
            }

            // Success!
            finalData = data;
            successInstance = instanceUrl;
            break; // Stop loop

        } catch (e: any) {
            console.warn(`[Cobalt Manager] Connection failed to ${instanceUrl}: ${e.message}`);
        }
    }

    if (!finalData) {
        return NextResponse.json(
            { error: "All download servers failed. Please check the URL or try again later." }, 
            { status: 503 }
        );
    }

    console.log(`[Cobalt Manager] Success via ${successInstance}`);

    // ---------------------------------------------------------
    // PROXY URL GENERATION
    // ---------------------------------------------------------
    // We proxy legitimate media URLs to avoid Mixed Content / CORS / Expiry issues
    const proxyUrl = (targetUrl: string, filename: string = "download") => {
      if (!targetUrl) return "";
      return `/api/proxy?url=${encodeURIComponent(targetUrl)}&filename=${encodeURIComponent(filename)}`;
    };

    const cleanData = { ...finalData }; // Clone

    if (finalData.status === "picker" && finalData.picker) {
      cleanData.picker = finalData.picker.map((item) => ({
        ...item,
        url: proxyUrl(item.url, `instagram_${item.type}_${Date.now()}.mp4`),
        thumb: item.thumb ? proxyUrl(item.thumb, "thumbnail.jpg") : undefined,
      }));
    } else if ((finalData.status === "stream" || finalData.status === "redirect" || finalData.status === "tunnel") && finalData.url) {
      // Stream/Tunnel
      const defaultName = finalData.filename || `instagram_video_${Date.now()}.mp4`;
      cleanData.url = proxyUrl(finalData.url, defaultName);
      
      // If audio mode, force title check?
      if (mode === "audio") cleanData.filename = "audio.mp3";
    }

    return NextResponse.json(cleanData, { status: 200 });

  } catch (error: any) {
    console.error("[Cobalt Manager] Critical Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
