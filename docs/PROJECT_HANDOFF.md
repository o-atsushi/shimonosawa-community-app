# 下ノ沢自治会アプリ — プロジェクト引き継ぎドキュメント

> **別の Claude アカウントへの引き継ぎ用に書かれたドキュメントです。**
> このファイルと [AGENTS.md](../AGENTS.md)、[docs/admin-manual.md](./admin-manual.md) の 3 つを読めば、
> セッション開始から 1 メッセージ目で生産的に動けるようになります。

---

## 1. 一言でいうと

**滋賀県野洲市「下ノ沢」地区の自治会 (新設準備中) のための住民向け LINE LIFF アプリ**。
役員 (ごく少人数) と住民 (数十世帯) が LINE 上で完結して、お知らせ閲覧 / 課題への投票・回答 / 回覧板閲覧 / 要望投稿 等を行う。

- **アプリ URL**: https://yasu-local-community-app.vercel.app (Vercel にデプロイ)
- **GitHub リポジトリ**: `o-atsushi/shimonosawa-community-app`
- **プライマリユーザー**: molehand.okada@hoshinoresorts.com (開発者 兼 自治会役員の 1 人)
- **ユーザー層**: ノンエンジニアの住民・役員。マニュアルは [docs/admin-manual.md](./admin-manual.md) を読むレベル感に合わせて書く。

---

## 2. 技術スタック

| カテゴリ | 使用技術 |
|---|---|
| フレームワーク | **Next.js 16.2.3** (App Router + Turbopack) |
| ランタイム | React 19.2.4 / TypeScript 5 |
| スタイル | Tailwind CSS v4 (@tailwindcss/postcss) |
| LINE SDK | `@line/liff` 2.28 |
| ヘッドレス CMS | **microCMS** (Hobby プラン、API 3 つ: articles / tasks / inquiries) |
| DB | **Supabase** (PostgreSQL + Storage + RLS) |
| 画像ストレージ (PDF) | Cloudflare R2 (配信のみ) |
| リッチエディタ | Tiptap 3.23 (StarterKit + Image + Link + Placeholder) |
| サニタイズ | sanitize-html 2.17 (TRUSTED_BODY / inquiryBody の 2 プロファイル) |
| デプロイ | **Vercel** (Preview Deployments per PR, Production = main merge) |
| LINE 送信 | Messaging API (Push / Multicast エンドポイント直叩き、SDK 不使用) |

> ⚠️ **「This is NOT the Next.js you know」**: Next.js 16 系で App Router も新しいので、
> 書く前に `node_modules/next/dist/docs/` を読むこと ([AGENTS.md](../AGENTS.md) 冒頭に明記)。

---

## 3. ディレクトリ構造

