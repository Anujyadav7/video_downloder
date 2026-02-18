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
        message: "API available at /api/json"
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    // Proxy Logic
    const containerUrl = new URL(url.pathname + url.search, "http://localhost:9000");

    const newHeaders = new Headers();
    if (request.headers.has("Content-Type")) newHeaders.set("Content-Type", request.headers.get("Content-Type")!);
    if (request.headers.has("Accept")) newHeaders.set("Accept", "application/json"); 
    newHeaders.set("User-Agent", "Cobalt-Worker-Proxy/1.0");

    const proxyRequest = new Request(containerUrl.toString(), {
      method: request.method,
      headers: newHeaders,
      body: request.body,
      redirect: "follow"
    });

    try {
      const response = await fetch(proxyRequest);

      // CRITICAL FIX: Intercept Cloudflare 530/1003 errors from upstream
      // These mean the container is unreachable, but fetch() returns them as valid responses.
      if (response.status === 530 || response.status === 1003) {
         return new Response(JSON.stringify({
            status: "error",
            code: "CONTAINER_CONNECTION_FAILED",
            message: "The internal Cobalt container is unreachable (Status 530/1003). Please check Cloudflare logs."
         }), {
            status: 502,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
         });
      }

      return this.corsResponse(response);

    } catch (e: any) {
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
