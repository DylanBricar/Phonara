import { createFileRoute } from "@tanstack/react-router";
import { generateLlmsTxt } from "./-llms-content";

export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: async () =>
        new Response(await generateLlmsTxt(), {
          headers: {
            "content-type": "text/plain; charset=utf-8",
          },
        }),
    },
  },
});
