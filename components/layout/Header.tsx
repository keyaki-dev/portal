"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-serif text-base sm:text-lg font-medium tracking-tight">
          <span className="text-accent">keyaki</span>
          <span className="text-muted-foreground font-sans text-xs sm:text-sm font-normal">/ portal</span>
        </Link>

        <nav className="flex items-center gap-0.5 sm:gap-1">
          <Link
            href="/"
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-sm transition-colors",
              pathname === "/"
                ? "bg-muted text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
            aria-label="ドキュメント"
          >
            <Home className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline">ドキュメント</span>
          </Link>
          <Link
            href="/blog"
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-sm transition-colors",
              pathname.startsWith("/blog")
                ? "bg-muted text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
            aria-label="ブログ"
          >
            <PenLine className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline">ブログ</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
