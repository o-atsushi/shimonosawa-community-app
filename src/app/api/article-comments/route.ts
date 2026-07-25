import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createArticleComment } from "@/lib/article-comments";
import type { ArticleCommentInput } from "@/types";

const LINE_USER_ID_PATTERN = /^U[0-9a-f]{32}$/;
// microCMS のコンテンツID は半角英数字 + - / _ を想定
const ARTICLE_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const BODY_MIN = 1;
const BODY_MAX = 1000;

// お知らせ (articles) にコメントを投稿する。
// body: { articleId, body, lineUserId, articleCategory? }
// articleCategory は revalidatePath 用 (news / events / life)。未指定なら 3 種全部 revalidate。
export async function POST(request: Request) {
  let body: Partial<ArticleCommentInput> & { articleCategory?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "リクエストの形式が不正です" },
      { status: 400 }
    );
  }

  const { articleId, body: text, lineUserId, articleCategory } = body;

  if (
    !articleId ||
    typeof articleId !== "string" ||
    !ARTICLE_ID_PATTERN.test(articleId)
  ) {
    return NextResponse.json(
      { error: "記事IDが不正です" },
      { status: 400 }
    );
  }
  if (!text || typeof text !== "string" || text.trim().length < BODY_MIN) {
    return NextResponse.json(
      { error: "コメントを入力してください" },
      { status: 400 }
    );
  }
  if (text.length > BODY_MAX) {
    return NextResponse.json(
      { error: `コメントは${BODY_MAX}文字以内で入力してください` },
      { status: 400 }
    );
  }
  if (
    !lineUserId ||
    typeof lineUserId !== "string" ||
    !LINE_USER_ID_PATTERN.test(lineUserId)
  ) {
    return NextResponse.json(
      { error: "LINEログインが必要です" },
      { status: 401 }
    );
  }

  try {
    const { id } = await createArticleComment({
      articleId,
      body: text.trim(),
      lineUserId,
    });

    // 詳細ページのキャッシュを破棄。カテゴリが分かればピンポイントで、
    // 未指定なら news / events (life は詳細ページ無し) を両方 revalidate。
    if (articleCategory === "news" || articleCategory === "events") {
      revalidatePath(`/${articleCategory}/${articleId}`);
    } else {
      revalidatePath(`/news/${articleId}`);
      revalidatePath(`/events/${articleId}`);
    }

    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    console.error("[article-comments] create failed", error);
    return NextResponse.json(
      { error: "送信に失敗しました。時間をおいて再度お試しください。" },
      { status: 500 }
    );
  }
}
