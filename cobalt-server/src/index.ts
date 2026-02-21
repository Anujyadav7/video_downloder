import { DurableObject } from "cloudflare:workers";

export interface Env {
  COBALT_SERVICE: DurableObjectNamespace<CobaltContainer>;
  API_PORT?: string; // Picking up from wrangler.jsonc [vars]
}

export class CobaltContainer extends DurableObject<Env> {
  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
  }

  async fetch(request: Request): Promise<Response> {
    // 1. Standardize the Port from Environment or default to 9000
    const port = this.env.API_PORT || "9000";
    
    /**
     * CRITICAL: Cobalt v10 standard image uses '/' as the POST endpoint.
     * Earlier logs confirmed '/api/json' returns a 404. We use the root path.
     */
    const containerTarget = `http://127.0.0.1:${port}/`;

    // 2. Fix 403 Forbidden: Mimic a standard browser User-Agent
    const proxyHeaders = new Headers();
    proxyHeaders.set("Content-Type", "application/json");
    proxyHeaders.set("Accept", "application/json");
    proxyHeaders.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36");

    try {
      const body = await request.text();
      console.log(`[Proxy] Strictly forwarding to: ${containerTarget}`);

      const response = await fetch(containerTarget, {
        method: "POST",
        headers: proxyHeaders,
        body: body,
      });

      const responseText = await response.text();

      // Return the response with strict JSON headers
      return new Response(responseText, {
        status: response.status,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        }
      });

    } catch (e: any) {
      console.error(`[DO Error] Failed to reach container: ${e.message}`);
      return new Response(JSON.stringify({ error: "Container Connection Refused", details: e.message }), { 
        status: 502,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } 
      });
    }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Standard Durable Object Dispatch
    try {
      const id = env.COBALT_SERVICE.idFromName("global-production-v1");
      const stub = env.COBALT_SERVICE.get(id);
      return await stub.fetch(request);
    } catch (e: any) {
      return new Response(JSON.stringify({ error: "Gateway Dispatch Error", details: e.message }), { status: 500 });
    }
  }
};
