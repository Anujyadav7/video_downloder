declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: "development" | "production" | "test";
    COBALT_WORKER: {
      fetch: (request: Request | string, init?: RequestInit) => Promise<Response>;
    };
    GROQ_API_KEY: string;
  }
}

declare module "@cloudflare/next-on-pages" {
  export function getRequestContext(): {
    env: {
      COBALT_WORKER: {
        fetch: (request: Request | string, init?: RequestInit) => Promise<Response>;
      };
      COBALT_SERVICE: any;
      GROQ_API_KEY: string;
    };
  };
}
