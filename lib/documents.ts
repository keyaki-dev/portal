import fs from "fs";
import path from "path";
import matter from "gray-matter";

const DOCS_DIR = path.join(process.cwd(), "documents");
const CACHE_DIR = path.join(process.cwd(), ".docs-cache");

export type DocType = "md" | "html";

export interface DocMeta {
  slug: string[];
  title: string;
  type: DocType;
  folder: string;
  relativePath: string;
  updatedAt: string;
}

function walkDir(dir: string, base: string = dir): DocMeta[] {
  const results: DocMeta[] = [];

  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name.startsWith("_")) continue;

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      results.push(...walkDir(fullPath, base));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (ext !== ".md" && ext !== ".html") continue;

      const relativePath = path.relative(base, fullPath);
      const slug = relativePath.replace(/\\/g, "/").split("/");
      const type: DocType = ext === ".html" ? "html" : "md";
      const folder = path.dirname(relativePath) === "." ? "" : path.dirname(relativePath).replace(/\\/g, "/");

      const stat = fs.statSync(fullPath);
      let title = path.basename(entry.name, ext);

      if (type === "md") {
        try {
          const raw = fs.readFileSync(fullPath, "utf-8");
          const { data } = matter(raw);
          if (data.title) title = data.title;
        } catch {}
      }

      results.push({
        slug,
        title,
        type,
        folder,
        relativePath,
        updatedAt: stat.mtime.toISOString().slice(0, 10),
      });
    }
  }

  return results;
}

type CacheEntry = {
  relativePath: string;
  safeKey: string;
  slug: string[];
  title: string;
  type: DocType;
  folder: string;
  updatedAt: string;
};

function isCacheAvailable(): boolean {
  return fs.existsSync(path.join(CACHE_DIR, "_index.json"));
}

function readCacheIndex(): CacheEntry[] {
  return JSON.parse(fs.readFileSync(path.join(CACHE_DIR, "_index.json"), "utf-8"));
}

function readCacheContent(safeKey: string): string {
  const data = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, safeKey + ".json"), "utf-8"));
  return data.content as string;
}

export function getAllDocuments(): DocMeta[] {
  if (isCacheAvailable()) {
    return readCacheIndex().map((e) => ({
      slug: e.slug,
      title: e.title,
      type: e.type,
      folder: e.folder,
      relativePath: e.relativePath,
      updatedAt: e.updatedAt,
    }));
  }
  return walkDir(DOCS_DIR).sort((a, b) => {
    if (a.folder !== b.folder) return a.folder.localeCompare(b.folder, "ja");
    return a.title.localeCompare(b.title, "ja");
  });
}

export function getDocumentBySlug(slug: string[]): { meta: DocMeta; content: string } | null {
  const relativePath = slug.join("/");

  if (isCacheAvailable()) {
    const index = readCacheIndex();
    const entry = index.find((e) => e.relativePath === relativePath);
    if (!entry) return null;
    const raw = readCacheContent(entry.safeKey);
    let content = raw;
    let title = entry.title;
    if (entry.type === "md") {
      const parsed = matter(raw);
      if (parsed.data.title) title = parsed.data.title;
      content = parsed.content;
    }
    return {
      meta: { slug, title, type: entry.type, folder: entry.folder, relativePath, updatedAt: entry.updatedAt },
      content,
    };
  }

  const fullPath = path.join(DOCS_DIR, relativePath);
  if (!fs.existsSync(fullPath)) return null;
  const ext = path.extname(fullPath).toLowerCase() as ".md" | ".html";
  if (ext !== ".md" && ext !== ".html") return null;
  const stat = fs.statSync(fullPath);
  const raw = fs.readFileSync(fullPath, "utf-8");
  const type: DocType = ext === ".html" ? "html" : "md";
  const folder = slug.length > 1 ? slug.slice(0, -1).join("/") : "";
  let title = path.basename(relativePath, ext);
  let content = raw;
  if (type === "md") {
    const parsed = matter(raw);
    if (parsed.data.title) title = parsed.data.title;
    content = parsed.content;
  }
  return {
    meta: { slug, title, type, folder, relativePath, updatedAt: stat.mtime.toISOString().slice(0, 10) },
    content,
  };
}

export function groupByFolder(docs: DocMeta[]): Record<string, DocMeta[]> {
  const groups: Record<string, DocMeta[]> = {};
  for (const doc of docs) {
    const key = doc.folder || "（ルート）";
    if (!groups[key]) groups[key] = [];
    groups[key].push(doc);
  }
  return groups;
}
