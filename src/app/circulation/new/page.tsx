import Link from "next/link";
import UploadCirculationForm from "@/components/UploadCirculationForm";

export default function NewCirculationPage() {
  return (
    <div>
      <Link
        href="/circulation"
        className="text-green-600 text-sm mb-4 inline-block hover:underline"
      >
        ← 回覧板一覧に戻る
      </Link>
      <h1 className="text-xl font-bold text-gray-800 mb-4">
        📜 回覧板をアップロード
      </h1>
      <UploadCirculationForm />
    </div>
  );
}
