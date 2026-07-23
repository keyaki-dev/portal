import { NextRequest, NextResponse } from "next/server";
import { getBlogPostBySlug, markdownToPortfolioMdx } from "@/lib/blog";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const PORTFOLIO_OWNER = "keyaki-labs";
const PORTFOLIO_REPO = "portfolio";
const PORTFOLIO_BASE_URL = "https://keyaki-labs.com/blog";

export async function POST(req: NextRequest) {
  const { slug } = (await req.json()) as { slug: string };
  if (!slug) return NextResponse.json({ error: "slug is required" }, { status: 400 });

  if (!GITHUB_TOKEN) {
    return NextResponse.json({ error: "GITHUB_TOKEN が設定されていません" }, { status: 500 });
  }

  const post = getBlogPostBySlug(slug);
  if (!post) return NextResponse.json({ error: "記事が見つかりません" }, { status: 404 });

  const mdxContent = markdownToPortfolioMdx(post);
  const filePath = `content/blog/${post.date}.mdx`;

  // Check if file already exists (to get sha for update)
  let existingSha: string | undefined;
  try {
    const checkRes = await fetch(
      `https://api.github.com/repos/${PORTFOLIO_OWNER}/${PORTFOLIO_REPO}/contents/${filePath}`,
      { headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, "X-GitHub-Api-Version": "2022-11-28" } }
    );
    if (checkRes.ok) {
      const existing = (await checkRes.json()) as { sha: string };
      existingSha = existing.sha;
    }
  } catch {}

  // Create or update file
  const body = {
    message: `content: ${post.title}`,
    content: Buffer.from(mdxContent).toString("base64"),
    ...(existingSha ? { sha: existingSha } : {}),
  };

  const putRes = await fetch(
    `https://api.github.com/repos/${PORTFOLIO_OWNER}/${PORTFOLIO_REPO}/contents/${filePath}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify(body),
    }
  );

  if (!putRes.ok) {
    const err = await putRes.text();
    console.error("GitHub API error:", err);
    return NextResponse.json({ error: "GitHub への書き込みに失敗しました" }, { status: 500 });
  }

  const portfolioUrl = `${PORTFOLIO_BASE_URL}/${post.date}`;

  // blog frontmatter の portfolio_url を更新
  const PORTAL_OWNER = "keyaki-labs";
  const PORTAL_REPO = "portal";
  const mdPath = `blog/${post.filename}`;
  try {
    const checkRes = await fetch(
      `https://api.github.com/repos/${PORTAL_OWNER}/${PORTAL_REPO}/contents/${mdPath}`,
      { headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, "X-GitHub-Api-Version": "2022-11-28" } }
    );
    if (checkRes.ok) {
      const existing = (await checkRes.json()) as { sha: string; content: string };
      const decoded = Buffer.from(existing.sha ? "" : "", "base64");
      // gray-matter をサーバーサイドでは使えないため簡易正規表現で更新
      const rawContent = Buffer.from(existing.content, "base64").toString("utf-8");
      const updatedContent = rawContent.includes("portfolio_url:")
        ? rawContent.replace(/portfolio_url:.*/, `portfolio_url: '${portfolioUrl}'`)
        : rawContent.replace(/^---/, `---\nportfolio_url: '${portfolioUrl}'`);
      void decoded;
      await fetch(
        `https://api.github.com/repos/${PORTAL_OWNER}/${PORTAL_REPO}/contents/${mdPath}`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, "Content-Type": "application/json", "X-GitHub-Api-Version": "2022-11-28" },
          body: JSON.stringify({
            message: `content: portfolio_url を更新 — ${post.title}`,
            content: Buffer.from(updatedContent).toString("base64"),
            sha: existing.sha,
          }),
        }
      );
    }
  } catch (e) {
    console.error("frontmatter更新エラー（続行）:", e);
  }

  return NextResponse.json({ url: portfolioUrl });
}
