import { DurableObject } from "cloudflare:workers";

export interface Env {
  COBALT_SERVICE: DurableObjectNamespace<CobaltContainer>;
}

export class CobaltContainer extends DurableObject<Env> {
  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
  }

  async fetch(request: Request): Promise<Response> {
    /**
     * V15 SOCKET BYPASS:
     * Using 127.0.0.1:9000 is the most direct route.
     * CRITICAL: We DO NOT pass any Host header. 
     * Cloudflare internal container bridge handles authentication via service identity.
     */
    const containerTarget = `http://127.0.0.1:9000/`;

    try {
      const body = await request.arrayBuffer(); // Use buffer to prevent encoding issues
      
      const response = await fetch(containerTarget, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "User-Agent": "Internal-DO-Relay"
        },
        body: body,
      });

      const responseText = await response.text();
      
      // If container itself returns 1003 (very rare but possible), we catch it
      if (responseText.includes("1003")) {
          throw new Error("Container Bridge Security Intercept");
      }

      return new Response(responseText, {
        status: response.status,
        headers: { "Content-Type": "application/json" }
      });
    } catch (e: any) {
      console.error("[DO_FETCH_ERROR]", e.message);
      return new Response(JSON.stringify({ 
        status: "error", 
        error: { code: "container.link.failure", message: e.message } 
      }), { status: 502, headers: { "Content-Type": "application/json" } });
    }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      /**
       * IDENTITY V15: Fresh ID to bypass old WAF session pools.
       */
      const id = env.COBALT_SERVICE.idFromName("v15-production-clean");
      const stub = env.COBALT_SERVICE.get(id);
      
      const body = await request.arrayBuffer();
      
      // Bare minimum internal request
      return await stub.fetch("http://do.internal/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body
      });
      
    } catch (e: any) {
      return new Response(JSON.stringify({ 
        status: "error", 
        error: { code: "bridge.fatal", message: e.message } 
      }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
  }
};
