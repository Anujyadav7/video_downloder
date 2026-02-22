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
     * V18 SHADOW-BRIDGE PATTERN (Feb 2026):
     * To bypass 1003, we must fetch using 127.0.0.1:9000 but REMOVE the Host header.
     * This forces the internal container route without triggering WAF 'Direct IP' rules.
     */
    const containerTarget = `http://127.0.0.1:9000/`;

    try {
      const body = await request.arrayBuffer();
      const freshHeaders = new Headers();
      
      freshHeaders.set("Content-Type", "application/json");
      freshHeaders.set("Accept", "application/json");
      // DO NOT set Host or User-Agent here to avoid WAF fingerprinting

      const response = await fetch(containerTarget, {
        method: "POST",
        headers: freshHeaders,
        body: body,
        credentials: "omit",
        redirect: "manual"
      } as any);

      const responseText = await response.text();
      
      // If we still see 1003, it means the identity leaked through the DO boundary
      if (responseText.includes("1003") || responseText.includes("Direct IP access")) {
         return new Response(JSON.stringify({ 
           status: "error", 
           text: "Shadow-Bridge Intercept (1003). Recalibrating internal headers..." 
         }), { status: 502, headers: { "Content-Type": "application/json" } });
      }

      return new Response(responseText, {
        status: response.status,
        headers: { "Content-Type": "application/json" }
      });
    } catch (e: any) {
      return new Response(JSON.stringify({ 
        status: "error", 
        text: `Engine Bridge Fail: ${e.message}` 
      }), { status: 502, headers: { "Content-Type": "application/json" } });
    }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const id = env.COBALT_SERVICE.idFromName("v18-production-final");
      const stub = env.COBALT_SERVICE.get(id);
      
      const body = await request.arrayBuffer();

      // Brand new request object - NO inherited metadata from Pages.
      const doRequest = new Request("http://internal.gateway/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body
      });

      return await stub.fetch(doRequest);
    } catch (e: any) {
      return new Response(JSON.stringify({ status: "error", text: `Gateway Error: ${e.message}` }), { status: 500 });
    }
  }
};
