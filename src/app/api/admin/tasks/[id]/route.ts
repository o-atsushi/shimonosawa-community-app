import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAdminLineUser } from "@/lib/members";
import { deleteTaskById, updateTaskContent } from "@/lib/tasks";
import type { TaskInput } from "@/lib/tasks";
import { validateInput } from "../route";

const LINE_USER_ID_PATTERN = /^U[0-9a-f]{32}$/;

// 役員のみ: 課題を更新する。
// body: { input: TaskInput, lineUserId: string }
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: { input?: Partial<TaskInput>; lineUserId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "リクエスト形式が不正です" },
      { status: 400 }
    );
  }
  const { input, lineUserId } = body;
  if (
    typeof lineUserId !== "string" ||
    !LINE_USER_ID_PATTERN.test(lineUserId)
  ) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }
  const admin = await isAdminLineUser(lineUserId);
  if (!admin) {
    return NextResponse.json(
      { error: "課題の更新は役員のみ可能です" },
      { status: 403 }
    );
  }
  const validated = validateInput(input);
  if ("error" in validated) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }
  try {
    await updateTaskContent(id, validated.input);
    revalidatePath("/tasks");
    revalidatePath(`/tasks/${id}`);
    revalidatePath("/");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/tasks/:id] update failed", err);
    return NextResponse.json(
      { error: "課題の更新に失敗しました" },
      { status: 500 }
    );
  }
}

// 役員のみ: 課題を削除する。
// body: { lineUserId: string }
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: { lineUserId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "リクエスト形式が不正です" },
      { status: 400 }
    );
  }
  const { lineUserId } = body;
  if (
    typeof lineUserId !== "string" ||
    !LINE_USER_ID_PATTERN.test(lineUserId)
  ) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }
  const admin = await isAdminLineUser(lineUserId);
  if (!admin) {
    return NextResponse.json(
      { error: "課題の削除は役員のみ可能です" },
      { status: 403 }
    );
  }
  try {
    await deleteTaskById(id);
    revalidatePath("/tasks");
    revalidatePath("/");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/tasks/:id] delete failed", err);
    return NextResponse.json(
      { error: "課題の削除に失敗しました" },
      { status: 500 }
    );
  }
}
