-- ==========================================================
-- چی چند — اسکیمای Supabase
-- این کد رو کامل کپی کنید و توی Supabase: SQL Editor → New query
-- پیست کنید و Run بزنید. یک‌بار کافیه.
-- ==========================================================

-- جدول «آخرین قیمت» هر آیتم (یک ردیف برای هر مورد، هر بار آپدیت می‌شود)
create table if not exists latest_prices (
  item_id text primary key,
  category text not null,
  name text not null,
  unit text,
  price numeric,
  change_percent numeric,
  updated_at timestamptz not null default now()
);

-- جدول «تاریخچه‌ی قیمت» (برای نمودار — هر بار یک ردیف جدید اضافه می‌شود)
create table if not exists price_history (
  id bigserial primary key,
  item_id text not null,
  price numeric not null,
  created_at timestamptz not null default now()
);

create index if not exists price_history_item_idx
  on price_history (item_id, created_at);

-- فعال‌سازی امنیت سطح ردیف (لازم است، وگرنه Supabase پیش‌فرض قفل می‌کند)
alter table latest_prices enable row level security;
alter table price_history enable row level security;

-- اجازه‌ی «فقط خواندن» برای همه (سایت شما با کلید anon فقط می‌خواند،
-- نوشتن فقط از طریق ربات گیت‌هاب و با کلید service_role انجام می‌شود
-- که خودش امنیت ردیف را دور می‌زند، پس نیازی به policy برای نوشتن نیست)
create policy "public read latest_prices"
  on latest_prices for select using (true);

create policy "public read price_history"
  on price_history for select using (true);

-- (اختیاری) برای اینکه جدول تاریخچه خیلی بزرگ نشود، هر از گاهی این را
-- توی SQL Editor اجرا کنید تا داده‌ی قدیمی‌تر از ۳۰ روز پاک شود:
-- delete from price_history where created_at < now() - interval '30 days';
