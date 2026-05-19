import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import {
  createAccessCode,
  getAllAccessCodes,
} from "@/lib/access-codes";

// GET /api/admin/access-codes?lineUserId=U***
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const guard = await requireAdmin(searchParams.get("lineUserId"));
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const codes = await getAllAccessCodes();
  return NextResponse.json({ codes });
}

// POST /api/admin/access-codes
// body: { lineUserId, input: { code, description?, validUntil? } }
export async function POST(request: Request) {
  let body: {
    lineUserId?: string;
    input?: {
      code?: string;
      description?: string | null;
      validUntil?: string | null;
    };
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "リクエストの形式が不正です" },
      { status: 400 }
    );
  }
  const guard = await requireAdmin(body.lineUserId);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const input = body.input ?? {};
  if (!input.code || typeof input.code !== "string") {
    return NextResponse.json(
      { error: "コードを入力してください" },
      { status: 400 }
    );
  }
  try {
    const code = await createAccessCode({
      code: input.code,
      description: input.description ?? null,
      validUntil: input.validUntil ?? null,
    });
    revalidatePath("/admin/access-codes");
    return NextResponse.json({ code }, { status: 201 });
  } catch (err) {
    console.error("[admin/access-codes] POST failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "追加に失敗しました" },
      { status: 500 }
    );
  }
}
