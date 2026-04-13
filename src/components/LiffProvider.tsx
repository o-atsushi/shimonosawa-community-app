"use client";

import { useEffect, useState, ReactNode } from "react";
import { initLiff } from "@/lib/liff";

export default function LiffProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initLiff().then(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">読み込み中...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
