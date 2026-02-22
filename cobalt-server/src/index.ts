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
     * INTERNAL CONTAINER COMMUNICATION
     * For Cloudflare Containers, the application inside the container 
     * listens on localhost:9000 by default. This is internal DO traffic.
     */
    const containerTarget = `http://127.0.0.1:9000/`;

    // Strip external metadata to prevent Cloudflare 1003/403 blocks
    const sanitizedHeaders = new Headers();
    sanitizedHeaders.set("Content-Type", "application/json");
    sanitizedHeaders.set("Accept", "application/json");
    sanitizedHeaders.set("User-Agent", "FastVideoSave-Engine/1.0");
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
          "Access-Control-Allow-Origin": "*" 
        }
      });
    } catch (e: any) {
      return new Response(JSON.stringify({ 
        status: "error", 
        error: { code: "container.unreachable", message: e.message } 
      }), { status: 502 });
    }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    /**
     * SERVICE BINDING ENTRY POINT
     * Internal requests coming from the Pages app via COBALT_WORKER.fetch()
     * will arrive here. We route them directly to the Durable Object.
     */
    if (request.method === "OPTIONS") {
        return new Response(null, { 
          headers: { 
            "Access-Control-Allow-Origin": "*", 
            "Access-Control-Allow-Methods": "POST, OPTIONS", 
            "Access-Control-Allow-Headers": "*" 
          } 
        });
    }

    try {
      // Direct DO Routing to ensure persistent container state
      const id = env.COBALT_SERVICE.idFromName("production-stable-v1");
      const stub = env.COBALT_SERVICE.get(id);
      return await stub.fetch(request);
    } catch (e: any) {
      console.error("[SERVICE BINDING FATAL]", e);
      return new Response(JSON.stringify({ 
        status: "error", 
        error: { code: "service.binding.error", message: e.message } 
      }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
  }
};
