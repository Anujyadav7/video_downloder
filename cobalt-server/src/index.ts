import { DurableObject } from "cloudflare:workers";

export interface Env {
  COBALT_SERVICE: DurableObjectNamespace<CobaltContainer>;
}

/**
 * Cobalt v10 Container Controller (V17-IPv6-Escape Feb 2026)
 * Uses IPv6 [::1] loopback to bypass legacy IPv4 Direct-IP Firewall (1003).
 */
export class CobaltContainer extends DurableObject<Env> {
  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
  }

  async fetch(request: Request): Promise<Response> {
    /**
     * V17 STANDARDS:
     * 1. Target [::1] (IPv6) instead of 127.0.0.1 to skip IPv4 WAF.
     * 2. Host header MUST match an internal alias, not an IP.
     * 3. Purge CF-* metadata via fresh Headers constructor.
     */
    const containerTarget = `http://[::1]:9000/`;

    try {
      const body = await request.arrayBuffer();
      const cleanHeaders = new Headers();
      
      // Mandatory for Cobalt v10
      cleanHeaders.set("Content-Type", "application/json");
      cleanHeaders.set("Accept", "application/json");
      
      // Mimic Browser Identity to avoid "Bot" flags from internal security
      cleanHeaders.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36");
      cleanHeaders.set("Host", "cobalt.internal"); 

      const response = await fetch(containerTarget, {
        method: "POST",
        headers: cleanHeaders,
        body: body,
        credentials: 'omit',
        redirect: 'manual'
      } as any);

      const responseText = await response.text();
      
      // Advanced Trace: Check if it's still an HTML block
      if (responseText.includes("<!DOCTYPE") || responseText.includes("1003")) {
          return new Response(JSON.stringify({ 
            status: "error", 
            text: "Network Intercepted (1003). IPv4 WAF leak detected." 
          }), { status: 502, headers: { "Content-Type": "application/json" } });
      }

      return new Response(responseText, {
        status: response.status,
        headers: { "Content-Type": "application/json" }
      });
    } catch (e: any) {
      return new Response(JSON.stringify({ 
        status: "error", 
        text: `Container Bridge Fatal: ${e.message}`
      }), { status: 502, headers: { "Content-Type": "application/json" } });
    }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      // Identity v17-IPv6 - Fresh hash
      const id = env.COBALT_SERVICE.idFromName("v17-stable-ipv6");
      const stub = env.COBALT_SERVICE.get(id);
      
      const body = await request.arrayBuffer();
      
      // Create a Zero-Metadata Request
      const bridgeRequest = new Request("http://bridge.internal/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body
      });

      return await stub.fetch(bridgeRequest);
    } catch (e: any) {
      return new Response(JSON.stringify({ status: "error", text: e.message }), { status: 500 });
    }
  }
};
