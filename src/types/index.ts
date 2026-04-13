import type { MicroCMSListContent, MicroCMSImage } from "microcms-js-sdk";

export type Category = "news" | "events" | "emergency" | "life";

// microCMS のスキーマに対応する型
export interface ArticleContent {
  title: string;
  summary: string;
  content: string; // リッチエディタ (HTML)
  category: [Category]; // セレクトフィールド
  image?: MicroCMSImage;
  important?: boolean;
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
}

export interface CategoryInfo {
  id: Category;
  label: string;
  icon: string;
  description: string;
  color: string;
}
