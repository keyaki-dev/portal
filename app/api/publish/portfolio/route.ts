import { NextRequest, NextResponse } from "next/server";
import { getBlogPostBySlug, markdownToPortfolioMdx } from "@/lib/blog";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const PORTFOLIO_OWNER = "keyaki-dev";
const PORTFOLIO_REPO = "portfolio";
const PORTFOLIO_BASE_URL = "https://keyaki-dev.com/blog";

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
  return NextResponse.json({ url: portfolioUrl });
}
