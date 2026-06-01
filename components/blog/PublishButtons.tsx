"use client";

import { useState } from "react";
import { Upload, ExternalLink, CheckCircle2, Loader2, AlertCircle, Clock, FileEdit } from "lucide-react";

type Status = "idle" | "loading" | "success" | "error";

interface PublishResult {
  url?: string;
  workflowUrl?: string;
  message?: string;
}

interface PublishButtonsProps {
  slug: string;
  noteStatus: "none" | "review" | "published";
  portfolioStatus: "none" | "published";
  publishedUrl?: string;
  portfolioUrl?: string;
}

export function PublishButtons({ slug, noteStatus, portfolioStatus, publishedUrl, portfolioUrl }: PublishButtonsProps) {
  const [portfolioRunStatus, setPortfolioRunStatus] = useState<Status>("idle");
  const [noteRunStatus, setNoteRunStatus] = useState<Status>("idle");
  const [portfolioResult, setPortfolioResult] = useState<PublishResult | null>(null);
  const [noteResult, setNoteResult] = useState<PublishResult | null>(null);
  const [useSchedule, setUseSchedule] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");

  async function publishPortfolio() {
    setPortfolioRunStatus("loading");
    setPortfolioResult(null);
    try {
      const res = await fetch("/api/publish/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const data = await res.json() as PublishResult & { error?: string };
      if (!res.ok) { setPortfolioRunStatus("error"); setPortfolioResult({ message: data.error ?? "失敗しました" }); return; }
      setPortfolioRunStatus("success");
      setPortfolioResult(data);
    } catch {
      setPortfolioRunStatus("error");
      setPortfolioResult({ message: "ネットワークエラー" });
    }
  }

  async function prepareNote() {
    setNoteRunStatus("loading");
    setNoteResult(null);
    try {
      const body: { slug: string; scheduledAt?: string } = { slug };
      if (useSchedule && scheduledAt) body.scheduledAt = new Date(scheduledAt).toISOString();
      const res = await fetch("/api/publish/note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json() as PublishResult & { error?: string };
      if (!res.ok) { setNoteRunStatus("error"); setNoteResult({ message: data.error ?? "失敗しました" }); return; }
      setNoteRunStatus("success");
      setNoteResult(data);
    } catch {
      setNoteRunStatus("error");
      setNoteResult({ message: "ネットワークエラー" });
    }
  }

  function handleScheduleToggle(checked: boolean) {
    setUseSchedule(checked);
    if (checked && !scheduledAt) {
      const d = new Date(Date.now() + 5 * 60 * 1000);
      d.setSeconds(0, 0);
      setScheduledAt(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
    }
  }

  const currentPortfolioUrl = portfolioResult?.url ?? portfolioUrl;
  const currentNoteUrl = noteResult?.workflowUrl ? undefined : (noteResult?.url ?? publishedUrl);

  return (
    <div className="space-y-4">
      <h3 className="mono-label">投稿先</h3>

      {/* ── ポートフォリオ ── */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">ポートフォリオ</span>
          {portfolioStatus === "published" || portfolioRunStatus === "success" ? (
            <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5">
              <CheckCircle2 className="h-2.5 w-2.5" /> 公開済み
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground bg-muted border border-border rounded px-1.5 py-0.5">
              未公開
            </span>
          )}
        </div>
        <button
          onClick={publishPortfolio}
          disabled={portfolioRunStatus === "loading"}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium transition-all hover:border-accent/40 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {portfolioRunStatus === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 text-muted-foreground" />}
          ポートフォリオに投稿
        </button>
        {portfolioRunStatus === "error" && <p className="flex items-center gap-1 text-xs text-red-600"><AlertCircle className="h-3 w-3" />{portfolioResult?.message}</p>}
        {currentPortfolioUrl && (
          <a href={currentPortfolioUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ExternalLink className="h-3 w-3" />{currentPortfolioUrl}
          </a>
        )}
      </div>

      {/* ── Note ── */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">note</span>
          {noteStatus === "published" ? (
            <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5">
              <CheckCircle2 className="h-2.5 w-2.5" /> 公開済み
            </span>
          ) : noteStatus === "review" ? (
            <span className="flex items-center gap-1 text-[10px] font-mono text-amber-700 bg-amber-50 border border-amber-100 rounded px-1.5 py-0.5">
              <FileEdit className="h-2.5 w-2.5" /> 下書きあり
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground bg-muted border border-border rounded px-1.5 py-0.5">
              未投稿
            </span>
          )}
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={useSchedule} onChange={(e) => handleScheduleToggle(e.target.checked)} className="h-3.5 w-3.5 accent-[var(--accent)]" />
          <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" />時間指定</span>
        </label>
        {useSchedule && (
          <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="w-full rounded-lg border border-border bg-card px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-accent/40" />
        )}

        <button
          onClick={prepareNote}
          disabled={noteRunStatus === "loading" || (useSchedule && !scheduledAt)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium transition-all hover:border-accent/40 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {noteRunStatus === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileEdit className="h-4 w-4 text-muted-foreground" />}
          note 下書きを準備
        </button>

        {noteRunStatus === "success" && (
          <p className="flex items-center gap-1 text-xs text-emerald-700">
            <CheckCircle2 className="h-3 w-3" />
            GitHub Actions で処理中です。
            {noteResult?.workflowUrl && (
              <a href={noteResult.workflowUrl} target="_blank" rel="noopener noreferrer" className="underline">進捗を確認</a>
            )}
          </p>
        )}
        {noteRunStatus === "error" && <p className="flex items-center gap-1 text-xs text-red-600"><AlertCircle className="h-3 w-3" />{noteResult?.message}</p>}

        {/* 既存のnote URL表示 */}
        {publishedUrl && (
          <a href={publishedUrl} target="_blank" rel="noopener noreferrer"
            className={`flex items-center gap-1 text-xs ${noteStatus === "published" ? "text-emerald-700" : "text-amber-700"} hover:underline`}>
            <ExternalLink className="h-3 w-3" />
            {noteStatus === "published" ? "note で見る" : "下書きを確認・公開する"}
          </a>
        )}
      </div>
    </div>
  );
}
