import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "反馈站",
  description: "登录后提交公开/私有反馈，支持 Markdown，公开反馈在广场可搜索。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${plexSans.variable} ${plexMono.variable} antialiased`}>
        <div className="min-h-dvh bg-[var(--bg)] text-[var(--fg)]">
          <Nav />
          <main className="mx-auto w-full max-w-5xl px-5 py-10">{children}</main>
          <footer className="border-t border-zinc-200/70 bg-[var(--surface)]">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-6 text-xs text-zinc-600">
              <span>反馈站</span>
              <span>公开内容可被所有人查看</span>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
