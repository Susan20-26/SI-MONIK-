-- =====================================================================
-- SI-MONIK  |  MIGRASI UPGRADE v2
-- Penambahan: tabel OPD, relasi opd_id, soft delete, RLS per-OPD,
--             role operator_opd, fungsi bantu auth
-- =====================================================================
-- Cara pakai: Supabase -> SQL Editor -> New Query -> paste seluruh file
-- ini -> Run. Aman dijalankan berulang (idempotent where practical).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. TABEL OPD / SKPD
-- ---------------------------------------------------------------------
create table if not exists public.opd (
  id uuid primary key default gen_random_uuid(),
  kode text unique,
  nama text not null unique,
  aktif boolean not null default true,
  created_at timestamptz default now()
);

insert into public.opd (kode, nama) values
  ('DPMPTSP', 'Dinas Penanaman Modal dan Pelayanan Terpadu Satu Pintu'),
  ('DISKOPERINDAG', 'Dinas Koperasi, Usaha Kecil dan Menengah, Perindustrian dan Perdagangan'),
  ('DINSOS', 'Dinas Sosial Kabupaten'),
  ('SETWAN', 'Sekretariat DPRD Kabupaten'),
  ('DISDUKCAPIL', 'Dinas Kependudukan dan Pencatatan Sipil Kabupaten')
on conflict (nama) do nothing;

-- ---------------------------------------------------------------------
-- 2. PROFILES: role diperluas + relasi opd_id
-- ---------------------------------------------------------------------
alter table public.profiles
  add column if not exists opd_id uuid references public.opd(id);

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('admin', 'pimpinan', 'operator_opd', 'auditor'));
-- 'auditor' dipertahankan untuk backward-compat data lama; gunakan
-- 'operator_opd' untuk role baru sesuai spesifikasi.

comment on column public.profiles.opd_id is
  'Wajib diisi untuk role operator_opd. NULL untuk admin/pimpinan.';

-- ---------------------------------------------------------------------
-- 3. TEMUAN_BPK: relasi opd_id + soft delete
-- ---------------------------------------------------------------------
alter table public.temuan_bpk
  add column if not exists opd_id uuid references public.opd(id);

alter table public.temuan_bpk
  add column if not exists deleted_at timestamptz;

alter table public.temuan_bpk
  add column if not exists deleted_by uuid references public.profiles(id);

-- Backfill opd_id dari kolom teks 'opd' yang sudah ada (best-effort,
-- cocokkan berdasarkan nama persis; sisanya perlu dicocokkan manual)
update public.temuan_bpk t
set opd_id = o.id
from public.opd o
where t.opd_id is null and t.opd = o.nama;

create index if not exists idx_temuan_opd_id on public.temuan_bpk(opd_id);
create index if not exists idx_temuan_deleted_at on public.temuan_bpk(deleted_at);

-- ---------------------------------------------------------------------
-- 4. FUNGSI BANTU: profil user yang sedang login (security definer,
--    menghindari rekursi RLS saat policy perlu membaca tabel profiles)
-- ---------------------------------------------------------------------
create or replace function public.fn_current_profile()
returns table(role text, opd_id uuid)
language sql security definer stable
as $$
  select role, opd_id from public.profiles where id = auth.uid()
$$;

create or replace function public.fn_is_admin()
returns boolean language sql security definer stable as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;

create or replace function public.fn_is_admin_or_pimpinan()
returns boolean language sql security definer stable as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'pimpinan')
  )
$$;

-- ---------------------------------------------------------------------
-- 5. RLS ULANG: temuan_bpk dibatasi per-OPD untuk operator_opd,
--    soft-deleted hanya terlihat oleh admin
-- ---------------------------------------------------------------------
drop policy if exists "temuan_select_authenticated" on public.temuan_bpk;
drop policy if exists "temuan_insert_authenticated" on public.temuan_bpk;
drop policy if exists "temuan_update_authenticated" on public.temuan_bpk;
drop policy if exists "temuan_delete_admin" on public.temuan_bpk;

