import type { Metadata, Viewport } from "next";
import "./globals.css";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import LiffProvider from "@/components/LiffProvider";

export const metadata: Metadata = {
  title: "野州シモノサワCommunity",
  description: "下ノ沢自治会からの情報をお届けするLINEアプリです",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full bg-gray-50 text-gray-900">
        <LiffProvider>
          <Header />
          <main className="max-w-lg mx-auto px-4 py-4 pb-20">{children}</main>
          <BottomNav />
        </LiffProvider>
      </body>
    </html>
  );
}
