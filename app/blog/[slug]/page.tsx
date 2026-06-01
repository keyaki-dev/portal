import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, Tag } from "lucide-react";
import Link from "next/link";
import { getBlogPostBySlug, getAllBlogPosts, countChars } from "@/lib/blog";
import { PublishButtons } from "@/components/blog/PublishButtons";
import { CoverImageUpload } from "@/components/blog/CoverImageUpload";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const posts = getAllBlogPosts();
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);
  if (!post) return {};
  return { title: post.title };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);
  if (!post) notFound();

  const charCount = countChars(post.content);
  const readingMinutes = Math.max(1, Math.round(charCount / 400));

  return (
    <div className="animate-in">
      <div className="mb-8">
        <Link
          href="/blog"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          ブログ管理に戻る
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* Article Preview */}
        <div className="min-w-0">
          <div className="mb-6">
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <span className="mono-label">{post.date}</span>
              {post.status === "published" ? (
                <span className="rounded border border-emerald-100 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-widest text-emerald-700">
                  投稿済み
                </span>
              ) : (
                <span className="rounded border border-amber-100 bg-amber-50 px-1.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-widest text-amber-700">
                  下書き
                </span>
              )}
            </div>
            <h1 className="font-serif text-3xl font-medium tracking-tight leading-tight">
              {post.title}
            </h1>
            {post.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
                  >
                    <Tag className="h-3 w-3" />
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="card-warm p-6 prose prose-sm max-w-none prose-headings:font-serif prose-headings:font-medium prose-a:text-accent prose-code:text-accent prose-pre:bg-muted">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {post.content}
            </ReactMarkdown>
          </div>
        </div>

        {/* Sidebar: Publish */}
        <div className="lg:sticky lg:top-24 h-fit">
          <div className="card-warm p-5 space-y-5">
            <PublishButtons
              slug={slug}
              isPublished={post.status === "published"}
              publishedUrl={post.publishedUrl}
            />

            <div className="border-t border-border pt-4">
              <CoverImageUpload slug={slug} currentImage={post.image} />
            </div>

            <div className="border-t border-border pt-4 space-y-2">
              <h3 className="mono-label">文字数</h3>
              <p className="text-sm font-medium text-foreground">
                {charCount.toLocaleString()}字
              </p>
              <p className="text-xs text-muted-foreground">読了目安: 約{readingMinutes}分</p>
            </div>

            <div className="border-t border-border pt-4 space-y-2">
              <h3 className="mono-label">ファイル情報</h3>
              <p className="text-xs text-muted-foreground break-all">
                {post.filename}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