-- SELECT: admin & pimpinan lihat semua (termasuk soft-deleted khusus admin
-- via filter aplikasi); operator_opd hanya lihat opd miliknya & yang belum dihapus
create policy "temuan_select_scoped" on public.temuan_bpk
  for select using (
    public.fn_is_admin_or_pimpinan()
    or (
      opd_id in (select opd_id from public.fn_current_profile())
      and deleted_at is null
    )
  );

-- INSERT: admin bebas; operator_opd hanya boleh insert untuk opd miliknya sendiri
create policy "temuan_insert_scoped" on public.temuan_bpk
  for insert with check (
    public.fn_is_admin()
    or (
      (select role from public.fn_current_profile()) = 'operator_opd'
      and opd_id in (select opd_id from public.fn_current_profile())
    )
  );

-- UPDATE: admin bebas; operator_opd hanya boleh update data opd-nya sendiri
-- dan yang belum di-soft-delete (validasi field-level tetap dilakukan di aplikasi)
create policy "temuan_update_scoped" on public.temuan_bpk
  for update using (
    public.fn_is_admin()
    or (
      (select role from public.fn_current_profile()) = 'operator_opd'
      and opd_id in (select opd_id from public.fn_current_profile())
      and deleted_at is null
    )
  );

-- DELETE keras (hard delete) tetap hanya admin; UI standar memakai
-- soft delete lewat UPDATE deleted_at, bukan lewat kebijakan ini
create policy "temuan_delete_admin_hard" on public.temuan_bpk
  for delete using (public.fn_is_admin());

-- ---------------------------------------------------------------------
-- 6. RLS: tabel opd
-- ---------------------------------------------------------------------
alter table public.opd enable row level security;

create policy "opd_select_authenticated" on public.opd
  for select using (auth.role() = 'authenticated');

create policy "opd_write_admin" on public.opd
  for all using (public.fn_is_admin()) with check (public.fn_is_admin());

-- ---------------------------------------------------------------------
-- 7. bukti_setoran: batasi juga sesuai OPD temuan induknya
-- ---------------------------------------------------------------------
drop policy if exists "bukti_select_authenticated" on public.bukti_setoran;
drop policy if exists "bukti_insert_authenticated" on public.bukti_setoran;

create policy "bukti_select_scoped" on public.bukti_setoran
  for select using (
    public.fn_is_admin_or_pimpinan()
    or exists (
      select 1 from public.temuan_bpk t
      where t.id = bukti_setoran.temuan_id
        and t.opd_id in (select opd_id from public.fn_current_profile())
        and t.deleted_at is null
    )
  );

create policy "bukti_insert_scoped" on public.bukti_setoran
  for insert with check (
    public.fn_is_admin()
    or exists (
      select 1 from public.temuan_bpk t
      where t.id = bukti_setoran.temuan_id
        and t.opd_id in (select opd_id from public.fn_current_profile())
        and t.deleted_at is null
    )
  );

-- ---------------------------------------------------------------------
-- 8. profiles: admin boleh insert/update profil siapa saja (kelola user),
--    user biasa tetap hanya boleh update profil sendiri (kebijakan lama)
-- ---------------------------------------------------------------------
create policy "profiles_admin_manage" on public.profiles
  for all using (public.fn_is_admin()) with check (public.fn_is_admin());

-- ---------------------------------------------------------------------
-- 9. Trigger log otomatis untuk aksi penting (opsional, dipanggil dari app;
--    disediakan fungsi pembantu agar konsisten formatnya)
-- ---------------------------------------------------------------------
create or replace function public.fn_log_aktivitas(p_aksi text, p_keterangan text)
returns void language plpgsql security definer as $$
begin
  insert into public.log_aktivitas (user_id, aksi, keterangan)
  values (auth.uid(), p_aksi, p_keterangan);
end;
$$;

-- =====================================================================
-- SELESAI. Setelah migrasi:
-- 1. Update profil operator_opd yang sudah ada: set role='operator_opd'
--    dan opd_id sesuai OPD masing-masing (lewat menu Manajemen Pengguna
--    atau langsung via SQL Editor).
-- 2. Verifikasi backfill opd_id pada temuan_bpk (lihat baris dengan
--    opd_id IS NULL -> perlu dicocokkan manual bila nama OPD tidak persis sama).
-- =====================================================================