```
.
├── .claude/skills/line-broadcast/ # LINE 一斉送信スキル (文面→検証→テスト送信→本番送信)
├── AGENTS.md                    # Claude Code 向け重要指示 (Next.js バージョン注意 + マニュアル更新ルール)
├── CLAUDE.md                    # @AGENTS.md を import するだけ
├── docs/
│   ├── admin-manual.md          # ノンエンジニア役員向けマニュアル (最重要・PR で必ず更新)
│   ├── supabase-schema.sql      # 本番 Supabase の全スキーマ (書き出し結果。手で編集しない)
│   └── PROJECT_HANDOFF.md       # このファイル
├── scripts/
│   ├── dump-supabase-schema.sql # 本番スキーマを書き出すクエリ (SQL Editor で実行 → CSV)
│   └── line-broadcast.mjs       # アプリ会員全員へ LINE カードを一斉送信 (line-broadcast スキルから使う)
├── src/
│   ├── app/
│   │   ├── page.tsx             # ホーム (カテゴリカード + 新着お知らせ + 課題サマリ)
│   │   ├── admin/               # 役員専用管理ページ (/admin/tasks など)
│   │   ├── api/                 # Route Handler 群
│   │   ├── circulation/         # デジタル回覧板
│   │   ├── events/              # イベント記事
│   │   ├── inquiries/           # ご意見・要望掲示板
│   │   ├── life/                # 生活情報
│   │   ├── news/                # お知らせ (sub-category: 自治会運営 / 土地開発)
│   │   └── tasks/               # 新設自治会の課題 + 投票/回答 + 議決まとめ
│   ├── components/              # Server/Client 両方。Client は "use client" 明示
│   ├── lib/
│   │   ├── api.ts               # fetch ラッパー
│   │   ├── liff.ts              # LIFF SDK 初期化
│   │   ├── microcms.ts          # microCMS クライアント
│   │   ├── supabase.ts          # Supabase クライアント
│   │   ├── sanitize.ts          # TRUSTED_BODY_SANITIZE / inquiryBodySanitize プロファイル
│   │   ├── line-messaging.ts    # Push (役員グループ / 個人宛)
│   │   ├── members.ts           # Supabase members テーブル + isAdmin 判定
│   │   ├── tasks.ts             # 課題 (microCMS tasks) の CRUD と型変換
│   │   ├── articles.ts (?)      # 記事 (microCMS articles)
│   │   ├── inquiries.ts         # 要望 (microCMS inquiries)
│   │   ├── circulations.ts      # 回覧板 (Supabase circulations)
│   │   ├── circulation-views.ts # 閲覧履歴 (Supabase circulation_views)
│   │   ├── circulation-reactions.ts # 興味ある の共通トグル実装
│   │   ├── circulation-interests.ts # 興味ある (Supabase circulation_interests)
│   │   ├── votes.ts             # 投票/回答 (Supabase votes)
│   │   ├── comments.ts          # 課題コメント (Supabase comments)
│   │   ├── comment-likes.ts     # コメントいいね (Supabase comment_likes)
│   │   ├── article-comments.ts  # 記事コメント (Supabase article_comments)
│   │   ├── inquiry-likes.ts     # 要望いいね (Supabase inquiry_likes)
│   │   ├── rsvps.ts             # 清掃活動 RSVP (Supabase cleanup_rsvps)
│   │   ├── articles-badge.ts    # 「重要」等のバッジ
│   │   ├── excerpt.ts           # 本文抜粋
│   │   └── compress-image.ts    # クライアント側 Canvas 圧縮 (2000px/JPEG 85%)
│   └── types/index.ts           # 全ドメイン型を 1 ファイルに集約
```

---

## 4. 外部サービス 一覧 と 環境変数

### 4-1. 一覧

| サービス | 用途 | 設定場所 |
|---|---|---|
| **LINE Developers Console** | LIFF ID (LINE Login チャネル) + Messaging API チャネル + Rich Menu | Vercel 環境変数 |
| **microCMS** | お知らせ / 課題 / 要望 の 3 API (タイトル・本文・メタ) | Vercel 環境変数 |
| **Supabase** | 会員 / コメント / 投票 / 回覧板 / RSVP / いいね / 興味あり の各テーブル + Storage バケット | Vercel 環境変数 |
| **Cloudflare R2** | PDF ホスティング (microCMS に URL 文字列で持たせる) | microCMS 側で URL 入力 |
| **Vercel** | ホスティング + Preview Deployments + 環境変数 | Vercel ダッシュボード |

### 4-2. 環境変数一覧

[.env.local.example](../.env.local.example) に全部書いてあるので新規セッション開始時に必ず読むこと。要約:

| 変数名 | 必須? | 用途 |
|---|---|---|
| `NEXT_PUBLIC_LIFF_ID` | ✅ | LIFF ID (例: `2008589405-abcdEFGH`)。**channel ID だけでは NG**、サフィックス付きの LIFF ID 全体を入れる |
| `MICROCMS_SERVICE_DOMAIN` | ✅ | microCMS のサービス名 |
| `MICROCMS_API_KEY` | ✅ | microCMS の読み書きキー (役員 UI からの CRUD 用) |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase プロジェクト URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon key (RLS で制御) |
| `LINE_MESSAGING_CHANNEL_ACCESS_TOKEN` | 推奨 | Messaging API チャネルの長期トークン。未設定でもアプリは動く (通知だけスキップ) |
| `LINE_MODERATION_GROUP_ID` | 推奨 | 役員 LINE グループの ID (`C...` で始まる) |

> **トークン再発行は本番の通知機能を壊すので要注意**。既存値を Vercel 環境変数から拾う運用。

### 4-3. Supabase のテーブル / Storage 一覧

