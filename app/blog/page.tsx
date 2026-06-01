import Link from "next/link";
import { PenLine, CheckCircle2, Clock } from "lucide-react";
import { getAllBlogPosts } from "@/lib/blog";
import type { BlogPost } from "@/lib/blog";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "ブログ管理" };

function PostCard({ post }: { post: BlogPost }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="card-warm group flex items-start gap-4 p-5 transition-all hover:border-accent/30 hover:shadow-sm hover:-translate-y-0.5"
    >
      <div className="mt-0.5 flex-shrink-0 rounded-lg bg-muted p-2">
        <PenLine className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-foreground truncate leading-snug">
            {post.title}
          </span>
          {post.status === "published" ? (
            <span className="flex items-center gap-1 shrink-0 rounded border border-emerald-100 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-widest text-emerald-700">
              <CheckCircle2 className="h-2.5 w-2.5" />
              投稿済み
            </span>
          ) : (
            <span className="flex items-center gap-1 shrink-0 rounded border border-amber-100 bg-amber-50 px-1.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-widest text-amber-700">
              <Clock className="h-2.5 w-2.5" />
              下書き
            </span>
          )}
        </div>
        <div className="mt-1 flex items-center gap-2">
          <p className="text-xs text-muted-foreground">{post.date}</p>
          {post.tags.length > 0 && (
            <div className="flex gap-1">
              {post.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

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
        <div className="space-y-10">
          {drafts.length > 0 && (
            <section>
              <div className="mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4 text-accent/70" />
                <h2 className="mono-label">下書き ({drafts.length})</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {drafts.map((post) => (
                  <PostCard key={post.filename} post={post} />
                ))}
              </div>
            </section>
          )}

          {published.length > 0 && (
            <section>
              <div className="mb-4 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-accent/70" />
                <h2 className="mono-label">投稿済み ({published.length})</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {published.map((post) => (
                  <PostCard key={post.filename} post={post} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
