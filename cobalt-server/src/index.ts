import { DurableObject } from "cloudflare:workers";

export interface Env {
  COBALT_SERVICE: DurableObjectNamespace<CobaltContainer>;
}

export class CobaltContainer extends DurableObject<Env> {
  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/" && request.method === "GET") {
      return new Response(JSON.stringify({
        status: "ok",
        service: "Cobalt Container Proxy",
        target: "localhost:80"
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    // Attempt connection to the container sidecar
    // We try localhost:80 (standard) and localhost:9000 (Cobalt default)
    // Using simple fetch to avoid complex resolving issues
    const containerUrl80 = new URL(url.pathname + url.search, "http://localhost:80");
    const containerUrl9000 = new URL(url.pathname + url.search, "http://localhost:9000");

    // Clean headers 
    const newHeaders = new Headers();
    if (request.headers.has("Content-Type")) newHeaders.set("Content-Type", request.headers.get("Content-Type")!);
    if (request.headers.has("Accept")) newHeaders.set("Accept", "application/json"); 

    const req80 = new Request(containerUrl80.toString(), {
      method: request.method,
      headers: newHeaders,
      body: request.body,
      redirect: "follow"
    });

    try {
      // Primary Attempt: Port 80 (Cloudflare Standard)
      const res = await fetch(req80);
      return this.corsResponse(res);
    } catch (e: any) {
      console.log(`Port 80 failed: ${e.message}. Trying 9000...`);
      // Secondary Attempt: Port 9000 (Cobalt Default)
      try {
        const req9000 = new Request(containerUrl9000.toString(), {
          method: request.method,
          headers: newHeaders,
          body: request.body,
          redirect: "follow"
        });
        const res2 = await fetch(req9000);
        return this.corsResponse(res2);
      } catch (e2: any) {
        return new Response(JSON.stringify({ 
           error: "Container Unreachable", 
           details: `Port 80: ${e.message}, Port 9000: ${e2.message}` 
        }), { status: 502, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
      }
    }
  }

  corsResponse(response: Response): Response {
    const headers = new Headers(response.headers);
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type, Accept");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: headers
    });
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, GET, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Accept" } });
    if (new URL(request.url).pathname === "/health") return new Response("OK", { status: 200, headers: {"Access-Control-Allow-Origin": "*"} });

    try {
      const id = env.COBALT_SERVICE.idFromName("global-prod-sidecar-v5");
      const stub = env.COBALT_SERVICE.get(id);
      return await stub.fetch(request);
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
    }
  }
};
