import { DurableObject } from "cloudflare:workers";

export interface Env {
  COBALT_SERVICE: DurableObjectNamespace<CobaltContainer>;
  API_EXTERNAL_PROXY: string;
}

/**
 * Cobalt v10 Container Controller (Production V2026 Stable)
 * This Durable Object acts as a secure firewall-safe bridge to the internal container.
 */
export class CobaltContainer extends DurableObject<Env> {
  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
  }

  async fetch(request: Request): Promise<Response> {
    /**
     * CLEAN BRIDGE PATTERN:
     * To avoid 1003, we must NOT pass any incoming headers that might contain 'edge' state.
     * We target 127.0.0.1:9000 which is the internal container loopback.
     */
    const containerTarget = `http://127.0.0.1:9000/`;

    try {
      const body = await request.text();
      
      // Construct a purely internal request
      const response = await fetch(containerTarget, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "User-Agent": "Cobalt-Internal-Bridge/1.0"
        },
        body: body,
      });

      const responseText = await response.text();
      
      // Integrity check for Cloudflare Firewall injection
      if (responseText.includes("1003") || responseText.includes("Direct IP access")) {
         return new Response(JSON.stringify({ 
           status: "error", 
           error: "Internal Firewall Intercepted Container Fetch (1003)." 
         }), { status: 502, headers: { "Content-Type": "application/json" } });
      }

      return new Response(responseText, {
        status: response.status,
        headers: { "Content-Type": "application/json" }
      });
    } catch (e: any) {
      return new Response(JSON.stringify({ 
        status: "error", 
        error: `Bridge Connection Failed: ${e.message}` 
      }), { status: 502, headers: { "Content-Type": "application/json" } });
    }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      // Identity v2026 - Fresh instance to clear any WAF state
      const id = env.COBALT_SERVICE.idFromName("v2026-production-bridge");
      const stub = env.COBALT_SERVICE.get(id);
      
      const body = await request.text();

      // Create a fresh request to hand off to the Durable Object
      // This strips all potential '1003-triggering' headers from the original request
      const doRequest = new Request("http://do.internal/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body
      });

      return await stub.fetch(doRequest);
    } catch (e: any) {
      return new Response(JSON.stringify({ 
        status: "error", 
        error: `Worker Runtime Error: ${e.message}` 
      }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
  }
};
