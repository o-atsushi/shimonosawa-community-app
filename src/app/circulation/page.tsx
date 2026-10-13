import CirculationAdminLink from "@/components/CirculationAdminLink";
import CirculationList from "@/components/CirculationList";
import { getInterestCounts } from "@/lib/circulation-interests";
import { getCirculations } from "@/lib/circulations";

// 取得した一覧を即時反映したいので revalidate は短め。
// 投稿/削除時にも /api/circulations で revalidatePath を叩いている。
export const revalidate = 60;

export default async function CirculationListPage() {
  const items = await getCirculations();
  // 興味あり件数を一括取得 (0 件時は空クエリでスキップ)
  const interestCounts = await getInterestCounts(items.map((c) => c.id));

  return (
    <div className="relative">
      <h1 className="text-xl font-bold text-gray-800 mb-2">📜 回覧板</h1>
      <p className="text-xs text-gray-500 mb-4">
        役員がアップロードした回覧書類の写真をご確認いただけます。
        新しいものから順に並びます。まだ開いていない 2 週間以内の回覧には、緑の枠と ● マークがつきます。
      </p>

      <CirculationList items={items} interestCounts={interestCounts} />

      {/* 役員のみ表示されるフローティングボタン */}
      <CirculationAdminLink />
    </div>
  );
}
