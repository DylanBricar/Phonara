import { handler } from "@/lib/auth-server";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async ({ request }) => handler(request),
      POST: async ({ request }) => handler(request),
    },
  },
});
