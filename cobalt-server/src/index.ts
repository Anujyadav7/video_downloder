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

    try {
      const body = await request.text();
      const response = await fetch(containerTarget, {
        method: "POST",
        headers: { "Content-Type": "application/json" }, // Bare minimum headers
        body: body,
      });

      const responseText = await response.text();
      return new Response(responseText, {
        status: response.status,
        headers: { "Content-Type": "application/json" }
      });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 502 });
    }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const id = env.COBALT_SERVICE.idFromName("v1"); // Simplified ID
      const stub = env.COBALT_SERVICE.get(id);
      return await stub.fetch(request);
    } catch (e: any) {
      return new Response(JSON.stringify({ error: "Backend Worker Error" }), { status: 500 });
    }
  }
};
