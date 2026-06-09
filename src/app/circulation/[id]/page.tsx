import { notFound } from "next/navigation";
import Link from "next/link";
import CirculationDeleteButton from "@/components/CirculationDeleteButton";
import CirculationViewsAdminLink from "@/components/CirculationViewsAdminLink";
import RecordCirculationView from "@/components/RecordCirculationView";
import { getCirculation } from "@/lib/circulations";

export const revalidate = 60;

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}/${mm}/${dd}`;
}

export default async function CirculationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const c = await getCirculation(id);
  if (!c) return notFound();

  return (
    <div>
      <Link
        href="/circulation"
        className="text-green-600 text-sm mb-4 inline-block hover:underline"
      >
        ← 回覧板一覧に戻る
      </Link>
      <h1 className="text-lg font-bold text-gray-800 mb-1">{c.title}</h1>
      <p className="text-xs text-gray-400 mb-4">{formatDateTime(c.createdAt)}</p>

      <div className="space-y-3">
        {c.imageUrls.map((url, idx) => (
          <a
            key={url}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-white rounded-xl border border-gray-100 overflow-hidden"
          >
            {/* タップで原寸表示 (新規タブ) */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`${c.title} - 写真 ${idx + 1}`}
              className="w-full h-auto"
              loading="lazy"
            />
          </a>
        ))}
      </div>

      {/* 閲覧履歴を記録 (LIFF ログイン済みの住民のみ) */}
      <RecordCirculationView circulationId={c.id} />

      <div className="mt-6 flex items-center justify-between gap-2 flex-wrap">
        <CirculationViewsAdminLink circulationId={c.id} />
        <CirculationDeleteButton circulationId={c.id} />
      </div>
    </div>
  );
}
