-- =============================================================================
-- HR Management — Supabase schema (clone package)
-- Chạy toàn bộ file này trong: Supabase Dashboard → SQL Editor → New query → Run
-- =============================================================================

-- Extensions
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1) Bảng users (nhân sự + đăng nhập)
-- -----------------------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),

  -- Định danh
  employee_id text,
  username text,
  email text,
  password text, -- Plaintext để tương thích app hiện tại (đổi hash khi harden)

  -- Thông tin cơ bản
  name text not null default '',
  phone text,
  branch text,
  department text,
  position text,
  employment_status text default 'Thử việc',
  status text, -- fallback cũ (có thể bỏ sau)
  shift text,
  role text not null default 'user',

  -- Ngày tháng
  join_date date,
  official_date date,
  dob date,

  -- Giấy tờ / cá nhân
  cccd text,
  identity_issue_date date,
  identity_issue_place text,
  address text,
  hometown text,
  gender text,
  marital_status text,

  -- Media / tài liệu (app lưu URL hoặc base64 trong JSON)
  avatar_url text,
  documents jsonb not null default '[]'::jsonb,
  images jsonb not null default '[]'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Unique indexes (cho phép nhiều NULL)
create unique index if not exists users_email_unique
  on public.users (lower(email))
  where email is not null and email <> '';

create unique index if not exists users_employee_id_unique
  on public.users (employee_id)
  where employee_id is not null and employee_id <> '';

create unique index if not exists users_username_unique
  on public.users (username)
  where username is not null and username <> '';

create index if not exists users_department_idx on public.users (department);
create index if not exists users_branch_idx on public.users (branch);
create index if not exists users_employment_status_idx on public.users (employment_status);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 2) Lịch sử đổi trạng thái nhân sự
-- -----------------------------------------------------------------------------
create table if not exists public.employee_status_history (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references public.users(id) on delete set null,
  employee_code text,
  employee_name text,
  old_status text,
  new_status text,
  effective_date date,
  actor text default 'HR',
  note text,
  created_at timestamptz not null default now()
);

create index if not exists employee_status_history_created_at_idx
  on public.employee_status_history (created_at desc);

create index if not exists employee_status_history_employee_id_idx
  on public.employee_status_history (employee_id);

-- -----------------------------------------------------------------------------
-- 3) Đánh giá hiệu suất (GradingPage)
-- -----------------------------------------------------------------------------
create table if not exists public.performance_reviews (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.users(id) on delete cascade,
  month text not null, -- YYYY-MM

  self_assessment jsonb not null default '{}'::jsonb,
  supervisor_assessment jsonb not null default '{}'::jsonb,
  self_comment text,
  supervisor_comment text,
  self_total_score numeric,
  self_grade text,
  supervisor_total_score numeric,
  supervisor_grade text,
  status text not null default 'draft', -- draft | submitted | approved

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint performance_reviews_employee_month_unique unique (employee_id, month)
);

