import { NextRequest, NextResponse } from "next/server";
import { getBlogPostBySlug } from "@/lib/blog";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const PORTAL_OWNER = "keyaki-dev";
const PORTAL_REPO = "portal";
const WORKFLOW_FILE = "publish-note.yml";

export async function POST(req: NextRequest) {
  const { slug, scheduledAt } = (await req.json()) as {
    slug: string;
    scheduledAt?: string;
  };
  if (!slug) return NextResponse.json({ error: "slug is required" }, { status: 400 });

  if (!GITHUB_TOKEN) {
    return NextResponse.json({ error: "GITHUB_TOKEN が設定されていません" }, { status: 500 });
  }

  const post = getBlogPostBySlug(slug);
  if (!post) return NextResponse.json({ error: "記事が見つかりません" }, { status: 404 });

  const inputs: Record<string, string> = {
    filename: post.filename,
    title: post.title,
  };

  if (post.image) inputs.cover_image = post.image;
  if (scheduledAt) inputs.scheduled_at = scheduledAt;

  const dispatchRes = await fetch(
    `https://api.github.com/repos/${PORTAL_OWNER}/${PORTAL_REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({ ref: "main", inputs }),
    }
  );

  if (!dispatchRes.ok) {
    const err = await dispatchRes.text();
    console.error("GitHub Actions dispatch error:", err);
    return NextResponse.json({ error: "GitHub Actions の起動に失敗しました" }, { status: 500 });
  }

  const workflowUrl = `https://github.com/${PORTAL_OWNER}/${PORTAL_REPO}/actions/workflows/${WORKFLOW_FILE}`;
  return NextResponse.json({ workflowUrl });
}
