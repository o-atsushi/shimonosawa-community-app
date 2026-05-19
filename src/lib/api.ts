import { client } from "@/lib/microcms";
import { mockArticles, categories } from "@/data/mock";
import type {
  Article,
  FormattedArticle,
  Category,
  CategoryInfo,
} from "@/types";

// microCMS のレスポンスをフロント用に整形
// category が空配列など、想定外フィールド欠落でも例外を出さないよう全てに既定値
function formatArticle(article: Article): FormattedArticle {
  const isoDate =
    article.publishedAt ?? article.createdAt ?? new Date().toISOString();
  return {
    id: article.id,
    title: article.title ?? "",
    summary: article.summary ?? "",
    content: article.content ?? "",
    category: article.category?.[0] ?? "news",
    date: isoDate.split("T")[0],
    imageUrl: article.image?.url,
    important: article.important ?? false,
    pdf: article.pdfUrl
      ? {
          url: article.pdfUrl,
          fileName: article.pdfFileName ?? "document.pdf",
          fileSize: article.pdfFileSize,
        }
      : undefined,
    rsvpEnabled: article.rsvpEnabled ?? false,
  };
}

export function getCategories(): CategoryInfo[] {
  return categories;
}

export async function getArticles(
  category?: Category
): Promise<FormattedArticle[]> {
  if (!client) {
    if (!category) return mockArticles;
    return mockArticles.filter((a) => a.category === category);
  }

  const filters = category ? `category[contains]${category}` : undefined;
  const res = await client.getList<Article>({
    endpoint: "articles",
    queries: {
      filters,
      orders: "-publishedAt",
      limit: 50,
    },
  });
  return res.contents.map(formatArticle);
}

export async function getArticleById(
  id: string
): Promise<FormattedArticle | undefined> {
  if (!client) {
    return mockArticles.find((a) => a.id === id);
  }

  try {
    const article = await client.get<Article>({
      endpoint: "articles",
      contentId: id,
    });
    return formatArticle(article);
  } catch (err) {
    // 404 (記事なし)、ネットワーク失敗、formatArticle 内の例外などを全て吸収
    console.warn("[articles] getArticleById failed", err);
    return undefined;
  }
}

export async function getLatestArticles(
  limit: number = 5
): Promise<FormattedArticle[]> {
  if (!client) {
    return [...mockArticles]
      .sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )
      .slice(0, limit);
  }

  const res = await client.getList<Article>({
    endpoint: "articles",
    queries: {
      orders: "-publishedAt",
      limit,
    },
  });
  return res.contents.map(formatArticle);
}
