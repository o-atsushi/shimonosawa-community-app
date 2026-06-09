import CirculationViewsAdminPage from "@/components/CirculationViewsAdminPage";

// 役員専用の閲覧履歴ページ。
// 認可はクライアント側で /api/admin/circulation-views 経由で is_admin チェック後にデータ取得する。
export default async function CirculationViewsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CirculationViewsAdminPage circulationId={id} />;
}
