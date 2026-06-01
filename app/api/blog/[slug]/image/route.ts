import { NextRequest, NextResponse } from "next/server";
import { getBlogPostBySlug } from "@/lib/blog";
import matter from "gray-matter";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const PORTAL_OWNER = "keyaki-dev";
const PORTAL_REPO = "portal";

async function getFileSha(path: string): Promise<string | undefined> {
  const res = await fetch(
    `https://api.github.com/repos/${PORTAL_OWNER}/${PORTAL_REPO}/contents/${path}`,
    { headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, "X-GitHub-Api-Version": "2022-11-28" } }
  );
  if (!res.ok) return undefined;
  const data = (await res.json()) as { sha: string };
  return data.sha;
}

async function putFile(path: string, content: string, message: string, sha?: string) {
  const res = await fetch(
    `https://api.github.com/repos/${PORTAL_OWNER}/${PORTAL_REPO}/contents/${path}`,
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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (!GITHUB_TOKEN) {
    return NextResponse.json({ error: "GITHUB_TOKEN が設定されていません" }, { status: 500 });
  }

  const post = getBlogPostBySlug(slug);
  if (!post) return NextResponse.json({ error: "記事が見つかりません" }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "ファイルが指定されていません" }, { status: 400 });

  const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "対応していないファイル形式です（PNG/JPEG/WebP/GIF）" }, { status: 400 });
  }

  const ext = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
  let filename = post.image ?? `${post.date}.${ext}`;
  if (post.image) {
    const existingExt = post.image.split(".").pop() ?? "";
    if (existingExt !== ext) filename = `${post.date}.${ext}`;
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const imageBase64 = buffer.toString("base64");
  const imagePath = `blog/images/${filename}`;
  const mdPath = `blog/${post.filename}`;
  const commitMessage = `content: カバー画像を追加 — ${post.title}`;

  try {
    // 画像を GitHub にアップロード
    const imageSha = await getFileSha(imagePath);
    await putFile(imagePath, imageBase64, commitMessage, imageSha);

    // frontmatter を更新してマークダウンファイルを上書き
    const { data, content } = matter(post.rawContent);
    data.image = filename;
    const updatedMd = matter.stringify(content, data);
    const mdSha = await getFileSha(mdPath);
    await putFile(mdPath, Buffer.from(updatedMd).toString("base64"), commitMessage, mdSha);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("GitHub API error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ filename });
}
