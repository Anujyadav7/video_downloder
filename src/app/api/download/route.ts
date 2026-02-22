import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  try {
    const cobaltBody = await request.json();
    if (!cobaltBody.url) {
      return NextResponse.json({ status: "error", error: { code: "invalid.url" } }, { status: 400 });
    }

    const ctx = getRequestContext();
    const env = ctx?.env as any;
    const worker = env?.COBALT_WORKER;

    if (!worker) {
      return NextResponse.json({ 
        status: "error", 
        error: { code: "binding.missing", message: "Service Binding (COBALT_WORKER) not found." } 
      }, { status: 500 });
    }

    /**
     * CLEAN PIPE PROTOCOL:
     * We create a completely new Request object with NO inherited headers.
     * This is the only way to stop Error 1003 in high-security zones.
     */
    const internalRequest = new Request("http://internal.api/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(cobaltBody),
    });

    const fetchResponse = await worker.fetch(internalRequest);
    const responseText = await fetchResponse.text();

    // Check if Cloudflare blocked us internally
    if (responseText.includes("error code: 1003") || responseText.includes("Direct IP access is denied")) {
      return NextResponse.json({ 
        status: "error", 
        error: { 
          code: "cloudflare.1003", 
          message: "Internal Bridge Blocked. Service Binding exists but communication is intercepted." 
        } 
      }, { status: 502 });
    }

    // Try to parse JSON safely
    try {
      const data = JSON.parse(responseText);
      return NextResponse.json(data);
    } catch (e) {
      console.error("Non-JSON Response:", responseText);
      return NextResponse.json({ 
        status: "error", 
        error: { code: "invalid.response", message: "Backend returned non-JSON data." } 
      }, { status: 502 });
    }

  } catch (err: any) {
    return NextResponse.json({ 
      status: "error", 
      error: { code: "gateway.fatal", message: err.message } 
    }, { status: 500 });
  }
}
