import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

// --- Handle CORS Preflight ---
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

// --- Main Handler ---
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, isAudioOnly } = body;
    
    console.log(`[Download] Processing: ${url}`);

    // Robust Environment Check
    const isLocal = process.env.NODE_ENV === 'development';
    
    // Extract Cloudflare Env
    let env: any = null;
    try {
        const ctx = getRequestContext();
        if (ctx && ctx.env) env = ctx.env;
    } catch (e) { /* ignore */ }
    if (!env) env = (request as any).env || (request as any).nextjs?.env || process.env;

    const worker = env?.COBALT_WORKER;

    // Headers with explicit Host to bypass 1003 (Direct IP Access)
    const securityHeaders = {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Origin": "https://video-downloder.pages.dev",
        "Referer": "https://video-downloder.pages.dev/",
        "Host": "cobalt-server.infoanuj74.workers.dev" 
    };

    const payload = JSON.stringify({ 
        url, 
        isAudioOnly,
        filenameStyle: "pretty" 
    });

    let resultResponse: Response | null = null;
    let usedMethod = "Unknown";

    // ---------------------------------------------------------
    // 1. Localhost Logic (Public API Fallback)
    // ---------------------------------------------------------
    if (isLocal) {
        console.log("[Download] Localhost detected. Using configured API URL.");
        
        // Use the exact URL from env (e.g. http://127.0.0.1:9000/ for v10 or .../api/json for public)
        // Default to v10 root behavior if not set
        const localTarget = env?.COBALT_API_URL || "http://127.0.0.1:9000/"; 
        
        try {
            console.log(`[Download] Local Fetch: ${localTarget}`);
            // Use simple headers for local/public to avoid Host mismatch
            const localHeaders = { 
                "Content-Type": "application/json", 
                "Accept": "application/json" 
            };
            
            const res = await fetch(localTarget, {
                method: "POST",
                headers: localHeaders,
                body: payload
            });
            
            if (res.ok) {
                resultResponse = res;
                usedMethod = "Localhost Fallback";
            }
            else console.warn(`[Download] Local fallback failed: ${res.status}`);
        } catch (e: any) {
            console.warn(`[Download] Local fallback error: ${e.message}`);
        }
    }

    // ---------------------------------------------------------
    // 2. Production Logic (Service Binding)
    // ---------------------------------------------------------
    else if (worker && typeof worker.fetch === 'function') {
        console.log("[Download] Using Service Binding: COBALT_WORKER");
        try {
            // Use internal Root URL (matches v10 container behavior)
            // with forced Host header to mimic public domain access
            const workerReq = new Request("https://internal.cobalt/", {
                method: "POST",
                headers: securityHeaders,
                body: payload
            });

            // 10s Timeout
            const timeoutPromise = new Promise<Response>((_, reject) => 
                setTimeout(() => reject(new Error("Service Binding Timeout (10s)")), 10000)
            );

            const res = await Promise.race([
                worker.fetch(workerReq),
                timeoutPromise
            ]);
            
            if (res.ok) {
                resultResponse = res;
                usedMethod = "Service Binding";
                console.log("[Download] Service Binding Success");
            } else {
                const txt = await res.text();
                // If 1003 or 530, treat as failure and fallback
                console.error(`[Download] Service Binding Failed: ${res.status} ${res.statusText}`);
                console.error(`[Download] Error Body: ${txt}`);
            }
        } catch (e: any) {
             console.error(`[Download] Service Binding Exception: ${e.message}`);
        }
    }

    // ---------------------------------------------------------
    // 3. Last Resort Fallback (Public Instances)
    // ---------------------------------------------------------
    if (!resultResponse && !isLocal) {
        console.log("[Download] Binding failed. Trying Public Fallbacks.");
        const PUBLIC_INSTANCES = [
          "https://api.cobalt.tools/api/json", 
          "https://co.wuk.sh/api/json",
          "https://sh.cobalt.tools/api/json"
        ];

        for (const instance of PUBLIC_INSTANCES) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 8000);
                
                // Use generic headers for public instances
                const publicHeaders = {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "User-Agent": securityHeaders["User-Agent"]
                };

                const res = await fetch(instance, {
                    method: "POST",
                    headers: publicHeaders,
                    body: payload,
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                if (res.ok) {
                    resultResponse = res;
                    break;
                }
            } catch (e) { /* ignore */ }
        }
    }

    // ---------------------------------------------------------
    // 4. Final Response
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
