<!-- BEGIN:nextjs-agent-rules -->
# 📘 セッション開始時に必ず読むドキュメント

**初回セッションや別アカウントからの引き継ぎ時は、まず [docs/PROJECT_HANDOFF.md](docs/PROJECT_HANDOFF.md) を読んでください。**
プロジェクトの全体像・技術スタック・外部サービス・設計パターン・運用規約・ハマりポイント・現在の状態 (未マージ WIP 含む) が 1 ファイルにまとまっています。

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 役員向け運用マニュアルの更新ルール (必須)

`docs/admin-manual.md` はノンエンジニアの自治会役員が日々の運用を行うための唯一の手順書です。
**機能の追加・変更・削除を行う PR では、必ず同じ PR 内で `docs/admin-manual.md` も更新してください。**

## 対象となる変更例
- 住民/役員に見える UI / 動線の追加・変更・削除
- microCMS のスキーマ追加・変更 (フィールド名、必須/任意の変更含む)
- 環境変数や外部サービス (Cloudflare R2 など) の追加・変更
- 役員が手で行う運用フロー (公開手順・承認フロー・データ確認方法) の変更
- 新しい管理画面・新しい API エンドポイントの追加

## 具体的にやること
1. 該当する章を探す。無ければ目次と本文に新セクションを追加する。
2. **役員が画面で「どこを押すか」が分かる粒度** で書く (専門用語は最小限、フィールド名は表で列挙)。
3. 「⚠️ 注意」「💡 ヒント」を活用して、ハマりやすい点・運用上の注意を明示する。
4. 既存セクションの記述と矛盾しないか読み直す。古くなった記述があれば同じ PR で直す。
5. PR 本文の test plan に「マニュアル更新済み」のチェック項目を含める。

## Supabase に適用する SQL は PR 本文に書く (マニュアルには書かない)
テーブル作成・カラム追加・RLS ポリシー変更など、Supabase SQL Editor で流す必要がある SQL は
**マニュアルではなく PR 本文の冒頭** に「⚠️ リリース前に必須」として、そのままコピペで実行できる形で全文記載すること。
(役員が日常的に使う確認用の SELECT 文はマニュアルに書いてよい)

## 例外
- リファクタ・内部実装の変更のみで、役員の操作・運用に一切影響しない場合は更新不要。
  ただし PR 説明でその旨を明記すること (「マニュアル更新不要: 役員操作に影響なし」)。
- 未マージの PR でまだ運用に乗っていない機能の修正は、その機能を導入する PR 側でまとめて反映してよい。
