import AdminCirculationTextsPage from "@/components/AdminCirculationTextsPage";

// 役員専用: 回覧板の文字起こし (AI相談の資料)。認可は /api/admin/circulation-texts で is_admin チェック。
export default function AdminCirculationTexts() {
  return <AdminCirculationTextsPage />;
}
