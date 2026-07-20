import fs from "fs";
import path from "path";
import matter from "gray-matter";

const BLOG_DIR = path.join(process.cwd(), "blog");

export interface BlogPost {
  filename: string;
  slug: string;
  date: string;
  title: string;
  tags: string[];
  image?: string;
  flags: string[];
  publishedUrl?: string;   // note.com の公開URL（editor URLの場合は下書きレビューURL）
  portfolioUrl?: string;   // keyaki-labs.com のポートフォリオURL
  status: "draft" | "published";
  noteStatus: "none" | "review" | "published";     // none: 未投稿, review: 下書きレビューURL, published: 公開済み
  portfolioStatus: "none" | "published";
}

export interface BlogPostWithContent extends BlogPost {
  content: string;
  rawContent: string;
}

function extractTitleFromContent(content: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : "";
}

function parseDateFromFrontmatter(created: unknown, filename: string): string {
  if (created instanceof Date) return created.toISOString().slice(0, 10);
  if (created && typeof created === "string") return created;
  const m = filename.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : "";
}

export function getAllBlogPosts(): BlogPost[] {
  if (!fs.existsSync(BLOG_DIR)) return [];

  const entries = fs.readdirSync(BLOG_DIR, { withFileTypes: true });
  const posts: BlogPost[] = [];
  const dateCount: Record<string, number> = {};

  const rawPosts = entries
    .filter((e) => e.isFile() && e.name.endsWith(".md"))
    .map((entry) => {
      const fullPath = path.join(BLOG_DIR, entry.name);
      const raw = fs.readFileSync(fullPath, "utf-8");
      const { data, content } = matter(raw);
      const date = parseDateFromFrontmatter(data.created, entry.name);
      const flags = Array.isArray(data.flags) ? (data.flags as string[]) : [];
      return {
        filename: entry.name,
        date,
        title: extractTitleFromContent(content) || entry.name,
        tags: Array.isArray(data.blog_tag) ? (data.blog_tag as string[]) : [],
        image: data.image as string | undefined,
        flags,
        publishedUrl: (data.published_url as string) || undefined,
        portfolioUrl: (data.portfolio_url as string) || undefined,
        status: (flags.includes("2_published") ? "published" : "draft") as "draft" | "published",
        noteStatus: (() => {
          const url = (data.published_url as string) || "";
          if (!url) return "none" as const;
          if (url.includes("note.com/keyaki_dev/n/")) return "published" as const;
          return "review" as const;
        })(),
        portfolioStatus: ((data.portfolio_url as string) ? "published" : "none") as "published" | "none",
      };
    })
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  for (const p of rawPosts) {
    dateCount[p.date] = (dateCount[p.date] ?? 0) + 1;
    const idx = dateCount[p.date];
    const slug = idx === 1 ? p.date : `${p.date}-${idx}`;
    posts.push({ ...p, slug });
  }

  return posts;
}

export function getBlogPostBySlug(slug: string): BlogPostWithContent | null {
  const all = getAllBlogPosts();
  const meta = all.find((p) => p.slug === slug);
  if (!meta) return null;

  const fullPath = path.join(BLOG_DIR, meta.filename);
  const raw = fs.readFileSync(fullPath, "utf-8");
  const { content } = matter(raw);

  return { ...meta, content, rawContent: raw };
}

export function countChars(content: string): number {
  const stripped = content
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]+`/g, "")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_~]/g, "")
    .replace(/^\s*[-*+\d.]+\s+/gm, "")
    .replace(/\s/g, "");
  return stripped.length;
}

export function markdownToPortfolioMdx(post: BlogPostWithContent): string {
  const body = post.content.replace(/^#\s+.+\n?/m, "").trim();

  const firstPara = body
    .split(/\n\n+/)
    .find((p) => p.trim() && !p.startsWith("#") && !p.startsWith("```"));
  const description = firstPara
    ? firstPara.replace(/\n/g, " ").replace(/[*_`[\]]/g, "").trim().slice(0, 160)
    : "";

  const frontmatter = [
    "---",
    `title: "${post.title.replace(/"/g, '\\"')}"`,
    `date: "${post.date}"`,
    `description: "${description.replace(/"/g, '\\"')}"`,
    `tags: [${post.tags.map((t) => `"${t}"`).join(", ")}]`,
    "---",
    "",
  ].join("\n");

  return frontmatter + body;
}
