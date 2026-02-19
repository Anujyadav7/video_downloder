import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

type CobaltResponse = {
  status: "redirect" | "stream" | "success" | "rate-limit" | "error" | "picker";
  url?: string;
  filename?: string;
  picker?: any[];
  audio?: string;
  thumb?: string;
  text?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, isAudioOnly } = body;

    console.log(`[Download] Processing: ${url}`);

    let lastError: any = null;
    let successfulResponse: Response | null = null;
    let usedProvider = "Unknown";

    // ---------------------------------------------------------
    // 1. Try Service Binding (Internal, High Performance)
    // ---------------------------------------------------------
    try {
        const ctx = getRequestContext();
        const worker = (ctx.env as any).COBALT_WORKER;
        
        if (worker && typeof worker.fetch === 'function') {
            console.log("[Download] Attempting Service Binding: COBALT_WORKER");
            // Workers expect a Request object. We must construct a new one.
            // Note: The URL here is internal to the binding, but Cobalt expects path routing.
            const workerReq = new Request("http://cobalt-server/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
                },
                body: JSON.stringify({ url, isAudioOnly })
            });

            const res = await worker.fetch(workerReq);
            if (res.ok) {
                successfulResponse = res;
                usedProvider = "Service Binding";
                console.log("[Download] Service Binding Success");
            } else {
                console.warn(`[Download] Service Binding failed: ${res.status}`);
                lastError = new Error(`Service Binding Error: ${res.status}`);
            }
        }
    } catch (e: any) {
        console.warn(`[Download] Service Binding Exception: ${e.message}`);
        // Don't impede fallback
    }

    // ---------------------------------------------------------
    // 2. Fallback to HTTP Providers (If Binding Failed)
    // ---------------------------------------------------------
    if (!successfulResponse) {
        const COBALT_INSTANCES = [
          process.env.COBALT_URL, // Renamed from COBALT_API_URL per user request
          process.env.COBALT_API_URL, // Legacy fallback
          process.env.NODE_ENV === 'development' ? "http://127.0.0.1:9000/" : null,
          "https://api.cobalt.tools/api/json", 
          "https://co.wuk.sh/api/json",
          "https://sh.cobalt.tools/api/json"
        ].filter(Boolean) as string[];

        console.log(`[Download] Falling back to HTTP Providers: ${COBALT_INSTANCES.join(', ')}`);

        for (const instance of COBALT_INSTANCES) {
          try {
            const endpoint = instance.endsWith('/') ? instance : `${instance}/`;
            // Remove double slash if /api/json/ resulted
            const cleanEndpoint = endpoint.replace(/\/api\/json\/$/, "/api/json"); 
            
            console.log(`[Download] Trying provider: ${cleanEndpoint}`);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 12000);

            const response = await fetch(cleanEndpoint, {
              method: "POST",
              headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
              },
              body: JSON.stringify({
                 url: url,
                 ...(isAudioOnly ? { isAudioOnly: true } : {})
              }),
              signal: controller.signal
            });
            
            clearTimeout(timeoutId);

            if (response.ok) {
                successfulResponse = response;
                usedProvider = cleanEndpoint;
                break;
            }
            
            const errorText = await response.text(); // Consume body
            throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 50)}`);

          } catch (e: any) {
             lastError = e;
             console.warn(`[Download] Provider ${instance} error: ${e.message}`);
          }
        }
    }

    // ---------------------------------------------------------
    // 3. Process Response
    // ---------------------------------------------------------
    if (!successfulResponse) {
        const errorStatus = (lastError?.message && lastError.message.includes("HTTP 4")) ? 400 : 500;
        return NextResponse.json(
            { error: `Download failed. Last error: ${lastError?.message || "Unknown"}` },
            { status: errorStatus }
        );
    }

    // Parse Data
    const data: any = await successfulResponse.json();

    // Validate Status
    if (data.status === "error" || data.status === "rate-limit") {
        throw new Error(data.text || "Provider returned error status");
    }

    // Handle Picker (Carousel)
    if (data.status === "picker" && data.picker && data.picker.length > 0) {
        console.log(`[Download] Carousel found with ${data.picker.length} items`);
        const pickerItems = data.picker.map((item: any) => {
            const itemUrl = item.url;
            return {
                url: itemUrl,
                type: (itemUrl.includes('.jpg') || itemUrl.includes('.png')) ? 'photo' : 'video',
                thumb: item.thumb || itemUrl
            };
        });
        return NextResponse.json({
            status: "picker",
            picker: pickerItems,
            url: pickerItems[0]?.url 
        });
    }

    // Handle Success
    if (data.url || data.status === "redirect" || data.status === "stream") {
        const mediaUrl = data.url;
        const randomId = Math.random().toString(36).substring(2, 10);
        const extension = isAudioOnly ? "mp3" : "mp4"; // Simplified extension logic
        const filename = `download_${randomId}.${extension}`;

        return NextResponse.json({
            status: "success",
            url: mediaUrl,
            filename: filename,
            thumb: data.thumb
        });
    }

    throw new Error("Invalid response format from provider");

  } catch (error: any) {
    console.error("[Download] Critical Error:", error);
    return NextResponse.json(
      { 
        error: "Internal Server Error", 
        details: error.message,
        stack: error.stack 
      },
      { status: 500 }
    );
  }
}
