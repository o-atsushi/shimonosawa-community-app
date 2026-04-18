import type { Inquiry, InquiryInput } from "@/types";

// モックデータ & インメモリストア
// 開発環境ではサーバー起動中のみ保持される（HMR でリセットされないよう globalThis に格納）
const globalStore = globalThis as unknown as { __inquiries?: Inquiry[] };

const initialInquiries: Inquiry[] = [
  {
    id: "inq-1",
    category: "request",
    title: "公園の遊具が壊れています",
    body: "中央公園のすべり台が壊れていて危険です。子どもが怪我をしないか心配なので、修繕をお願いできないでしょうか。",
    createdAt: "2026-04-02T10:30:00+09:00",
    status: "answered",
    response: {
      body: "ご連絡ありがとうございます。現地を確認したところ、すべり台の一部に破損を確認しましたので、4月15日までに修繕工事を実施いたします。工事中はご不便をおかけしますが、ご理解のほどよろしくお願いいたします。",
      respondedAt: "2026-04-05T14:00:00+09:00",
      respondedBy: "都市整備課",
    },
  },
  {
    id: "inq-2",
    category: "question",
    title: "粗大ゴミの出し方を教えてください",
    body: "引越しで不要になった家具（ソファ、タンス）を処分したいのですが、手続きの流れを教えてください。",
    createdAt: "2026-04-08T09:15:00+09:00",
    status: "answered",
    response: {
      body: "粗大ゴミは事前申込制です。以下の手順でお願いします。\n\n1. 粗大ゴミ受付センター（0120-XXX-XXX）へ電話\n2. 収集日と料金を確認\n3. コンビニで処理券を購入\n4. 収集日の朝8時までに指定場所へ\n\n料金は品目により異なります（ソファ 1,000円、タンス 1,500円〜）。詳細は市ホームページもご参照ください。",
      respondedAt: "2026-04-08T16:20:00+09:00",
      respondedBy: "環境課",
    },
  },
  {
    id: "inq-3",
    category: "request",
    title: "防犯灯の増設をお願いします",
    body: "駅前の商店街から住宅地へ抜ける路地が暗く、夜道が怖いです。防犯灯を増やしてもらえないでしょうか。",
    createdAt: "2026-04-12T20:00:00+09:00",
    status: "in_progress",
  },
  {
    id: "inq-4",
    category: "question",
    title: "市民プールの営業期間はいつからですか？",
    body: "子どもが楽しみにしています。今年の市民プールのオープン日と閉鎖日を教えてください。",
    createdAt: "2026-04-15T13:40:00+09:00",
    status: "pending",
  },
  {
    id: "inq-5",
    category: "other",
    title: "このアプリ、便利ですね！",
    body: "LINEでお知らせが見られるのは本当に助かります。今後も情報発信をよろしくお願いします。",
    createdAt: "2026-04-16T08:30:00+09:00",
    status: "answered",
    response: {
      body: "嬉しいお言葉ありがとうございます！今後も皆さまにとって便利なアプリとなるよう、機能改善を続けてまいります。ご意見ご要望があればいつでもお寄せください。",
      respondedAt: "2026-04-17T10:00:00+09:00",
      respondedBy: "広報課",
    },
  },
];

if (!globalStore.__inquiries) {
  globalStore.__inquiries = initialInquiries;
}
const inquiries: Inquiry[] = globalStore.__inquiries;

export function getAllInquiries(): Inquiry[] {
  // 新しい順
  return [...inquiries].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getInquiryById(id: string): Inquiry | undefined {
  return inquiries.find((i) => i.id === id);
}

export function addInquiry(input: InquiryInput): Inquiry {
  const now = new Date().toISOString();
  const newInquiry: Inquiry = {
    id: `inq-${Date.now()}`,
    category: input.category,
    title: input.title,
    body: input.body,
    createdAt: now,
    status: "pending",
  };
  inquiries.unshift(newInquiry);
  return newInquiry;
}
