import Link from "next/link";
import { FileText, FileCode2, FolderOpen } from "lucide-react";
import { getAllDocuments, groupByFolder } from "@/lib/documents";
import type { DocMeta } from "@/lib/documents";

function DocCard({ doc }: { doc: DocMeta }) {
  const href = `/documents/${doc.slug.join("/")}`;
  const Icon = doc.type === "html" ? FileCode2 : FileText;
  const typeBadge = doc.type === "html" ? "HTML" : "MD";
  const typeColor = doc.type === "html"
    ? "bg-blue-50 text-blue-700 border-blue-100"
    : "bg-emerald-50 text-emerald-700 border-emerald-100";

  return (
    <Link
      href={href}
      className="card-warm group flex items-start gap-4 p-5 transition-all hover:border-accent/30 hover:shadow-sm hover:-translate-y-0.5"
    >
      <div className="mt-0.5 flex-shrink-0 rounded-lg bg-muted p-2">
        <Icon className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-foreground truncate leading-snug">{doc.title}</span>
          <span className={`mono-label shrink-0 rounded border px-1.5 py-0.5 text-[10px] ${typeColor}`}>
            {typeBadge}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">更新: {doc.updatedAt}</p>
      </div>
    </Link>
  );
}

export default function HomePage() {
  const docs = getAllDocuments();
  const grouped = groupByFolder(docs);
  const folders = Object.keys(grouped).sort((a, b) => {
    if (a === "（ルート）") return -1;
    if (b === "（ルート）") return 1;
    return a.localeCompare(b, "ja");
  });

  return (
    <div className="animate-in">
      <div className="mb-10">
        <span className="mono-label">Team Portal</span>
        <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight">
          ドキュメント
        </h1>
        <p className="mt-3 text-muted-foreground">
          チームの資料・仕様書・議事録を一覧できます。
        </p>
      </div>

      {docs.length === 0 ? (
        <div className="card-warm flex flex-col items-center justify-center py-24 text-center">
          <FolderOpen className="mb-4 h-10 w-10 text-muted-foreground/40" />
          <p className="font-medium text-muted-foreground">ドキュメントがありません</p>
          <p className="mt-1 text-sm text-muted-foreground/70">
            <code className="text-xs">documents/</code> ディレクトリに .md または .html ファイルを追加してください。
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {folders.map((folder) => (
            <section key={folder}>
              <div className="mb-4 flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-accent/70" />
                <h2 className="mono-label">{folder}</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {grouped[folder].map((doc) => (
                  <DocCard key={doc.relativePath} doc={doc} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
