-- =====================================================================
-- SI-MONIK  |  MIGRASI UPGRADE v3
-- Memisahkan kolom "Status" (kondisi temuan menurut BPK, mis. "Belum",
-- "Proses", "Selesai") dan "Penanggung Jawab" (nama pegawai wajib
-- setor) menjadi dua kolom tersendiri pada temuan_bpk -- sebelumnya
-- pada versi upload lama keduanya digabung jadi satu string di kolom
-- `keterangan`. Ini mengikuti format Excel Rekap Dinas Sosial yang
-- memang punya kolom STATUS dan PENANGGUNG JAWAB terpisah.
--
-- Cara pakai: Supabase -> SQL Editor -> New Query -> paste seluruh file
-- ini -> Run. Aman dijalankan berulang (idempotent).
-- Jalankan SETELAH supabase_schema_upgrade.sql dan
-- supabase_schema_notifikasi.sql (keduanya wajib sudah pernah dijalankan
-- sebelumnya untuk versi v2 upgrade).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Kolom baru: status_bpk & penanggung_jawab
-- ---------------------------------------------------------------------
alter table public.temuan_bpk
  add column if not exists status_bpk text;

alter table public.temuan_bpk
  add column if not exists penanggung_jawab text;

comment on column public.temuan_bpk.status_bpk is
  'Status temuan sesuai kolom "STATUS" pada template Excel BPK (mis. Belum, Proses, Selesai) -- berbeda dari kolom status pelunasan internal (belum_lunas/cicilan/lunas) yang dihitung otomatis oleh sistem dari nilai_kerugian vs total_disetor.';

comment on column public.temuan_bpk.penanggung_jawab is
  'Nama pegawai/pihak wajib setor sesuai kolom "PENANGGUNG JAWAB" pada template Excel BPK. Kolom nama_wajib_setor yang sudah ada diisi otomatis dengan nilai yang sama agar tampilan lama (Detail Temuan, Laporan) tetap konsisten.';

-- Backfill dari data lama yang sempat menyimpan info ini di kolom
-- keterangan dengan format "Status Penanggung Jawab: <isi>" (hasil
-- upload Excel versi sebelum upgrade ini) -- dipindahkan ke status_bpk
-- apa adanya supaya datanya tidak hilang. Sesuaikan/cocokkan manual bila
-- perlu memisahkannya lebih lanjut ke kolom penanggung_jawab.
update public.temuan_bpk
set status_bpk = regexp_replace(keterangan, '^Status Penanggung Jawab:\s*', '')
where status_bpk is null
  and keterangan ilike 'Status Penanggung Jawab:%';

-- =====================================================================
-- SELESAI. Tidak ada perubahan RLS di file ini -- kebijakan
-- temuan_update_scoped dari supabase_schema_upgrade.sql (v2) sudah
-- mengizinkan admin mengedit semua baris, dan operator_opd mengedit
-- baris OPD miliknya sendiri saja, sehingga otomatis berlaku juga untuk
-- fitur Edit Data Temuan yang baru di aplikasi.
-- =====================================================================
