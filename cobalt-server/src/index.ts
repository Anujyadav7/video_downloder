import { DurableObject } from "cloudflare:workers";

export interface Env {
  COBALT_SERVICE: DurableObjectNamespace<CobaltContainer>;
}

export class CobaltContainer extends DurableObject<Env> {
  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
  }

  async fetch(request: Request): Promise<Response> {
    const port = "9000";
    const containerTarget = `http://127.0.0.1:${port}/`;

    // STRIP EVERYTHING: Only send minimal headers required by Cobalt v10
    const headers = new Headers();
    headers.set("Content-Type", "application/json");
    headers.set("Accept", "application/json");
    headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36");

    try {
      const body = await request.text();
      const response = await fetch(containerTarget, {
        method: "POST",
        headers: headers,
        body: body,
      });

      // PURE PASS-THROUGH: Return the exact body from Cobalt
      const responseText = await response.text();
      
      return new Response(responseText, {
        status: response.status,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        }
      });
    } catch (e: any) {
      return new Response(JSON.stringify({ status: "error", error: { code: e.message } }), { status: 500 });
    }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
        return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "*" } });
    }

    try {
      // Use V7 to completely purge any cached 1003 block states
      const id = env.COBALT_SERVICE.idFromName("global-prod-relay-v7-final");
      const stub = env.COBALT_SERVICE.get(id);
      return await stub.fetch(request);
    } catch (e: any) {
      return new Response(JSON.stringify({ error: "Gateway Error" }), { status: 500 });
    }
  }
};
