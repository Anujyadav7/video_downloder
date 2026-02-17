import { DurableObject } from "cloudflare:workers";

export interface Env {
  cobalt_image: any;
  cobalt_service: DurableObjectNamespace;
}

export class CobaltContainer extends DurableObject {
  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
  }

  async fetch(request: Request): Promise<Response> {
    try {
      // Direct access to the container
      const response = await this.env.cobalt_image.fetch(request);
      
      // Add CORS headers manually to ensure the browser fallback can read the response
      const newHeaders = new Headers(response.headers);
      newHeaders.set("Access-Control-Allow-Origin", "*");
      newHeaders.set("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
      newHeaders.set("Access-Control-Allow-Headers", "Content-Type, Accept");

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    } catch (err: any) {
      return new Response(`Container Error: ${err.message}`, { 
        status: 502,
        headers: { "Access-Control-Allow-Origin": "*" }
      });
    }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Accept",
        },
      });
    }

    const id = env.cobalt_service.idFromName("global");
    const stub = env.cobalt_service.get(id);
    return await stub.fetch(request);
  },
};
