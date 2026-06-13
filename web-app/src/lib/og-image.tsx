import { Resvg } from "@resvg/resvg-js";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import satori from "satori";
import { SiteConfig } from "@/site-config";

export type OgImageInput = {
  title: string;
  description?: string;
  label?: string;
};

const OG_IMAGE_WIDTH = 1200;
const OG_IMAGE_HEIGHT = 630;
const FONT_DIR = join(process.cwd(), "public", "fonts");
const ogTheme = SiteConfig.brand.ogImage;

const fontData = Promise.all([
  readFile(join(FONT_DIR, "Geist-Bold.otf")),
  readFile(join(FONT_DIR, "Geist-SemiBold.otf")),
]);

function normalizeText(value: string | undefined, fallback: string, max = 140) {
  const cleaned = (value ?? fallback).replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 1).trim()}...`;
}

function OgImageCard({ title, description, label }: Required<OgImageInput>) {
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        width: OG_IMAGE_WIDTH,
        height: OG_IMAGE_HEIGHT,
        overflow: "hidden",
        background: ogTheme.background,
        color: ogTheme.foreground,
        fontFamily: "Geist",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 72,
          top: 0,
          width: 1,
          height: OG_IMAGE_HEIGHT,
          background: ogTheme.border,
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 72,
          top: 0,
          width: 1,
          height: OG_IMAGE_HEIGHT,
          background: ogTheme.border,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 72,
          right: 72,
          bottom: 58,
          height: 2,
          background: SiteConfig.brand.primary,
        }}
      />

      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          padding: "58px 88px 92px 88px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: 29,
            fontWeight: 700,
            letterSpacing: -0.7,
            color: ogTheme.foreground,
          }}
        >
          <span>{SiteConfig.title}</span>
          <span
            style={{
              marginLeft: 12,
              color: ogTheme.accent,
              letterSpacing: 1.6,
              textTransform: "uppercase",
              fontSize: 21,
            }}
          >
            {label}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flex: 1,
            width: 950,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: title.length > 68 ? 50 : 61,
              fontWeight: 700,
              lineHeight: 1.08,
              letterSpacing: -2,
              color: ogTheme.foreground,
            }}
          >
            {title}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 30,
              maxWidth: 900,
              fontSize: 34,
              fontWeight: 600,
              lineHeight: 1.28,
              letterSpacing: -0.8,
              color: ogTheme.mutedForeground,
            }}
          >
            {description}
          </div>
        </div>
      </div>
    </div>
  );
}

export async function renderOgImage(input: OgImageInput) {
  const [bold, semiBold] = await fontData;
  const title = normalizeText(input.title, SiteConfig.title, 92);
  const description = normalizeText(
    input.description,
    SiteConfig.description,
    118,
  );
  const label = normalizeText(input.label, "SaaS", 18).toUpperCase();

  const svg = await satori(
    <OgImageCard title={title} description={description} label={label} />,
    {
      width: OG_IMAGE_WIDTH,
      height: OG_IMAGE_HEIGHT,
      fonts: [
        {
          name: "Geist",
          data: bold,
          weight: 700,
          style: "normal",
        },
        {
          name: "Geist",
          data: semiBold,
          weight: 600,
          style: "normal",
        },
      ],
    },
  );

  const png = new Resvg(svg, {
    fitTo: {
      mode: "width",
      value: OG_IMAGE_WIDTH,
    },
    background: ogTheme.background,
  })
    .render()
    .asPng();

  const image = new ArrayBuffer(png.byteLength);
  new Uint8Array(image).set(png);
  return image;
}
