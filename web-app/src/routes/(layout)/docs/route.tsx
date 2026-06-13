import { createFileRoute, Outlet } from "@tanstack/react-router";
import {
  formatAllDocsMarkdown,
  markdownResponseHeaders,
  shouldServeMarkdown,
} from "./-agent-markdown";
import { DocsMobileHeader, DocsSidebar } from "./_components/docs-sidebar";
import { createServerFn } from "@tanstack/react-start";

const getDocsLayoutData = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getDocsTree } = await import("./doc-manager");
    const tree = await getDocsTree();
    return { tree };
  },
);

const docsLoader = async () => {
  return getDocsLayoutData();
};

export const Route = createFileRoute("/(layout)/docs")({
  server: {
    handlers: {
      GET: async ({ request, next }) => {
        if (!shouldServeMarkdown(request)) {
          return next();
        }

        const { getAllDocs } = await import("./doc-manager");
        const docs = await getAllDocs();
        return new Response(formatAllDocsMarkdown(docs), {
          headers: markdownResponseHeaders,
        });
      },
    },
  },
  loader: docsLoader,
  component: DocsLayout,
});

function DocsLayout() {
  const { tree } = Route.useLoaderData();

  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <DocsMobileHeader tree={tree} />
      <DocsSidebar tree={tree} />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
