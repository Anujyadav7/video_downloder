import { DurableObject } from "cloudflare:workers";

export interface Env {
  COBALT_SERVICE: DurableObjectNamespace<CobaltContainer>;
}

export class CobaltContainer extends DurableObject<Env> {
  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
  }

  async fetch(request: Request): Promise<Response> {
    // Cloudflare Edge Containers follow this loopback pattern
    const containerTarget = `http://127.0.0.1:9000/`;

    try {
      const body = await request.text();
      
      const response = await fetch(containerTarget, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Host": "localhost:9000" // Ensure the container recognizes the request
        },
        body: body,
      });

      const responseText = await response.text();
      return new Response(responseText, {
        status: response.status,
        headers: { "Content-Type": "application/json" }
      });
    } catch (e: any) {
      // Return the EXACT error message so we can debug on frontend
      return new Response(JSON.stringify({ 
        status: "error", 
        text: `Container Connection Failed: ${e.message}`
      }), { status: 502, headers: { "Content-Type": "application/json" } });
    }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const id = env.COBALT_SERVICE.idFromName("v16-final-check");
      const stub = env.COBALT_SERVICE.get(id);
      
      // Clean pass-through
      return await stub.fetch(request);
      
    } catch (e: any) {
      return new Response(JSON.stringify({ 
        status: "error", 
        text: `Worker Bridge Error: ${e.message}`
      }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
  }
};
