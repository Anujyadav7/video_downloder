import { DurableObject } from "cloudflare:workers";

export interface Env {
  COBALT_SERVICE: DurableObjectNamespace<CobaltContainer>;
}

export class CobaltContainer extends DurableObject<Env> {
  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
  }

  async fetch(request: Request): Promise<Response> {
    const port = "9000"; // Fixed Port 9000 for Docker
    const containerTarget = `http://127.0.0.1:${port}/`;

    // CRITICAL: Cobalt v10 requires EXPLICIT Accept: application/json
    // and mimics a real browser to pass WAF/bot checks.
    const cleanHeaders = new Headers();
    cleanHeaders.set("Content-Type", "application/json");
    cleanHeaders.set("Accept", "application/json");
    cleanHeaders.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36");

    try {
      const body = await request.text();
      console.log(`[V5_STABLE] Proxying to container: ${containerTarget}`);

      const response = await fetch(containerTarget, {
        method: "POST",
        headers: cleanHeaders,
        body: body,
      });

      const responseText = await response.text();
      console.log(`[V5_STABLE] Container Status: ${response.status}`);

      return new Response(responseText, {
        status: response.status,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Accept"
        }
      });

    } catch (e: any) {
      console.error(`[V5_STABLE] Dispatch Error: ${e.message}`);
      return new Response(JSON.stringify({ status: "error", error: { code: "GATEWAY_TIMEOUT", details: e.message } }), { 
        status: 504,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } 
      });
    }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
        return new Response(null, { 
            headers: { 
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Accept"
            } 
        });
    }

    try {
      // Identity V5 for a fresh state (Port 8080 death)
      const id = env.COBALT_SERVICE.idFromName("global-prod-relay-v5-stable");
      const stub = env.COBALT_SERVICE.get(id);
      return await stub.fetch(request);
    } catch (e: any) {
      return new Response(JSON.stringify({ error: "Internal Gateway Error" }), { status: 500 });
    }
  }
};
