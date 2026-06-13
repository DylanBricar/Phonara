import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Img,
  Markdown,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { SiteConfig } from "@convex/utils/siteConfig";

export type MarkdownEmailBadgeVariant = "brand" | "dark";

export type MarkdownEmailProps = {
  preview: string;
  markdown: string;
  badgeLabel: string;
  badgeImageUrl?: string | null;
  badgeVariant?: MarkdownEmailBadgeVariant;
};

type MarkdownBlock =
  | { type: "markdown"; content: string }
  | { type: "button"; label: string; url: string };

const buttonLinkPattern =
  /^\[([^\]]+)\]\((\S+)\s+(?:"button"|'button'|"primary-button"|'primary-button')\)$/i;

const splitMarkdownBlocks = (content: string): MarkdownBlock[] => {
  const blocks: MarkdownBlock[] = [];
  const markdownLines: string[] = [];

  const flushMarkdown = () => {
    const markdown = markdownLines.join("\n").trim();
    if (markdown) {
      blocks.push({ type: "markdown", content: markdown });
    }
    markdownLines.length = 0;
  };

  for (const line of content.split("\n")) {
    const buttonMatch = line.match(buttonLinkPattern);
    if (!buttonMatch) {
      markdownLines.push(line);
      continue;
    }

    flushMarkdown();
    blocks.push({
      type: "button",
      label: buttonMatch[1],
      url: buttonMatch[2],
    });
  }

  flushMarkdown();
  return blocks;
};

export function MarkdownEmail({
  preview,
  markdown,
  badgeLabel,
  badgeImageUrl,
  badgeVariant = "brand",
}: MarkdownEmailProps) {
  const normalizedMarkdown = markdown
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .join("\n");
  const blocks = splitMarkdownBlocks(normalizedMarkdown);
  const badgeBackground =
    badgeVariant === "brand" ? SiteConfig.brand.primary : "#0f172a";
  const badgeInitial =
    badgeLabel.trim().charAt(0).toUpperCase() ||
    SiteConfig.title.charAt(0).toUpperCase();
  const renderMarkdown = (content: string) =>
    content.trim() ? (
      <Markdown
        markdownCustomStyles={{
          h1,
          p,
          bold,
          link,
          codeInline,
          codeBlock,
          ul,
          li,
        }}
      >
        {content}
      </Markdown>
    ) : null;

  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={badgeWrap}>
            {badgeImageUrl ? (
              <Img
                alt={`${badgeLabel} logo`}
                height={56}
                src={badgeImageUrl}
                style={badgeImage}
                width={56}
              />
            ) : (
              <Text style={{ ...badge, backgroundColor: badgeBackground }}>
                {badgeInitial}
              </Text>
            )}
          </Section>
          {blocks.map((block, index) =>
            block.type === "button" ? (
              <Section key={`${block.url}-${index}`} style={actionWrap}>
                <Button href={block.url} style={primaryActionButton}>
                  {block.label}
                </Button>
              </Section>
            ) : (
              <Section key={`markdown-${index}`}>
                {renderMarkdown(block.content)}
              </Section>
            ),
          )}
        </Container>
        <Text style={footer}>
          Sent by {SiteConfig.title} - if you weren't expecting this email, you
          can ignore it.
        </Text>
      </Body>
    </Html>
  );
}

const body = {
  backgroundColor: "#f5f5f5",
  color: "#0f172a",
  fontFamily:
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif",
  margin: 0,
  padding: "40px 16px",
};

const container = {
  backgroundColor: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "16px",
  margin: "0 auto",
  maxWidth: "560px",
  padding: "32px 40px 24px",
};

const badgeWrap = {
  margin: "0 0 8px",
  textAlign: "center" as const,
};

const badge = {
  border: "1px solid #e2e8f0",
  borderRadius: "14px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "22px",
  fontWeight: "700",
  height: "56px",
  lineHeight: "56px",
  margin: 0,
  textAlign: "center" as const,
  width: "56px",
};

const badgeImage = {
  border: "1px solid #e2e8f0",
  borderRadius: "9999px",
  display: "inline-block",
  height: "56px",
  objectFit: "cover" as const,
  width: "56px",
};

const h1 = {
  color: "#0f172a",
  fontSize: "24px",
  fontWeight: "700",
  lineHeight: "1.3",
  margin: "16px 0 8px",
  textAlign: "center" as const,
};

const p = {
  color: "#475569",
  fontSize: "16px",
  lineHeight: "1.6",
  margin: "0 0 16px",
  textAlign: "center" as const,
};

const bold = {
  color: "#0f172a",
  fontWeight: "700",
};

const link = {
  color: SiteConfig.brand.primary,
  fontWeight: "600",
  textDecoration: "none",
};

const actionWrap = {
  margin: "24px 0 28px",
  textAlign: "center" as const,
};

const primaryActionButton = {
  backgroundColor: SiteConfig.brand.primary,
  borderRadius: "10px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "16px",
  fontWeight: "700",
  lineHeight: "1",
  padding: "14px 22px",
  textDecoration: "none",
};

const codeInline = {
  backgroundColor: "#f1f5f9",
  borderRadius: "6px",
  color: "#0f172a",
  padding: "2px 5px",
};

const codeBlock = {
  backgroundColor: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "14px",
  color: "#0f172a",
  fontFamily: "'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace",
  fontSize: "32px",
  fontWeight: "700",
  letterSpacing: "8px",
  lineHeight: "1",
  margin: "8px auto 24px",
  padding: "16px 24px",
  textAlign: "center" as const,
};

const ul = {
  color: "#475569",
  fontSize: "16px",
  lineHeight: "1.6",
  margin: "0 0 24px",
  paddingLeft: "24px",
};

const li = {
  color: "#475569",
  fontSize: "16px",
  lineHeight: "1.6",
  margin: "0 0 8px",
};

const footer = {
  color: "#94a3b8",
  fontSize: "12px",
  lineHeight: "1.5",
  margin: "24px 0 0",
  textAlign: "center" as const,
};
