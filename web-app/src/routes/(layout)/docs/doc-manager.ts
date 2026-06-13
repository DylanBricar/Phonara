import fm from "front-matter";
import fs from "fs/promises";
import path from "path";
import { z } from "zod";

const docsStorageBase = "/assets/docs";

const getDocsDirectory = () => {
  if (typeof process === "undefined") return null;
  return path.join(process.cwd(), "content/docs");
};

const MetaSchema = z.object({
  title: z.string(),
  pages: z.array(z.string()),
});

const AttributeSchema = z.object({
  title: z.string(),
  description: z.string(),
  keywords: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  coverUrl: z.string().optional(),
  order: z.number().optional(),
  subcategory: z.string().optional(),
  method: z.string().optional(),
  endpoint: z.string().optional(),
  examples: z.record(z.string(), z.string()).optional(),
  results: z.record(z.string(), z.string()).optional(),
  links: z
    .object({
      doc: z.string().optional(),
      api: z.string().optional(),
    })
    .optional(),
});

type DocAttributes = z.infer<typeof AttributeSchema>;

export type DocType = {
  slug: string;
  url: string;
  attributes: DocAttributes;
  content: string;
};

export type DocFolder = {
  name: string;
  slug: string;
  docs: DocType[];
};

export type DocTree = {
  rootDocs: DocType[];
  folders: DocFolder[];
};

async function readMdxFile(
  filePath: string,
  slug: string,
): Promise<DocType | null> {
  try {
    const fileContents = await readDocsFile(filePath);
    if (!fileContents) return null;

    const matter = fm(fileContents);
    const result = AttributeSchema.safeParse(matter.attributes);

    if (!result.success) {
      return null;
    }

    return {
      slug,
      url: `/docs/${slug}`,
      content: matter.body,
      attributes: result.data,
    };
  } catch {
    return null;
  }
}

async function getDocsStorage() {
  if (import.meta.env.DEV) return null;

  try {
    const { useStorage: getStorage } = await import("nitro/storage");
    return getStorage(docsStorageBase);
  } catch {
    return null;
  }
}

async function getDocsKeys(): Promise<string[]> {
  const storage = await getDocsStorage();
  const storageKeys = (await storage?.getKeys().catch(() => [])) ?? [];
  if (storageKeys.length > 0) return storageKeys;

  return getFilesystemDocsKeys();
}

async function readDocsFile(filePath: string): Promise<string | null> {
  const storage = await getDocsStorage();
  const value = await storage?.getItem(filePath).catch(() => null);
  if (typeof value === "string") return value;

  const docsDirectory = getDocsDirectory();
  if (!docsDirectory) return null;

  return fs
    .readFile(path.join(docsDirectory, filePath), "utf8")
    .catch(() => null);
}

function getBaseName(filePath: string): string {
  return filePath.split("/").at(-1) ?? filePath;
}

function getFirstSegment(filePath: string): string | null {
  const [segment, ...rest] = filePath.split("/");
  return rest.length > 0 ? segment : null;
}

function isDirectChild(filePath: string, directory: string): boolean {
  const prefix = directory ? `${directory}/` : "";
  if (!filePath.startsWith(prefix)) return false;

  const relativePath = filePath.slice(prefix.length);
  return relativePath.length > 0 && !relativePath.includes("/");
}

async function getFilesystemDocsKeys(
  directory?: string,
  prefix = "",
): Promise<string[]> {
  const targetDirectory = directory ?? getDocsDirectory();
  if (!targetDirectory) return [];

  const entries = await fs.readdir(targetDirectory, { withFileTypes: true });
  const keys = await Promise.all(
    entries.map(async (entry) => {
      const key = prefix ? `${prefix}/${entry.name}` : entry.name;
      const fullPath = path.join(targetDirectory, entry.name);

      if (entry.isDirectory()) {
        return getFilesystemDocsKeys(fullPath, key);
      }

      return entry.isFile() ? [key] : [];
    }),
  );

  return keys.flat();
}

async function getMetaOrder(dirPath: string): Promise<string[] | null> {
  try {
    const metaPath = dirPath ? `${dirPath}/meta.json` : "meta.json";
    const metaContents = await readDocsFile(metaPath);
    if (!metaContents) return null;

    const meta = MetaSchema.safeParse(JSON.parse(metaContents));
    if (meta.success) {
      return meta.data.pages;
    }
    return null;
  } catch {
    return null;
  }
}

async function getFolderTitle(
  folderPath: string,
  fallback: string,
): Promise<string> {
  try {
    const metaPath = `${folderPath}/meta.json`;
    const metaContents = await readDocsFile(metaPath);
    if (!metaContents) return fallback;

    const meta = JSON.parse(metaContents);
    return meta.title ?? fallback;
  } catch {
    return fallback;
  }
}

