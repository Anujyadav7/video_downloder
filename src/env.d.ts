
// Cloudflare Environment Types for Next.js 15 Edge Runtime
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      COBALT_WORKER: {
        fetch: typeof fetch;
      };
      COBALT_SERVICE: {
        idFromName(name: string): any;
        get(id: any): any;
      };
    }
  }
}

export {};
