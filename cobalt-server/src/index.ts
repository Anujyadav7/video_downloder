import { DurableObject } from "cloudflare:workers";

export interface Env {
  COBALT_SERVICE: DurableObjectNamespace<CobaltContainer>;
}

export class CobaltContainer extends DurableObject<Env> {
  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
  }

  async fetch(request: Request): Promise<Response> {
    // Using localhost:9000 which is standard for Cloudflare Containers loopback
    const containerTarget = `http://localhost:9000/`;

    // STRIPPING EVERYTHING: To avoid 1003 internal policy blocks
    const headers = new Headers();
    headers.set("Content-Type", "application/json");
    headers.set("Accept", "application/json");
    headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/123.0.0.0");
    // Explicitly set host to local to avoid WAF interception
    headers.set("Host", "localhost:9000");

    try {
      const body = await request.text();
      const response = await fetch(containerTarget, {
        method: "POST",
        headers: headers,
        body: body,
      });

      const responseText = await response.text();
      
      return new Response(responseText, {
        status: response.status,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        }
      });
    } catch (e: any) {
      return new Response(JSON.stringify({ status: "error", message: e.message }), { status: 502 });
    }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
        return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "*" } });
    }

    try {
      // V10 - Final Production Identity
      const id = env.COBALT_SERVICE.idFromName("production-v10-final");
      const stub = env.COBALT_SERVICE.get(id);
      return await stub.fetch(request);
    } catch (e: any) {
      return new Response(JSON.stringify({ error: "Gateway Fatal" }), { status: 500 });
    }
  }
};
