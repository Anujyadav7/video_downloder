import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, isAudioOnly } = body;
    
    console.log(`[Download] Processing: ${url}`);

    // Extract Environment
    let env: any = null;
    try {
        const ctx = getRequestContext();
        if (ctx && ctx.env) env = ctx.env;
    } catch (e) { console.log("[Download] getRequestContext unavailable"); }

    if (!env) {
        env = (request as any).env || (request as any).nextjs?.env || process.env;
    }

    const worker = env?.COBALT_WORKER;
    
    // Construct Request Headers to Bypass 403 / Bot Detection
    const headers = {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Referer": "https://video-downloder.pages.dev/", // Hardcoded to production URL
        "x-requested-with": "XMLHttpRequest"
    };

    // Construct Payload (Add Proxy if available)
    const payload: any = { 
        url, 
        isAudioOnly,
        filenameStyle: "pretty" 
    };
    
    if (env?.PROXY_URL) {
        payload.proxy = env.PROXY_URL; // Pass proxy if configured
    }

    let resultResponse: Response | null = null;
    let usedMethod = "Unknown";

    // ---------------------------------------------------------
    // 1. Try Service Binding (Priority)
    // ---------------------------------------------------------
    if (worker && typeof worker.fetch === 'function') {
        console.log("[Download] Using Service Binding: COBALT_WORKER");
        try {
            // Use 'cobalt-server' as host to match expected Worker host
            const workerReq = new Request("https://cobalt-server/api/json", {
                method: "POST",
                headers: headers,
                body: JSON.stringify(payload)
            });

            const res = await worker.fetch(workerReq);
            
            if (res.ok) {
                resultResponse = res;
                usedMethod = "Service Binding";
            } else {
                const errText = await res.text();
                // If 1003 or 403, it might be the Internal WAF.
                // We fallback to Public if binding fails hard.
                console.warn(`[Download] Service Binding failed: ${res.status} - ${errText}`);
                if (res.status === 403 || res.status === 530) {
                     // 1003/1016 -> Fallback to Public needed
                }
            }
        } catch (e: any) {
             console.warn(`[Download] Service Binding Exception: ${e.message}`);
        }
    }

    // ---------------------------------------------------------
    // 2. Fallback to Public Instances (Crucial for 1016/1003 bypass)
    // ---------------------------------------------------------
    if (!resultResponse) {
        console.log("[Download] Falling back to Public Providers due to Binding Failure");
        
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
              headers: headers, // Reuse robust headers
              body: JSON.stringify(payload),
              signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (response.ok) {
                resultResponse = response;
                usedMethod = instance;
                break;
            }
          } catch (e) {
             console.warn(`[Download] Public provider ${instance} failed`);
          }
        }
    }

    // ---------------------------------------------------------
    // 3. Final Response
    // ---------------------------------------------------------
    if (resultResponse) {
        const data = await resultResponse.json();
        return NextResponse.json(data);
    }

    return NextResponse.json(
        { error: "All providers failed (Binding & Public)" }, 
        { status: 500 }
    );

  } catch (error: any) {
    console.error("[Download] Critical Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
