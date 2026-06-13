import { createFileRoute } from "@tanstack/react-router";

const convexSiteUrl =
  import.meta.env.VITE_CONVEX_SITE_URL ??
  process.env.VITE_CONVEX_SITE_URL ??
  "";

const proxyToConvex = async (request: Request) => {
  const url = new URL(request.url);
  const target = `${convexSiteUrl}${url.pathname}${url.search}`;

  const init: RequestInit & { duplex?: "half" } = {
    method: request.method,
    headers: request.headers,
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
    init.duplex = "half";
  }

  return fetch(target, init);
};

export const Route = createFileRoute("/api/v1/$")({
  server: {
    handlers: {
      GET: async ({ request }) => proxyToConvex(request),
      POST: async ({ request }) => proxyToConvex(request),
      PUT: async ({ request }) => proxyToConvex(request),
      PATCH: async ({ request }) => proxyToConvex(request),
      DELETE: async ({ request }) => proxyToConvex(request),
      OPTIONS: async ({ request }) => proxyToConvex(request),
    },
  },
});
