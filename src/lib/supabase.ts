import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Supabase は anon key で初期化する。
// RLS で comments テーブルに対し select / insert (長さ制約付き) のみ許可している。
// 環境変数が未設定なら null を返し、呼び出し側で適切にフォールバック表示する。
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn(
    "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY is not set. Comments feature is disabled."
  );
}

export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null;
