import fm from "front-matter";
import fs from "fs/promises";
import path from "path";
import { z } from "zod";

const postsStorageBase = "/assets/posts";

const getPostsDirectory = () => {
  if (typeof process === "undefined") return null;
  return path.join(process.cwd(), "content/posts");
};

const isProductionContent = () => {
  if (typeof process === "undefined") return false;
  return (
    process.env.VERCEL_ENV === "production" ||
    process.env.NODE_ENV === "production"
  );
};

async function getPostsStorage() {
  if (import.meta.env.DEV) return null;

  try {
    const { useStorage: getStorage } = await import("nitro/storage");
    return getStorage(postsStorageBase);
  } catch {
    return null;
  }
}

async function getFilesystemPostKeys(): Promise<string[]> {
  const postsDirectory = getPostsDirectory();
  if (!postsDirectory) return [];

  return fs.readdir(postsDirectory).catch(() => []);
}

async function getPostKeys(): Promise<string[]> {
  const storage = await getPostsStorage();
  const storageKeys = (await storage?.getKeys().catch(() => [])) ?? [];
  if (storageKeys.length > 0) return storageKeys;

  return getFilesystemPostKeys();
}

async function readPostFile(filePath: string): Promise<string | null> {
  const storage = await getPostsStorage();
  const value = await storage?.getItem(filePath).catch(() => null);
  if (typeof value === "string") return value;

  const postsDirectory = getPostsDirectory();
  if (!postsDirectory) return null;

  return fs
    .readFile(path.join(postsDirectory, filePath), "utf8")
    .catch(() => null);
}

const AttributeSchema = z.object({
  title: z.string(),
  description: z.string(),
  keywords: z.array(z.string()),
  status: z.enum(["draft", "published"]),
  coverUrl: z.string(),
  tags: z.array(z.string()).optional(),
  date: z.date(),
});

type PostAttributes = z.infer<typeof AttributeSchema> & {
  date: Date;
};

export type Post = {
  slug: string;
  attributes: PostAttributes;
  content: string;
};

export const getPosts = async (tags?: string[]) => {
  const fileNames = (await getPostKeys()).filter((fileName) =>
    fileName.endsWith(".mdx"),
  );
  const posts: Post[] = [];
  for await (const fileName of fileNames) {
    const fileContents = await readPostFile(fileName);
    if (!fileContents) continue;

    const matter = fm(fileContents);

    const result = AttributeSchema.safeParse(matter.attributes);

    if (!result.success) {
      continue;
    }

    if (isProductionContent() && result.data.status === "draft") {
      continue;
    }

    if (tags) {
      if (!result.data.tags?.some((tag) => tags.includes(tag))) {
        continue;
      }
    }

    posts.push({
      slug: fileName.replace(".mdx", ""),
      content: matter.body,
      attributes: {
        ...result.data,
      },
    });
  }

  return posts;
};

export const getPostsTags = async () => {
  const posts = await getPosts();
  const tags = new Set<string>();
  for (const post of posts) {
    if (!post.attributes.tags) {
      continue;
    }
    for (const tag of post.attributes.tags) {
      tags.add(tag);
    }
  }
  return Array.from(tags);
};

export type PostParams = {
  params: { slug: string };
};

export const getCurrentPost = async (slug: string) => {
  const posts = await getPosts();
  return posts.find((p) => p.slug === slug);
};
