import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight, FileText, Home } from "lucide-react";
import { getDocumentBySlug, getAllDocuments } from "@/lib/documents";
import { MarkdownViewer } from "@/components/document/MarkdownViewer";
import { SlideViewer } from "@/components/document/SlideViewer";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string[] }>;
}

export async function generateStaticParams() {
  const docs = getAllDocuments();
  return docs.map((doc) => ({ slug: doc.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const doc = getDocumentBySlug(slug);
  if (!doc) return {};
  return { title: doc.meta.title };
}

export default async function DocumentPage({ params }: Props) {
  const { slug } = await params;
  const doc = getDocumentBySlug(slug);
  if (!doc) notFound();

  const { meta, content } = doc;
  const breadcrumbs = [
    { label: "ドキュメント", href: "/" },
    ...meta.folder
      ? meta.folder.split("/").map((part) => ({
          label: part,
          href: null,
        }))
      : [],
    { label: meta.title, href: null },
  ];

  // HTML スライドは専用の全高ビューアで表示
  if (meta.type === "html") {
    return (
      <SlideViewer
        src={`/api/raw/${slug.join("/")}`}
        title={meta.title}
        breadcrumbs={breadcrumbs}
        updatedAt={meta.updatedAt}
      />
    );
  }

  // Markdown ドキュメントは通常レイアウト
  return (
    <div className="mx-auto max-w-5xl animate-in">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground flex-wrap">
        <Link href="/" className="hover:text-foreground transition-colors flex-shrink-0">
          <Home className="h-3.5 w-3.5" />
        </Link>
        {breadcrumbs.slice(1).map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <ChevronRight className="h-3.5 w-3.5 opacity-40" />
            {crumb.href ? (
              <Link href={crumb.href} className="hover:text-foreground transition-colors">
                {crumb.label}
              </Link>
            ) : (
              <span className={i === breadcrumbs.length - 2 ? "text-foreground font-medium" : ""}>
                {crumb.label}
              </span>
            )}
          </span>
        ))}
      </nav>

      {/* Header */}
      <div className="mb-6 sm:mb-8 border-b border-border pb-5 sm:pb-6">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="h-5 w-5 text-accent/70 flex-shrink-0" />
          {meta.folder && <span className="mono-label">{meta.folder}</span>}
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight leading-tight">
          {meta.title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">最終更新: {meta.updatedAt}</p>
      </div>

      {/* Content */}
      <MarkdownViewer content={content} />
    </div>
  );
}
