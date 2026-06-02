import fs from "fs";
import path from "path";
import matter from "gray-matter";

const DOCS_DIR = path.join(process.cwd(), "documents");

export type DocType = "md" | "html";

export interface DocMeta {
  safeKey: string;
  slug: string[];
  title: string;
  type: DocType;
  folder: string;
  relativePath: string;
  updatedAt: string;
}

// ビルド時に webpack がバンドルするキャッシュ。
// prebuild スクリプトが next build の前に .docs-cache/all.json を生成する。
// コンテンツは safeKey（base64url）で索引付けし、URL にも使用する。
type DocsCache = {
  index: Array<{
    safeKey: string;
    relativePath: string;
    slug: string[];
    title: string;
    type: DocType;
    folder: string;
    updatedAt: string;
  }>;
  content: Record<string, string>; // keyed by safeKey
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const docsCache = require("../.docs-cache/all.json") as DocsCache;
const useCache = docsCache.index.length > 0;

function makeSafeKey(relativePath: string): string {
  return Buffer.from(relativePath).toString("base64url");
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

      const relativePath = path.relative(base, fullPath).replace(/\\/g, "/");
      const slug = relativePath.split("/");
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
        safeKey: makeSafeKey(relativePath),
        slug,
        title,
        type,
        folder,
        relativePath,
        updatedAt: new Date(stat.mtime.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 16).replace("T", " "),
      });
    }
  }

  return results;
}

export function getAllDocuments(): DocMeta[] {
  if (useCache) {
    return docsCache.index.map((e) => ({
      safeKey: e.safeKey,
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

export function getDocumentBySafeKey(safeKey: string): { meta: DocMeta; content: string } | null {
  if (useCache) {
    const entry = docsCache.index.find((e) => e.safeKey === safeKey);
    if (!entry) return null;
    const raw = docsCache.content[safeKey] ?? "";
    let content = raw;
    let title = entry.title;
    if (entry.type === "md") {
      const parsed = matter(raw);
      if (parsed.data.title) title = parsed.data.title;
      content = parsed.content;
    }
    return {
      meta: { safeKey, slug: entry.slug, title, type: entry.type, folder: entry.folder, relativePath: entry.relativePath, updatedAt: entry.updatedAt },
      content,
    };
  }

  // 開発環境フォールバック：ファイルシステムから読む
  const docs = getAllDocuments();
  const doc = docs.find((d) => d.safeKey === safeKey);
  if (!doc) return null;
  const fullPath = path.join(DOCS_DIR, doc.relativePath);
  if (!fs.existsSync(fullPath)) return null;
  const raw = fs.readFileSync(fullPath, "utf-8");
  let content = raw;
  let title = doc.title;
  if (doc.type === "md") {
    const parsed = matter(raw);
    if (parsed.data.title) title = parsed.data.title;
    content = parsed.content;
  }
  return { meta: { ...doc, title }, content };
}

export function getRawHtmlBySafeKey(safeKey: string): string | null {
  if (useCache) {
    const entry = docsCache.index.find((e) => e.safeKey === safeKey);
    if (!entry || entry.type !== "html") return null;
    return docsCache.content[safeKey] ?? null;
  }
  const docs = getAllDocuments();
  const doc = docs.find((d) => d.safeKey === safeKey);
  if (!doc || doc.type !== "html") return null;
  const fullPath = path.join(DOCS_DIR, doc.relativePath);
  if (!fs.existsSync(fullPath)) return null;
  return fs.readFileSync(fullPath, "utf-8");
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
