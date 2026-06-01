import { NextRequest, NextResponse } from "next/server";
import { getBlogPostBySlug } from "@/lib/blog";
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { execSync } from "child_process";

const BLOG_DIR = path.join(process.cwd(), "blog");
const IMAGES_DIR = path.join(BLOG_DIR, "images");

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
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

  // 既存のimage fieldがあればそのファイル名で上書き、なければ日付.extで新規作成
  let filename = post.image ?? `${post.date}.${ext}`;
  // 拡張子が変わった場合は更新
  if (post.image) {
    const existingExt = post.image.split(".").pop() ?? "";
    if (existingExt !== ext) {
      filename = `${post.date}.${ext}`;
    }
  }

  if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(path.join(IMAGES_DIR, filename), buffer);

  // frontmatter の image フィールドを更新
  const fullPath = path.join(BLOG_DIR, post.filename);
  const raw = fs.readFileSync(fullPath, "utf-8");
  const { data, content } = matter(raw);
  data.image = filename;
  fs.writeFileSync(fullPath, matter.stringify(content, data), "utf-8");

  // git commit + push
  try {
    const cwd = process.cwd();
    execSync(
      `git -C "${cwd}" add "blog/images/${filename}" "blog/${post.filename}"`,
      { stdio: "pipe" }
    );
    const status = execSync(`git -C "${cwd}" status --porcelain`, { stdio: "pipe" }).toString();
    if (status.trim()) {
      execSync(
        `git -C "${cwd}" -c user.name="川上" -c user.email="contact@keyaki-dev.com" commit -m "content: カバー画像を追加 — ${post.title}"`,
        { stdio: "pipe" }
      );
      execSync(`git -C "${cwd}" push origin main`, { stdio: "pipe" });
    }
  } catch (e) {
    console.error("Git error (non-fatal):", e);
  }

  return NextResponse.json({ filename });
}
