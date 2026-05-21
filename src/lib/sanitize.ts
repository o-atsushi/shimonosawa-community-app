import sanitizeHtml from "sanitize-html";

// HTML 入力を「保存前」と「描画前」の両方で sanitize する。
// 保存前 sanitize で DB に汚染されたデータが入るのを防ぎ、
// 描画前 sanitize で過去データ・他経路からの想定外データも安全にする (多層防御)。
//
// 入稿者 (役員) が microCMS 経由で書く本文は信頼できるが、
// 住民投稿 (inquiries) は untrusted なので住民用は厳しめにしている。

// 役員入稿の articles / tasks 用 (リッチエディタフル機能)
export const TRUSTED_BODY_SANITIZE: sanitizeHtml.IOptions = {
  allowedTags: [
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "p",
    "div",
    "br",
    "hr",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "s",
    "del",
    "ins",
    "blockquote",
    "code",
    "pre",
    "ul",
    "ol",
    "li",
    "a",
    "img",
    "figure",
    "figcaption",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "span",
  ],
  allowedAttributes: {
    a: ["href", "name", "target", "rel"],
    img: ["src", "alt", "width", "height"],
    "*": ["class", "id"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: {
        ...attribs,
        rel: "noopener noreferrer",
      },
    }),
  },
};

// 住民投稿 (inquiries) 用 (厳しめ)。
// - 表組み / pre / code / iframe などは禁止
// - リンクは外部のみ (mailto / tel は禁止)
// - 画像は Supabase Storage の public URL のみ受け付ける
//   (=自前アップロード経由でしか image を貼れないようにし、画像追跡ピクセル等を弾く)
export function inquiryBodySanitize(): sanitizeHtml.IOptions {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  // 例: https://abcd.supabase.co/storage/v1/object/public/inquiry-images/...
  const allowedImgPrefix = supabaseUrl
    ? `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/inquiry-images/`
    : "";
  return {
    allowedTags: [
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "h2",
      "h3",
      "ul",
      "ol",
      "li",
      "a",
      "img",
      "blockquote",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt"],
    },
    allowedSchemes: ["http", "https"],
    transformTags: {
      // 外部リンクは noopener / noreferrer / _blank を強制
      a: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
    },
    exclusiveFilter: (frame) => {
      // 画像は Supabase Storage 配下のみ許可。それ以外は要素ごと削除。
      if (frame.tag === "img") {
        const src = frame.attribs?.src ?? "";
        if (!allowedImgPrefix) return true; // env 未設定なら画像全部弾く
        return !src.startsWith(allowedImgPrefix);
      }
      return false;
    },
  };
}

// サーバー側 (Route Handler 内) で住民投稿本文を保存前にきれいにする。
export function sanitizeInquiryBody(html: string): string {
  return sanitizeHtml(html, inquiryBodySanitize());
}
