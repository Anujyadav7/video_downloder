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
    let resultResponse: Response | null = null;

    // ---------------------------------------------------------
    // 1. Try Service Binding (Priority)
    // ---------------------------------------------------------
    if (worker && typeof worker.fetch === 'function') {
        console.log("[Download] Using Service Binding: COBALT_WORKER");
        try {
            // CRITICAL FIX: Cobalt v10 Container expects POST request at ROOT '/'
            // Previous '/api/json' was causing 404/405 errors
            const workerReq = new Request("https://cobalt-server/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                    // Removed extra security headers that were causing issues
                },
                body: JSON.stringify({ 
                    url, 
                    isAudioOnly,
                    filenameStyle: "pretty" 
                })
            });

            const res = await worker.fetch(workerReq);
            
            if (res.ok) {
                resultResponse = res;
            } else {
                const errText = await res.text();
                console.warn(`[Download] Service Binding failed: ${res.status} - ${errText}`);
            }
        } catch (e: any) {
             console.warn(`[Download] Service Binding Exception: ${e.message}`);
        }
    }

    // ---------------------------------------------------------
    // 2. Fallback to Public Instances
    // ---------------------------------------------------------
    if (!resultResponse) {
        console.log("[Download] Falling back to Public Providers");
        
        // Public instances use /api/json (v7/compat API)
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
                "Content-Type": "application/json",
                "Accept": "application/json"
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
                resultResponse = response;
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
