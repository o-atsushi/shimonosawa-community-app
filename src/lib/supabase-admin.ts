import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// 機密性が高い情報 (会員台帳・会費・入金) のためのサーバー専用クライアント。
// service_role キーは絶対にクライアントへ露出しないこと。
// API ルート (server-only) からのみ import する。
//
// 役員ダッシュボード / 住民マイページの権限チェックは API ルート側で実施し、
// Supabase 側の RLS は select 全許可 + 書き込み拒否のままで運用する。
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.warn(
    "NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY is not set. Admin features are disabled."
  );
}

export const supabaseAdmin: SupabaseClient | null =
  url && serviceKey
    ? createClient(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;
