import { DurableObject } from "cloudflare:workers";

export interface Env {
  COBALT_SERVICE: DurableObjectNamespace<CobaltContainer>;
  API_URL?: string;
}

export class CobaltContainer extends DurableObject<Env> {
  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // GET / -> Health Check
    if (request.method === "GET") {
      return new Response(JSON.stringify({ status: "ok", message: "Cobalt Container Ready" }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    // POST / -> Proxy to Container
    // Use IP strictly to avoid localhost/IPv6 mismatch inside the worker runtime
    const containerTarget = "http://127.0.0.1:9000/";

    // EXTREME FIX for Error 1003: 
    // Create a fresh set of headers to forward ONLY what's needed.
    // Cloudflare internal headers from the binding call can trigger 1003 if they reach the container layer.
    const proxyHeaders = new Headers();
    proxyHeaders.set("Content-Type", "application/json");
    proxyHeaders.set("Accept", "application/json");
    proxyHeaders.set("User-Agent", request.headers.get("User-Agent") || "CobaltProxy/1.0");

    try {
      const body = await request.text();
      console.log(`[DO] Proxying request to container at ${containerTarget}`);

      const response = await fetch(containerTarget, {
        method: "POST",
        headers: proxyHeaders,
        body: body
      });

      const responseText = await response.text();

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
      console.error(`[DO] Proxy Error: ${e.message}`);
      return new Response(JSON.stringify({ error: "Internal Fetch Failed", details: e.message }), { 
        status: 502, 
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } 
      });
    }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // 1. Handle CORS Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Accept"
        }
      });
    }

    // 2. Health check route
    if (new URL(request.url).pathname === "/health") {
      return new Response("OK", { status: 200 });
    }

    try {
      // 3. Forward to the Container-bound Durable Object
      // Use a fixed name for the DO instance to ensure keep-alive performance
      const id = env.COBALT_SERVICE.idFromName("global-v2");
      const stub = env.COBALT_SERVICE.get(id);
      
      // Perform the fetch on the stub
      return await stub.fetch(request);
      
    } catch (e: any) {
      console.error(`[Worker] Root Error: ${e.message}`);
      return new Response(JSON.stringify({ error: "Worker Dispatch Error", details: e.message }), { 
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }
  }
};
