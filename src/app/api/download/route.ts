import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  let url: string | undefined;
  let isAudioOnly = false;

  try {
    const body = await request.json();
    url = body.url;
    isAudioOnly = body.isAudioOnly;
    
    console.log(`[Download] Processing: ${url}`);

    // ---------------------------------------------------------
    // 1. Get Service Binding
    // ---------------------------------------------------------
    const ctx = getRequestContext();
    const env = ctx.env as any;
    const worker = env.COBALT_WORKER; // Service Binding

    let successfulResponse: Response | null = null;
    let lastError: any = null;

    // ---------------------------------------------------------
    // 2. Try Service Binding (Primary)
    // ---------------------------------------------------------
    if (worker && typeof worker.fetch === 'function') {
        console.log("[Download] Attempting Service Binding: COBALT_WORKER");
        try {
            // "https://internal.cobalt" is a dummy URL for the binding. 
            // The Worker intercepts it. Path "/api/json" matches typical Cobalt endpoint.
            const workerReq = new Request("https://internal.cobalt/api/json", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0"
                },
                body: JSON.stringify({ 
                    url, 
                    isAudioOnly,
                    filenameStyle: "pretty" 
                })
            });

            const res = await worker.fetch(workerReq);
            
            if (res.ok) {
                successfulResponse = res;
                console.log("[Download] Service Binding Success");
            } else {
                const errText = await res.text();
                console.warn(`[Download] Service Binding failed: ${res.status} - ${errText}`);
                lastError = new Error(`Service Binding Error ${res.status}: ${errText}`);
            }
        } catch (e: any) {
            console.warn(`[Download] Service Binding Exception: ${e.message}`);
            lastError = e;
        }
    } else {
        console.warn("[Download] COBALT_WORKER binding not found or invalid.");
        lastError = new Error("Service Binding COBALT_WORKER not found");
    }

    // ---------------------------------------------------------
    // 3. Fallback to Public Instances (If Binding Failed)
    // ---------------------------------------------------------
    if (!successfulResponse) {
        console.warn("[Download] Falling back to Public Cobalt Instances");
        
        const PUBLIC_INSTANCES = [
          "https://api.cobalt.tools/api/json", 
          "https://co.wuk.sh/api/json",
          "https://sh.cobalt.tools/api/json"
        ];

        for (const instance of PUBLIC_INSTANCES) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            console.log(`[Download] Trying public: ${instance}`);
            const response = await fetch(instance, {
              method: "POST",
              headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                 // Standard User-Agent to avoid blocks
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0"
              },
              body: JSON.stringify({
                 url: url,
                 filenameStyle: "pretty",
                 ...(isAudioOnly ? { isAudioOnly: true } : {})
              }),
              signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (response.ok) {
                successfulResponse = response;
                break;
            }
            lastError = new Error(`Public HTTP ${response.status}`);
          } catch (e: any) {
             console.warn(`[Download] Public provider error: ${e.message}`);
             lastError = e;
          }
        }
    }

    // ---------------------------------------------------------
    // 4. Return Response
    // ---------------------------------------------------------
    if (successfulResponse) {
        const data = await successfulResponse.json();
        return NextResponse.json(data);
    }

    return NextResponse.json(
        { 
            error: "All providers failed", 
            details: lastError?.message || "Unknown error",
            stack: lastError?.stack
        },
        { status: 500 }
    );

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
