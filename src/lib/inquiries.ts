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
    // 投稿者識別子をクライアントに渡し、本人のみ削除ボタンを出せるようにする
    lineUserId: c.lineUserId,
  };
}

// ソフトデリート済み (isDeleted=true) を一覧/詳細から除外する microCMS フィルタ
const NOT_DELETED_FILTER = "isDeleted[not_equals]true";

export async function getInquiries(
  category?: InquiryCategory
): Promise<Inquiry[]> {
  if (!client) return [];
  const filters = [
    NOT_DELETED_FILTER,
    category ? `category[contains]${category}` : "",
  ]
    .filter(Boolean)
    .join("[and]");
  const res = await client.getList<InquiryCms>({
    endpoint: "inquiries",
    queries: {
      filters,
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
    if (c.isDeleted) return undefined;
    return formatInquiry(c);
  } catch {
    return undefined;
  }
}

// 投稿者本人のみが呼べるソフトデリート。所有権の検証は呼び出し側 (Route Handler) で行う。
export async function softDeleteInquiry(id: string): Promise<void> {
  if (!client) {
    throw new Error("microCMS client is not configured");
  }
  await client.update<Pick<InquiryContent, "isDeleted">>({
    endpoint: "inquiries",
    contentId: id,
    content: { isDeleted: true },
  });
}

// 所有権チェック用 (Route Handler 内で呼ぶ)
export async function getInquiryLineUserId(id: string): Promise<string | undefined> {
  if (!client) return undefined;
  try {
    const c = await client.get<InquiryCms>({
      endpoint: "inquiries",
      contentId: id,
    });
    return c.lineUserId;
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
      ...(input.lineUserId ? { lineUserId: input.lineUserId } : {}),
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
