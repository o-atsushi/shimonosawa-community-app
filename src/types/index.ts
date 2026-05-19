import type { MicroCMSListContent, MicroCMSImage } from "microcms-js-sdk";

export type Category = "news" | "events" | "life";

// 添付PDF（Cloudflare R2 等でホスティングしたPDFを想定）
export interface PdfAttachment {
  url: string;
  fileName: string;
  fileSize?: number; // バイト
}

// microCMS のスキーマに対応する型
export interface ArticleContent {
  title: string;
  summary: string;
  content: string; // リッチエディタ (HTML)
  category: [Category]; // セレクトフィールド
  image?: MicroCMSImage;
  important?: boolean;
  // PDF 添付（microCMS 側では 3フィールド: pdfUrl / pdfFileName / pdfFileSize）
  pdfUrl?: string;
  pdfFileName?: string;
  pdfFileSize?: number;
  // RSVP (清掃活動の参加表明) を有効化するか
  // events カテゴリで清掃活動など、参加状況をトラッキングしたい記事で true にする
  rsvpEnabled?: boolean;
}

// microCMS のレスポンス型（id, createdAt, updatedAt 等が自動付与）
export type Article = ArticleContent & MicroCMSListContent;

// フロントエンド用に整形した型
export interface FormattedArticle {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: Category;
  date: string;
  imageUrl?: string;
  important: boolean;
  pdf?: PdfAttachment;
  // 清掃活動などで参加表明 (RSVP) を有効化したい場合 true
  rsvpEnabled?: boolean;
}

// ===== 会員台帳 / 会費 / 入金 (Supabase) =====

// 会員種別 (ロール)
// member    = 会員 (戸建て等。個別に会費を支払う。完納でアプリログイン可)
// associate = 準会員 (賃貸マンション居住者。管理会社が一括徴収するため個別入金管理なし。
//                     アクセスコード入力でアプリログイン可)
export type MemberRole = "member" | "associate";

export const MEMBER_ROLE_LABELS: Record<MemberRole, string> = {
  member: "会員",
  associate: "準会員",
};

export const MEMBER_ROLE_COLORS: Record<MemberRole, string> = {
  member: "bg-emerald-100 text-emerald-800",
  associate: "bg-sky-100 text-sky-800",
};

