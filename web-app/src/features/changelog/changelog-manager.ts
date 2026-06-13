import fm from "front-matter";
import fs from "fs/promises";
import path from "path";
import { z } from "zod";

const changelogStorageBase = "/assets/changelog";

const getChangelogDirectory = () => {
  if (typeof process === "undefined") return null;
  return path.join(process.cwd(), "content/changelog");
};

const isProductionContent = () => {
  if (typeof process === "undefined") return false;
  return (
    process.env.VERCEL_ENV === "production" ||
    process.env.NODE_ENV === "production"
  );
};

const AttributeSchema = z.object({
  date: z.coerce.date(),
  version: z.string().optional(),
  title: z.string().optional(),
  image: z.string().nullable().optional(),
  status: z.enum(["draft", "published"]).default("published"),
});

type ChangelogAttributes = z.infer<typeof AttributeSchema>;

export type Changelog = {
  slug: string;
  attributes: ChangelogAttributes;
  content: string;
};

async function getChangelogStorage() {
  if (import.meta.env.DEV) return null;

  try {
    const { useStorage: getStorage } = await import("nitro/storage");
    return getStorage(changelogStorageBase);
  } catch {
    return null;
  }
}

async function getFilesystemChangelogKeys(): Promise<string[]> {
  const changelogDirectory = getChangelogDirectory();
  if (!changelogDirectory) return [];

  return fs.readdir(changelogDirectory).catch(() => []);
}

async function getChangelogKeys(): Promise<string[]> {
  const storage = await getChangelogStorage();
  const storageKeys = (await storage?.getKeys().catch(() => [])) ?? [];
  if (storageKeys.length > 0) return storageKeys;

  return getFilesystemChangelogKeys();
}

async function readChangelogFile(filePath: string): Promise<string | null> {
  const storage = await getChangelogStorage();
  const value = await storage?.getItem(filePath).catch(() => null);
  if (typeof value === "string") return value;

  const changelogDirectory = getChangelogDirectory();
  if (!changelogDirectory) return null;

  return fs
    .readFile(path.join(changelogDirectory, filePath), "utf8")
    .catch(() => null);
}

export const getChangelogs = async (): Promise<Changelog[]> => {
  try {
    const fileNames = await getChangelogKeys();
    const mdxFiles = fileNames.filter((f) => f.endsWith(".mdx"));

    const changelogPromises = mdxFiles.map(async (fileName) => {
      const fileContents = await readChangelogFile(fileName);
      if (!fileContents) return null;

      const matter = fm(fileContents);
      const result = AttributeSchema.safeParse(matter.attributes);

      if (!result.success) {
        return null;
      }

      if (isProductionContent() && result.data.status === "draft") {
        return null;
      }

      return {
        slug: fileName.replace(".mdx", ""),
        content: matter.body,
        attributes: result.data,
      } satisfies Changelog;
    });

    const results = await Promise.all(changelogPromises);
    const changelogs = results.filter((c): c is Changelog => c !== null);

    return changelogs.sort(
      (a, b) =>
        new Date(b.attributes.date).getTime() -
        new Date(a.attributes.date).getTime(),
    );
  } catch {
    return [];
  }
};

export type ChangelogParams = {
  params: Promise<{ slug: string }>;
};

export const getCurrentChangelog = async (
  slug: string,
): Promise<Changelog | undefined> => {
  const changelogs = await getChangelogs();
  return changelogs.find((c) => c.slug === slug);
};
