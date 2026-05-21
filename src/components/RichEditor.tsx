"use client";

import { useCallback, useEffect, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";

// 住民が要望/質問を投稿するためのリッチエディタ。
// Tiptap (StarterKit + Image + Link) ベースで以下に絞った構成:
//   - 太字 / 斜体 / 見出し (H2, H3) / 順序付きリスト / 順序なしリスト
//   - リンク (prompt() で URL を入力)
//   - 画像 (file input → /api/uploads/inquiry-image にアップロード → URL を埋め込み)
//
// onChange は HTML 文字列をそのまま返す。
// 親側はサーバーに送る前に空判定 (タグだけ・空白だけ) を行うこと。

interface RichEditorProps {
  value: string;
  onChange: (html: string) => void;
  // 画像アップロード時の認可 (LINE userId 必須)
  lineUserId?: string;
  placeholder?: string;
}

export default function RichEditor({
  value,
  onChange,
  lineUserId,
  placeholder,
}: RichEditorProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // 住民投稿では下記は不要 (誤操作の温床になりやすい)
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Image.configure({
        // <img> はサーバー側でも sanitize するので画像 inline 属性は最小限
        inline: false,
        allowBase64: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
        HTMLAttributes: {
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
      Placeholder.configure({
        placeholder: placeholder ?? "詳しい内容を記入してください",
        emptyEditorClass:
          "before:content-[attr(data-placeholder)] before:text-gray-400 before:float-left before:pointer-events-none before:h-0",
      }),
    ],
    content: value || "",
    // SSR 時に hydration mismatch を出さないため immediatelyRender を切る
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[140px] px-3 py-2",
      },
    },
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML());
    },
  });

  // 親が value を外部リセットした (例: 送信完了で空に戻す) 時に反映
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current && (value === "" || value === "<p></p>")) {
      editor.commands.clearContent();
    }
  }, [value, editor]);

  const handleImagePick = useCallback(() => {
    if (!lineUserId) {
      alert("画像をアップロードするには LINE ログインが必要です。");
      return;
    }
    fileInputRef.current?.click();
  }, [lineUserId]);

  const handleImageChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      // 入力をリセットしておかないと同じファイル選択でイベントが発火しない
      e.target.value = "";
      if (!file || !editor || !lineUserId) return;

      // クライアント側でも軽くバリデーション (サーバーでも検証する)
      if (!file.type.startsWith("image/")) {
        alert("画像ファイルを選んでください。");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert("画像は 5MB 以下にしてください。");
        return;
      }

      const fd = new FormData();
      fd.append("image", file);
      fd.append("lineUserId", lineUserId);
      try {
        const res = await fetch("/api/uploads/inquiry-image", {
          method: "POST",
          body: fd,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          alert(data.error ?? "画像のアップロードに失敗しました。");
          return;
        }
        const data: { url?: string } = await res.json();
        if (!data.url) {
          alert("画像 URL が取得できませんでした。");
          return;
        }
        editor.chain().focus().setImage({ src: data.url, alt: "" }).run();
      } catch (err) {
        console.error("[RichEditor] image upload error", err);
        alert("画像のアップロード中に通信エラーが発生しました。");
      }
    },
    [editor, lineUserId]
  );

  const handleAddLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("リンク先 URL (https://...)", prev ?? "");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    if (!/^https?:\/\//i.test(url)) {
      alert("URL は http(s):// で始めてください。");
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url })
      .run();
  }, [editor]);

  if (!editor) {
    return (
      <div className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-400">
        読み込み中...
      </div>
    );
  }

  // ボタン共通スタイル
  const btn = (active: boolean) =>
    `text-xs font-bold px-2 py-1 rounded ${
      active
        ? "bg-green-600 text-white"
        : "bg-white text-gray-700 hover:bg-gray-100"
    }`;

  return (
    <div className="rounded-lg border border-gray-300 bg-white overflow-hidden">
      {/* ツールバー */}
      <div className="flex flex-wrap gap-1 border-b border-gray-200 bg-gray-50 px-2 py-1.5">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={btn(editor.isActive("bold"))}
          aria-label="太字"
          title="太字"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`italic ${btn(editor.isActive("italic"))}`}
          aria-label="斜体"
          title="斜体"
        >
          I
        </button>
        <button
          type="button"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          className={btn(editor.isActive("heading", { level: 2 }))}
          aria-label="見出し大"
          title="見出し (大)"
        >
          H2
        </button>
        <button
          type="button"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          className={btn(editor.isActive("heading", { level: 3 }))}
          aria-label="見出し小"
          title="見出し (小)"
        >
          H3
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={btn(editor.isActive("bulletList"))}
          aria-label="箇条書き"
          title="箇条書き"
        >
          •
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={btn(editor.isActive("orderedList"))}
          aria-label="番号付きリスト"
          title="番号付きリスト"
        >
          1.
        </button>
        <button
          type="button"
          onClick={handleAddLink}
          className={btn(editor.isActive("link"))}
          aria-label="リンク"
          title="リンクを挿入"
        >
          🔗
        </button>
        <button
          type="button"
          onClick={handleImagePick}
          className={btn(false)}
          disabled={!lineUserId}
          aria-label="画像を挿入"
          title={
            lineUserId
              ? "画像を挿入"
              : "画像挿入には LINE ログインが必要です"
          }
        >
          🖼️
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="hidden"
        />
      </div>

      {/* エディタ本体 (Placeholder 拡張で空時の案内文が出る) */}
      <EditorContent editor={editor} />
    </div>
  );
}
