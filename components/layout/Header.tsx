"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5 font-serif text-lg font-medium tracking-tight">
          <span className="text-accent">keyaki</span>
          <span className="text-muted-foreground font-sans text-sm font-normal">/ portal</span>
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            href="/"
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors",
              pathname === "/"
                ? "bg-muted text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <Home className="h-3.5 w-3.5" />
            ドキュメント
          </Link>
          <Link
            href="/blog"
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors",
              pathname.startsWith("/blog")
                ? "bg-muted text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <PenLine className="h-3.5 w-3.5" />
            ブログ
          </Link>
        </nav>
      </div>
    </header>
  );
}
