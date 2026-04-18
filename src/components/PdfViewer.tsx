import type { PdfAttachment } from "@/types";

function formatSize(bytes?: number): string | null {
  if (!bytes) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function PdfViewer({ pdf }: { pdf: PdfAttachment }) {
  const size = formatSize(pdf.fileSize);

  return (
    <section className="mt-6">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="text-xl">📄</span>
        <h3 className="font-bold text-sm text-gray-800 flex-1 break-all">
          {pdf.fileName}
        </h3>
        {size && (
          <span className="text-xs text-gray-400 shrink-0">{size}</span>
        )}
      </div>

      {/* PDF埋め込みビューア（ブラウザ標準機能を使用） */}
      <div className="rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
        <iframe
          src={pdf.url}
          className="w-full h-[500px]"
          title={pdf.fileName}
        />
      </div>

      {/* 補助リンク: 別タブで開く・ダウンロード */}
      <div className="flex gap-3 mt-2 text-sm">
        <a
          href={pdf.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-green-600 hover:underline flex items-center gap-1"
        >
          <span>🔍</span>
          <span>別タブで開く</span>
        </a>
        <a
          href={pdf.url}
          download={pdf.fileName}
          className="text-green-600 hover:underline flex items-center gap-1"
        >
          <span>⬇</span>
          <span>ダウンロード</span>
        </a>
      </div>
    </section>
  );
}
