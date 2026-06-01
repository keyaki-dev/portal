import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const IMAGES_DIR = path.join(process.cwd(), "blog", "images");
const GITHUB_RAW_BASE = "https://raw.githubusercontent.com/keyaki-dev/portal/main/blog/images";

const CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  const safeName = path.basename(filename);
  const ext = safeName.split(".").pop()?.toLowerCase() ?? "";
  const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";

  // デプロイ済みのファイルはローカルから配信（高速）
  const localPath = path.join(IMAGES_DIR, safeName);
  if (fs.existsSync(localPath)) {
    const buffer = fs.readFileSync(localPath);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  // アップロード直後でまだデプロイされていない画像は GitHub raw から取得
  const githubRes = await fetch(`${GITHUB_RAW_BASE}/${safeName}`);
  if (!githubRes.ok) return new NextResponse(null, { status: 404 });

  const buffer = await githubRes.arrayBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      // 次のデプロイで local に切り替わるため短めにキャッシュ
      "Cache-Control": "public, max-age=60",
    },
  });
}
