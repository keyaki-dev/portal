import Link from "next/link";
import { ChevronRight, Home, Smartphone } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Xando デザインモックアップ",
};

const screens = [
  { id: "feed", label: "ホーム / フィード", description: "タイムライン・作品一覧" },
  { id: "post", label: "作品詳細", description: "個別作品ページ" },
  { id: "profile", label: "プロフィール", description: "ユーザープロフィール" },
  { id: "create", label: "新規投稿", description: "作品アップロード画面" },
];

export default function XandoDesignPage() {
  return (
    <div className="animate-in">
      <nav className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground transition-colors">
          <Home className="h-3.5 w-3.5" />
        </Link>
        <ChevronRight className="h-3.5 w-3.5 opacity-40" />
        <span className="text-foreground font-medium">Xando デザイン</span>
      </nav>

      <div className="mb-8 border-b border-border pb-6">
        <div className="flex items-center gap-2 mb-3">
          <Smartphone className="h-5 w-5 text-accent/70" />
          <span className="mono-label">design / mockup</span>
        </div>
        <h1 className="font-serif text-3xl font-medium tracking-tight leading-tight">
          Xando デザインモックアップ
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">山口作成 — 4画面のUIモックアップ</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {screens.map((s) => (
          <Link
            key={s.id}
            href={`/xando/design/${s.id}`}
            className="card-warm rounded-xl p-5 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-foreground group-hover:text-accent transition-colors">
                  {s.label}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
