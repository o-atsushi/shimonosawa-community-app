import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// サーバー専用。service role key は RLS を無視するので、Client Component から import しないこと。
// AI相談の質問ログ / AI用資料は住民に見せないデータなので、anon key ではなくこちらで読み書きする
// (テーブル側は RLS 有効・ポリシーなし = anon からは一切触れない)。
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin: SupabaseClient | null =
  url && serviceRoleKey
    ? createClient(url, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;
