"use client";

import { useEffect } from "react";
import { markVisited } from "@/lib/articles-badge";

// /news 一覧ページに埋めて、マウント時に最終訪問時刻を更新する。
// これによりホームに戻った時に「お知らせ」バッジが消える。
export default function MarkArticlesVisitedOnMount() {
  useEffect(() => {
    markVisited();
  }, []);
  return null;
}
