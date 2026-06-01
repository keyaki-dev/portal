import { NextRequest, NextResponse } from "next/server";
import { getRawHtmlBySafeKey } from "@/lib/documents";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const safeKey = slug[0];

  const content = getRawHtmlBySafeKey(safeKey);
  if (content === null) {
    return new NextResponse("Not Found", { status: 404 });
  }

  return new NextResponse(content, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
