import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { getRawHtml } from "@/lib/documents";

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

  const content = getRawHtml(relativePath);
  if (content === null) {
    return new NextResponse("Not Found", { status: 404 });
  }

  return new NextResponse(content, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