本番の全スキーマ (テーブル / インデックス / RLS ポリシー / Storage バケット) は **[docs/supabase-schema.sql](./supabase-schema.sql)** にある。
本番から [scripts/dump-supabase-schema.sql](../scripts/dump-supabase-schema.sql) で書き出したもので、空の Supabase に上から流せば再現できる。
- スキーマを変える PR では、**流す SQL を PR 本文に全文記載** → 本番で実行後に書き出し直して `docs/supabase-schema.sql` を更新する
- マニュアルには作成 SQL を書かない (役員が日常で使う SELECT / UPDATE だけ書く)

要約だけ:

| オブジェクト | 用途 |
|---|---|
| **Table** `members` | 会員 (lineUserId, displayName, is_admin)。LIFF 初回アクセスで自動 upsert、`is_admin` だけ SQL で手動管理 |
| **Table** `comments` | 課題コメント (ソフトデリート方式: is_deleted) |
| **Table** `comment_likes` | コメントの 👍 (PK: comment_id, line_user_id) |
| **Table** `article_comments` | お知らせ記事コメント |
| **Table** `inquiry_likes` | 要望のいいね |
| **Table** `votes` | 課題投票/回答 (single/multiple/freetext の 3 モード) |
| **Table** `cleanup_rsvps` | 清掃活動の参加表明 |
| **Table** `circulations` | 回覧板本体 (title, image_urls jsonb, uploaded_by_line_user_id) |
| **Table** `circulation_views` | 回覧板の閲覧履歴 (PV カウント方針で INSERT のみ) |
| **Table** `circulation_interests` | **PR #54 で追加**: 回覧板への「♥ 興味ある」(PK: circulation_id, line_user_id) |
| **Storage** `inquiry-images` | 要望に添付する画像 (リッチエディタからアップロード) |
| **Storage** `circulation-images` | 回覧板の写真 |

---

## 5. 設計上の重要パターン

### 5-1. LIFF 自動会員登録
- `/api/members/me?lineUserId=xxx` を叩くと、未登録なら `members` テーブルに自動 upsert される
- `is_admin` は SQL Editor で `update members set is_admin = true where line_user_id = 'Uxxx'` で手動付与
- LIFF ログインしていない住民は会員登録されない → LINE 通知対象外・既読判定対象外

### 5-2. 役員ゲート (Admin Gating)
全ての役員専用機能は 2 層で守る:

1. **クライアント側 (UI 出し分け)**:
   LIFF から userId 取得 → `/api/members/me` でチェック → `member.isAdmin` が true の場合だけボタン表示
2. **サーバ側 (認可)**:
   API ハンドラ冒頭で `isAdminLineUser(lineUserId)` を呼ぶ (`src/lib/members.ts`)。LINE userId は正規表現 `/^U[0-9a-f]{32}$/` でバリデーション

**参考実装**: [`src/components/AdminTaskEditLink.tsx`](../src/components/AdminTaskEditLink.tsx) (UI) + [`src/app/api/admin/tasks/route.ts`](../src/app/api/admin/tasks/route.ts) (API)

### 5-3. microCMS セレクトフィールドは配列で返る
`status: [TaskStatus]`、`category: [Category]` のように、**単一選択でも常に配列**。
型変換ヘルパ (`formatTask()`, `formatArticle()` 等) で `c.status?.[0] ?? "default"` にして吸収する。

### 5-4. 画像サイズ対策 (Vercel の 4.5MB 制限)
原寸写真をそのままアップロードすると Vercel の body size limit (4.5MB) に引っかかる。
→ クライアント側 Canvas で **長辺 2000px / JPEG 85%** に圧縮してからアップロード (`src/lib/compress-image.ts`)

### 5-5. 世帯単位の 1 票集計
投票は LINE userId 単位ではなく **世帯名** でユニーク化。家族の誰かが入れた後に別メンバーが同じ世帯名で入れると前回を上書き。
世帯名は `localStorage` に保存して次回プリフィル。

### 5-6. 回覧板の「新着」と「既読」 (PR #54)
- 新着表示 (緑枠 + 点滅ドット) = **「投稿から 14 日以内」かつ「その住民が未読」** の AND
- 既読判定は既存の `circulation_views` テーブルを再利用 (詳細ページを開いた瞬間に INSERT)
- 未ログイン住民には既読情報がないため常に未読扱い (投稿から 14 日以内なら全部新着表示)

### 5-7. ソフトデリート vs 物理削除
- **ソフトデリート**: 要望 (`is_deleted`) とコメント (`is_deleted`) — 住民が自分の投稿を取り消すと一覧から除外
- **物理削除**: 回覧板 (役員のみ)、課題 (役員のみ) — microCMS/Supabase からの delete 操作

