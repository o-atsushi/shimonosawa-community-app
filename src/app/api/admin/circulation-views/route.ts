import { NextResponse } from "next/server";
import { getCirculation } from "@/lib/circulations";
import { getViewStats } from "@/lib/circulation-views";
import { isAdminLineUser } from "@/lib/members";

const LINE_USER_ID_PATTERN = /^U[0-9a-f]{32}$/;

// 役員専用: 1 件の回覧板の閲覧統計を取得する。
// body: { circulationId, lineUserId (= viewer / 役員) }
// 返り値: { circulation: { id, title }, stats: { totalViews, uniqueViewers, viewers: [...] } }
export async function POST(request: Request) {
  let body: { circulationId?: string; lineUserId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "リクエスト形式が不正です" },
      { status: 400 }
    );
  }
  const { circulationId, lineUserId } = body;
  if (!circulationId || typeof circulationId !== "string") {
    return NextResponse.json({ error: "回覧板 ID が不正です" }, { status: 400 });
  }
  if (
    typeof lineUserId !== "string" ||
    !LINE_USER_ID_PATTERN.test(lineUserId)
  ) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }
  const admin = await isAdminLineUser(lineUserId);
  if (!admin) {
    return NextResponse.json(
      { error: "このページの閲覧権限がありません (役員のみ)" },
      { status: 403 }
    );
  }
  const circ = await getCirculation(circulationId);
  if (!circ) {
    return NextResponse.json(
      { error: "回覧板が見つかりません" },
      { status: 404 }
    );
  }
  const stats = await getViewStats(circulationId);
  return NextResponse.json({
    circulation: { id: circ.id, title: circ.title, createdAt: circ.createdAt },
    stats,
  });
}
