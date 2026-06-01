"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { ChevronRight, Home, Maximize2, X } from "lucide-react";

interface Breadcrumb {
  label: string;
  href: string | null;
}

interface Props {
  src: string;
  title: string;
  breadcrumbs: Breadcrumb[];
  updatedAt: string;
}

export function SlideViewer({ src, title, breadcrumbs, updatedAt }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className="-mx-4 sm:-mx-6 -mt-6 sm:-mt-10 -mb-6 sm:-mb-10 flex flex-col bg-background"
      style={{ height: "calc(100svh - 56px)" }}
    >
      {/* Top bar */}
      <div className="flex items-center gap-2 px-3 sm:px-4 py-2 border-b border-border bg-card flex-shrink-0">
        {/* Mobile: title only */}
        <div className="flex-1 min-w-0 sm:hidden">
          <p className="text-sm font-medium truncate text-foreground">{title}</p>
        </div>

        {/* Desktop: breadcrumb nav */}
        <nav className="hidden sm:flex items-center gap-1.5 flex-1 min-w-0 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors flex-shrink-0">
            <Home className="h-3.5 w-3.5" />
          </Link>
          {breadcrumbs.slice(1).map((crumb, i) => (
            <span key={i} className="flex items-center gap-1.5 min-w-0">
              <ChevronRight className="h-3.5 w-3.5 opacity-40 flex-shrink-0" />
              {crumb.href ? (
                <Link href={crumb.href} className="hover:text-foreground transition-colors truncate">
                  {crumb.label}
                </Link>
              ) : (
                <span className={`truncate ${i === breadcrumbs.length - 2 ? "text-foreground font-medium" : ""}`}>
                  {crumb.label}
                </span>
              )}
            </span>
          ))}
        </nav>

        {/* Info toggle (mobile only) */}
        <button
          onClick={() => setInfoOpen((v) => !v)}
          className="sm:hidden flex-shrink-0 rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="ドキュメント情報"
        >
          <span className="text-xs font-mono">{updatedAt}</span>
        </button>

        {/* Fullscreen button */}
        <button
          onClick={toggleFullscreen}
          className="flex-shrink-0 rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label={isFullscreen ? "全画面を終了" : "全画面表示"}
        >
          {isFullscreen ? <X className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      </div>

      {/* Info panel (mobile expandable) */}
      {infoOpen && (
        <div className="sm:hidden px-4 py-3 border-b border-border bg-muted/50 flex-shrink-0">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">最終更新: {updatedAt}</p>
        </div>
      )}

      {/* Iframe */}
      <iframe
        src={src}
        className="flex-1 w-full border-0 min-h-0"
        title={title}
        allowFullScreen
      />
    </div>
  );
}
