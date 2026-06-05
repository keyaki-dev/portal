import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SlideViewer } from "@/components/document/SlideViewer";

const SCREENS: Record<string, { label: string; file: string }> = {
  feed:    { label: "ホーム / フィード",  file: "feed.html" },
  post:    { label: "作品詳細",           file: "post.html" },
  profile: { label: "プロフィール",       file: "profile.html" },
  create:  { label: "新規投稿",           file: "create.html" },
};

interface Props {
  params: Promise<{ screen: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { screen } = await params;
  const s = SCREENS[screen];
  if (!s) return {};
  return { title: `Xando — ${s.label}` };
}

export function generateStaticParams() {
  return Object.keys(SCREENS).map((screen) => ({ screen }));
}

export default async function XandoScreenPage({ params }: Props) {
  const { screen } = await params;
  const s = SCREENS[screen];
  if (!s) notFound();

  return (
    <SlideViewer
      src={`/xando/design/${s.file}`}
      title={`Xando — ${s.label}`}
      breadcrumbs={[
        { label: "ホーム", href: "/" },
        { label: "Xando デザイン", href: "/xando/design" },
        { label: s.label, href: null },
      ]}
      updatedAt="2026-06-05"
    />
  );
}
