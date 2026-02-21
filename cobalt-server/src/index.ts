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

    // Root / Health Check
    if (url.pathname === "/" && request.method === "GET") {
      return new Response(JSON.stringify({ status: "ok", service: "Cobalt Container Gateway" }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    // Proxy Logic - Target the root of the local container network
    const containerUrl = new URL("/", "http://127.0.0.1:9000");
    
    // Use fresh headers to avoid carrying over Cloudflare internal headers that trigger 1003
    const proxyHeaders = new Headers();
    proxyHeaders.set("Content-Type", "application/json");
    proxyHeaders.set("Accept", "application/json");
    proxyHeaders.set("User-Agent", request.headers.get("User-Agent") || "CobaltProxy/1.0");

    try {
      const bodyText = await request.text();
      console.log(`[DO] Proxying to: ${containerUrl.toString()}`);

      const response = await fetch(containerUrl.toString(), {
        method: "POST",
        headers: proxyHeaders,
        body: bodyText
      });

      const responseText = await response.text();

      // Return with proper CORS headers for the frontend
      return new Response(responseText, {
        status: response.status,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Accept"
        }
      });

    } catch (e: any) {
      console.error(`[DO] Proxy Exception: ${e.message}`);
      return new Response(JSON.stringify({ error: "Container Connection Refused", message: e.message }), { 
        status: 502, 
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } 
      });
    }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Accept"
        }
      });
    }

    try {
      // Use a consistent ID for the global gateway
      const id = env.COBALT_SERVICE.idFromName("cobalt-global-v1");
      const stub = env.COBALT_SERVICE.get(id);
      return await stub.fetch(request);
    } catch (e: any) {
      return new Response(JSON.stringify({ error: "Worker Internal Error", details: e.message }), { 
        status: 500, 
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } 
      });
    }
  }
};
