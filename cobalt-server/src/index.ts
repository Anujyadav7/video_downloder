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
     * TO FIX 1003 (Direct IP Access Denied):
     * We MUST use 'localhost' and explicitly set the Host header.
     * We also skip any headers from the incoming request.
     */
    const containerTarget = `http://localhost:9000/`;

    try {
      const body = await request.text();
      const response = await fetch(containerTarget, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Host": "localhost" // Crucial for container loopback
        },
        body: body,
      });

      const responseText = await response.text();
      return new Response(responseText, {
        status: response.status,
        headers: { "Content-Type": "application/json" }
      });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 502 });
    }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      /**
       * AGGRESSIVE HEADER PURGING:
       * If we pass the 'request' object directly, it carries CF-Ray and IP 
       * headers from the browser which trigger the 1003 Firewall block.
       */
      const id = env.COBALT_SERVICE.idFromName("v14-final-clean");
      const stub = env.COBALT_SERVICE.get(id);
      
      const body = await request.text();
      
      // We reconstruct a BARE-BONES request
      const cleanInternalRequest = new Request("http://internal.tunnel/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body
      });

      return await stub.fetch(cleanInternalRequest);
    } catch (e: any) {
      return new Response(JSON.stringify({ error: "Backend Worker Error", details: e.message }), { status: 500 });
    }
  }
};
