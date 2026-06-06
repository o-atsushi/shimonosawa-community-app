"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// 6 アイテム想定。横幅が狭いので、各ラベルは 2〜4 文字に収める。
// お知らせ (news) はイベントを統合し、1 つの一覧にカテゴリバッジ付きで表示する。
const navItems = [
  { href: "/", label: "ホーム", icon: "🏠" },
  // 新設課題: ホーム右隣に置いて目立たせる
  { href: "/tasks", label: "新設課題", icon: "🎯" },
  { href: "/news", label: "お知らせ", icon: "📢" },
  { href: "/circulation", label: "回覧板", icon: "📜" },
  { href: "/inquiries", label: "要望", icon: "💬" },
  { href: "/life", label: "生活", icon: "📋" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg">
      <div className="max-w-lg mx-auto flex justify-around">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center py-2 px-1 text-[10px] transition-colors ${
                isActive
                  ? "text-green-600 font-bold"
                  : "text-gray-500 hover:text-green-500"
              }`}
            >
              <span className="text-lg mb-0.5">{item.icon}</span>
              <span className="whitespace-nowrap">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
