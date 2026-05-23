import AdminResponsesPage from "@/components/AdminResponsesPage";

// 役員専用の課題回答一覧ページ。
// 認可はクライアント側で /api/admin/responses 経由で is_admin チェック後にデータ取得する。
// (SSR ではリクエスト元の lineUserId が分からないため)
export default async function TaskResponsesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminResponsesPage taskId={id} />;
}
