-- =====================================================================
-- Migration 002: several services per booking
--
-- ORDER MATTERS:
--   1. Run PART A now (the site keeps working: new columns are nullable).
--   2. Deploy the new code.
--   3. Run PART B (makes the new columns required).
-- =====================================================================


-- ---------------------------------------------------------------------
-- PART A: run BEFORE deploying the new code
-- ---------------------------------------------------------------------
begin;

alter table public.bookings
  add column if not exists services       jsonb,
  add column if not exists total_price    integer,
  add column if not exists total_duration integer;

-- "service" is kept for backward compatibility and now stores a readable
-- summary ("Signature Haircut + Beard Trim & Shape"). Several names can exceed
-- the old 80-character limit, so replace that check (whatever its name is).
do $$
declare c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.bookings'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%char_length(service)%'
  loop
    execute format('alter table public.bookings drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.bookings
  add constraint bookings_service_check check (char_length(service) between 1 and 300);

-- Backfill existing single-service bookings with the prices at migration time.
update public.bookings as b
set services       = jsonb_build_array(
                       jsonb_build_object('id', p.id, 'name', p.name, 'price', p.price, 'duration', p.duration)
                     ),
    total_price    = p.price,
    total_duration = p.duration
from (values
  ('haircut',   'Signature Haircut',     550, 45),
  ('beard',     'Beard Trim & Shape',    350, 30),
  ('shave',     'Hot Towel Razor Shave', 450, 40),
  ('cut-beard', 'Cut & Beard Combo',     800, 75),
  ('royal',     'The Royal Treatment',   950, 90),
  ('kids',      'Kids Haircut',          350, 30)
) as p(id, name, price, duration)
where b.services is null
  and b.service = p.name;

commit;

notify pgrst, 'reload schema';

-- Check after PART A. Must return 0 rows; otherwise send me the "service" values.
--   select id, service, created_at from public.bookings where services is null;


-- ---------------------------------------------------------------------
-- PART B: run AFTER the new code is deployed (and the check above is empty)
-- ---------------------------------------------------------------------
-- begin;
--
-- alter table public.bookings
--   alter column services       set not null,
--   alter column total_price    set not null,
--   alter column total_duration set not null;
--
-- alter table public.bookings drop constraint if exists bookings_services_check;
-- alter table public.bookings drop constraint if exists bookings_total_price_check;
-- alter table public.bookings drop constraint if exists bookings_total_duration_check;
--
-- alter table public.bookings
--   add constraint bookings_services_check check (
--     case when jsonb_typeof(services) = 'array'
--          then jsonb_array_length(services) between 1 and 20
--          else false end
--   ),
--   add constraint bookings_total_price_check    check (total_price between 0 and 1000000),
--   add constraint bookings_total_duration_check check (total_duration between 1 and 720);
--
-- commit;
--
-- notify pgrst, 'reload schema';
