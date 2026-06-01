import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Header } from "@/components/layout/Header";

export const metadata: Metadata = {
  title: { default: "keyaki portal", template: "%s | keyaki portal" },
  description: "keyaki チームの社内ポータル",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-svh">
        <Header />
        <main className="px-4 sm:px-6 py-6 sm:py-10">{children}</main>
      </body>
    </html>
  );
}
