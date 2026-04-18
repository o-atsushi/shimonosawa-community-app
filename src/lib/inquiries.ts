import { client } from "@/lib/microcms";
import type {
  Inquiry,
  InquiryCategory,
  InquiryCms,
  InquiryContent,
  InquiryInput,
} from "@/types";

function formatInquiry(c: InquiryCms): Inquiry {
  const hasResponse =
    !!c.responseBody && !!c.respondedAt && !!c.respondedBy;
  return {
    id: c.id,
    title: c.title,
    body: c.body,
    category: c.category[0],
    status: c.status?.[0] ?? "pending",
    // 公開日時を優先（下書き→公開された時点）、未公開なら createdAt
    createdAt: c.publishedAt ?? c.createdAt,
    response: hasResponse
      ? {
          body: c.responseBody!,
          respondedAt: c.respondedAt!,
          respondedBy: c.respondedBy!,
        }
      : undefined,
  };
}

export async function getInquiries(
  category?: InquiryCategory
): Promise<Inquiry[]> {
  if (!client) return [];
  const res = await client.getList<InquiryCms>({
    endpoint: "inquiries",
    queries: {
      filters: category ? `category[contains]${category}` : undefined,
      orders: "-publishedAt",
      limit: 100,
    },
  });
  return res.contents.map(formatInquiry);
}

export async function getInquiry(id: string): Promise<Inquiry | undefined> {
  if (!client) return undefined;
  try {
    const c = await client.get<InquiryCms>({
      endpoint: "inquiries",
      contentId: id,
    });
    return formatInquiry(c);
  } catch {
    return undefined;
  }
}

// 住民の投稿は下書きとして保存。役員が microCMS 管理画面で公開操作をするまで一覧に出ない。
export async function createInquiry(
  input: InquiryInput
): Promise<{ id: string }> {
  if (!client) {
    throw new Error("microCMS client is not configured");
  }
  return client.create<InquiryContent>({
    endpoint: "inquiries",
    content: {
      title: input.title,
      body: input.body,
      category: [input.category],
      status: ["pending"],
    },
    isDraft: true,
  });
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
