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
  publishedAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

// ===== 課題ごとのコメント (Supabase) =====

export interface Comment {
  id: string;
  taskId: string;
  body: string;
  createdAt: string; // ISO date string
  // line_user_id は識別目的のみで、API レスポンスには含めない
}

export interface CommentInput {
  taskId: string;
  body: string;
  lineUserId: string;
}
