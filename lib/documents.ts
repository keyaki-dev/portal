import fs from "fs";
import path from "path";
import matter from "gray-matter";

const DOCS_DIR = path.join(process.cwd(), "documents");

export type DocType = "md" | "html";

export interface DocMeta {
  slug: string[];
  title: string;
  type: DocType;
  folder: string;
  relativePath: string;
  updatedAt: string;
}

// ビルド時に webpack がバンドルするキャッシュ。
// NODE_ENV === 'production' の条件により、開発時は dead code として除去される。
// prebuild スクリプトが next build の前に .docs-cache/all.json を生成する。
type DocsCache = {
  index: Array<{
    relativePath: string;
    slug: string[];
    title: string;
    type: DocType;
    folder: string;
    updatedAt: string;
  }>;
  content: Record<string, string>;
};

let docsCache: DocsCache | null = null;
if (process.env.NODE_ENV === "production") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  docsCache = require("../.docs-cache/all.json") as DocsCache;
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

export function getAllDocuments(): DocMeta[] {
  if (docsCache) {
    return docsCache.index.map((e) => ({
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

  if (docsCache) {
    const entry = docsCache.index.find((e) => e.relativePath === relativePath);
    if (!entry) return null;
    const raw = docsCache.content[relativePath] ?? "";
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

export function getRawHtml(relativePath: string): string | null {
  if (docsCache) {
    return docsCache.content[relativePath] ?? null;
  }
  const fullPath = path.join(DOCS_DIR, relativePath);
  if (!fs.existsSync(fullPath)) return null;
  const ext = path.extname(fullPath).toLowerCase();
  if (ext !== ".html") return null;
  return fs.readFileSync(fullPath, "utf-8");
}
