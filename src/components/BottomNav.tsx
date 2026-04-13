"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "ホーム", icon: "🏠" },
  { href: "/news", label: "お知らせ", icon: "📢" },
  { href: "/events", label: "イベント", icon: "🎉" },
  { href: "/emergency", label: "防災", icon: "🚨" },
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
              className={`flex flex-col items-center py-2 px-3 text-xs transition-colors ${
                isActive
                  ? "text-green-600 font-bold"
                  : "text-gray-500 hover:text-green-500"
              }`}
            >
              <span className="text-xl mb-0.5">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
