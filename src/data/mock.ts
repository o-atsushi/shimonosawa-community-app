import type { FormattedArticle, CategoryInfo } from "@/types";

export const categories: CategoryInfo[] = [
  {
    id: "news",
    label: "お知らせ",
    icon: "📢",
    description: "市役所からのお知らせ",
    color: "bg-blue-500",
  },
  {
    id: "events",
    label: "イベント",
    icon: "🎉",
    description: "地域のイベント・行事",
    color: "bg-orange-500",
  },
  {
    id: "life",
    label: "生活情報",
    icon: "🏠",
    description: "ゴミ出し・届出・施設",
    color: "bg-green-500",
  },
];

export const mockArticles: FormattedArticle[] = [
  {
    id: "news-1",
    title: "令和8年度 市民税・県民税の申告について",
    summary: "申告期間は2月16日から3月15日までです。",
    content:
      "<p>令和8年度の市民税・県民税の申告受付を開始します。</p><h3>申告期間</h3><p>2月16日（月）〜 3月15日（日）</p><h3>受付場所</h3><p>市役所1階 市民税課</p><h3>必要なもの</h3><ul><li>マイナンバーカードまたは通知カード</li><li>源泉徴収票</li><li>各種控除の証明書</li></ul><p>詳しくは市役所市民税課までお問い合わせください。</p>",
    category: "news",
    date: "2026-04-10",
    important: false,
    pdf: {
      url: "/sample-pdfs/about-community.pdf",
      fileName: "自治会新設に向けて動き出そうとした理由.pdf",
      fileSize: 55959,
    },
  },
  {
    id: "news-2",
    title: "市役所窓口の混雑状況をリアルタイムで確認できます",
    summary: "Webサイトから窓口の混雑状況を確認できるようになりました。",
    content:
      "<p>市民課の窓口混雑状況をリアルタイムで確認できるサービスを開始しました。</p><p>市公式ウェブサイトから、現在の待ち人数や推定待ち時間を確認できます。</p><p>ご来庁前にぜひご活用ください。</p>",
    category: "news",
    date: "2026-04-08",
    important: false,
  },
  {
    id: "events-1",
    title: "春の市民マラソン大会",
    summary: "5月10日開催。参加者募集中です！",
    content:
      "<p>今年も春の市民マラソン大会を開催します。</p><h3>日時</h3><p>5月10日（日）9:00スタート</p><h3>コース</h3><p>市民公園周回コース（5km / 10km）</p><h3>参加費</h3><ul><li>一般：2,000円</li><li>高校生以下：無料</li></ul><h3>申込締切</h3><p>4月25日（金）</p><p>市民課窓口またはWebからお申し込みください。</p>",
    category: "events",
    date: "2026-04-05",
    important: true,
    pdf: {
      url: "/sample-pdfs/about-community.pdf",
      fileName: "自治会新設に向けて動き出そうとした理由.pdf",
      fileSize: 55959,
    },
  },
  {
    id: "events-2",
    title: "図書館 春の読書フェア",
    summary: "4月20日〜5月5日。おすすめ本の展示や読み聞かせイベントを開催。",
    content:
      "<p>市立図書館にて春の読書フェアを開催します。</p><h3>期間</h3><p>4月20日（月）〜 5月5日（火・祝）</p><h3>内容</h3><ul><li>司書おすすめ本の特集展示</li><li>お子さま向け読み聞かせ（土日 14:00〜）</li><li>ブックリサイクル市</li></ul><p>皆さまのご来館をお待ちしております。</p>",
    category: "events",
    date: "2026-04-03",
    important: false,
  },
  {
    id: "life-1",
    title: "4月のゴミ収集カレンダー",
    summary: "4月のゴミ出しスケジュールをご確認ください。",
    content:
      "<p>4月のゴミ収集スケジュールです。</p><ul><li><strong>燃えるゴミ</strong>: 毎週月・木</li><li><strong>燃えないゴミ</strong>: 第1・第3水曜</li><li><strong>資源ゴミ</strong>: 毎週火曜</li><li><strong>粗大ゴミ</strong>: 要予約（電話 0120-XXX-XXX）</li></ul><h3>ゴールデンウィーク期間中の変更</h3><ul><li>4/29（水・祝）→ 5/1（金）に振替</li><li>5/4（月・祝）→ 5/7（木）に振替</li></ul><p>収集日の朝8:00までに所定の場所へお出しください。</p>",
    category: "life",
    date: "2026-03-28",
    important: false,
  },
  {
    id: "life-2",
    title: "マイナンバーカードの休日交付窓口",
    summary: "毎月第2日曜日にマイナンバーカードの受取ができます。",
    content:
      "<p>マイナンバーカードの休日交付を実施しています。</p><h3>日時</h3><p>毎月第2日曜日 9:00〜12:00</p><h3>場所</h3><p>市役所1階 市民課窓口</p><h3>必要なもの</h3><ul><li>交付通知書（ハガキ）</li><li>本人確認書類</li><li>通知カード</li></ul><p>※ 要予約：電話またはWebで事前予約してください。</p>",
    category: "life",
    date: "2026-03-25",
    important: false,
  },
];
