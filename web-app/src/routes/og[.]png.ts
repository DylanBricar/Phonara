import { SiteConfig } from "@/site-config";
import { createFileRoute } from "@tanstack/react-router";

function getParam(url: URL, key: string, fallback: string) {
  return url.searchParams.get(key) || fallback;
}

export const Route = createFileRoute("/og.png")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { renderOgImage } = await import("@/lib/og-image");
        const url = new URL(request.url);
        const image = await renderOgImage({
          title: getParam(url, "title", SiteConfig.title),
          description: getParam(url, "description", SiteConfig.description),
          label: getParam(url, "label", "SaaS"),
        });

        return new Response(image, {
          headers: {
            "content-type": "image/png",
            "cache-control":
              "public, max-age=31536000, s-maxage=31536000, immutable",
          },
        });
      },
    },
  },
});
