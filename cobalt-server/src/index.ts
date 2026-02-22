import { DurableObject } from "cloudflare:workers";

export interface Env {
  COBALT_SERVICE: DurableObjectNamespace<CobaltContainer>;
  API_EXTERNAL_PROXY: string;
}

/**
 * Cobalt v10 Container Controller (Feb 2026 Stable)
 */
export class CobaltContainer extends DurableObject<Env> {
  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
  }

  async fetch(request: Request): Promise<Response> {
    /**
     * TO KILL 1003 ERROR:
     * We MUST use 'localhost' and an explicit 'Host: localhost' header.
     * We also strip all incoming metadata.
     */
    const containerTarget = `http://localhost:9000/`;

    try {
      const body = await request.text();
      
      const response = await fetch(containerTarget, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Host": "localhost",
          "User-Agent": "Internal-Bridge/2026"
        },
        body: body,
      });

      const responseText = await response.text();
      
      if (responseText.includes("1003") || responseText.includes("Direct IP access")) {
         return new Response(JSON.stringify({ 
           status: "error", 
           text: "Loopback Intercepted (1003). Check Host config." 
         }), { status: 502, headers: { "Content-Type": "application/json" } });
      }

      return new Response(responseText, {
        status: response.status,
        headers: { "Content-Type": "application/json" }
      });
    } catch (e: any) {
      return new Response(JSON.stringify({ 
        status: "error", 
        text: `Container Bridge Fatal: ${e.message}` 
      }), { status: 502, headers: { "Content-Type": "application/json" } });
    }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const id = env.COBALT_SERVICE.idFromName("v2026-production-stable");
      const stub = env.COBALT_SERVICE.get(id);
      
      // Zero-Metadata handoff
      const body = await request.text();

      const doRequest = new Request("http://do.internal/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body
      });

      return await stub.fetch(doRequest);
    } catch (e: any) {
      return new Response(JSON.stringify({ 
        status: "error", 
        text: `Worker Bridge Error: ${e.message}` 
      }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
  }
};
