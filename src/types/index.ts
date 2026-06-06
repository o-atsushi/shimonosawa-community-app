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
  // 概要と本文で書き分け迷いが発生していたため summary は廃止し、body 一本化。
  // microCMS 側でも summary フィールドは未入力で OK (型から外したので参照されない)
  body: string; // リッチエディタ (HTML)
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
  body: string;
  category: Category;
  date: string;
  imageUrl?: string;
  important: boolean;
  pdf?: PdfAttachment;
  // 清掃活動などで参加表明 (RSVP) を有効化したい場合 true
  rsvpEnabled?: boolean;
}

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
export type HomeCategoryId = Category | "tasks" | "circulation";

export interface CategoryInfo {
  id: HomeCategoryId;
  label: string;
  icon: string;
  description: string;
  color: string;
  // カードの遷移先パス。未指定の場合は `/${id}` に遷移する
  href?: string;
}

// ===== ご意見・要望掲示板 =====

// 投稿の種別: 「質問」か「要望」かを選ばせる
export type InquiryKind = "question" | "request";

// 投稿カテゴリ (質問/要望共通):
// - operations: 自治会の運営 (会費・役員・総会など)
// - event: イベント (清掃活動・お祭りなど)
// - facility: 設備・環境 (掲示板・遊具・街灯など)
// - app: この自治会アプリの機能
// - other: その他
export type InquiryCategory =
  | "operations"
  | "event"
  | "facility"
  | "app"
  | "other";
export type InquiryStatus = "pending" | "in_progress" | "answered";

export interface InquiryResponse {
  body: string;
  respondedAt: string; // ISO date string
  respondedBy: string; // 例: "市民課"
}

export interface Inquiry {
  id: string;
  kind: InquiryKind;
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
  kind: InquiryKind;
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
  // microCMS のセレクトフィールドは配列で返る
  kind: [InquiryKind];
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

// 投票の回答方式。
// - single: 単一選択 (デフォルト)。1 人 1 票で 1 つの選択肢を選ぶ
// - multiple: 複数選択。1 人で複数の選択肢にチェックできる
// - freetext: 自由記述。選択肢なし。テキストエリアで自由に回答してもらう
//             自由入力モードは「個人回答」で、他の住民からは見えない (役員のみ Supabase で参照)
export type VoteMode = "single" | "multiple" | "freetext";

// microCMS のスキーマに対応する型 (セレクト型は単一選択でも配列で返る)
export interface TaskContent {
  title: string;
  // 概要と本文で書き分け迷いが生じやすかったため summary は廃止し、body 一本化。
  // microCMS 側でも summary フィールドは未入力で OK (型から外したので参照されない)
  body: string; // リッチエディタ (HTML)
  status: [TaskStatus];
  // 役員が新たに設定するフィールド (任意。未設定でも画面は壊れない)
  priority?: [TaskPriority];
  // 決めていく順序 (小さいほど先に表示)。同値なら publishedAt 降順
  displayOrder?: number;
  // 投票選択肢 (改行区切り)。空または未設定なら投票機能は表示しない (single / multiple のみ)
  // 例: "賛成\n反対\nどちらでもない"
  voteOptionsRaw?: string;
  // 投票期限 (ISO date string)。未設定なら無期限
  voteDeadline?: string;
  // 回答方式。未設定なら "single" (後方互換)
  voteMode?: [VoteMode];
}

export type TaskCms = TaskContent & MicroCMSListContent;

// フロントエンド用に整形した型
export interface Task {
  id: string;
  title: string;
  body: string;
  status: TaskStatus;
  priority?: TaskPriority;
  displayOrder?: number;
  // パース後の投票選択肢。空配列なら投票機能なし (freetext モードでも空配列で OK)
  voteOptions: string[];
  // 投票期限 (ISO date string)。未設定なら無期限
  voteDeadline?: string;
  // 回答方式。未設定は "single"
  voteMode: VoteMode;
  publishedAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

// ===== 会員 / 役員 (Supabase members) =====
//
// 軽量メンバー管理。LIFF 初回アクセスで自動登録され、is_admin だけは
// 役員が Supabase 側で SQL で立てる運用。会費・会員番号などは持たない。
export interface Member {
  id: string;
  lineUserId: string;
  displayName: string;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

// 役員向け: 1 課題分の各回答者 (line_user_id 単位でまとめたもの)
export interface TaskResponseRow {
  lineUserId: string;
  displayName: string; // 未登録なら "(未登録)"
  // single / multiple: 選択肢の配列 (single は要素 1)
  // freetext: 空配列 (本文は freeText に)
  selectedOptions: string[];
  freeText: string | null;
  reason: string | null;
  createdAt: string; // 当該ユーザーの最古行の created_at
}

// ===== 課題ごとの投票 (Supabase) =====

// 集計結果。
// - single / multiple: option ごとの票数 + 回答者総数 (uniqueな投票者数)
// - freetext: 個人回答モードのため住民側には公開せず、件数のみ
export interface VoteSummary {
  total: number; // 投票した「人数」(uniqueなlineUserId数)
  counts: Record<string, number>; // option name → count (freetext では空)
}

// 自分の回答 (3 モード共通)。
// - single: selectedOptions に 1 件、必要なら reason
// - multiple: selectedOptions に N 件
// - freetext: freeText に本文
export interface OwnVote {
  selectedOptions: string[];
  freeText: string | null;
  reason: string | null;
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

// ===== デジタル回覧板 (Supabase circulations) =====
//
// 役員が紙の回覧書類 (市役所からの通知など) をアプリで撮影してアップロードし、
// 全会員がいつでも過去の書類を写真付きで見られるようにする機能。
// タイトル + 画像 N 枚のシンプルな構造。
export interface Circulation {
  id: string;
  title: string;
  // Supabase Storage circulation-images バケットの public URL の配列
  imageUrls: string[];
  // 投稿者の LINE userId (役員。表示はしない)
  uploadedByLineUserId: string | null;
  createdAt: string; // ISO date string
}

export interface CirculationInput {
  title: string;
  imageUrls: string[];
}
