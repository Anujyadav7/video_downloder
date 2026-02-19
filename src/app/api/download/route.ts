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
    const { url, isAudioOnly } = body; // My frontend sends 'url'
    
    console.log(`[Download] Processing: ${url}`);

    // Extract Environment
    let env: any = null;
    try {
        const ctx = getRequestContext();
        if (ctx && ctx.env) env = ctx.env;
    } catch (e) { /* ignore */ }
    if (!env) env = (request as any).env || (request as any).nextjs?.env || process.env;

    const worker = env?.COBALT_WORKER;
    const isLocal = process.env.NODE_ENV === 'development';
    
    // Security Headers (Crucial for 1003 bypass)
    const securityHeaders = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Origin": "https://video-downloder.pages.dev",
        "Referer": "https://video-downloder.pages.dev/",
        "x-requested-with": "XMLHttpRequest"
    };

    const payload = JSON.stringify({ 
        url, 
        isAudioOnly,
        filenameStyle: "pretty" 
    });

    let resultResponse: Response | null = null;
    let usedMethod = "Unknown";

    // ---------------------------------------------------------
    // 1. Try Service Binding (PRODUCTION ONLY)
    // ---------------------------------------------------------
    if (!isLocal && worker && typeof worker.fetch === 'function') {
        console.log("[Download] Using Service Binding: COBALT_WORKER");
        try {
            // Use Internal URL with /api/json per user request
            // Note: If v10 container fails on /api/json, check logs
            const workerReq = new Request("https://internal.cobalt/api/json", {
                method: "POST",
                headers: securityHeaders,
                body: payload
            });

            // Implement 10s Timeout for Binding
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
                // If 1003/530, treat as failure and fallback
                console.warn(`[Download] Service Binding failed: ${res.status} - ${txt}`);
            }
        } catch (e: any) {
             console.warn(`[Download] Service Binding Exception: ${e.message}`);
        }
    } else if (isLocal) {
        console.log("[Download] Localhost detected - Skipping Service Binding");
    }

    // ---------------------------------------------------------
    // 2. Fallback to API_URL or Public Instances
    // ---------------------------------------------------------
    if (!resultResponse) {
        console.log("[Download] Falling back to Public/External Providers");
        
        const FALLBACKS = [
          env?.API_URL ? `${env.API_URL}/api/json` : null, // Use /api/json for consistency
          "https://api.cobalt.tools/api/json", 
          "https://co.wuk.sh/api/json",
          "https://sh.cobalt.tools/api/json"
        ].filter(Boolean) as string[];

        // Filter duplicates and invalid URLs
        const uniqueFallbacks = [...new Set(FALLBACKS)].filter(u => u && u.startsWith("http"));

        for (const instance of uniqueFallbacks) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 12000);

            console.log(`[Download] Trying: ${instance}`);
            
            // Clean URL (remove double slashes)
            const cleanUrl = instance.replace(/([^:]\/)\/+/g, "$1");

            const response = await fetch(cleanUrl, {
              method: "POST",
              headers: securityHeaders, // Use same headers for bypass
              body: payload,
              signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (response.ok) {
                resultResponse = response;
                usedMethod = instance;
                break;
            } else {
                 console.warn(`[Download] ${cleanUrl} returned ${response.status}`);
            }
          } catch (e: any) {
             console.warn(`[Download] ${instance} error: ${e.message}`);
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
