import { SiteConfig } from "@/site-config";
import type { DocType } from "./doc-manager";

const MARKDOWN_USER_AGENTS = [
  "curl",
  "wget",
  "httpie",
  "python-requests",
  "go-http-client",
  "node-fetch",
  "undici",
  "axios",
  "postman",
  "insomnia",
  "bun/",
  "deno",
];

export const markdownResponseHeaders = {
  "content-type": "text/markdown; charset=utf-8",
  vary: "accept, user-agent, sec-fetch-dest, sec-fetch-mode",
};

export function shouldServeMarkdown(request: Request): boolean {
  const accept = request.headers.get("accept")?.toLowerCase() ?? "";
  if (accept.includes("text/markdown") || accept.includes("text/plain")) {
    return true;
  }

  if (accept.includes("text/html")) {
    return false;
  }

  const userAgent = request.headers.get("user-agent")?.toLowerCase() ?? "";
  if (MARKDOWN_USER_AGENTS.some((agent) => userAgent.includes(agent))) {
    return true;
  }

  const fetchDest = request.headers.get("sec-fetch-dest");
  const fetchMode = request.headers.get("sec-fetch-mode");
  return !userAgent && fetchDest !== "document" && fetchMode !== "navigate";
}

function fencedCode(language: string, code: string): string {
  return `\`\`\`${language}\n${code.trim()}\n\`\`\``;
}

export function formatDocMarkdown(doc: DocType): string {
  const sections = [
    `# ${doc.attributes.title}`,
    doc.attributes.description,
    `URL: ${SiteConfig.prodUrl}/docs/${doc.slug}`,
  ].filter(Boolean);

  if (doc.attributes.method || doc.attributes.endpoint) {
    sections.push(
      [
        "## API",
        doc.attributes.method ? `Method: ${doc.attributes.method}` : "",
        doc.attributes.endpoint ? `Endpoint: ${doc.attributes.endpoint}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  sections.push(doc.content.trim());

  if (doc.attributes.examples) {
    sections.push(
      [
        "## Examples",
        ...Object.entries(doc.attributes.examples).map(([language, code]) =>
          [`### ${language}`, fencedCode(language, code)].join("\n\n"),
        ),
      ].join("\n\n"),
    );
  }

  if (doc.attributes.results) {
    sections.push(
      [
        "## Results",
        ...Object.entries(doc.attributes.results).map(([name, code]) =>
          [`### ${name}`, fencedCode("json", code)].join("\n\n"),
        ),
      ].join("\n\n"),
    );
  }

  return `${sections.join("\n\n")}\n`;
}

export function formatAllDocsMarkdown(docs: DocType[]): string {
  const sortedDocs = [...docs].sort((a, b) => {
    if (a.attributes.order !== undefined && b.attributes.order !== undefined) {
      return a.attributes.order - b.attributes.order;
    }
    return a.attributes.title.localeCompare(b.attributes.title);
  });

  const index = sortedDocs
    .map(
      (doc) =>
        `- [${doc.attributes.title}](${SiteConfig.prodUrl}/docs/${doc.slug}) - ${doc.attributes.description}`,
    )
    .join("\n");

  const content = sortedDocs
    .map((doc) => `---\n\n${formatDocMarkdown(doc).trim()}`)
    .join("\n\n");

  return [
    `# ${SiteConfig.title} Documentation`,
    SiteConfig.description,
    `Base URL: ${SiteConfig.prodUrl}`,
    "## Documentation Index",
    index,
    "## Full Documentation",
    content,
  ].join("\n\n");
}
