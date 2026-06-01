import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight, FileCode2, FileText, Home } from "lucide-react";
import { getDocumentBySlug } from "@/lib/documents";
import { MarkdownViewer } from "@/components/document/MarkdownViewer";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string[] }>;
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

  const Icon = meta.type === "html" ? FileCode2 : FileText;

  return (
    <div className="animate-in">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground transition-colors">
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
      <div className="mb-8 border-b border-border pb-6">
        <div className="flex items-center gap-2 mb-3">
          <Icon className="h-5 w-5 text-accent/70" />
          {meta.folder && <span className="mono-label">{meta.folder}</span>}
        </div>
        <h1 className="font-serif text-3xl font-medium tracking-tight leading-tight">
          {meta.title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">最終更新: {meta.updatedAt}</p>
      </div>

      {/* Content */}
      {meta.type === "md" ? (
        <MarkdownViewer content={content} />
      ) : (
        <div className="card-warm overflow-hidden rounded-xl" style={{ height: "75vh" }}>
          <iframe
            src={`/api/raw/${slug.map(encodeURIComponent).join("/")}`}
            className="h-full w-full border-0"
            title={meta.title}
          />
        </div>
      )}
    </div>
  );
}
