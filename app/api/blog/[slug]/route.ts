import { NextRequest, NextResponse } from "next/server";
import { getBlogPostBySlug } from "@/lib/blog";
import { revalidatePath } from "next/cache";
import matter from "gray-matter";
import fs from "fs";
import path from "path";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const PORTAL_OWNER = "keyaki-dev";
const PORTAL_REPO = "portal";

async function getFileSha(filePath: string): Promise<string | undefined> {
  const res = await fetch(
    `https://api.github.com/repos/${PORTAL_OWNER}/${PORTAL_REPO}/contents/${encodeURIComponent(filePath)}`,
    { headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, "X-GitHub-Api-Version": "2022-11-28" } }
  );
  if (!res.ok) return undefined;
  const data = (await res.json()) as { sha: string };
  return data.sha;
}

async function putFile(filePath: string, content: string, message: string, sha?: string) {
  const res = await fetch(
    `https://api.github.com/repos/${PORTAL_OWNER}/${PORTAL_REPO}/contents/${encodeURIComponent(filePath)}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({ message, content, ...(sha ? { sha } : {}) }),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub API error: ${err}`);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (!GITHUB_TOKEN) {
    return NextResponse.json({ error: "GITHUB_TOKEN が設定されていません" }, { status: 500 });
  }

  const post = getBlogPostBySlug(slug);
  if (!post) return NextResponse.json({ error: "記事が見つかりません" }, { status: 404 });

  const body = (await req.json()) as { title?: string; content?: string };
  if (!body.title && !body.content) {
    return NextResponse.json({ error: "title または content が必要です" }, { status: 400 });
  }

  const mdPath = `blog/${post.filename}`;
  const { data: frontmatter, content: originalContent } = matter(post.rawContent);

  // タイトルは markdown の H1 として管理（frontmatter には持たない）
  let newContent = originalContent;
  if (body.content !== undefined) {
    newContent = body.content;
  }

  // H1 タイトルを差し替え
  if (body.title !== undefined) {
    const hasH1 = /^#\s+.+$/m.test(newContent);
    if (hasH1) {
      newContent = newContent.replace(/^#\s+.+$/m, `# ${body.title}`);
    } else {
      newContent = `# ${body.title}\n\n${newContent}`;
    }
  }

  const updatedMd = matter.stringify(newContent, frontmatter);

  try {
    const sha = await getFileSha(mdPath);
    const commitTitle = body.title ?? post.title;
    await putFile(mdPath, Buffer.from(updatedMd).toString("base64"), `content: 記事を編集 — ${commitTitle}`, sha);

    // ローカルにも書き戻す（同一インスタンスへのリクエスト用）
    try {
      fs.writeFileSync(path.join(process.cwd(), mdPath), updatedMd, "utf-8");
    } catch {
      // Vercel read-only fs では失敗することがある（無視）
    }
  } catch (e) {
    console.error("GitHub API error:", e);
    return NextResponse.json({ error: "GitHub への保存に失敗しました" }, { status: 500 });
  }

  revalidatePath(`/blog/${slug}`);
  return NextResponse.json({ ok: true });
}
