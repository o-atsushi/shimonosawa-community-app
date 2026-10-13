---
name: line-broadcast
description: LINE 公式アカウントから、自治会アプリの会員 (Supabase members に登録された住民) 全員に、アプリの該当ページを開くボタン付きのカード型メッセージを一斉送信する。「回覧板をアップロードしたので LINE で知らせて」「LINE で住民に一斉送信して」「会員にお知らせを送って」「LINE 配信」などの依頼で使う。文面づくり → 送らずに検証 → 自分だけにテスト送信 → ユーザーの明示的な OK → 本番送信、の順を必ず守る。
---

# LINE 一斉送信 (アプリ会員向けカード)

送信は取り消せず、無料プランの通数 (月 200 通、**届いた人数 × 通数** で消費) も使う。
**どのステップも省略しない。** 特に本番送信は、ユーザーがチャットで「送信」「OK」等を明示した後にだけ行う。

スクリプト: `scripts/line-broadcast.mjs` (依存なし、Node 18+)

## 0. 事前確認

`.env` に以下があるか、**値を表示せずに** 確認する (`grep -c '^KEY=' .env` など)。トークンや userId を画面に出さない・ユーザーに聞かない。

| キー | 中身 |
|---|---|
| `LINE_TOKEN` (または `LINE_MESSAGING_CHANNEL_ACCESS_TOKEN`) | Messaging API のチャネルアクセストークン |
| `LIFF_ID` (または `NEXT_PUBLIC_LIFF_ID`) | LIFF ID (`2008589405-xxxx` のようにハイフン付き) |
| `LINE_TEST_TO` | テスト送信先 = ユーザー本人の LINE userId |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 宛先 (members) の取得用 |

足りなければ、どのキーを `.env` に追記してほしいかだけ伝えて止まる。

## 1. 文面づくり

### 回覧板のお知らせ (いちばん多い用途)
回覧板は **1 件ずつではなく、まとめてアップロードした後に 1 通でまとめて知らせる** 運用 (ユーザーの方針)。

1. 対象を拾う: `node scripts/line-broadcast.mjs new-circulations`
   → 前回の回覧板お知らせ (sent.log の本番送信) 以降に追加された回覧板を、日本時間付きで一覧表示する。履歴が無い時は直近 14 日分
2. 一覧をユーザーに見せ、今回知らせる範囲を確認する (日付でまとまりが分かれている時は特に)
3. カードは次の形にする: タイトルに件数、`items` に回覧板のタイトル、ボタンは一覧 `/circulation`
   (一覧では未読の回覧に緑枠 + ● が付くので、個別ページではなく一覧に飛ばす)

```json
{
  "label": "📜 回覧板",
  "title": "新しい回覧板が 7 件届きました",
  "body": "以下の回覧板をアプリにアップロードしました。お手すきの際にご覧ください。",
  "items": ["要保護世帯等支援の申請について", "野洲であい博のお知らせ", "…"],
  "button": { "label": "回覧板を見る", "path": "/circulation" },
  "altText": "📜 新しい回覧板が 7 件届きました"
}
```

### それ以外 (お知らせ・イベント・課題など)

ユーザーの依頼から、カードの中身を `.line-broadcast/drafts/<YYYYMMDD>-<短い英数字>.json` に書く (`.line-broadcast/` は gitignore 済み)。

```json
{
  "label": "📜 回覧板",
  "title": "秋の一斉清掃のお知らせ",
  "body": "10/20(日) 9:00〜 公民館前に集合です。詳細は回覧板をご確認ください。",
  "items": ["(任意) 箇条書きにしたい項目"],
  "imageUrl": "https://… (任意。https の画像のみ)",
  "button": { "label": "回覧板を開く", "path": "/circulation/xxxx" },
  "altText": "(任意) スマホの通知に出る文。省略時は label + title"
}
```

- **label** は内容に合わせる: `📜 回覧板` / `📢 お知らせ` / `📅 イベント` / `📋 新設自治会の課題` / `💬 ご意見・要望` / `🏠 生活情報`
- **title** は短く (通知で切れないよう 20 字前後)。**body** は 2〜3 行。住民 (ノンエンジニア・年配の方含む) が読む前提で、丁寧で簡潔に
- **button.path** はアプリ内のパス:
  - 一覧: `/circulation` `/news` `/tasks` `/inquiries` `/life`
  - 個別: `/circulation/<id>` `/news/<id>` `/events/<id>` `/tasks/<id>` `/inquiries/<id>`
  - 個別ページの id が分からない時は、ユーザーにアプリでそのページを開いて URL を共有してもらうか、一覧ページへのリンクにする
  - 回覧板の id と写真 URL は Supabase から引ける: `curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/circulations?select=id,title,image_urls,created_at&order=created_at.desc&limit=5" -H "apikey: …"` (キーは .env から読み、表示しない)
- **imageUrl** は回覧板の 1 枚目の写真などがあると見栄えが良い。無ければ省略

## 2. 送らずに検証 (check)

```bash
node scripts/line-broadcast.mjs check .line-broadcast/drafts/<file>.json
```

LINE 側の形式チェック・宛先人数・今月の残り通数・プレビューが出る。**この時点では誰にも送っていない。**
結果をそのままユーザーに見せ、文面の修正があれば JSON を直して check をやり直す。
残り通数が足りない場合はその旨を伝えて止まる。

## 3. 自分だけにテスト送信 (test)

ユーザーに「あなたの LINE にだけテスト送信してよいか」を確認してから実行:

```bash
node scripts/line-broadcast.mjs test .line-broadcast/drafts/<file>.json
```

テスト送信も 1 通分の通数を使う。ユーザーに LINE で見た目とボタンの遷移先を確認してもらう。

## 4. 本番送信 (send)

最終確認として次をまとめて提示し、**ユーザーの明示的な OK を待つ**:
- タイトル / 本文 / リンク先
- 宛先人数と、送信後の残り通数
- 「送信すると取り消せません」

OK が出たら、check で表示された人数を `--expect` に渡して実行:

```bash
node scripts/line-broadcast.mjs send .line-broadcast/drafts/<file>.json --expect <人数>
```

- 確認後に会員数が変わっていたら、スクリプトは送らずに止まる → check からやり直す
- 通信エラー時はスクリプトが同じリトライキーで再送するので二重には届かない。**失敗と表示されても、自分の判断で send を再実行しない**。結果を伝えてユーザーに判断を仰ぐ (再実行すると二重送信になり得る)

## 5. 結果報告

送信人数と残り通数を伝える。送信履歴は `.line-broadcast/sent.log` に残る (日時・タイトル・リンク・人数のみ。userId は残さない)。

## 補足

- 宛先は「アプリを 1 回以上開いた会員」。公式アカウントを友だち追加していない人・ブロック中の人には届かない (その分の通数は消費されない)
- 今月の残り通数だけ見たい時: `node scripts/line-broadcast.mjs quota`
- カードは hero (写真) / body / footer のみで組んでいる。header に背景色を付けると一部の LINE で「システムエラー」になった実績があるため、構造は変えない
