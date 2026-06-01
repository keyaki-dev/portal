"use client";

import { useState } from "react";
import Link from "next/link";
import { PenLine, CheckCircle2, Clock, LayoutGrid, List, ImageIcon, FileEdit } from "lucide-react";
import type { BlogPost } from "@/lib/blog";

type View = "gallery" | "list";

interface BlogGridProps {
  drafts: BlogPost[];
  published: BlogPost[];
}

function GalleryCard({ post }: { post: BlogPost }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="card-warm group flex flex-col overflow-hidden transition-all hover:border-accent/30 hover:shadow-sm hover:-translate-y-0.5"
    >
      {/* サムネイル */}
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        {post.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/blog/images/${post.image}`}
            alt={post.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/60">
            <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
          </div>
        )}
        {/* ステータスバッジをオーバーレイ */}
        <div className="absolute top-2 right-2">
          {post.status === "published" ? (
            <span className="flex items-center gap-1 rounded border border-emerald-100 bg-emerald-50/90 px-1.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-widest text-emerald-700 backdrop-blur-sm">
              <CheckCircle2 className="h-2.5 w-2.5" />
              投稿済み
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded border border-amber-100 bg-amber-50/90 px-1.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-widest text-amber-700 backdrop-blur-sm">
              <Clock className="h-2.5 w-2.5" />
              下書き
            </span>
          )}
        </div>
      </div>

      {/* メタ情報 */}
      <div className="flex flex-col gap-1.5 p-4">
        <p className="font-medium text-foreground leading-snug line-clamp-2 group-hover:text-accent transition-colors">
          {post.title}
        </p>
        {/* note / portfolio 公開状況 */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {post.noteStatus === "published" ? (
            <span className="flex items-center gap-0.5 rounded bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 text-[9px] font-mono text-emerald-700">
              <CheckCircle2 className="h-2 w-2" /> note
            </span>
          ) : post.noteStatus === "review" ? (
            <span className="flex items-center gap-0.5 rounded bg-amber-50 border border-amber-100 px-1.5 py-0.5 text-[9px] font-mono text-amber-700">
              <FileEdit className="h-2 w-2" /> note下書き
            </span>
          ) : null}
          {post.portfolioStatus === "published" && (
            <span className="flex items-center gap-0.5 rounded bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 text-[9px] font-mono text-emerald-700">
              <CheckCircle2 className="h-2 w-2" /> portfolio
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="mono-label text-[10px]">{post.date}</span>
          {post.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}

function ListCard({ post }: { post: BlogPost }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="card-warm group flex items-center gap-3 p-4 transition-all hover:border-accent/30 hover:shadow-sm hover:-translate-y-0.5"
    >
      {/* 小サムネイル */}
      <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
        {post.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/blog/images/${post.image}`}
            alt={post.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <PenLine className="h-4 w-4 text-muted-foreground/40 group-hover:text-accent/50 transition-colors" />
          </div>
        )}
      </div>

      {/* テキスト */}
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
        <div className="mt-1 flex items-center gap-2 flex-wrap">
          <p className="text-xs text-muted-foreground">{post.date}</p>
          {post.noteStatus === "published" && (
            <span className="flex items-center gap-0.5 rounded bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 text-[9px] font-mono text-emerald-700"><CheckCircle2 className="h-2 w-2" />note</span>
          )}
          {post.noteStatus === "review" && (
            <span className="flex items-center gap-0.5 rounded bg-amber-50 border border-amber-100 px-1.5 py-0.5 text-[9px] font-mono text-amber-700"><FileEdit className="h-2 w-2" />note下書き</span>
          )}
          {post.portfolioStatus === "published" && (
            <span className="flex items-center gap-0.5 rounded bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 text-[9px] font-mono text-emerald-700"><CheckCircle2 className="h-2 w-2" />portfolio</span>
          )}
          {post.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}

export function BlogGrid({ drafts, published }: BlogGridProps) {
  const [view, setView] = useState<View>("gallery");

  const Card = view === "gallery" ? GalleryCard : ListCard;
  const gridClass = view === "gallery"
    ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    : "flex flex-col gap-3";

  return (
    <div className="space-y-10">
      {/* ビュー切り替えボタン */}
      <div className="flex justify-end">
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => setView("gallery")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors ${
              view === "gallery"
                ? "bg-accent/10 text-accent font-medium"
                : "bg-card text-muted-foreground hover:bg-muted"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            ギャラリー
          </button>
          <button
            onClick={() => setView("list")}
            className={`flex items-center gap-1.5 border-l border-border px-3 py-1.5 text-xs transition-colors ${
              view === "list"
                ? "bg-accent/10 text-accent font-medium"
                : "bg-card text-muted-foreground hover:bg-muted"
            }`}
          >
            <List className="h-3.5 w-3.5" />
            リスト
          </button>
        </div>
      </div>

      {drafts.length > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-accent/70" />
            <h2 className="mono-label">下書き ({drafts.length})</h2>
          </div>
          <div className={gridClass}>
            {drafts.map((post) => <Card key={post.filename} post={post} />)}
          </div>
        </section>
      )}

      {published.length > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-accent/70" />
            <h2 className="mono-label">投稿済み ({published.length})</h2>
          </div>
          <div className={gridClass}>
            {published.map((post) => <Card key={post.filename} post={post} />)}
          </div>
        </section>
      )}
    </div>
  );
}
