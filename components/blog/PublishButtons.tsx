"use client";

import { useState } from "react";
import { Upload, ExternalLink, CheckCircle2, Loader2, AlertCircle, Clock } from "lucide-react";

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
  const [useSchedule, setUseSchedule] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");

  async function publishPortfolio() {
    setPortfolioStatus("loading");
    setPortfolioResult(null);

    try {
      const res = await fetch("/api/publish/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const data = await res.json() as PublishResult & { error?: string };

      if (!res.ok) {
        setPortfolioStatus("error");
        setPortfolioResult({ message: data.error ?? "投稿に失敗しました" });
        return;
      }
      setPortfolioStatus("success");
      setPortfolioResult(data);
    } catch {
      setPortfolioStatus("error");
      setPortfolioResult({ message: "ネットワークエラーが発生しました" });
    }
  }

  async function publishNote() {
    setNoteStatus("loading");
    setNoteResult(null);

    try {
      const body: { slug: string; scheduledAt?: string } = { slug };
      if (useSchedule && scheduledAt) {
        body.scheduledAt = new Date(scheduledAt).toISOString();
      }

      const res = await fetch("/api/publish/note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json() as PublishResult & { error?: string };

      if (!res.ok) {
        setNoteStatus("error");
        setNoteResult({ message: data.error ?? "投稿に失敗しました" });
        return;
      }
      setNoteStatus("success");
      setNoteResult(data);
    } catch {
      setNoteStatus("error");
      setNoteResult({ message: "ネットワークエラーが発生しました" });
    }
  }

  // 最低5分後の日時を初期値に
  function handleScheduleToggle(checked: boolean) {
    setUseSchedule(checked);
    if (checked && !scheduledAt) {
      const d = new Date(Date.now() + 5 * 60 * 1000);
      d.setSeconds(0, 0);
      const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setScheduledAt(local);
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="mono-label">投稿先</h3>

      <div className="flex flex-col gap-3">
        {/* Portfolio */}
        <div>
          <button
            onClick={publishPortfolio}
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
        <div className="space-y-2">
          {/* 時間指定トグル */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={useSchedule}
              onChange={(e) => handleScheduleToggle(e.target.checked)}
              className="h-3.5 w-3.5 accent-[var(--accent)]"
            />
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              時間指定で投稿
            </span>
          </label>

          {useSchedule && (
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent/40"
            />
          )}

          <button
            onClick={publishNote}
            disabled={noteStatus === "loading" || (useSchedule && !scheduledAt)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium transition-all hover:border-accent/40 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {noteStatus === "loading" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : noteStatus === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <Upload className="h-4 w-4 text-muted-foreground" />
            )}
            {useSchedule ? "Note に予約投稿" : "Note に投稿"}
          </button>

          {noteStatus === "success" && (
            <p className="flex items-center gap-1 text-xs text-emerald-700">
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
            <p className="flex items-center gap-1 text-xs text-red-600">
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
