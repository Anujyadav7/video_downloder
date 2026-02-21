import { DurableObject } from "cloudflare:workers";

export interface Env {
  COBALT_SERVICE: DurableObjectNamespace<CobaltContainer>;
}

export class CobaltContainer extends DurableObject<Env> {
  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
  }

  async fetch(request: Request): Promise<Response> {
    // Try both 127.0.0.1 and localhost for maximum compatibility with Containers
    const containerTarget = `http://127.0.0.1:9000/`;

    // 100% SANITIZED HEADERS: To bypass 403/401 Cloudflare Internal blocks
    const sanitizedHeaders = new Headers();
    sanitizedHeaders.set("Content-Type", "application/json");
    sanitizedHeaders.set("Accept", "application/json");
    // Standard Browser UA is required by many WAFs
    sanitizedHeaders.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36");
    // Crucial: Set Host to 127.0.0.1 to avoid Host Header mismatch 403s
    sanitizedHeaders.set("Host", "127.0.0.1:9000");

    try {
      const body = await request.text();
      
      // Perform the local fetch to the container
      const response = await fetch(containerTarget, {
        method: "POST",
        headers: sanitizedHeaders,
        body: body,
        redirect: "follow"
      });

      const responseText = await response.text();
      
      // If we still get a 403, we need to know if it's our code or Cloudflare
      if (response.status === 403) {
         console.error(`[V8_STABLE] UPSTREAM_403: Container rejected request. Body: ${responseText.slice(0, 100)}`);
      }

      return new Response(responseText, {
        status: response.status,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        }
      });

    } catch (e: any) {
      return new Response(JSON.stringify({ status: "error", error: "Connection Failed", details: e.message }), { status: 502 });
    }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Health Check for debugging
    if (new URL(request.url).pathname === "/health") {
      return new Response("OK", { status: 200 });
    }

    if (request.method === "OPTIONS") {
        return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "*" } });
    }

    try {
      // V8 - Fresh ID to break any 403 / 1003 cached block sessions
      const id = env.COBALT_SERVICE.idFromName("global-prod-relay-v8-final-stable");
      const stub = env.COBALT_SERVICE.get(id);
      return await stub.fetch(request);
    } catch (e: any) {
      return new Response(JSON.stringify({ error: "Gateway Fatal" }), { status: 500 });
    }
  }
};