// 会員 (Supabase members テーブル)
export interface Member {
  id: string;
  memberNumber: number; // 自動連番 (会員番号)
  displayName: string;
  role: MemberRole;
  lineUserId: string | null;
  household: string | null;
  notes: string | null;
  isAdmin: boolean;
  // 入会日 (YYYY-MM-DD)。当年度途中入会の場合に月割計算で利用。
  // null の場合は「年度始め (4/1) から在籍」とみなす
  joinedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MemberInput {
  displayName: string;
  role: MemberRole;
  lineUserId?: string | null;
  household?: string | null;
  notes?: string | null;
  isAdmin?: boolean;
  joinedAt?: string | null;
}

// 年度・種別ごとの会費標準額
export interface FeeSchedule {
  id: string;
  fiscalYear: number;
  role: MemberRole;
  amount: number; // 円
}

export interface FeeScheduleInput {
  fiscalYear: number;
  role: MemberRole;
  amount: number;
}

// 入金記録
export interface Payment {
  id: string;
  memberId: string;
  fiscalYear: number;
  amount: number;
  paidAt: string; // YYYY-MM-DD
  method: string | null;
  notes: string | null;
  createdAt: string;
}

export interface PaymentInput {
  memberId: string;
  fiscalYear: number;
  amount: number;
  paidAt: string;
  method?: string | null;
  notes?: string | null;
}

// 会員一覧画面で使うサマリ (各会員の今年度入金状況)
export interface MemberWithPaymentStatus extends Member {
  // 今年度 (fiscalYear) の入金合計
  paidThisYear: number;
  // 標準額 (会費表から)。null なら未設定
  expectedThisYear: number | null;
  // "paid" 完納 / "partial" 一部納入 / "unpaid" 未納
  paymentStatus: "paid" | "partial" | "unpaid";
}

// アクセスコード (準会員のログイン用)
export interface AccessCode {
  id: string;
  code: string;
  description: string | null;
  validUntil: string | null; // YYYY-MM-DD or null (無期限)
  createdAt: string;
}

export interface AccessCodeInput {
  code: string;
  description?: string | null;
  validUntil?: string | null;
}

// サーバー API (/api/auth/check) が返すステータス
export type ServerAuthStatus =
  | { kind: "not_registered" } // members に line_user_id がない (新規ユーザー)
  | { kind: "unpaid"; member: Member; expected: number; paid: number } // 会員だが当年度未納
  | { kind: "ok"; member: Member };

// クライアント側で扱う認証ステータス (loading / needs_line_login も含む)
export type AuthStatus =
  | { kind: "loading" }
  | { kind: "needs_line_login" }
  | ServerAuthStatus;

// ===== 清掃活動 RSVP (Supabase cleanup_rsvps) =====

// 参加表明のステータス
// attending = 参加 / skipping = 不参加 (別日実施予定) / alt_done = 別日実施済み
export type RsvpResponse = "attending" | "skipping" | "alt_done";

export interface RsvpSummary {
  total: number;
  counts: Record<RsvpResponse, number>;
}

export interface OwnRsvp {
  response: RsvpResponse;
  altDate: string | null; // YYYY-MM-DD
  note: string | null;
}

// ホーム画面のカテゴリカードに表示するエントリのID。
// articles の Category (news/events/life) に加えて、独自ページへの導線も持つ。
export type HomeCategoryId = Category | "tasks";

export interface CategoryInfo {
  id: HomeCategoryId;
  label: string;
  icon: string;
  description: string;
  color: string;
  // カードの遷移先パス。未指定の場合は `/${id}` に遷移する
  href?: string;
}

// ===== 要望・質問掲示板 =====

export type InquiryCategory = "request" | "question" | "other";
export type InquiryStatus = "pending" | "in_progress" | "answered";

export interface InquiryResponse {
  body: string;
  respondedAt: string; // ISO date string
  respondedBy: string; // 例: "市民課"
}

export interface Inquiry {
  id: string;
  category: InquiryCategory;
  title: string;
  body: string;
  createdAt: string; // ISO date string
  status: InquiryStatus;
  response?: InquiryResponse;
  // 投稿者識別子。クライアントが「自分の投稿か」を判定するために返す。
  // ソフトデリート済みの投稿は一覧/詳細から除外されるため、ここに入らない
  lineUserId?: string;
}

export interface InquiryInput {
  category: InquiryCategory;
  title: string;
  body: string;
  // 投稿者の LINE userId (通知送信用)。LIFFログイン済みの時だけ付与される
  lineUserId?: string;
}

// microCMS 側の生スキーマに対応する型
// - category / status はセレクトフィールドなので配列で返る
// - response は responseBody / respondedAt / respondedBy の3フィールドを
//   役員が管理画面で入力する想定で、存在しない場合は undefined
export interface InquiryContent {
  title: string;
  body: string;
  category: [InquiryCategory];
  status: [InquiryStatus];
  responseBody?: string;
  respondedAt?: string; // ISO date string
  respondedBy?: string;
  // 投稿者の LINE userId (Phase 3 の通知送信用、画面には表示しない)
  lineUserId?: string;
  // 投稿者によるソフトデリートフラグ
  isDeleted?: boolean;
}

export type InquiryCms = InquiryContent & MicroCMSListContent;

// ===== 新自治会設立 課題一覧 =====

// 方針が決まったかどうかを示すステータス。
// open=未着手 / in_progress=検討中 / resolved=方針確定済み (現状の3値の意味付けを変更)
export type TaskStatus = "open" | "in_progress" | "resolved";

// 優先度。high=高 / medium=中 / low=低
export type TaskPriority = "high" | "medium" | "low";

// microCMS のスキーマに対応する型 (セレクト型は単一選択でも配列で返る)
export interface TaskContent {
  title: string;
  summary: string;
  body: string; // リッチエディタ (HTML)
  status: [TaskStatus];
  // 役員が新たに設定するフィールド (任意。未設定でも画面は壊れない)
  priority?: [TaskPriority];
  // 決めていく順序 (小さいほど先に表示)。同値なら publishedAt 降順
  displayOrder?: number;
  // 投票選択肢 (改行区切り)。空または未設定なら投票機能は表示しない
  // 例: "賛成\n反対\nどちらでもない"
  voteOptionsRaw?: string;
  // 投票期限 (ISO date string)。未設定なら無期限
  voteDeadline?: string;
}

export type TaskCms = TaskContent & MicroCMSListContent;

// フロントエンド用に整形した型
export interface Task {
  id: string;
  title: string;
  summary: string;
  body: string;
  status: TaskStatus;
  priority?: TaskPriority;
  displayOrder?: number;
  // パース後の投票選択肢。空配列なら投票機能なし
  voteOptions: string[];
  // 投票期限 (ISO date string)。未設定なら無期限
  voteDeadline?: string;
  publishedAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

// ===== 課題ごとの投票 (Supabase) =====

// 集計結果。option ごとの票数 + 合計。
// 自分の投票は別途 API で取得し、UI 側で合成する
export interface VoteSummary {
  total: number;
  counts: Record<string, number>; // option name → count
}

// 投票理由 (匿名表示用)。option ごとに自由記述の声を一覧表示する。
// line_user_id はクライアントには返さない (匿名性)。
export interface VoteReasonItem {
  option: string;
  reason: string;
  createdAt: string;
}

// ===== 課題ごとのコメント (Supabase) =====

export interface Comment {
  id: string;
  taskId: string;
  body: string;
  createdAt: string; // ISO date string
  // 投稿者識別子。クライアントが「自分のコメントか」を判定するために返す。
  // ソフトデリート済みのコメントは一覧から除外されるため、ここに入らない
  lineUserId?: string;
}

export interface CommentInput {
  taskId: string;
  body: string;
  lineUserId: string;
}
