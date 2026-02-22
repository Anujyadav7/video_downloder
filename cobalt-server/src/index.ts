import { DurableObject } from "cloudflare:workers";

export interface Env {
  COBALT_SERVICE: DurableObjectNamespace<CobaltContainer>;
}

/**
 * Cobalt v10 Container Controller (V16-Ultra-Clean Feb 2026)
 * Strictly isolates the internal Docker bridge to kill Error 1003.
 */
export class CobaltContainer extends DurableObject<Env> {
  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
  }

  async fetch(request: Request): Promise<Response> {
    /**
     * TO KILL 1003:
     * 1. No 'localhost' (prevents DNS resolution overhead/leaks).
     * 2. No 'Host' header (allows Cloudflare to use the internal bridge host).
     * 3. Fresh Headers constructor.
     */
    const containerTarget = `http://127.0.0.1:9000/`;

    try {
      const body = await request.arrayBuffer();
      
      const cleanHeaders = new Headers();
      cleanHeaders.set("Content-Type", "application/json");
      cleanHeaders.set("Accept", "application/json");

      const response = await fetch(containerTarget, {
        method: "POST",
        headers: cleanHeaders,
        body: body,
        // MUST OMIT CREDENTIALS for internal container bridge
        credentials: 'omit',
        redirect: 'manual'
      } as any);

      const responseText = await response.text();
      
      // Safety check for HTML blocks
      if (responseText.includes("1003") || responseText.includes("<!DOCTYPE")) {
          return new Response(JSON.stringify({ 
            status: "error", 
            text: "Firewall Block (1003) detected at the Container Bridge level." 
          }), { status: 502, headers: { "Content-Type": "application/json" } });
      }

      return new Response(responseText, {
        status: response.status,
        headers: { "Content-Type": "application/json" }
      });
    } catch (e: any) {
      return new Response(JSON.stringify({ 
        status: "error", 
        text: `Container Bridge Error: ${e.message}`
      }), { status: 502, headers: { "Content-Type": "application/json" } });
    }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      // Identity v16 - Fresh hash to purge old session stickiness
      const id = env.COBALT_SERVICE.idFromName("v16-production-ultra-stable");
      const stub = env.COBALT_SERVICE.get(id);
      
      const body = await request.arrayBuffer();
      
      /**
       * ZERO-IDENTITY RECONSTRUCTION:
       * We create a request that has NEVER seen a browser header.
       */
      const tunnelRequest = new Request("http://do.internal/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body
      });

      return await stub.fetch(tunnelRequest);
      
    } catch (e: any) {
      return new Response(JSON.stringify({ 
        status: "error", 
        text: `Bridge Fatal Error: ${e.message}`
      }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
  }
};
