# 自治会アプリ 役員向け 運用マニュアル

下ノ沢自治会の LINE アプリ「野州シモノサワCommunity」を **役員のみなさんが日々運用するためのマニュアル** です。
専門用語はなるべく使わず、画面で「どこを押せばいいか」が分かるように書いています。

---

## 目次

1. [このアプリでできること](#1-このアプリでできること)
2. [役員が使う管理ツール (microCMS)](#2-役員が使う管理ツール-microcms)
3. [お知らせ・イベント・生活情報を投稿する](#3-お知らせイベント生活情報を投稿する)
4. [清掃活動など、参加表明 (RSVP) 付きのイベントを投稿する](#4-清掃活動など参加表明-rsvp-付きのイベントを投稿する)
5. [新自治会設立の「課題」を投稿する (投票機能つき)](#5-新自治会設立の課題を投稿する-投票機能つき)
6. [投票結果やコメントを確認する](#6-投票結果やコメントを確認する)
7. [PDF を添付したい時](#7-pdf-を添付したい時)
8. [画像を本文に埋め込みたい時](#8-画像を本文に埋め込みたい時)
8-A. [住民の要望投稿 (リッチエディタ + 画像)](#8-a-住民の要望投稿-リッチエディタ--画像)
8-B. [デジタル回覧板 (紙書類を撮影してアップロード)](#8-b-デジタル回覧板-紙書類を撮影してアップロード)
9. [住民から削除依頼があった時](#9-住民から削除依頼があった時)
10. [困った時 / よくある質問](#10-困った時--よくある質問)
11. [役員アカウントの設定方法](#11-役員アカウントの設定方法)

---

## 1. このアプリでできること

このアプリは LINE の「公式アカウント」から開く、自治会専用のミニアプリです。
住民が見られる画面は次の 5 つです。

| 下部メニュー | 内容 | 役員の主な仕事 |
| --- | --- | --- |
| 🏠 ホーム | 課題ヒーロー + 最新お知らせ | (自動で表示されます) |
| 🎯 新設課題 | 新自治会設立に向けた検討中の課題 + 投票 | **課題の追加・投票選択肢の設定** |
| 📢 お知らせ | 自治会からのお知らせ + イベント案内 (1 つの一覧にバッジ付きで表示) | **記事の投稿** (お知らせ / イベント 両方) |
| 📜 回覧板 | 紙の回覧書類を撮影して共有 | **アプリから写真をアップロード** ([8-B 章](#8-b-デジタル回覧板-紙書類を撮影してアップロード) 参照) |
| 💬 要望 | 住民からの質問・要望 + いいね | **モデレーション・回答** ([6 章](#6-投票結果やコメントを確認する) 参照) |
| 📋 生活 | ゴミ出し・防災など暮らしの情報 | **生活情報の投稿** |

---

## 2. 役員が使う管理ツール (microCMS)

このアプリの「中身」(記事や課題など) は **microCMS (マイクロシーエムエス)** という管理ツールで編集します。
住民は触れません。役員だけがログインできます。

### 2-1. microCMS にログインする

1. ブラウザ (Chrome / Safari など) で [https://shimonosawa.microcms.io/](https://shimonosawa.microcms.io/) を開く
2. 役員アカウントのメールアドレスとパスワードを入力
3. ログイン後、左サイドバーに以下の API (= データの種類) が並んでいます:
   - **articles** … お知らせ / イベント / 生活情報
   - **tasks** … 新設課題
   - **inquiries** … 住民からの要望投稿 (将来用)

> 🔐 アカウントの追加・削除は「管理者」権限のある役員にお願いしてください。

### 2-2. 公開と下書きの違い

microCMS では「公開」と「下書き」が選べます。

- **公開**: 住民のアプリにすぐ反映されます (最大 1 分のキャッシュあり)
- **下書き**: アプリには出ません。役員だけが microCMS で見られます

「とりあえず保存しておきたい」「複数人でレビューしたい」時は下書きで保存し、合意できたら公開に変更してください。

---

## 3. お知らせ・イベント・生活情報を投稿する

3 つとも同じ `articles` という箱に入れます。区別は「カテゴリ」で行います。

### 3-1. 手順

1. microCMS の左サイドバーで **articles** を開く
2. 右上の **「+ 追加」** ボタンを押す
3. 以下を入力:

| 項目 | 必須 | 書き方 |
| --- | --- | --- |
| title | ✅ | 一覧に出る見出し。50 文字以内推奨 |
| body | ✅ | 本文 (リッチエディタ。見出し / 太字 / 画像 OK)。一覧カードには冒頭が自動で抜粋表示されます |
| category | ✅ | `news` / `events` / `life` から 1 つ選ぶ |
| image | (任意) | カードに大きく表示されるトップ画像 |
| important | (任意) | チェックすると 🔴 重要バッジが付く |
| pdfUrl / pdfFileName / pdfFileSize | (任意) | [7 章](#7-pdf-を添付したい時) 参照 |
| rsvpEnabled | (任意) | [4 章](#4-清掃活動など参加表明-rsvp-付きのイベントを投稿する) 参照 |

4. 右上の **「公開」** を押す
5. 住民のアプリに反映されるまで **最大 1 分** ほどかかります

### 3-2. カテゴリの使い分け

- **news (お知らせ)**: 総会のご案内、決定事項の周知、緊急連絡など
- **events (イベント)**: お祭り、清掃活動、防災訓練、定例会など日付のある催し
- **life (生活情報)**: ゴミ出しカレンダー、防災マップ、各種申請窓口など、年中使う情報

> 💡 住民の画面では **`news` と `events` は同じ「📢 お知らせ」ページに一緒に表示** されます (カテゴリバッジで区別)。役員が microCMS で入稿する時はカテゴリを正しく選び分けてください。
> `life` は別画面 (📋 生活) です。

### 3-3. 「重要」マークの使いどころ

`important` にチェックを入れると、一覧で赤い「重要」バッジが付きます。
**月に 1〜2 件まで** に絞ると効果的です。乱発すると埋もれます。

---

## 4. 清掃活動など、参加表明 (RSVP) 付きのイベントを投稿する

イベント記事に「参加 / 不参加 (別日実施予定) / 別日実施済み」を住民が回答できる機能です。

### 4-1. 有効化の手順

1. 通常通り [3 章](#3-お知らせイベント生活情報を投稿する) と同じ手順で `articles` を 1 件追加
2. category は **`events`** を選ぶ
3. **`rsvpEnabled`** にチェックを入れる ✅
4. 公開

これだけで、住民の詳細画面に「参加 / 不参加 / 別日実施済み」のボタンが出ます。

### 4-2. 回答状況を確認する

回答は **Supabase という別のデータベース** に溜まります。役員が見るには:

- アプリ側に「回答一覧画面」はまだ実装していません
- 暫定: Supabase 管理画面 ([https://supabase.com/dashboard](https://supabase.com/dashboard)) にログインし、`cleanup_rsvps` テーブルを `article_id` で絞り込んで確認

> 💡 「アプリ内で回答一覧を見たい」というご要望が出てきたら、開発担当に連絡してください。専用画面を追加できます。

---

## 5. 新自治会設立の「課題」を投稿する (投票機能つき)

役員が叩き台を作り、住民に投票・意見を募るための機能です。

### 5-1. 手順

**おすすめ: アプリ上で作成 (微CMS に行かなくて OK)**

1. アプリの 🎯 新設課題 タブを開く
2. 上部に **「🛡️ 役員: 課題を作成 / 編集」** リンクが表示される (役員のみ)
3. タップ → `/admin/tasks` の管理ページが開く
4. 右上の **「＋ 新規作成」** を押す
5. タイトル / 本文 (リッチエディタで画像も貼れる) / ステータス / 優先度 / 表示順 / 投票設定 を入力
6. **「作成する」** を押す → 一覧に即時反映
7. 既存課題の編集は管理ページの「編集」または、課題詳細ページ上部の「🛡️ 役員: 編集」リンクから可能
8. 削除も編集画面下部の「🗑 削除」ボタンから可能

> 💡 アプリで作成した課題も従来通り **microCMS の tasks にも保存** されるので、microCMS 側から見ても同じデータが入っています。

#### microCMS 側で操作したい場合 (従来通り)

1. microCMS の **tasks** を開く → **「+ 追加」**
2. 以下を入力:

| 項目 | 必須 | 書き方 |
| --- | --- | --- |
| title | ✅ | 課題名 (例: 「集会所の場所をどうするか」) |
| body | ✅ | 詳しい背景・選択肢の解説 (リッチエディタ、画像可)。一覧カードには冒頭が自動で抜粋表示されます |
| status | ✅ | `open` / `in_progress` / `resolved` から選ぶ |
| priority | (任意) | `high` / `medium` / `low` |
| displayOrder | (任意) | 数字。**小さいほど上に表示** されます (1, 2, 3...) |
| voteMode | (任意) | 回答方式: `single` (単一選択・既定) / `multiple` (複数選択可) / `freetext` (自由入力)。詳細は [5-3](#5-3-投票選択肢の書き方) |
| voteOptionsRaw | (任意) | 投票選択肢を **改行区切り** で入力 (`single` / `multiple` のみ。`freetext` では無視される) |
| voteDeadline | (任意) | 回答期限 (日付) |

3. **「公開」** を押す

### 5-2. ステータスの意味

| 値 | 意味 | 使うタイミング |
| --- | --- | --- |
| `open` | 未着手 | 課題は立てたが、まだ議論前 |
| `in_progress` | 検討中 | 投票中・意見募集中 |
| `resolved` | 方針確定 | 役員会で結論が出た。投票はもう受け付けない |

### 5-3. 投票選択肢の書き方

`voteOptionsRaw` フィールドに、選択肢を **改行で 1 行ずつ** 書きます。選択肢の数は何個でも OK。

例:
```
賛成
反対
どちらでもない
```

#### 回答方式 (voteMode)

`voteMode` セレクトで、住民の回答方式を 3 つから選べます。

| 値 | 表示 | 動作 |
| --- | --- | --- |
| `single` (既定) | 🗳 投票 (単一選択) | ラジオボタンで 1 つだけ選ぶ。**「反対」を含む選択肢を選んだ住民は理由の入力が必須** |
| `multiple` | 🗳 投票 (複数選択可) | チェックボックスで何個でも選択可。理由欄は無し |
| `freetext` | 📝 自由回答 | 選択肢を使わずテキストエリアに自由記述。**個人回答で、他の住民からは見えません** (役員のみ Supabase で参照可) |

> 💡 `freetext` モードでは `voteOptionsRaw` は使われません。本文 (body) で「どのテーマについて聞きたいか」を案内するだけで OK です。

> ⚠️ `single` モードの「反対理由必須」は、ただ反対するのではなく、改善のための声を集めるための仕組みです。

### 5-4. 回答期限

`voteDeadline` に日付を入れると、その日を過ぎたら回答が受け付けられなくなります (`single` / `multiple` は集計表示は継続、`freetext` は受付終了の表示のみ)。
未設定なら無期限です。

### 5-5. 住民による回答の修正・取り消し

- 住民は **何度でも回答を変更** できます (期限内なら)。再送信のたびに最新の回答に上書きされます
- 回答済みの住民には **「回答を取り消す」リンク** が表示され、これを押すと自分の回答がデータベースから削除され「未回答」状態に戻ります
- 期限切れ後は変更も取り消しもできません

### 5-6. 優先度と表示順

- `priority` は「重要度」のラベル表示用 (一覧で 🔴/🟡/⚪ のバッジ)
- `displayOrder` は「どの順番で並べたいか」を数値で指定

両方未設定の場合は **公開日が新しい順** に並びます。

---

## 6. 投票結果やコメントを確認する

### 6-1. 投票結果

住民は **アプリの課題詳細ページ** で投票結果 (棒グラフ + 反対理由) を見られます (`single` / `multiple` モード)。

`freetext` (自由回答) モードは個人回答のため住民側には件数だけ表示され、本文は見えません。本文を確認するには Supabase の `votes` テーブルを `task_id` で絞り込んでください (`selected_option` 列に回答本文が入ります)。
役員も同じ画面で確認できます。LIFF ログインさえできていれば誰でも結果は閲覧可能です (匿名集計)。

### 6-2. 役員向け: 名前付きの回答一覧を見る (アプリ内)

役員 (`members.is_admin = true` のアカウント) は、課題詳細ページの投票パネル右下に **「🛡️ 役員: 回答一覧を見る」** リンクが出ます (一般住民には表示されません)。

押すと `/tasks/[id]/responses` の **役員専用ページ** が開き、以下を会員名付きで確認できます:

- 単一選択: 各会員が選んだ選択肢 + 理由 (反対の場合)
- 複数選択: 各会員がチェックしたすべての選択肢
- 自由入力: 各会員の本文 (個人回答が住民同士に見えないモード)

アカウントが `members` に未登録の住民は **「(未登録)」** と表示されます (まだアプリにログインしていない / 自動登録が失敗したケース)。

> 💡 役員アカウントの設定方法は [11 章](#11-役員アカウントの設定方法) を参照してください。

### 6-3. コメント機能

各課題には住民がコメントできます。
**不適切なコメントが投稿された時**:

- そのコメントは本人 (LINE userId が一致する人) のみ「削除」ボタンが押せます
- 役員が他人のコメントを削除する仕組みは今はありません
- どうしても削除が必要な時は開発担当に依頼して Supabase 側で直接削除してもらいます

---

## 7. PDF を添付したい時

総会資料・規約・チラシなどの PDF は、記事に添付できます。

### 7-1. 仕組み

PDF 本体は **Cloudflare R2** という保存場所にアップロードします。
microCMS には「PDF の URL」だけを書きます。

### 7-2. 手順

1. 開発担当または管理者役員から **R2 のアップロード方法** を共有してもらう
   (もしくは自治会公式の Dropbox / Google Drive を使う運用に切り替える)
2. アップロード後の **直接 URL** をコピー
3. microCMS の articles に該当記事を作成 / 編集
4. 以下 3 フィールドを埋める:
   - `pdfUrl` … コピーした URL
   - `pdfFileName` … 住民の画面に表示する名前 (例: `2026年度総会資料.pdf`)
   - `pdfFileSize` … ファイルサイズ (バイト数。任意。書くと「2.3 MB」と表示されます)
5. 公開

> 💡 PDF を差し替えた時は、URL も変わるので microCMS の `pdfUrl` も更新してください。

---

## 8. 画像を本文に埋め込みたい時

お知らせ・イベント・生活情報・課題、いずれの本文 (リッチエディタ) にも画像が埋め込めます。

### 8-1. 手順

1. microCMS で対象の記事 / 課題を開く
2. 本文 (body) のリッチエディタにカーソルを置く
3. ツールバーの **🖼️ 画像** ボタンを押す
4. 画像ファイルを選択 → アップロード
5. 必要に応じて代替テキスト (alt) を入力
6. 公開

画像は microCMS の CDN に保存され、アプリ側でも安全に表示されます (脆弱なタグは自動でフィルタされています)。

---

## 8-A. 住民の要望投稿 (リッチエディタ + 画像)

住民が「💬 要望」から質問・要望を投稿する画面は **リッチエディタ** になっており、太字・見出し・リスト・リンク・画像が使えます。

### 8-A-0. 投稿の公開 / 非公開を切り替える (役員専用)

住民から投稿された要望/質問は **初期状態は「🔒 非公開」** になっており、住民の一覧には出ません。
役員が内容を確認して問題なければアプリ上で **「🌐 公開」に切り替える** ことで初めて一覧に出ます。

#### 操作手順
1. 役員 (`is_admin = true`) が `/inquiries` を開く
2. 上部に **「🛡️ 役員: 公開設定」** リンクが表示される (一般住民には非表示)
3. タップすると `/admin/inquiries` に遷移し、以下のタブが出る:
   - 🔒 **未公開** (デフォルト) … 住民からの新規投稿で、まだ公開していないもの
   - 🌐 **公開中** … 既に公開済みのもの
   - **すべて**
4. 各カードの右下にある **トグルボタン** を押すと公開/非公開を切り替え:
   - 「🔒 非公開 (タップで公開)」を押す → 即時公開
   - 「🌐 公開中 (タップで非公開)」を押す → 一覧から取り下げ

> 💡 個別の詳細ページ (`/inquiries/[id]`) を開いても、役員には同じトグルボタンが上部に表示されます。詳細を見ながら判断したい時はこちらが便利です。

> ⚠️ **microCMS 側に `isPublished` フィールド (boolean) を追加** しておく必要があります (詳細は [8-A-2 ④](#8-a-2-セットアップ-初回のみ))。

### 8-A-0-A. 投稿時に役員 LINE グループへ自動通知する (任意)

住民が要望/質問を投稿した瞬間に、**役員 LINE グループに自動でプッシュ通知** することができます。
通知文には種別・カテゴリ・タイトルと、`/admin/inquiries` (公開設定ページ) への LIFF リンクが入ります。

#### 仕組み
- 公式アカウントの **Messaging API** (Push API) 経由で、指定したグループ ID に対してテキストメッセージを送る
- LINE Login (LIFF) チャネルとは別の **Messaging API チャネル** が必要
- Vercel に環境変数を 2 つ設定するだけで有効化される (未設定なら通知はスキップされ、投稿動作には影響なし)

#### セットアップ手順

##### ① Messaging API チャネルを用意
1. [LINE Developers Console](https://developers.line.biz/console/) にログイン
2. 自治会のプロバイダー → **「Messaging API」** チャネル を確認 (無ければ作成)
   - 既存の公式アカウントを Messaging API 連携した時点でチャネルが作られているはず
3. チャネル設定の **「Messaging API」** タブを開き、**チャネルアクセストークン (長期)** を発行

##### ② 公式アカウントをグループに参加させる
1. LINE の通知先にしたいグループを開く
2. メンバー追加で **公式アカウント** を招待
3. グループ設定で「グループ・複数人トークへの参加を許可」を有効化していること
   (LINE Official Account Manager → 設定 → 応答設定 → グループ・複数人トーク 「許可する」)

##### ③ グループ ID を取得する
Messaging API には「グループ一覧を取る API」が無いため、グループに公式アカウントを招待した直後の **Webhook イベント** から取得するのが一般的です。

簡単な方法:
1. LINE Developers Console → Messaging API → Webhook 設定 を一時的に有効化
2. テキトーな URL (例えば https://webhook.site/ で取得) を Webhook URL に設定
3. 招待したグループで何か発言 → webhook.site に届いた JSON の `source.groupId` ( `C` で始まる文字列) をコピー
4. webhook 設定を元に戻す (アプリ側で受け取らないので不要なら無効化に)

> 💡 もしくは開発担当に「グループ ID を取りたい」と頼めば、別途簡易スクリプトで取れます。

##### ④ Vercel に環境変数を追加
Vercel ダッシュボード → Settings → Environment Variables に以下 2 つを追加:

| キー | 値 |
| --- | --- |
| `LINE_MESSAGING_CHANNEL_ACCESS_TOKEN` | ① で発行したチャネルアクセストークン (長期) |
| `LINE_MODERATION_GROUP_ID` | ③ で取得したグループ ID (`C` で始まる文字列) |

設定後、再デプロイ (= Vercel が自動で行う) すれば次の投稿から通知が届きます。

##### ⑤ 動作確認
1. テスト用アカウントで `/inquiries/new` から要望を投稿
2. 役員グループに「📨 新規要望が投稿されました...」のメッセージが届くか確認
3. メッセージ内の LIFF リンクをタップ → `/admin/inquiries` (公開設定ページ) が開く

> 💡 通知に失敗した場合 (LINE API 5xx、ネットワーク断、トークン失効など) も、要望投稿自体は成功扱いになります。失敗内容は Vercel のサーバーログに残ります。

### 8-A-1. 画像はどこに保存されるか

住民が貼り付けた画像は **Supabase Storage** の `inquiry-images` バケットに保存され、CDN 経由で配信されます。
1 枚あたり **5MB まで** / 形式は **jpeg / png / webp / gif** に制限しています。

### 8-A-2. セットアップ (初回のみ)

Supabase 管理画面で以下を 1 回だけ作成してください。

#### ① バケットを作る
1. 左サイドバー **Storage** をクリック
2. **「New bucket」** を押す
3. 以下を入力:
   - **Name**: `inquiry-images`
   - **Public bucket**: **ON** (これで公開閲覧が可能になる)
4. **Save** を押す

#### ② ポリシー (Policies) を作る

**おすすめ: SQL で一気に設定する**

左サイドバー **SQL Editor** を開き、以下を貼り付けて **Run** を押します。

```sql
-- INSERT 用ポリシー (住民が画像を投稿できるように)
create policy "Allow anon insert to inquiry-images"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'inquiry-images');

-- SELECT 用ポリシー (住民・役員が画像を見られるように)
create policy "Allow public read of inquiry-images"
  on storage.objects for select
  to anon
  using (bucket_id = 'inquiry-images');
```

**「Success. No rows returned」** が出れば完了です。

<details>
<summary>UI で操作したい場合 (クリックして展開)</summary>

1. **Storage → `inquiry-images` バケット → Policies** タブを開く
2. **「New policy」** → **「For full customization」**
3. 1 つ目 (INSERT):
   - Policy name: `Allow anon insert to inquiry-images`
   - Allowed operation: **INSERT**
   - Target roles: **anon**
   - WITH CHECK: `bucket_id = 'inquiry-images'`
4. 同じ手順で 2 つ目 (SELECT):
   - Policy name: `Allow public read of inquiry-images`
   - Allowed operation: **SELECT**
   - Target roles: **anon**
   - USING: `bucket_id = 'inquiry-images'`

</details>

#### ③ 確認
Storage → `inquiry-images` → Policies タブに INSERT と SELECT の anon ポリシーが 2 つ並んでいれば成功です。
試しにアプリの「💬 要望」→ 新規投稿で画像挿入ボタンを押し、画像が貼り付くか確認してください。

#### ④ microCMS の inquiries に `isPublished` フィールドを追加
役員が LIFF 上で公開/非公開を切り替えできるようにするためのフラグです。

1. microCMS → API スキーマ管理 → **inquiries**
2. **「フィールドを追加」** を押す
3. 以下を設定:
   - フィールド ID: `isPublished`
   - 表示名: 「公開する」など
   - 種類: **真偽値 (boolean)**
   - 初期値: **false**
4. 保存

> 💡 既存の投稿 (`isPublished` フィールド追加前のもの) は値が空のままになりますが、アプリ側では「未定義 = 公開済み」として扱うため、住民にも引き続き表示されます。新規投稿のみ初期値 `false` (= 未公開) で記録されます。

### 8-A-3. 不適切な画像が投稿された時

- 投稿者本人が「この投稿を削除」を押せば、その投稿ごと一覧から消えます
- 画像ファイル自体は Supabase Storage に残ったままになります。気になる場合は Supabase Storage の `inquiry-images` から該当ファイルを手動で削除してください
- (将来的に「投稿削除 → 画像も削除」する仕組みを検討中)

---

## 8-B. デジタル回覧板 (紙書類を撮影してアップロード)

市役所などから自治会に届く **紙の回覧書類** を、役員がスマホで撮影してアプリにアップロードする機能です。
アップロードされた書類は全会員が一覧から **いつでも過去分も含めて閲覧** できます。

### 8-B-1. アップロード手順 (役員)

1. アプリの下部メニュー **📜 回覧板** をタップ
2. 画面右下の **「＋ 回覧板を追加」** ボタンを押す (役員アカウントにのみ表示)
3. **タイトル** を入力 (例: 「市役所からのお知らせ (2026年5月)」)
4. **「📷 写真を撮影」** または **「🖼 アルバムから選択」** ボタンから写真を追加
   - **写真を撮影**: その場でカメラを起動して 1 枚撮影
   - **アルバムから選択**: スマホに保存済みの写真を **まとめて複数枚** 選べる
   - 1 件あたり最大 **10 枚** までまとめてアップロード可能
   - JPEG / PNG / WEBP / GIF 対応
   - **大きい写真は自動で縮小されます** (長辺 2000px / JPEG 85% 品質)。スマホで撮った原寸写真 (5〜10MB) でもそのままアップロード OK
5. アップロード完了 (各サムネに ✓ マーク) を確認したら **「公開する」** を押す
6. 一覧に即時反映されます

### 8-B-2. 閲覧 / 削除

- 全会員は `/circulation` から一覧 (サムネイル + タイトル + 日付) を閲覧可能
- **新しいものが上に並びます**
- **月で絞り込み** ができます (投稿のあった月だけが選択肢に出ます)
- 各カードをタップすると **写真がフル表示** され、さらにタップで原寸を新規タブで開けます
- 詳細画面の右下に **「🗑 この回覧板を削除」** が役員にのみ表示されます (誤投稿の取り消しに使用)

### 8-B-2-A. 閲覧履歴の確認 (役員専用)

住民が回覧板の詳細ページを開くと **`circulation_views` テーブルに 1 行記録** されます (LIFF ログイン済みの住民のみ)。

役員は以下の手順で閲覧状況を確認できます:

1. 該当の回覧板の詳細ページを開く
2. 左下に **「🛡️ 役員: 閲覧履歴を見る」** リンクが出る (役員のみ表示)
3. タップすると `/circulation/[id]/views` の **役員専用ページ** が開く

確認できる情報:
- **ユニーク閲覧者** … 何人が見たか (重複なし)
- **延べ閲覧 (PV)** … 同じ人が複数回見た分も含めた累計
- **閲覧者一覧** … 会員名 + その人の PV + 初回 / 最新閲覧日時

> 💡 LIFF ログインしていない住民の閲覧は記録されません。会員登録 (自動) がまだの住民は「(未登録)」と表示されます。

### 8-B-3. セットアップ (初回のみ)

`inquiry-images` バケットと同じ要領で、**`circulation-images`** バケットを Supabase に作ります。

#### ① バケットを作る
1. 左サイドバー **Storage** → **「New bucket」**
2. **Name**: `circulation-images`、**Public bucket**: **ON**

#### ② ポリシーを SQL で設定
左サイドバー **SQL Editor** で実行:

```sql
-- INSERT 用 (役員のみアップロードできる旨は API 側で is_admin チェック)
create policy "Allow anon insert to circulation-images"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'circulation-images');

-- SELECT 用 (全会員が画像を見られるように)
create policy "Allow public read of circulation-images"
  on storage.objects for select
  to anon
  using (bucket_id = 'circulation-images');
```

#### ③ `circulations` テーブル
SQL Editor で実行:

```sql
create table public.circulations (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 100),
  image_urls jsonb not null default '[]'::jsonb,
  uploaded_by_line_user_id text,
  created_at timestamptz not null default now()
);
alter table public.circulations enable row level security;
-- SELECT: 全員 (一覧表示用)
create policy "select_all" on public.circulations for select using (true);
-- INSERT / DELETE は anon に許可 (API 側で is_admin 検証)
create policy "insert_anon" on public.circulations for insert with check (true);
create policy "delete_anon" on public.circulations for delete using (true);
create index if not exists circulations_created_at_idx
  on public.circulations (created_at desc);
```

#### ④ 閲覧履歴テーブル `circulation_views`
役員が「閲覧履歴」を確認するために必要なテーブルです。住民が詳細ページを開くたびに 1 行 INSERT されます。

```sql
create table public.circulation_views (
  id uuid primary key default gen_random_uuid(),
  circulation_id uuid not null references public.circulations(id) on delete cascade,
  line_user_id text not null,
  viewed_at timestamptz not null default now()
);
alter table public.circulation_views enable row level security;
-- SELECT: 役員ページが集計用に使う (実際の権限制御は API 側で is_admin 検証)
create policy "select_all" on public.circulation_views for select using (true);
-- INSERT: anon に許可 (住民が詳細ページを開いた瞬間に記録される)
create policy "insert_anon" on public.circulation_views for insert with check (true);
create index if not exists circulation_views_circulation_id_idx
  on public.circulation_views (circulation_id);
create index if not exists circulation_views_line_user_id_idx
  on public.circulation_views (line_user_id);
```

### 8-B-4. 不要になった回覧板を消したい時

- 詳細ページから役員が「🗑 この回覧板を削除」で消すと、`circulations` テーブルから当該行が消えます
- **Supabase Storage 上の画像本体はそのまま残ります** (ストレージ容量が気になる場合のみ Storage の `circulation-images` から手動削除)

---

## 9. 住民から削除依頼があった時

住民は **自分の投稿のみ** 自分で削除できます (アプリ画面に「削除」ボタンが出ます)。
代理で削除してほしいという依頼があった場合は:

1. どの投稿か (URL や投稿日時) を聞き取る
2. 開発担当に Supabase / microCMS 側での削除を依頼
3. (本人確認は LINE のやり取りで十分とする運用が現実的)

---

## 10. 困った時 / よくある質問

### Q. 投稿が住民の画面に出てきません

- microCMS で **「公開」** を押しましたか? 「下書き」のままだと出ません
- 公開しても **最大 1 分** の遅延があります
- それ以上待っても出ない場合は、ブラウザ / LINE のキャッシュをリロードしてください

### Q. 間違って公開してしまった

- microCMS の該当コンテンツを開き、右上の **「公開状態」を「下書き」** に戻す
- もしくは本文を訂正してから「再公開」する

### Q. アプリにエラー画面が出る

- 開発担当に **「どの画面で / どんなエラーメッセージか / いつ起きたか」** を伝えてください
- 可能ならスクリーンショットを添付するとさらに助かります

### Q. 新しい役員を追加したい

- microCMS の管理者役員に「メンバー追加」を依頼してください
- (将来的に「役員フラグ」をアプリ側で管理する仕組みも準備中です)

### Q. 公式 LINE アカウントへの友だち追加・リッチメニュー変更

- LINE 公式アカウントの管理画面 ([https://manager.line.biz/](https://manager.line.biz/)) で行います
- アクセス権限を持っている役員に依頼してください

---

## 11. 役員アカウントの設定方法

アプリで「役員専用機能」(現状は **各課題の名前付き回答一覧** ページ) にアクセスできるようにするには、**Supabase の `members` テーブルに `is_admin = true` を立てる** 必要があります。

### 11-1. 仕組み (簡単に)

- 住民が初めて LIFF (LINE 経由) でアプリを開くと、`members` テーブルに自動で 1 行登録されます
  - `line_user_id`: LINE のユーザー識別子
  - `display_name`: LINE のプロフィール名
  - `is_admin`: **既定で false (=一般住民)**
- 役員にしたい人を `is_admin = true` に書き換えるのは **Supabase 側で SQL を 1 回叩くだけ** です

### 11-2. 役員フラグを立てる手順

#### ① まずはその人にアプリを 1 回開いてもらう
- LIFF 経由 (LINE 公式アカウントのリッチメニュー等) でアプリを開いてもらうと、`members` テーブルに自動登録されます

#### ② Supabase で対象行を探す
1. Supabase 管理画面 → **Table Editor** → `members` テーブル
2. `display_name` 列で対象の人を探す
3. その行の `id` または `line_user_id` をメモ

#### ③ SQL Editor で is_admin を更新

```sql
-- display_name で見つけた人を役員にする例
update public.members
set is_admin = true, updated_at = now()
where display_name = '山田太郎';
-- もしくは line_user_id を直接指定する方が確実
update public.members
set is_admin = true, updated_at = now()
where line_user_id = 'U1234567890abcdef...';
```

#### ④ 役員から外したい時
```sql
update public.members
set is_admin = false, updated_at = now()
where line_user_id = 'U1234567890abcdef...';
```

### 11-3. 役員アカウントで何ができるか

- 各課題の詳細ページに **「🛡️ 役員: 回答一覧を見る」** リンクが表示される (一般住民には非表示)
- 課題の回答 (single / multiple / freetext いずれも) を **会員名付きで一覧確認** できる
- 将来追加される役員専用ページにもこのフラグでアクセス制御する想定

### 11-4. display_name を変えたい時

`members.display_name` は自動登録時に LINE のプロフィール名で入ります。
表記を統一したい (例: 「ヤマダ」→「山田太郎」など) 場合は Supabase 側で直接編集できます。

```sql
update public.members
set display_name = '山田太郎', updated_at = now()
where line_user_id = 'U1234...';
```

---

## 連絡先

- **アプリ開発担当**: (担当者名・LINE / メール)
- **microCMS 管理者**: (担当者名)
- **LINE 公式アカウント管理**: (担当者名)

> このマニュアルは、機能追加や運用変更にあわせて随時更新します。気になった点があれば開発担当までお知らせください。
