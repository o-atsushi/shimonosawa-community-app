"use client";

import Link from "next/link";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-green-600 text-white shadow-md">
      <div className="max-w-lg mx-auto px-4 py-3 flex items-center">
        <Link href="/" className="flex items-center">
          <span className="text-xl font-bold">野州シモノサワCommunity</span>
        </Link>
      </div>
    </header>
  );
}
