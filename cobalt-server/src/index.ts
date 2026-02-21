import { DurableObject } from "cloudflare:workers";

export interface Env {
  COBALT_SERVICE: DurableObjectNamespace<CobaltContainer>;
}

export class CobaltContainer extends DurableObject<Env> {
  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
  }

  async fetch(request: Request): Promise<Response> {
    const containerTarget = `http://127.0.0.1:9000/`;

    // STRIPPING HEADERS: This is the ONLY way to stop 403 Forbidden on Cloudflare internal fetches
    const sanitizedHeaders = new Headers();
    sanitizedHeaders.set("Content-Type", "application/json");
    sanitizedHeaders.set("Accept", "application/json");
    sanitizedHeaders.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/123.0.0.0");
    // Standard Host header for container loopback
    sanitizedHeaders.set("Host", "127.0.0.1:9000");

    try {
      const body = await request.text();
      const response = await fetch(containerTarget, {
        method: "POST",
        headers: sanitizedHeaders,
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
      return new Response(JSON.stringify({ status: "error", message: "Container Reachability Error", details: e.message }), { status: 502 });
    }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
        return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "*" } });
    }

    try {
      // V9-Stable ID
      const id = env.COBALT_SERVICE.idFromName("global-prod-relay-v9-github-stable");
      const stub = env.COBALT_SERVICE.get(id);
      return await stub.fetch(request);
    } catch (e: any) {
      return new Response(JSON.stringify({ error: "DO Gateway Error" }), { status: 500 });
    }
  }
};
