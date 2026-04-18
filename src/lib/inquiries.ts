import {
  addInquiry,
  getAllInquiries,
  getInquiryById,
} from "@/data/inquiries";
import type { Inquiry, InquiryCategory, InquiryInput } from "@/types";

// モックストアを薄くラップしたインターフェース。
// 将来的にはここを microCMS 呼び出しに差し替えれば
// 画面側コードを変えずに本番運用できる。

export async function getInquiries(
  category?: InquiryCategory
): Promise<Inquiry[]> {
  const all = getAllInquiries();
  if (!category) return all;
  return all.filter((i) => i.category === category);
}

export async function getInquiry(id: string): Promise<Inquiry | undefined> {
  return getInquiryById(id);
}

export async function createInquiry(input: InquiryInput): Promise<Inquiry> {
  return addInquiry(input);
}

export const INQUIRY_CATEGORY_LABELS: Record<InquiryCategory, string> = {
  request: "要望",
  question: "質問",
  other: "その他",
};

export const INQUIRY_STATUS_LABELS = {
  pending: "受付中",
  in_progress: "対応中",
  answered: "回答済み",
} as const;

export const INQUIRY_CATEGORY_COLORS: Record<InquiryCategory, string> = {
  request: "bg-blue-100 text-blue-700",
  question: "bg-purple-100 text-purple-700",
  other: "bg-gray-100 text-gray-700",
};

export const INQUIRY_STATUS_COLORS = {
  pending: "bg-gray-200 text-gray-700",
  in_progress: "bg-yellow-100 text-yellow-800",
  answered: "bg-green-100 text-green-800",
} as const;
