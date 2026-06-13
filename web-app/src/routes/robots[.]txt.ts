import { absoluteUrl } from "@/lib/seo";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async () =>
        new Response(
          [
            "User-agent: *",
            "Allow: /",
            "Disallow: /admin/",
            "Disallow: /api/",
            "Disallow: /account/",
            "Disallow: /orgs/",
            "Disallow: /auth/",
            "Disallow: /*?modal=",
            "",
            `Sitemap: ${absoluteUrl("/sitemap.xml")}`,
          ].join("\n"),
          {
            headers: {
              "content-type": "text/plain; charset=utf-8",
              "cache-control": "public, max-age=3600",
            },
          },
        ),
    },
  },
});
