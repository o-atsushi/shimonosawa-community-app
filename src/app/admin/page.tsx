"use client";

import Link from "next/link";
import AdminGate from "@/components/admin/AdminGate";

function Body({ lineUserId }: { lineUserId: string }) {
  void lineUserId; // 使用フラグ。各カードリンク先で再度ガードが走る
  const cards = [
    {
      href: "/admin/members",
      icon: "👥",
      title: "会員管理",
      desc: "会員の追加・編集・入金記録",
    },
    {
      href: "/admin/fees",
      icon: "💰",
      title: "会費表",
      desc: "会員の年度別 会費標準額を設定",
    },
    {
      href: "/admin/access-codes",
      icon: "🔑",
      title: "アクセスコード",
      desc: "準会員 (賃貸マンション) のログインコードを管理",
    },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-800">🛠 役員ダッシュボード</h1>
      <p className="text-xs text-gray-500">
        この画面は役員のみアクセスできます。住民には URL を共有しないでください。
      </p>
      <div className="grid grid-cols-1 gap-3">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="flex items-center gap-3 bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
          >
            <span className="text-3xl">{c.icon}</span>
            <div>
              <p className="font-bold text-gray-800">{c.title}</p>
              <p className="text-xs text-gray-500">{c.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function Page() {
  return <AdminGate>{({ lineUserId }) => <Body lineUserId={lineUserId} />}</AdminGate>;
}
