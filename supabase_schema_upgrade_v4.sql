-- =====================================================================
-- SI-MONIK  |  MIGRASI UPGRADE v4
-- Perbaikan dua laporan bug + penyesuaian hak akses:
--
-- 1) "Could not find the 'penanggung_jawab' column of 'temuan_bpk' in
--    the schema cache" saat Simpan Excel maupun saat Admin menyimpan
--    Edit Data. Penyebabnya: migrasi v3 (supabase_schema_upgrade_v3.sql)
--    belum pernah dijalankan di project Supabase ini, jadi kolom
--    status_bpk & penanggung_jawab memang belum ada di database --
--    bukan cache PostgREST yang basi. File ini menambahkan kembali
--    kedua kolom tsb (aman diulang) dan memaksa PostgREST memuat ulang
--    skemanya supaya perubahan langsung dikenali tanpa restart project.
--
-- 2) Operator OPD tidak lagi diberi izin menambah/mengubah data
--    temuan_bpk maupun upload Excel dari sisi database (RLS) --
--    sebelumnya hanya dibatasi di UI. Operator OPD tetap boleh
--    melihat data OPD-nya dan mengunggah bukti setoran (tabel
--    bukti_setoran, tidak diubah pada file ini).
--
-- Cara pakai: Supabase -> SQL Editor -> New query -> paste seluruh
-- file ini -> Run. Aman dijalankan berulang (idempotent).
-- Jalankan SETELAH supabase_schema_upgrade.sql (v2) dan
-- supabase_schema_notifikasi.sql sudah pernah dijalankan. Jika belum
-- yakin migrasi v2/v3/notifikasi sudah pernah jalan, jalankan saja
-- semua file supabase_schema_upgrade*.sql dan
-- supabase_schema_notifikasi.sql secara berurutan (aman diulang),
-- baru file ini paling akhir.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Pastikan kolom status_bpk & penanggung_jawab benar-benar ada
--    (identik dengan v3, diulang di sini supaya file ini bisa dipakai
--    berdiri sendiri sebagai perbaikan cepat).
-- ---------------------------------------------------------------------
alter table public.temuan_bpk
  add column if not exists status_bpk text;

alter table public.temuan_bpk
  add column if not exists penanggung_jawab text;

comment on column public.temuan_bpk.status_bpk is
  'Status temuan sesuai kolom "STATUS" pada template Excel BPK (mis. Belum, Proses, Selesai).';

comment on column public.temuan_bpk.penanggung_jawab is
  'Nama pegawai/pihak wajib setor sesuai kolom "PENANGGUNG JAWAB" pada template Excel BPK.';

-- ---------------------------------------------------------------------
-- 2. Paksa PostgREST memuat ulang skema (menghapus schema cache lama)
--    supaya kolom di atas -- atau perubahan kolom apa pun dari migrasi
--    sebelumnya yang mungkin belum ter-refresh -- langsung terlihat
--    tanpa perlu restart project secara manual dari Dashboard.
-- ---------------------------------------------------------------------
notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------
-- 3. RLS temuan_bpk: INSERT & UPDATE kini KHUSUS admin utama.
--    Operator OPD tidak lagi bisa menambah, mengedit, maupun upload
--    Excel data temuan -- baik lewat UI (sudah dibatasi di
--    lib/roleAccess.js) maupun langsung lewat API/PostgREST.
--    SELECT tetap sama seperti v2: operator OPD tetap bisa melihat
--    data OPD-nya sendiri.
-- ---------------------------------------------------------------------
drop policy if exists "temuan_insert_scoped" on public.temuan_bpk;
create policy "temuan_insert_scoped" on public.temuan_bpk
  for insert with check (public.fn_is_admin());

drop policy if exists "temuan_update_scoped" on public.temuan_bpk;
create policy "temuan_update_scoped" on public.temuan_bpk
  for update using (public.fn_is_admin());

-- ---------------------------------------------------------------------
-- 4. bukti_setoran TIDAK diubah oleh migrasi ini -- Operator OPD tetap
--    boleh mengunggah bukti setoran untuk temuan di OPD-nya sendiri
--    (lihat "bukti_insert_scoped" pada supabase_schema_upgrade.sql).
--    Setiap upload bukti setoran oleh Operator OPD sudah otomatis
--    tercatat ke log_aktivitas (aksi = 'upload_bukti') dan langsung
--    muncul di lonceng notifikasi admin utama -- pastikan
--    supabase_schema_notifikasi.sql sudah pernah dijalankan agar
--    kolom `dibaca` & realtime-nya aktif.
-- =====================================================================
-- SELESAI.
-- =====================================================================
