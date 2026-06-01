import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DOCS_DIR = path.join(process.cwd(), "documents");
const CACHE_DIR = path.join(process.cwd(), ".docs-cache");

function resolveFromCache(relativePath: string): string | null {
  const indexPath = path.join(CACHE_DIR, "_index.json");
  if (!fs.existsSync(indexPath)) return null;
  const index: Array<{ relativePath: string; safeKey: string }> = JSON.parse(
    fs.readFileSync(indexPath, "utf-8")
  );
  const entry = index.find((e) => e.relativePath === relativePath);
  if (!entry) return null;
  const cachePath = path.join(CACHE_DIR, entry.safeKey + ".json");
  if (!fs.existsSync(cachePath)) return null;
  return JSON.parse(fs.readFileSync(cachePath, "utf-8")).content as string;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const relativePath = slug.join("/");

  const ext = path.extname(relativePath).toLowerCase();
  if (ext !== ".html") {
    return new NextResponse("Not Found", { status: 404 });
  }

  // キャッシュから読む（Vercel 本番）
  const cached = resolveFromCache(relativePath);
  if (cached !== null) {
    return new NextResponse(cached, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // フォールバック：ファイルシステムから直接読む（開発環境）
  const filePath = path.join(DOCS_DIR, relativePath);
  if (!filePath.startsWith(DOCS_DIR)) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  if (!fs.existsSync(filePath)) {
    return new NextResponse("Not Found", { status: 404 });
  }
  const content = fs.readFileSync(filePath, "utf-8");
  return new NextResponse(content, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
