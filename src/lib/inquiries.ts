import { client } from "@/lib/microcms";
import type {
  Inquiry,
  InquiryCategory,
  InquiryCms,
  InquiryContent,
  InquiryInput,
  InquiryKind,
} from "@/types";

// 旧スキーマ (テキストエリア) の投稿は HTML タグを含まないプレーン文字列で
// 入っている可能性がある。リッチエディタ移行後は描画側が HTML を期待するので、
// タグが無さそうなものを <p> ... </p> + 改行 → <br> に変換する。
function normalizeBodyHtml(raw: string | undefined | null): string {
  if (!raw) return "";
  // 既にタグが入っていればそのまま (sanitize は描画側 / 保存側で行う)
  if (/<[a-z][\s\S]*?>/i.test(raw)) return raw;
  // 旧プレーンテキスト: エスケープしつつ改行を <br> に
  const escaped = raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<p>${escaped.replace(/\r?\n/g, "<br>")}</p>`;
}

function formatInquiry(c: InquiryCms): Inquiry {
  const hasResponse =
    !!c.responseBody && !!c.respondedAt && !!c.respondedBy;
  return {
    id: c.id,
    title: c.title,
    body: normalizeBodyHtml(c.body),
    // 既存データに kind が無い場合は "request" (要望) として扱う (後方互換)
    kind: c.kind?.[0] ?? "request",
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
    // isPublished フィールドが存在しない旧データは「公開済み」として扱う (後方互換)
    isPublished: c.isPublished ?? true,
  };
}

// ソフトデリート済み (isDeleted=true) を一覧/詳細から除外する microCMS フィルタ
const NOT_DELETED_FILTER = "isDeleted[not_equals]true";
// 未公開 (isPublished=false) を除外するフィルタ。
// isPublished が未定義の旧データは「公開済み」扱いするため equals false で弾く方針。
const PUBLISHED_FILTER = "isPublished[not_equals]false";

// 一般住民向け一覧。公開済み (isPublished != false) かつ未削除のみ返す。
export async function getInquiries(
  category?: InquiryCategory
): Promise<Inquiry[]> {
  if (!client) return [];
  const filters = [
    NOT_DELETED_FILTER,
    PUBLISHED_FILTER,
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

// 役員向け一覧。未公開のものも含めて返す (未削除のみ)。
// microCMS getList の limit は 100 が上限。それ以上見たくなったらページング実装が必要。
export async function getInquiriesForAdmin(): Promise<Inquiry[]> {
  if (!client) return [];
  const res = await client.getList<InquiryCms>({
    endpoint: "inquiries",
    queries: {
      filters: NOT_DELETED_FILTER,
      // 新着が上 (公開済みは publishedAt、未公開は createdAt が使われる)
      orders: "-publishedAt",
      limit: 100,
    },
  });
  return res.contents.map(formatInquiry);
}

// 自分が投稿した一覧 (未公開 / 公開済み / 回答済み 含む、ソフトデリート除外)。
// 「マイ投稿」ページで使う。
export async function getInquiriesByOwner(
  lineUserId: string
): Promise<Inquiry[]> {
  if (!client) return [];
  const filters = [
    NOT_DELETED_FILTER,
    `lineUserId[equals]${lineUserId}`,
  ].join("[and]");
  const res = await client.getList<InquiryCms>({
    endpoint: "inquiries",
    queries: {
      filters,
      // 新着が上 (未公開は createdAt が代入される)
      orders: "-publishedAt",
      limit: 100,
    },
  });
  return res.contents.map(formatInquiry);
}

// 詳細取得。
// 未公開のものでも返す (役員プレビュー / 詳細ページ自体での公開トグル用)。
// 「住民にも見せていいか」は呼び出し側で isPublished をチェックする。
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

// 住民の投稿は microCMS 上では「公開」状態で保存するが、isPublished=false で
// 住民の一覧からは隠す。役員が LIFF 上で公開トグルすると isPublished=true になり一覧に出る。
//
// (以前は isDraft: true で microCMS 下書きにしていたが、その方式だと管理画面に
//  入らないと公開操作ができなかったため、アプリ内で完結する isPublished フラグ
//  方式に変更した)
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
      kind: [input.kind],
      category: [input.category],
      status: ["pending"],
      isPublished: false,
      ...(input.lineUserId ? { lineUserId: input.lineUserId } : {}),
    },
  });
}

// 投稿者本人が呼ぶ。未公開の投稿に限り内容を更新する。
// 所有権と未公開判定は呼び出し側 (Route Handler) で行う。
export async function updateOwnInquiry(
  id: string,
  input: Pick<InquiryInput, "kind" | "category" | "title" | "body">
): Promise<void> {
  if (!client) {
    throw new Error("microCMS client is not configured");
  }
  await client.update<
    Pick<InquiryContent, "kind" | "category" | "title" | "body">
  >({
    endpoint: "inquiries",
    contentId: id,
    content: {
      kind: [input.kind],
      category: [input.category],
      title: input.title,
      body: input.body,
    },
  });
}

// 役員のみが呼ぶ。isPublished を更新する。所有権の検証は呼び出し側で行う。
export async function setInquiryPublication(
  id: string,
  isPublished: boolean
): Promise<void> {
  if (!client) {
    throw new Error("microCMS client is not configured");
  }
  await client.update<Pick<InquiryContent, "isPublished">>({
    endpoint: "inquiries",
    contentId: id,
    content: { isPublished },
  });
}

export const INQUIRY_KIND_LABELS: Record<InquiryKind, string> = {
  question: "質問",
  request: "要望",
};

export const INQUIRY_KIND_DESCRIPTIONS: Record<InquiryKind, string> = {
  question: "わからないことを役員に尋ねたい",
  request: "こうしてほしい、改善してほしいことがある",
};

export const INQUIRY_KIND_COLORS: Record<InquiryKind, string> = {
  question: "bg-purple-100 text-purple-700",
  request: "bg-blue-100 text-blue-700",
};

export const INQUIRY_CATEGORY_LABELS: Record<InquiryCategory, string> = {
  operations: "運営",
  event: "イベント",
  facility: "設備",
  app: "アプリ",
  other: "その他",
};

// カテゴリ選択時の補足説明 (フォーム用)。
// 質問/要望どちらにも使えるよう「〜への要望」のような限定的言い回しは避ける。
export const INQUIRY_CATEGORY_DESCRIPTIONS: Record<InquiryCategory, string> = {
  operations: "会費・役員・総会など、自治会運営について",
  event: "清掃活動・お祭りなど、イベント企画について",
  facility: "掲示板・遊具・街灯など、設備・環境について",
  app: "この自治会アプリの機能について",
  other: "上記にあてはまらないもの",
};

export const INQUIRY_STATUS_LABELS = {
  pending: "受付中",
  in_progress: "対応中",
  answered: "回答済み",
} as const;

export const INQUIRY_CATEGORY_COLORS: Record<InquiryCategory, string> = {
  operations: "bg-blue-100 text-blue-700",
  event: "bg-pink-100 text-pink-700",
  facility: "bg-amber-100 text-amber-800",
  app: "bg-indigo-100 text-indigo-700",
  other: "bg-gray-100 text-gray-700",
};

export const INQUIRY_STATUS_COLORS = {
  pending: "bg-gray-200 text-gray-700",
  in_progress: "bg-yellow-100 text-yellow-800",
  answered: "bg-green-100 text-green-800",
} as const;
