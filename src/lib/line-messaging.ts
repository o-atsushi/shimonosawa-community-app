// LINE Messaging API へのプッシュ通知ヘルパー。
//
// 使い方:
//   - Vercel 環境変数に LINE_MESSAGING_CHANNEL_ACCESS_TOKEN と
//     LINE_MODERATION_GROUP_ID を設定する
//   - 未設定なら関数は静かに何もせず成功扱い (開発 / プレビュー用)
//   - 失敗時はエラーを throw する (呼び出し側で catch して投稿処理は続行する)

const PUSH_ENDPOINT = "https://api.line.me/v2/bot/message/push";

// LINE のテキストメッセージ 1 通あたりの上限は 5000 文字 (Messaging API 仕様)。
// グループ通知用なのでもっと短く抑える前提だが、念のため安全側に切り詰める。
const TEXT_MAX = 1000;

interface PushOptions {
  // 上書き先 (グループ ID 等)。未指定なら LINE_MODERATION_GROUP_ID
  to?: string;
}

export async function pushTextToGroup(
  text: string,
  opts: PushOptions = {}
): Promise<void> {
  const token = process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN;
  const groupId = opts.to ?? process.env.LINE_MODERATION_GROUP_ID;
  if (!token || !groupId) {
    // 未設定: 静かにスキップ
    console.warn(
      "[line-messaging] LINE_MESSAGING_CHANNEL_ACCESS_TOKEN or LINE_MODERATION_GROUP_ID is not set; skip push"
    );
    return;
  }

  const safeText =
    text.length > TEXT_MAX ? `${text.slice(0, TEXT_MAX - 1)}…` : text;

  const res = await fetch(PUSH_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      to: groupId,
      messages: [{ type: "text", text: safeText }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(
      `LINE push failed: HTTP ${res.status} ${errText.slice(0, 200)}`
    );
  }
}
