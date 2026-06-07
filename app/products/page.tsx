import Image from "next/image";
import { ExternalLink } from "lucide-react";

const products = [
  {
    name: "FocusBurst",
    description: "ADHD脳専用の集中サポートアプリ。超短ポモドーロタイマーとAIボディダブリング機能を搭載。",
    logo: null as string | null,
    links: [
      { label: "LP を見る", url: "https://focusburst.keyaki-dev.com" },
      { label: "アプリを開く", url: "https://focusburst.keyaki-dev.com/app", primary: true },
    ],
    status: "β公開中",
    statusColor: "text-[#C45E3E]",
  },
  {
    name: "Forkbox（フォークボックス）",
    description: "アイデアをフォークして進化させるSNS型プラットフォーム。AIで作った未完成の成果物を共有し、フォークされることが評価になる。",
    logo: "/forkbox-logo.svg" as string | null,
    links: [
      { label: "モックを見る", url: "https://frontend-tau-neon-47.vercel.app", primary: true },
      { label: "デザインを見る", url: "https://portal.keyaki-dev.com/xando/design" },
    ],
    status: "開発中",
    statusColor: "text-[#1A6EA8]",
  },
];

export const metadata = { title: "プロダクト" };

export default function ProductsPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight mb-2">プロダクト</h1>
      <p className="text-muted-foreground text-sm mb-8">keyaki が開発・公開しているアプリケーション一覧</p>

      <div className="grid gap-4 sm:grid-cols-2">
        {products.map((p) => (
          <div
            key={p.name}
            className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                {p.logo && (
                  <Image
                    src={p.logo}
                    alt={`${p.name} logo`}
                    width={40}
                    height={40}
                    className="rounded-lg flex-shrink-0"
                  />
                )}
                <h2 className="font-serif text-xl font-medium">{p.name}</h2>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full bg-muted ${p.statusColor} flex-shrink-0`}>
                {p.status}
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed flex-1">{p.description}</p>
            <div className="flex flex-wrap gap-2">
              {p.links.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                    link.primary
                      ? "bg-[#C45E3E] text-white hover:bg-[#b05235]"
                      : "border border-border hover:bg-muted text-foreground"
                  }`}
                >
                  {link.label}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
