import CirculationAdminLink from "@/components/CirculationAdminLink";
import CirculationCard from "@/components/CirculationCard";
import { getCirculations } from "@/lib/circulations";

// 取得した一覧を即時反映したいので revalidate は短め。
// 投稿/削除時にも /api/circulations で revalidatePath を叩いている。
export const revalidate = 60;

export default async function CirculationListPage() {
  const items = await getCirculations();

  return (
    <div className="relative">
      <h1 className="text-xl font-bold text-gray-800 mb-2">📜 回覧板</h1>
      <p className="text-xs text-gray-500 mb-4">
        役員がアップロードした回覧書類の写真をご確認いただけます。
        過去の書類もここからいつでも見られます。
      </p>

      {items.length === 0 ? (
        <div className="bg-white rounded-xl p-6 text-center text-sm text-gray-500 border border-gray-100">
          まだ回覧板は投稿されていません。
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {items.map((c) => (
            <CirculationCard key={c.id} circulation={c} />
          ))}
        </div>
      )}

      {/* 役員のみ表示されるフローティングボタン */}
      <CirculationAdminLink />
    </div>
  );
}
