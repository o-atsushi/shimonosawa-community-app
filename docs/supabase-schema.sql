-- =====================================================================
-- 下ノ沢自治会アプリ: Supabase スキーマ (本番の現状)
-- =====================================================================
-- 本番 Supabase から scripts/dump-supabase-schema.sql で書き出したもの。
-- 書き出し日: 2026-10-14
--
-- 用途:
--   - 本番の構成を 1 か所で確認するためのリファレンス
--   - 空の Supabase プロジェクトに環境を作り直す時は、このファイルを SQL Editor で上から実行する
--     (Storage バケットは insert 文で作成される。データ (行) は含まない)
--
-- ⚠️ 手で編集しないこと。スキーマを変更したら:
--   1. PR 本文に書いた SQL を本番で実行
--   2. scripts/dump-supabase-schema.sql を SQL Editor で実行し、結果を CSV で書き出す
--   3. このファイルを書き出し結果で置き換えて同じ PR (またはフォローアップ PR) でコミット
-- =====================================================================


-- ---------------------------------------------------------------------
-- テーブル
-- ---------------------------------------------------------------------

create table public.article_comments (
  id uuid not null default gen_random_uuid(),
  article_id text not null,
  line_user_id text not null,
  body text not null,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  constraint article_comments_body_check CHECK (((char_length(body) >= 1) AND (char_length(body) <= 1000))),
  constraint article_comments_pkey PRIMARY KEY (id)
);

create table public.circulation_interests (
  circulation_id uuid not null,
  line_user_id text not null,
  created_at timestamp with time zone not null default now(),
  constraint circulation_interests_pkey PRIMARY KEY (circulation_id, line_user_id)
);

create table public.circulation_paper_requests (
  circulation_id uuid not null,
  line_user_id text not null,
  created_at timestamp with time zone not null default now(),
  constraint circulation_paper_requests_pkey PRIMARY KEY (circulation_id, line_user_id)
);

create table public.circulation_views (
  id uuid not null default gen_random_uuid(),
  circulation_id uuid not null,
  line_user_id text not null,
  viewed_at timestamp with time zone not null default now(),
  constraint circulation_views_pkey PRIMARY KEY (id)
);

create table public.circulations (
  id uuid not null default gen_random_uuid(),
  title text not null,
  image_urls jsonb not null default '[]'::jsonb,
  uploaded_by_line_user_id text,
  created_at timestamp with time zone not null default now(),
  constraint circulations_title_check CHECK (((char_length(title) >= 1) AND (char_length(title) <= 100))),
  constraint circulations_pkey PRIMARY KEY (id)
);

create table public.cleanup_rsvps (
  id uuid not null default gen_random_uuid(),
  article_id text not null,
  line_user_id text not null,
  response text not null,
  alt_date date,
  note text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint cleanup_rsvps_note_check CHECK (((note IS NULL) OR (char_length(note) <= 500))),
  constraint cleanup_rsvps_response_check CHECK ((response = ANY (ARRAY['attending'::text, 'skipping'::text, 'alt_done'::text]))),
  constraint cleanup_rsvps_pkey PRIMARY KEY (id),
  constraint cleanup_rsvps_article_id_line_user_id_key UNIQUE (article_id, line_user_id)
);

create table public.comment_likes (
  comment_id uuid not null,
  line_user_id text not null,
  created_at timestamp with time zone not null default now(),
  constraint comment_likes_pkey PRIMARY KEY (comment_id, line_user_id)
);

create table public.comments (
  id uuid not null default gen_random_uuid(),
  task_id text not null,
  line_user_id text not null,
  body text not null,
  created_at timestamp with time zone not null default now(),
  deleted_at timestamp with time zone,
  constraint comments_body_check CHECK (((char_length(body) >= 1) AND (char_length(body) <= 1000))),
  constraint comments_pkey PRIMARY KEY (id)
);

create table public.inquiry_likes (
  inquiry_id text not null,
  line_user_id text not null,
  created_at timestamp with time zone not null default now(),
  constraint inquiry_likes_pkey PRIMARY KEY (inquiry_id, line_user_id)
);

