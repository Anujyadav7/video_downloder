import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, isAudioOnly } = body;
    
    console.log(`[Download] Processing: ${url}`);

    // ---------------------------------------------------------
    // 1. Extract Environment (Comprehensive Check)
    // ---------------------------------------------------------
    let env: any = null;
    
    // Try getRequestContext() (Standard for next-on-pages)
    try {
        const ctx = getRequestContext();
        if (ctx && ctx.env) {
            env = ctx.env;
            console.log("[Download] Env loaded from getRequestContext()");
        }
    } catch (e) { console.log("[Download] getRequestContext unavailable"); }

    // Try request object (User requested method)
    if (!env) {
        env = (request as any).env || (request as any).nextjs?.env;
        if (env) console.log("[Download] Env loaded from request object");
    }

    // fallback to process.env for local dev mocking?
    if (!env) {
        console.warn("[Download] Env not found on request or context. Falling back to process.env (risky)");
        env = process.env;
    }

    // ---------------------------------------------------------
    // 2. Validate Service Binding
    // ---------------------------------------------------------
    const worker = env?.COBALT_WORKER;
    
    if (!worker || typeof worker.fetch !== 'function') {
        console.error("[Download] CRITICAL: Service Binding 'COBALT_WORKER' is missing or invalid.");
        console.log("Details - content of env:", Object.keys(env || {}));
        return NextResponse.json(
            { error: "Service Binding COBALT_WORKER Missing" },
            { status: 500 }
        );
    }

    console.log("[Download] Using Service Binding: COBALT_WORKER");

    // ---------------------------------------------------------
    // 3. Execute Internal Fetch (Bypass Public DNS)
    // ---------------------------------------------------------
    try {
        // "https://internal.cobalt" is dummy; Worker intercepts.
        const workerReq = new Request("https://internal.cobalt/api/json", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                // User Requested UA
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
            },
            body: JSON.stringify({ 
                url, 
                isAudioOnly,
                filenameStyle: "pretty" 
            })
        });

        const res = await worker.fetch(workerReq);
        
        if (res.ok) {
            const data = await res.json();
            return NextResponse.json(data);
        } else {
            const errText = await res.text();
            console.error(`[Download] Worker Returned Error: ${res.status}`);
            console.error(`[Download] Error Body: ${errText}`); // Log full body as requested
            
            return NextResponse.json(
                { 
                    error: `Worker Error ${res.status}`, 
                    details: errText 
                },
                { status: res.status } // Propagate worker status (e.g. 400, 500)
            );
        }

    } catch (e: any) {
        console.error(`[Download] Binding Fetch Logic Failed: ${e.message}`);
        console.error(e.stack);
        return NextResponse.json(
            { error: "Internal Fetch Exception", details: e.message },
            { status: 500 }
        );
    }

  } catch (error: any) {
    console.error("[Download] Critical Handler Error:", error);
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