drop trigger if exists performance_reviews_set_updated_at on public.performance_reviews;
create trigger performance_reviews_set_updated_at
  before update on public.performance_reviews
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 4) RPC đăng nhập — check_credentials
-- App gọi: supabase.rpc('check_credentials', { p_email, p_password })
-- Trả về 1 dòng user (không gồm password). SECURITY DEFINER để bypass RLS.
-- -----------------------------------------------------------------------------
create or replace function public.check_credentials(p_email text, p_password text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user public.users%rowtype;
  v_result json;
begin
  if p_email is null or btrim(p_email) = '' or p_password is null then
    return null;
  end if;

  select *
  into v_user
  from public.users
  where lower(email) = lower(btrim(p_email))
    and password = p_password
  limit 1;

  if not found then
    return null;
  end if;

  -- Không trả password ra client
  select json_build_object(
    'id', v_user.id,
    'employee_id', v_user.employee_id,
    'username', v_user.username,
    'email', v_user.email,
    'name', v_user.name,
    'phone', v_user.phone,
    'branch', v_user.branch,
    'department', v_user.department,
    'position', v_user.position,
    'employment_status', v_user.employment_status,
    'status', v_user.status,
    'shift', v_user.shift,
    'role', v_user.role,
    'join_date', v_user.join_date,
    'official_date', v_user.official_date,
    'dob', v_user.dob,
    'cccd', v_user.cccd,
    'identity_issue_date', v_user.identity_issue_date,
    'identity_issue_place', v_user.identity_issue_place,
    'address', v_user.address,
    'hometown', v_user.hometown,
    'gender', v_user.gender,
    'marital_status', v_user.marital_status,
    'avatar_url', v_user.avatar_url,
    'documents', v_user.documents,
    'images', v_user.images,
    'created_at', v_user.created_at,
    'updated_at', v_user.updated_at
  )
  into v_result;

  return v_result;
end;
$$;

grant execute on function public.check_credentials(text, text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 5) RLS — app đang dùng anon key, nên mở CRUD cho anon (nội bộ HR)
-- Nếu public internet: siết lại policy / chuyển sang Supabase Auth.
-- -----------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.employee_status_history enable row level security;
alter table public.performance_reviews enable row level security;

-- users
drop policy if exists "users_select_anon" on public.users;
drop policy if exists "users_insert_anon" on public.users;
drop policy if exists "users_update_anon" on public.users;
drop policy if exists "users_delete_anon" on public.users;

create policy "users_select_anon" on public.users for select to anon, authenticated using (true);
create policy "users_insert_anon" on public.users for insert to anon, authenticated with check (true);
create policy "users_update_anon" on public.users for update to anon, authenticated using (true) with check (true);
create policy "users_delete_anon" on public.users for delete to anon, authenticated using (true);

-- employee_status_history
drop policy if exists "esh_select_anon" on public.employee_status_history;
drop policy if exists "esh_insert_anon" on public.employee_status_history;
drop policy if exists "esh_update_anon" on public.employee_status_history;
drop policy if exists "esh_delete_anon" on public.employee_status_history;

create policy "esh_select_anon" on public.employee_status_history for select to anon, authenticated using (true);
create policy "esh_insert_anon" on public.employee_status_history for insert to anon, authenticated with check (true);
create policy "esh_update_anon" on public.employee_status_history for update to anon, authenticated using (true) with check (true);
create policy "esh_delete_anon" on public.employee_status_history for delete to anon, authenticated using (true);

-- performance_reviews
drop policy if exists "pr_select_anon" on public.performance_reviews;
drop policy if exists "pr_insert_anon" on public.performance_reviews;
drop policy if exists "pr_update_anon" on public.performance_reviews;
drop policy if exists "pr_delete_anon" on public.performance_reviews;

create policy "pr_select_anon" on public.performance_reviews for select to anon, authenticated using (true);
create policy "pr_insert_anon" on public.performance_reviews for insert to anon, authenticated with check (true);
create policy "pr_update_anon" on public.performance_reviews for update to anon, authenticated using (true) with check (true);
create policy "pr_delete_anon" on public.performance_reviews for delete to anon, authenticated using (true);

-- -----------------------------------------------------------------------------
-- 6) Seed tài khoản admin mặc định (đổi mật khẩu ngay sau khi clone)
-- Email: admin@company.local  |  Password: 123456
-- -----------------------------------------------------------------------------
insert into public.users (
  employee_id,
  username,
  email,
  password,
  name,
  role,
  employment_status,
  department,
  position
)
select
  'NV0001',
  'admin',
  'admin@company.local',
  '123456',
  'Quản trị viên',
  'admin',
  'Chính thức',
  'Nhân sự',
  'Admin'
where not exists (
  select 1 from public.users where lower(email) = lower('admin@company.local')
);

-- =============================================================================
-- Xong. Tiếp theo:
-- 1. Project Settings → API → copy Project URL + anon public key
-- 2. Điền vào file .env của web clone (xem supabase/README.md)
-- =============================================================================
