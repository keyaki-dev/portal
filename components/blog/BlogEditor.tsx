"use client";

import { useState } from "react";
import { Save, Loader2, CheckCircle2, AlertCircle, Edit3, X } from "lucide-react";

interface BlogEditorProps {
  slug: string;
  initialTitle: string;
  initialContent: string;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function BlogEditor({ slug, initialTitle, initialContent }: BlogEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const isDirty = title !== initialTitle || content !== initialContent;

  async function handleSave() {
    setStatus("saving");
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/blog/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });

      let data: { error?: string } = {};
      try {
        data = await res.json() as { error?: string };
      } catch {
        // ignore
      }

      if (!res.ok) {
        setStatus("error");
        setErrorMessage(data.error ?? `サーバーエラー (${res.status})`);
        return;
      }

      setStatus("saved");
      setTimeout(() => setStatus("idle"), 3000);
    } catch {
      setStatus("error");
      setErrorMessage("ネットワークエラーが発生しました");
    }
  }

  function handleDiscard() {
    setTitle(initialTitle);
    setContent(initialContent);
    setIsEditing(false);
    setStatus("idle");
  }

  if (!isEditing) {
    return (
      <button
        onClick={() => setIsEditing(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium transition-all hover:border-accent/40 hover:bg-muted"
      >
        <Edit3 className="h-3.5 w-3.5 text-muted-foreground" />
        タイトル・本文を編集
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="mono-label">記事編集</h3>
        <button
          onClick={handleDiscard}
          className="rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">タイトル</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/20"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">本文（Markdown）</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={20}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs leading-relaxed focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/20 resize-y"
        />
      </div>

      <button
        onClick={handleSave}
        disabled={status === "saving" || !isDirty}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-accent/40 bg-accent/5 px-3 py-2 text-xs font-medium transition-all hover:bg-accent/10 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === "saving" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Save className="h-3.5 w-3.5" />
        )}
        保存してコミット
      </button>

      {status === "saved" && (
        <p className="flex items-center gap-1 text-xs text-emerald-700">
          <CheckCircle2 className="h-3 w-3" />
          保存しました
        </p>
      )}
      {status === "error" && (
        <p className="flex items-center gap-1 text-xs text-red-600">
          <AlertCircle className="h-3 w-3" />
          {errorMessage}
        </p>
      )}
    </div>
  );
}
