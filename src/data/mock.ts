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
      "令和8年度の市民税・県民税の申告受付を開始します。\n\n■ 申告期間\n2月16日（月）〜 3月15日（日）\n\n■ 受付場所\n市役所1階 市民税課\n\n■ 必要なもの\n・マイナンバーカードまたは通知カード\n・源泉徴収票\n・各種控除の証明書\n\n詳しくは市役所市民税課までお問い合わせください。",
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
      "市民課の窓口混雑状況をリアルタイムで確認できるサービスを開始しました。\n\n市公式ウェブサイトから、現在の待ち人数や推定待ち時間を確認できます。\n\nご来庁前にぜひご活用ください。",
    category: "news",
    date: "2026-04-08",
    important: false,
  },
  {
    id: "events-1",
    title: "春の市民マラソン大会",
    summary: "5月10日開催。参加者募集中です！",
    content:
      "今年も春の市民マラソン大会を開催します。\n\n■ 日時\n5月10日（日）9:00スタート\n\n■ コース\n市民公園周回コース（5km / 10km）\n\n■ 参加費\n一般：2,000円\n高校生以下：無料\n\n■ 申込締切\n4月25日（金）\n\n市民課窓口またはWebからお申し込みください。",
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
      "市立図書館にて春の読書フェアを開催します。\n\n■ 期間\n4月20日（月）〜 5月5日（火・祝）\n\n■ 内容\n・司書おすすめ本の特集展示\n・お子さま向け読み聞かせ（土日 14:00〜）\n・ブックリサイクル市\n\n皆さまのご来館をお待ちしております。",
    category: "events",
    date: "2026-04-03",
    important: false,
  },
  {
    id: "life-1",
    title: "4月のゴミ収集カレンダー",
    summary: "4月のゴミ出しスケジュールをご確認ください。",
    content:
      "4月のゴミ収集スケジュールです。\n\n■ 燃えるゴミ：毎週月・木\n■ 燃えないゴミ：第1・第3水曜\n■ 資源ゴミ：毎週火曜\n■ 粗大ゴミ：要予約（電話 0120-XXX-XXX）\n\n※ ゴールデンウィーク期間中の変更\n4/29（水・祝）→ 5/1（金）に振替\n5/4（月・祝）→ 5/7（木）に振替\n\n収集日の朝8:00までに所定の場所へお出しください。",
    category: "life",
    date: "2026-03-28",
    important: false,
  },
  {
    id: "life-2",
    title: "マイナンバーカードの休日交付窓口",
    summary: "毎月第2日曜日にマイナンバーカードの受取ができます。",
    content:
      "マイナンバーカードの休日交付を実施しています。\n\n■ 日時\n毎月第2日曜日 9:00〜12:00\n\n■ 場所\n市役所1階 市民課窓口\n\n■ 必要なもの\n・交付通知書（ハガキ）\n・本人確認書類\n・通知カード\n\n※ 要予約：電話またはWebで事前予約してください。",
    category: "life",
    date: "2026-03-25",
    important: false,
  },
];