create table public.members (
  id uuid not null default gen_random_uuid(),
  line_user_id text not null,
  display_name text not null default '住民'::text,
  is_admin boolean not null default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint members_display_name_check CHECK ((char_length(display_name) <= 100)),
  constraint members_pkey PRIMARY KEY (id),
  constraint members_line_user_id_key UNIQUE (line_user_id)
);

create table public.votes (
  id uuid not null default gen_random_uuid(),
  task_id text not null,
  line_user_id text not null,
  selected_option text not null,
  reason text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  household text,
  constraint votes_reason_check CHECK (((reason IS NULL) OR (char_length(reason) <= 200))),
  constraint votes_pkey PRIMARY KEY (id)
);

-- ---------------------------------------------------------------------
-- 外部キー
-- ---------------------------------------------------------------------

alter table public.circulation_interests add constraint circulation_interests_circulation_id_fkey FOREIGN KEY (circulation_id) REFERENCES public.circulations(id) ON DELETE CASCADE;
alter table public.circulation_paper_requests add constraint circulation_paper_requests_circulation_id_fkey FOREIGN KEY (circulation_id) REFERENCES public.circulations(id) ON DELETE CASCADE;
alter table public.circulation_views add constraint circulation_views_circulation_id_fkey FOREIGN KEY (circulation_id) REFERENCES public.circulations(id) ON DELETE CASCADE;

-- ---------------------------------------------------------------------
-- インデックス
-- ---------------------------------------------------------------------

CREATE INDEX article_comments_article_id_idx ON public.article_comments USING btree (article_id);
CREATE INDEX circulation_interests_circulation_id_idx ON public.circulation_interests USING btree (circulation_id);
CREATE INDEX circulation_paper_requests_circulation_id_idx ON public.circulation_paper_requests USING btree (circulation_id);
CREATE INDEX circulation_views_circulation_id_idx ON public.circulation_views USING btree (circulation_id);
CREATE INDEX circulation_views_line_user_id_idx ON public.circulation_views USING btree (line_user_id);
CREATE INDEX circulations_created_at_idx ON public.circulations USING btree (created_at DESC);
CREATE INDEX cleanup_rsvps_article_id_idx ON public.cleanup_rsvps USING btree (article_id);
CREATE INDEX comment_likes_comment_id_idx ON public.comment_likes USING btree (comment_id);
CREATE INDEX comments_task_id_created_at_idx ON public.comments USING btree (task_id, created_at DESC);
CREATE INDEX inquiry_likes_inquiry_id_idx ON public.inquiry_likes USING btree (inquiry_id);
CREATE INDEX members_line_user_id_idx ON public.members USING btree (line_user_id);
CREATE INDEX votes_task_household_idx ON public.votes USING btree (task_id, household) WHERE (household IS NOT NULL);
CREATE INDEX votes_task_id_idx ON public.votes USING btree (task_id);
CREATE UNIQUE INDEX votes_task_user_option_uq ON public.votes USING btree (task_id, line_user_id, selected_option);

-- ---------------------------------------------------------------------
-- RLS 有効化
-- ---------------------------------------------------------------------

alter table public.article_comments enable row level security;
alter table public.circulation_interests enable row level security;
alter table public.circulation_paper_requests enable row level security;
alter table public.circulation_views enable row level security;
alter table public.circulations enable row level security;
alter table public.cleanup_rsvps enable row level security;
alter table public.comment_likes enable row level security;
alter table public.comments enable row level security;
alter table public.inquiry_likes enable row level security;
alter table public.members enable row level security;
alter table public.votes enable row level security;

-- ---------------------------------------------------------------------
-- RLS ポリシー (public)
-- ---------------------------------------------------------------------