### 5-8. 下書き状態の表現
- **要望**: microCMS の下書きとは別軸で `isPublished` boolean フィールドを持ち、役員が LIFF 上でトグル。新規投稿は false (未公開)
- **課題**: microCMS の「下書き」ステータスをそのまま使う

### 5-9. Push 通知の方針
- **グループ通知** (`pushTextToGroup`): 役員 LINE グループに 1 通送るだけ。安い、確実
- **個別通知** (`pushTextToUser`): 要望の投稿者本人への回答通知等で使う。友だち未追加だと 400 だが致命的ではないので握りつぶす
- **一斉送信**: アプリからの自動送信はしない。必要な時に `line-broadcast` スキル (`scripts/line-broadcast.mjs`) で members 全員に Multicast (500 件 / リクエスト)。無料プランは月 200 通 (届いた人数 × 通数) なので、送信前に残り通数を必ず確認する

---

## 6. ワークフロー / コーディング規約

### 6-1. ブランチと PR
- **ブランチ名**: `feat/<機能名>` or `fix/<対象>` (ケバブケース、ショート)
- **PR タイトル**: `feat: 課題ページ改修 (…)` のように Conventional Commits 風
- **1 PR 1 機能**: 要件が別のものは別 PR に分ける。要件が未確定なら WIP ローカルコミットだけ残して PR 化しない
- **PR 本文**: `## Summary` + `## Test plan` (チェックリスト) を必ず含める
- **Co-Author**: 全コミットの末尾に `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`
- **PR 本文の末尾**: `🤖 Generated with [Claude Code](https://claude.com/claude-code)`

### 6-2. マニュアル同時更新ルール (必須・[AGENTS.md](../AGENTS.md) に明記)
機能の追加・変更・削除を行う PR では、**必ず同じ PR 内で [docs/admin-manual.md](./admin-manual.md) も更新する**。
- UI / 動線の変化、環境変数追加、運用フロー変更 が対象
- **Supabase に流す SQL (テーブル作成・RLS 等) はマニュアルではなく PR 本文に全文記載する**
- リファクタだけで役員操作に影響なしなら更新不要だが、その旨を PR 本文に明記
- 書き方は「ノンエンジニアが画面でどこを押すか」の粒度で、専門用語は最小限

### 6-3. コミットメッセージ (日本語で OK)
```
feat: 回覧板に新着バッジ + 興味ありボタン

- 具体的な変更点 1
- 具体的な変更点 2

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

### 6-4. テスト前の自動チェック
- 必ず `npx next build` を通してから push
- 型エラーは必ず解消する (lint のみでは不足)
- UI 変更時は Vercel の Preview Deployment で動作確認してからマージ (ユーザーが指示することが多い)

### 6-5. 安全ガード
- `main` に直接 push しない (常に PR 経由)
- destructive 操作 (force push, reset --hard, branch -D, rm -rf) はユーザーに確認
- `git status` を見て意図しない変更 (特に **CSV や credential ファイル**) が含まれていないか必ず確認してから `git add`
- `--no-verify` / `-c commit.gpgsign=false` 禁止

### 6-6. ユーザーからの依頼スタイル
- 日本語で指示が来る。短く明確。例: 「①○○してほしい ②○○もお願いします」のような箇条書き
- 要件が固まっていないときは「要件固めるまで PR はおいておいて」と言われる → 新規ブランチに WIP commit だけ残す
- 認証情報 (API キー、トークン) を Claude に求めるのは禁止 (`organizationInstructions`)
- **個人情報ファイル** (`members_rows.csv` 等) を検知したら警告する

---

## 7. ハマりポイント (過去の失敗から)

### 7-1. LIFF ID のフォーマット
- `2008589405` は **チャネル ID**、LIFF ID ではない
- 正しい LIFF ID は `2008589405-xxxxYYYY` のサフィックス付き
- `https://liff.line.me/{channelId}/...` にアクセスすると「システムエラー」ダイアログが出る
- 必ず Vercel 環境変数の `NEXT_PUBLIC_LIFF_ID` から拾う

