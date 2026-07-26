# Clone Supabase cho web HR mới

Gói này tạo đủ schema để web HR chạy với **Supabase mới** (không cần copy data cũ).

## Bảng được tạo

| Bảng | Mục đích |
|------|----------|
| `users` | Nhân sự + đăng nhập (email/password) |
| `employee_status_history` | Lịch sử đổi trạng thái |
| `performance_reviews` | Đánh giá hiệu suất |

## RPC

- `check_credentials(p_email, p_password)` → JSON user (không gồm password) hoặc `null`

## Các bước setup (5 phút)

### 1. Tạo project Supabase mới
1. Vào [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. **New project** → đặt tên, mật khẩu DB, region gần bạn
3. Đợi project Ready

### 2. Chạy SQL schema
1. Vào **SQL Editor** → **New query**
2. Copy toàn bộ nội dung file [`schema.sql`](./schema.sql)
3. **Run**

### 3. Lấy API keys
**Project Settings → API**:
- `Project URL` → `VITE_SUPABASE_URL`
- `anon` `public` key → `VITE_SUPABASE_ANON_KEY`

### 4. Cấu hình web clone
Tạo file `.env` (hoặc `.env.local`) ở root project:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

Khởi động lại `npm run dev`.

### 5. Đăng nhập lần đầu
Tài khoản seed mặc định:

| Field | Value |
|-------|-------|
| Email | `admin@company.local` |
| Password | `123456` |

Đổi mật khẩu ngay trong bảng `users` (Table Editor) sau khi vào được hệ thống.

## Lưu ý quan trọng

1. **Password đang lưu plaintext** để tương thích app hiện tại. Chỉ dùng nội bộ; không public internet mà không harden.
2. **RLS đang mở CRUD cho `anon`** vì app dùng anon key + session `localStorage`. Siết lại nếu deploy public.
3. Các module **Chấm công / Lương / KPI / Tasks / Phê duyệt requests** dùng **Firebase**, không nằm trong gói Supabase này. Clone web mới vẫn cần cấu hình Firebase riêng (nếu dùng các module đó).
4. Avatar/giấy tờ lưu URL hoặc base64 trong cột `avatar_url` / `documents` — **không cần Storage bucket**.

## Kiểm tra nhanh sau khi Run SQL

Trong SQL Editor:

```sql
select id, employee_id, email, name, role from public.users;
select public.check_credentials('admin@company.local', '123456');
```

Nếu RPC trả JSON có `id`/`email`/`name` là OK.
