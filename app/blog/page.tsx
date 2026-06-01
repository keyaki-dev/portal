import { PenLine } from "lucide-react";
import { getAllBlogPosts } from "@/lib/blog";
import { BlogGrid } from "@/components/blog/BlogGrid";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "ブログ管理" };

export default function BlogPage() {
  const posts = getAllBlogPosts();
  const drafts = posts.filter((p) => p.status === "draft");
  const published = posts.filter((p) => p.status === "published");

  return (
    <div className="animate-in">
      <div className="mb-10">
        <span className="mono-label">Blog</span>
        <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight">
          ブログ管理
        </h1>
        <p className="mt-3 text-muted-foreground">
          記事の下書き・投稿管理。ポートフォリオと Note へ投稿できます。
        </p>
      </div>

      {posts.length === 0 ? (
        <div className="card-warm flex flex-col items-center justify-center py-24 text-center">
          <PenLine className="mb-4 h-10 w-10 text-muted-foreground/40" />
          <p className="font-medium text-muted-foreground">記事がありません</p>
          <p className="mt-1 text-sm text-muted-foreground/70">
            <code className="text-xs">blog/</code> ディレクトリに .md ファイルを追加してください。
          </p>
        </div>
      ) : (
        <BlogGrid drafts={drafts} published={published} />
      )}
    </div>
  );
}
