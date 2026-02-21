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

    // Root Check
    if (url.pathname === "/" && request.method === "GET") {
      return new Response(JSON.stringify({
        status: "ok",
        service: "Cobalt Gateway",
        message: "API available at POST /"
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    // Cloudflare Containers share network namespace, so 127.0.0.1 works reliably
    const containerUrl = new URL(url.pathname + url.search, "http://127.0.0.1:9000");

    // CRITICAL: Forward ALL Headers but delete Host to let runtime manage it
    const newHeaders = new Headers(request.headers);
    newHeaders.delete("Host"); 
    newHeaders.set("Accept", "application/json");
    
    console.log(`[Proxy] Forwarding to: ${containerUrl.toString()}`);

    const proxyRequest = new Request(containerUrl.toString(), {
      method: request.method,
      headers: newHeaders,
      body: request.body,
      redirect: "follow"
    });

    try {
      console.log(`[Proxy] Fetching upstream from container...`);
      const response = await fetch(proxyRequest);
      
      // Read response as text first to validate JSON and identify HTML errors
      const responseText = await response.text();
      
      if (responseText.trim().startsWith("<!DOCTYPE html") || responseText.includes("<html")) {
        console.error(`[Proxy] Received HTML instead of JSON: ${responseText.slice(0, 200)}`);
        return new Response(JSON.stringify({
          status: "error",
          code: "UPSTREAM_HTML_ERROR",
          message: "Upstream returned HTML (likely Error 1003/1016). Loop detected or container unreachable."
        }), { 
          status: 502, 
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } 
        });
      }

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
      console.error(`[Proxy] Connection failed: ${e.message}`);
      return new Response(JSON.stringify({ 
         status: "error",
         code: "PROXY_EXCEPTION",
         message: e.message 
      }), { status: 502, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
    }
  }

  corsResponse(response: Response): Response {
    const headers = new Headers(response.headers);
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type, Accept");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: headers
    });
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, GET, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Accept" } });
    if (new URL(request.url).pathname === "/health") return new Response("OK", { status: 200, headers: {"Access-Control-Allow-Origin": "*"} });

    try {
      const id = env.COBALT_SERVICE.idFromName("cobalt-gateway-manager-v2");
      const stub = env.COBALT_SERVICE.get(id);
      return await stub.fetch(request);
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
    }
  }
};
