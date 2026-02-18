import { DurableObject } from "cloudflare:workers";

export interface Env {
  COBALT_SERVICE: DurableObjectNamespace<CobaltContainer>;
}

export class CobaltContainer extends DurableObject<Env> {
  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    // 2026 Fix: Handle Root Path explicitly to avoid "Direct IP" errors on browser visit
    if (url.pathname === "/" && request.method === "GET") {
      return new Response(JSON.stringify({
        status: "ok",
        service: "Cobalt v10 Container",
        version: "1.0.0",
        message: "Container is running. functionality is available at /api/json"
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    // Proxy everything else to the sidecar
    const containerUrl = new URL(url.pathname + url.search, "http://127.0.0.1:9000");

    const newHeaders = new Headers();
    // Only forward essential headers to avoid Edge Loops
    if (request.headers.has("Content-Type")) newHeaders.set("Content-Type", request.headers.get("Content-Type")!);
    if (request.headers.has("Accept")) newHeaders.set("Accept", request.headers.get("Accept")!);
    if (request.headers.has("Authorization")) newHeaders.set("Authorization", request.headers.get("Authorization")!);
    
    const containerRequest = new Request(containerUrl.toString(), {
        method: request.method,
        headers: newHeaders,
        body: request.body,
        redirect: "manual"
    });

    try {
      const response = await fetch(containerRequest);
      
      const responseHeaders = new Headers(response.headers);
      responseHeaders.set("Access-Control-Allow-Origin", "*");
      responseHeaders.set("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
      responseHeaders.set("Access-Control-Allow-Headers", "Content-Type, Accept");

      return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders
      });

    } catch (err: any) {
      return new Response(JSON.stringify({ 
          status: "error", 
          text: `Sidecar Proxy Error: ${err.message}` 
      }), { 
          status: 502,
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*" 
          }
      });
    }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, GET, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Accept" } });
    }
    
    const url = new URL(request.url);
    if (url.pathname === "/health") {
       return new Response("Worker Gateway OK", { status: 200, headers: {"Access-Control-Allow-Origin": "*"} });
    }

    try {
      const id = env.COBALT_SERVICE.idFromName("global-prod-sidecar-v3");
      const stub = env.COBALT_SERVICE.get(id);
      return await stub.fetch(request);
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
    }
  }
};