### 7-2. LINE Flex Message の互換性
- `header` ブロックに `backgroundColor` + 子要素のパターンで「システムエラー」になるクライアントがある
- → `hero + body + footer` のみのシンプル構造が最も互換性高い (`scripts/line-broadcast.mjs` の実装参照)
- `size: "kilo"` 等の bubble サイズも環境依存で問題が出ることがある。省略推奨

### 7-3. macOS BSD sed の落とし穴
- `sed -i 's/foo\|bar/baz/g'` の `\|` alternation は BSD sed では動かない
- → Python `re.sub()` でまとめて置換する

### 7-4. microCMS getList の limit は 100 まで
- `limit: 200` を指定すると `/admin/inquiries` 等で 400 エラー
- → **最大 100** を厳守 (PR #43 で修正済み)

### 7-5. ArticleCard で imageUrl が描画されない
- `formatArticle()` が imageUrl を返しても `<img>` タグ側で参照していないケースがあった
- → PR #50 で全テンプレートに `<img>` 追加

### 7-6. マージ済みブランチへの follow-up push
- PR が merge されると remote ブランチが削除される
- ローカルで同名ブランチに commit を push しても別物の新規ブランチになる
- → 常に **main から新しいブランチを切る** パターンで対応 (`git checkout main && git pull && git checkout -b feat/...`)

### 7-7. Vercel の 4.5MB body size limit
- 複数枚の原寸写真アップロードで `413 Request Entity Too Large`
- → `src/lib/compress-image.ts` でクライアント側圧縮 (2000px / JPEG 85%)

### 7-8. .env ファイルに秘密情報が入る
- `scripts/line-broadcast.mjs` は `.env` を自動読み込みする (LINE_TOKEN / LIFF_ID / LINE_TEST_TO / Supabase URL・anon key)
- `.env` は `.gitignore` 済み。コミット前に `git status` で必ず確認

---

## 8. ローカルセットアップ

```bash
# 1. 依存インストール
npm install

# 2. 環境変数ファイル
cp .env.local.example .env
# .env に本番の Vercel 環境変数の値をコピー (ユーザーに確認)

# 3. 起動
npm run dev      # http://localhost:3000

# 4. ビルドチェック (push 前に必ず)
npx next build

# 5. LINE 一斉送信 (任意。通常は line-broadcast スキル経由で使う)
# .env の LINE_TOKEN / LIFF_ID / LINE_TEST_TO / NEXT_PUBLIC_SUPABASE_* を読み込む
node scripts/line-broadcast.mjs quota   # 今月の残り通数
```

LIFF の動作確認は **実機の LINE アプリから** 行うのが基本。ローカルで直接開くと `liff.init()` が失敗するので、Vercel の Preview Deployment URL を LINE 公式アカウントの LIFF Endpoint に差し込んで確認する運用もあり。

---

## 9. ユーザーの好み (観察結果)

- **返答は短く**、箇条書きで整理されたものを好む
- **PR の test plan はチェックボックス形式**
- **専門用語を避ける** マニュアルを書く (「ノンエンジニアの自治会役員が読む」が常に念頭)
- **変更の "なぜ" を書く** コミットメッセージ (what は diff を見れば分かる)
- **コメントは最小限**。「WHY が非自明」なものだけ日本語で簡潔に
- **軽微な修正は再通知しない方針** (全体通知が住民の負担にならないよう配慮)
- **要件が固まっていない機能は PR 化しない** (WIP ローカルコミットのみ)

---

## 10. 次セッション開始時の推奨フロー

1. このドキュメント + [AGENTS.md](../AGENTS.md) + [docs/admin-manual.md](./admin-manual.md) を読む
2. `git log --oneline -10` で直近の変更を把握
3. `git status` で未コミットの変更を把握 (未追跡ファイルに個人情報 CSV が無いか必ず確認)
4. `gh pr list --state open` で未マージ PR を把握
5. `git branch -a` でローカル / リモートの未マージブランチを把握 (WIP が残っている可能性あり)
6. ユーザーの依頼を日本語で短く要約し、必要なら 2-3 文で設計案を提示 → 合意を得てから着手
7. 実装 → `npx next build` → **admin-manual.md 更新** → コミット → push → PR 作成
8. 新しい Supabase テーブル / 環境変数が増える場合は **PR 本文の冒頭に「リリース前に必須」として明記**。Supabase に流す SQL は PR 本文にコピペ実行できる形で全文記載 (マニュアルには書かない)。本番適用後に `docs/supabase-schema.sql` を書き出し直す
