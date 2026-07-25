import DeleteOwnPostButton from "@/components/DeleteOwnPostButton";
import type { ArticleComment, Category } from "@/types";

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}/${mm}/${dd} ${hh}:${mi}`;
}

// お知らせ (news / events) 記事に紐づくコメント一覧。
// 課題コメントの CommentList と同じレイアウトだが、削除エンドポイントが
// /api/article-comments/[id] で articleId/articleCategory を extraBody で渡す。
export default function ArticleCommentList({
  comments,
  articleCategory,
}: {
  comments: ArticleComment[];
  articleCategory: Category;
}) {
  if (comments.length === 0) {
    return (
      <div className="bg-gray-50 rounded-xl p-5 text-center border border-gray-200">
        <p className="text-sm text-gray-500">
          まだコメントはありません。気になることがあれば投稿してみましょう。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {comments.map((comment) => (
        <article
          key={comment.id}
          className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
              自治会員
            </span>
            <span className="text-xs text-gray-400 ml-auto">
              {formatDateTime(comment.createdAt)}
            </span>
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
            {comment.body}
          </p>
          <div className="flex justify-end mt-2">
            <DeleteOwnPostButton
              ownerLineUserId={comment.lineUserId}
              endpoint={`/api/article-comments/${comment.id}`}
              extraBody={{
                articleId: comment.articleId,
                articleCategory,
              }}
              confirmMessage="このコメントを削除しますか?"
              label="削除"
            />
          </div>
        </article>
      ))}
    </div>
  );
}
