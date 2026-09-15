-- =====================================================================
-- 1. TABLE
-- =====================================================================
create table if not exists public.bookings (
  id            uuid        primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  name          text        not null check (char_length(name) between 2 and 60),
  phone         text        not null check (char_length(phone) between 9 and 20),
  service       text        not null check (char_length(service) between 1 and 80),
  barber        text        not null check (char_length(barber) between 1 and 80),
  booking_date  date        not null,
  booking_time  time        not null,
  comment       text                 check (comment is null or char_length(comment) <= 500),
  status        text        not null default 'new'
                            check (status in ('new', 'confirmed', 'completed', 'cancelled', 'no_show'))
);

create index if not exists bookings_date_time_idx
  on public.bookings (booking_date, booking_time);

create index if not exists bookings_status_idx
  on public.bookings (status);


-- =====================================================================
-- 2. SECURITY: RLS on, zero access for anon (and authenticated)
-- =====================================================================
-- RLS enabled with NO policies = every row is invisible and every write is
-- rejected for any role that respects RLS (anon, authenticated).
alter table public.bookings enable row level security;

-- Belt and braces: also remove table privileges, so even a policy added by
-- mistake later would not open access. Supabase grants these by default.
revoke all on table public.bookings from anon;
revoke all on table public.bookings from authenticated;
revoke all on table public.bookings from public;

-- The server (Route Handler) uses service_role, which bypasses RLS.
grant select, insert, update, delete on table public.bookings to service_role;


-- =====================================================================
-- 3. VERIFY (optional, run after the above)
-- =====================================================================
-- RLS must be true:
--   select relname, relrowsecurity from pg_class where relname = 'bookings';
--
-- Only postgres / service_role should appear here, no anon/authenticated:
--   select grantee, privilege_type
--   from information_schema.role_table_grants
--   where table_schema = 'public' and table_name = 'bookings'
--   order by grantee, privilege_type;
--
-- No policies should exist:
--   select * from pg_policies where tablename = 'bookings';
