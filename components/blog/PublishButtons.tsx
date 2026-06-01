"use client";

import { useState } from "react";
import { Upload, ExternalLink, CheckCircle2, Loader2, AlertCircle } from "lucide-react";

type Destination = "portfolio" | "note";
type Status = "idle" | "loading" | "success" | "error";

interface PublishResult {
  url?: string;
  workflowUrl?: string;
  message?: string;
}

interface PublishButtonsProps {
  slug: string;
  isPublished: boolean;
  publishedUrl?: string;
}

export function PublishButtons({ slug, isPublished, publishedUrl }: PublishButtonsProps) {
  const [portfolioStatus, setPortfolioStatus] = useState<Status>("idle");
  const [noteStatus, setNoteStatus] = useState<Status>("idle");
  const [portfolioResult, setPortfolioResult] = useState<PublishResult | null>(null);
  const [noteResult, setNoteResult] = useState<PublishResult | null>(null);

  async function publish(destination: Destination) {
    const setStatus = destination === "portfolio" ? setPortfolioStatus : setNoteStatus;
    const setResult = destination === "portfolio" ? setPortfolioResult : setNoteResult;

    setStatus("loading");
    setResult(null);

    try {
      const res = await fetch(`/api/publish/${destination}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });

      const data = await res.json() as PublishResult & { error?: string };

      if (!res.ok) {
        setStatus("error");
        setResult({ message: data.error ?? "投稿に失敗しました" });
        return;
      }

      setStatus("success");
      setResult(data);
    } catch {
      setStatus("error");
      setResult({ message: "ネットワークエラーが発生しました" });
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="mono-label">投稿先</h3>

      <div className="flex flex-col gap-3 sm:flex-row">
        {/* Portfolio */}
        <div className="flex-1">
          <button
            onClick={() => publish("portfolio")}
            disabled={portfolioStatus === "loading"}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium transition-all hover:border-accent/40 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {portfolioStatus === "loading" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : portfolioStatus === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <Upload className="h-4 w-4 text-muted-foreground" />
            )}
            ポートフォリオに投稿
          </button>
          {portfolioStatus === "success" && portfolioResult?.url && (
            <a
              href={portfolioResult.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex items-center gap-1 text-xs text-emerald-700 hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              {portfolioResult.url}
            </a>
          )}
          {portfolioStatus === "error" && (
            <p className="mt-2 flex items-center gap-1 text-xs text-red-600">
              <AlertCircle className="h-3 w-3" />
              {portfolioResult?.message}
            </p>
          )}
        </div>

        {/* Note */}
        <div className="flex-1">
          <button
            onClick={() => publish("note")}
            disabled={noteStatus === "loading"}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium transition-all hover:border-accent/40 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {noteStatus === "loading" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : noteStatus === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <Upload className="h-4 w-4 text-muted-foreground" />
            )}
            Note に投稿
          </button>
          {noteStatus === "success" && (
            <p className="mt-2 text-xs text-emerald-700">
              {noteResult?.url ? (
                <a
                  href={noteResult.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  {noteResult.url}
                </a>
              ) : (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  GitHub Actions で処理中です。
                  {noteResult?.workflowUrl && (
                    <a
                      href={noteResult.workflowUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      進捗を確認
                    </a>
                  )}
                </span>
              )}
            </p>
          )}
          {noteStatus === "error" && (
            <p className="mt-2 flex items-center gap-1 text-xs text-red-600">
              <AlertCircle className="h-3 w-3" />
              {noteResult?.message}
            </p>
          )}
        </div>
      </div>

      {isPublished && publishedUrl && (
        <a
          href={publishedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Note で見る: {publishedUrl}
        </a>
      )}
    </div>
  );
}