async function processFolder(
  folderName: string,
  allKeys: string[],
): Promise<DocFolder> {
  const [folderOrder, folderTitle] = await Promise.all([
    getMetaOrder(folderName),
    getFolderTitle(folderName, folderName),
  ]);

  const mdxFiles = allKeys.filter(
    (file) => file.endsWith(".mdx") && isDirectChild(file, folderName),
  );
  const docsPromises = mdxFiles.map(async (file) => {
    const fileName = getBaseName(file).replace(".mdx", "");
    const slug =
      fileName === "index" ? folderName : `${folderName}/${fileName}`;
    return readMdxFile(file, slug);
  });

  const docsResults = await Promise.all(docsPromises);
  const folderDocs = docsResults.filter((doc): doc is DocType => doc !== null);

  if (folderOrder) {
    folderDocs.sort((a, b) => {
      const aName = a.slug.includes("/") ? a.slug.split("/")[1] : "index";
      const bName = b.slug.includes("/") ? b.slug.split("/")[1] : "index";
      const aIndex = folderOrder.indexOf(aName);
      const bIndex = folderOrder.indexOf(bName);
      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
  }

  return {
    name: folderTitle,
    slug: folderName,
    docs: folderDocs,
  };
}

export async function getDocsTree(): Promise<DocTree> {
  try {
    const allKeys = await getDocsKeys();
    const rootOrder = await getMetaOrder("");

    const directories = Array.from(
      new Set(
        allKeys
          .map(getFirstSegment)
          .filter((segment): segment is string => segment !== null),
      ),
    );
    const mdxFiles = allKeys.filter(
      (file) => file.endsWith(".mdx") && isDirectChild(file, ""),
    );

    const [physicalFolders, rootDocsResults] = await Promise.all([
      Promise.all(
        directories.map(async (folder) => {
          const result = await processFolder(folder, allKeys);
          return result;
        }),
      ),
      Promise.all(
        mdxFiles.map(async (file) => {
          const fileName = getBaseName(file).replace(".mdx", "");
          const slug = fileName === "index" ? "" : fileName;
          return readMdxFile(file, slug);
        }),
      ),
    ]);

    const rootDocs = rootDocsResults.filter(
      (doc): doc is DocType => doc !== null,
    );

    // Group root docs by subcategory to create virtual folders
    const subcategoryGroups: Record<string, DocType[]> = {};
    const docsWithoutSubcategory: DocType[] = [];

    for (const doc of rootDocs) {
      if (doc.attributes.subcategory) {
        const subcategory = doc.attributes.subcategory;
        subcategoryGroups[subcategory] ??= [];
        subcategoryGroups[subcategory].push(doc);
      } else {
        docsWithoutSubcategory.push(doc);
      }
    }

    // Sort docs within each subcategory by order or title
    Object.keys(subcategoryGroups).forEach((key) => {
      subcategoryGroups[key].sort((a, b) => {
        if (
          a.attributes.order !== undefined &&
          b.attributes.order !== undefined
        ) {
          return a.attributes.order - b.attributes.order;
        }
        return a.attributes.title.localeCompare(b.attributes.title);
      });
    });

    // Convert subcategory groups to folders
    const virtualFolders: DocFolder[] = Object.keys(subcategoryGroups)
      .sort((a, b) => a.localeCompare(b))
      .map((subcategory) => ({
        name: subcategory,
        slug: subcategory.toLowerCase().replace(/\s+/g, "-"),
        docs: subcategoryGroups[subcategory],
      }));

    // Combine physical folders and virtual folders
    const allFolders = [...physicalFolders, ...virtualFolders];

    if (rootOrder) {
      docsWithoutSubcategory.sort((a, b) => {
        const aName = a.slug || "index";
        const bName = b.slug || "index";
        const aIndex = rootOrder.indexOf(aName);
        const bIndex = rootOrder.indexOf(bName);
        if (aIndex === -1 && bIndex === -1) return 0;
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });

      allFolders.sort((a, b) => {
        const aIndex = rootOrder.indexOf(a.slug);
        const bIndex = rootOrder.indexOf(b.slug);
        if (aIndex === -1 && bIndex === -1) return 0;
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });
    }

    return { rootDocs: docsWithoutSubcategory, folders: allFolders };
  } catch {
    return { rootDocs: [], folders: [] };
  }
}

export async function getAllDocs(): Promise<DocType[]> {
  const tree = await getDocsTree();
  const allDocs: DocType[] = [...tree.rootDocs];
  for (const folder of tree.folders) {
    allDocs.push(...folder.docs);
  }
  return allDocs;
}

export async function getCurrentDoc(
  slugParts: string[] | undefined,
): Promise<DocType | null> {
  const slug = slugParts?.join("/") ?? "";
  const allDocs = await getAllDocs();
  return allDocs.find((doc) => doc.slug === slug) ?? null;
}

export type DocParams = {
  params: Promise<{ slug?: string[] }>;
};