create policy insert_anon on public.article_comments as permissive for insert to public with check (true);
create policy select_all on public.article_comments as permissive for select to public using (true);
create policy update_anon on public.article_comments as permissive for update to public using (true) with check (true);
create policy delete_anon on public.circulation_interests as permissive for delete to public using (true);
create policy insert_anon on public.circulation_interests as permissive for insert to public with check (true);
create policy select_all on public.circulation_interests as permissive for select to public using (true);
create policy delete_anon on public.circulation_paper_requests as permissive for delete to public using (true);
create policy insert_anon on public.circulation_paper_requests as permissive for insert to public with check (true);
create policy select_all on public.circulation_paper_requests as permissive for select to public using (true);
create policy insert_anon on public.circulation_views as permissive for insert to public with check (true);
create policy select_all on public.circulation_views as permissive for select to public using (true);
create policy delete_anon on public.circulations as permissive for delete to public using (true);
create policy insert_anon on public.circulations as permissive for insert to public with check (true);
create policy select_all on public.circulations as permissive for select to public using (true);
create policy cleanup_rsvps_insert_all on public.cleanup_rsvps as permissive for insert to public with check ((((char_length(line_user_id) >= 1) AND (char_length(line_user_id) <= 64)) AND ((note IS NULL) OR (char_length(note) <= 500))));
create policy cleanup_rsvps_select_all on public.cleanup_rsvps as permissive for select to public using (true);
create policy cleanup_rsvps_update_all on public.cleanup_rsvps as permissive for update to public using (true) with check ((((char_length(line_user_id) >= 1) AND (char_length(line_user_id) <= 64)) AND ((note IS NULL) OR (char_length(note) <= 500))));
create policy delete_anon on public.comment_likes as permissive for delete to public using (true);
create policy insert_anon on public.comment_likes as permissive for insert to public with check (true);
create policy select_all on public.comment_likes as permissive for select to public using (true);
create policy comments_insert_all on public.comments as permissive for insert to public with check ((((char_length(body) >= 1) AND (char_length(body) <= 1000)) AND ((char_length(line_user_id) >= 1) AND (char_length(line_user_id) <= 64))));
create policy comments_select_all on public.comments as permissive for select to public using (true);
create policy comments_soft_delete on public.comments as permissive for update to public using (true) with check ((deleted_at IS NOT NULL));
create policy delete_self on public.inquiry_likes as permissive for delete to public using (true);
create policy insert_self on public.inquiry_likes as permissive for insert to public with check (true);
create policy select_all on public.inquiry_likes as permissive for select to public using (true);
create policy insert_self on public.members as permissive for insert to public with check (true);
create policy select_all on public.members as permissive for select to public using (true);
create policy votes_delete_all on public.votes as permissive for delete to public using (true);
create policy votes_insert_all on public.votes as permissive for insert to public with check ((((char_length(selected_option) >= 1) AND (char_length(selected_option) <= 200)) AND ((char_length(line_user_id) >= 1) AND (char_length(line_user_id) <= 64))));
create policy votes_select_all on public.votes as permissive for select to public using (true);
create policy votes_update_all on public.votes as permissive for update to public using (true) with check ((((char_length(selected_option) >= 1) AND (char_length(selected_option) <= 200)) AND ((char_length(line_user_id) >= 1) AND (char_length(line_user_id) <= 64))));

-- ---------------------------------------------------------------------
-- RLS ポリシー (Storage)
-- ---------------------------------------------------------------------

create policy "Allow anon insert to circulation-images" on storage.objects as permissive for insert to anon with check ((bucket_id = 'circulation-images'::text));
create policy "Allow anon insert to inquiry-images" on storage.objects as permissive for insert to anon with check ((bucket_id = 'inquiry-images'::text));
create policy "Allow public read of circulation-images" on storage.objects as permissive for select to anon using ((bucket_id = 'circulation-images'::text));
create policy "Allow public read of inquiry-images" on storage.objects as permissive for select to anon using ((bucket_id = 'inquiry-images'::text));

-- ---------------------------------------------------------------------
-- Storage バケット
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public) values ('circulation-images', 'circulation-images', true);
insert into storage.buckets (id, name, public) values ('inquiry-images', 'inquiry-images', true);
