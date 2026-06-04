"use client";

import { useRef, useState, useEffect } from "react";
import { ImageIcon, Upload, Loader2, CheckCircle2, AlertCircle, X } from "lucide-react";
import Image from "next/image";

interface CoverImageUploadProps {
  slug: string;
  currentImage?: string;
}

type UploadStatus = "idle" | "loading" | "success" | "error";

async function compressImage(file: File): Promise<File> {
  const MAX_WIDTH = 1200;
  const MAX_HEIGHT = 630;
  const QUALITY = 0.85;

  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;

      if (width > MAX_WIDTH || height > MAX_HEIGHT) {
        const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("canvas unavailable")); return; }
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error("compression failed")); return; }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }));
        },
        "image/jpeg",
        QUALITY
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("load failed")); };
    img.src = url;
  });
}

export function CoverImageUpload({ slug, currentImage }: CoverImageUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [savedFilename, setSavedFilename] = useState<string | null>(currentImage ?? null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/blog/${slug}/image`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { image?: string } | null) => {
        if (data?.image) setSavedFilename(data.image);
      })
      .catch(() => {});
  }, [slug]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setSelectedFile(file);
    setStatus("idle");
    setErrorMessage(null);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setSelectedFile(file);
    setStatus("idle");
    setErrorMessage(null);
  }

  function clearSelection() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSelectedFile(null);
    setStatus("idle");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function upload() {
    if (!selectedFile) return;
    setStatus("loading");
    setErrorMessage(null);

    let fileToUpload: File;
    try {
      fileToUpload = await compressImage(selectedFile);
    } catch {
      fileToUpload = selectedFile;
    }

    const formData = new FormData();
    formData.append("file", fileToUpload);

    try {
      const res = await fetch(`/api/blog/${slug}/image`, {
        method: "POST",
        body: formData,
      });

      let data: { filename?: string; error?: string } = {};
      try {
        data = await res.json() as { filename?: string; error?: string };
      } catch {
        // JSON パース失敗（サーバーエラーで HTML が返った場合など）
      }

      if (!res.ok) {
        setStatus("error");
        setErrorMessage(data.error ?? `サーバーエラー (${res.status})`);
        return;
      }

      setStatus("success");
      setSavedFilename(data.filename ?? null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setSelectedFile(null);
    } catch {
      setStatus("error");
      setErrorMessage("ネットワークエラーが発生しました");
    }
  }

  const displayUrl = previewUrl ?? (savedFilename ? `/api/blog/images/${savedFilename}` : null);

  return (
    <div className="space-y-3">
      <h3 className="mono-label">カバー画像</h3>

      {/* 現在の画像 or プレビュー */}
      {displayUrl ? (
        <div className="relative rounded-lg overflow-hidden border border-border bg-muted aspect-video">
          <Image src={displayUrl} alt="カバー画像" fill className="object-cover" unoptimized />
          {previewUrl && (
            <button
              onClick={clearSelection}
              className="absolute top-1.5 right-1.5 rounded-full bg-black/50 p-1 text-white hover:bg-black/70 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          )}
          {savedFilename && !previewUrl && (
            <p className="absolute bottom-0 left-0 right-0 bg-black/40 px-2 py-1 text-[10px] text-white font-mono truncate">
              {savedFilename}
            </p>
          )}
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/50 aspect-video cursor-pointer hover:border-accent/40 hover:bg-muted transition-colors"
        >
          <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
          <p className="text-xs text-muted-foreground">クリックまたはドロップ</p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* ボタン類 */}
      {!previewUrl && (
        <button
          onClick={() => inputRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium transition-all hover:border-accent/40 hover:bg-muted"
        >
          <Upload className="h-3.5 w-3.5 text-muted-foreground" />
          {savedFilename ? "画像を変更" : "画像を選択"}
        </button>
      )}

      {previewUrl && selectedFile && (
        <button
          onClick={upload}
          disabled={status === "loading"}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-accent/40 bg-accent/5 px-3 py-2 text-xs font-medium transition-all hover:bg-accent/10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === "loading" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
          保存してコミット
        </button>
      )}

      {status === "success" && (
        <p className="flex items-center gap-1 text-xs text-emerald-700">
          <CheckCircle2 className="h-3 w-3" />
          保存しました（{savedFilename}）
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
