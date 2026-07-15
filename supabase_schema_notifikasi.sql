-- =====================================================================
-- SI-MONIK  |  UPGRADE: Notifikasi Monitoring untuk Admin Utama
-- Setiap aktivitas Operator OPD (upload bukti setoran, tambah temuan,
-- dll -- yaitu apa pun yang sudah tercatat di log_aktivitas) otomatis
-- muncul sebagai notifikasi bagi admin, tanpa perlu konfirmasi manual
-- ke OPD terlebih dahulu.
--
-- Pendekatan: memakai tabel log_aktivitas yang sudah ada (semua
-- halaman sudah mencatat ke sana), cukup ditambah kolom status baca
-- + policy + realtime, tidak perlu tabel baru atau ubah halaman lain.
--
-- Cara pakai: Supabase -> SQL Editor -> New query -> paste seluruh
-- file ini -> Run. Aman dijalankan berulang (idempotent).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Kolom status baca pada log_aktivitas
-- ---------------------------------------------------------------------
alter table public.log_aktivitas
  add column if not exists dibaca boolean not null default false;

create index if not exists idx_log_dibaca on public.log_aktivitas(dibaca);
create index if not exists idx_log_user_created
  on public.log_aktivitas(user_id, created_at desc);

-- ---------------------------------------------------------------------
-- 2. RLS: admin boleh menandai notifikasi (dibaca) -- sebelumnya
--    log_aktivitas hanya punya policy select & insert, belum ada update
-- ---------------------------------------------------------------------
drop policy if exists "log_update_admin" on public.log_aktivitas;
create policy "log_update_admin" on public.log_aktivitas
  for update using (public.fn_is_admin()) with check (public.fn_is_admin());

-- ---------------------------------------------------------------------
-- 3. Aktifkan Realtime untuk log_aktivitas agar notifikasi muncul
--    otomatis di sisi admin tanpa perlu refresh halaman
-- ---------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.log_aktivitas;
exception when duplicate_object then
  null; -- sudah terdaftar sebelumnya, aman diabaikan
end $$;

-- =====================================================================
-- SELESAI. Catatan:
-- - fn_is_admin() dipakai di sini berasal dari
--   supabase_schema_upgrade.sql -- pastikan file itu sudah dijalankan
--   lebih dulu sebelum menjalankan file ini.
-- - Tidak perlu trigger tambahan: setiap kali Operator OPD melakukan
--   aksi (upload bukti setoran, tambah temuan, dsb.), halaman terkait
--   memang sudah insert ke log_aktivitas -- baris itu otomatis menjadi
--   notifikasi baru (dibaca = false) yang tampil di lonceng notifikasi
--   admin.
-- =====================================================================
