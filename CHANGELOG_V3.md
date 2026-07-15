# Changelog Upgrade v3 — SI-MONIK

## 1. Format Excel diperbaiki (kolom STATUS & PENANGGUNG JAWAB dipisah)

**Masalah sebelumnya:** file `Rekap_Dinas_Sosial_1.xlsx` gagal diunggah
karena parser lama mengharapkan satu kolom gabungan "Status Penanggung
Jawab", padahal file aslinya punya dua kolom terpisah: `STATUS` dan
`PENANGGUNG JAWAB`.

**Perubahan** (`components/UploadExcelParser.js`):
- Kolom wajib sekarang: **OPD/SKPD, NO LHP, JENIS TEMUAN, NILAI TEMUAN
  (RP), JUMLAH DISETOR (RP), STATUS, PENANGGUNG JAWAB** — tujuh kolom
  terpisah, sesuai file Rekap Temuan yang dilampirkan.
- `STATUS` disimpan ke kolom baru `status_bpk` (status menurut BPK,
  mis. "Belum"), terpisah dari `status` (status pelunasan internal:
  belum_lunas/cicilan/lunas yang tetap dihitung otomatis dari nilai vs
  disetor).
- `PENANGGUNG JAWAB` disimpan ke kolom baru `penanggung_jawab`, dan juga
  dipakai sebagai `nama_wajib_setor` (karena pada data BPK, pihak yang
  wajib menyetor kembali memang perorangan/penanggung jawab, bukan
  nama OPD).
- File template lama (satu kolom gabungan "Status Penanggung Jawab")
  masih bisa diunggah untuk kompatibilitas mundur, tapi tidak lagi
  disarankan.
- Pratinjau sebelum simpan sekarang menampilkan kolom Status & Penanggung
  Jawab secara terpisah.

**Perlu dijalankan di Supabase:** `supabase_schema_upgrade_v3.sql`
(menambah kolom `status_bpk` dan `penanggung_jawab` pada `temuan_bpk`).

## 2. Fitur Edit Data Temuan

**Baru:**
- Halaman `pages/temuan/edit/[id].js` — form edit lengkap (No. LHP,
  OPD, Jenis Temuan, Wajib Setor, Penanggung Jawab, Status BPK, Nilai
  Kerugian, Tanggal Temuan, Keterangan).
- Tombol **Edit** muncul di menu Data Temuan (`pages/temuan/index.js`)
  dan tombol **Edit Data** di halaman Detail Temuan
  (`pages/temuan/[id].js`) — hanya untuk baris yang boleh diedit oleh
  pengguna yang sedang login.
- Hak akses (`lib/roleAccess.js` — fungsi `canEditTemuan`): **Admin**
  boleh mengedit semua baris; **Operator OPD** hanya boleh mengedit
  baris milik OPD-nya sendiri dan yang belum dihapus (soft delete).
  Dijaga dua lapis: UI (tombol disembunyikan) dan RLS database
  (`temuan_update_scoped`, sudah ada sejak upgrade v2 — tidak perlu
  migrasi tambahan untuk ini).
- Setiap edit tercatat ke `log_aktivitas` (aksi `edit_temuan`) beserta
  ringkasan kolom apa saja yang berubah.

## 3. Notifikasi ke Admin — lebih andal

**Masalah sebelumnya:** notifikasi ke admin bergantung sepenuhnya pada
Supabase Realtime, yang butuh publication SQL **dan** toggle Realtime
per-tabel aktif di dashboard Supabase. Kalau salah satu belum
dikonfigurasi, notifikasi tidak pernah muncul walau datanya sudah masuk
ke `log_aktivitas` — istilah "belum terintegrasi" yang dimaksud.

**Perubahan** (`components/NotificationBell.js`):
- Ditambahkan **polling cadangan tiap 20 detik**, berjalan berdampingan
  dengan realtime subscription yang sudah ada. Jadi notifikasi tetap
  muncul (walau butuh beberapa detik) meskipun Realtime belum aktif di
  project Supabase.
- Setiap notifikasi sekarang punya label aksi (Temuan baru, Edit data,
  Hapus data, Pulihkan data, Upload Excel, Upload bukti setoran) supaya
  admin langsung tahu jenis aktivitasnya tanpa membaca keterangan detail.
- Aksi **Edit Data** yang baru otomatis ikut memicu notifikasi ke admin
  begitu Operator OPD melakukan perubahan, karena sistem notifikasi
  sudah memantau semua baris baru di `log_aktivitas` dari role
  `operator_opd`.

**Cek konfigurasi di Supabase** (agar realtime tetap ideal, polling
hanya cadangan):
1. `supabase_schema_notifikasi.sql` sudah pernah dijalankan.
2. Supabase Dashboard → Database → Replication → pastikan tabel
   `log_aktivitas` diaktifkan untuk Realtime.

## 4. Migrasi database yang perlu dijalankan

Jalankan **hanya** file baru berikut di Supabase SQL Editor (urutan file
v1/v2/v3 sudah pernah dijalankan sebelumnya, tidak perlu diulang):

```
supabase_schema_upgrade_v3.sql
```

## 5. File yang berubah / baru pada paket ini

```
components/UploadExcelParser.js      (diperbarui — parsing STATUS & PENANGGUNG JAWAB terpisah)
components/NotificationBell.js       (diperbarui — polling cadangan + label aksi)
lib/roleAccess.js                    (diperbarui — canEditTemuan, akses tambahTemuan untuk operator)
pages/temuan/index.js                (diperbarui — tombol Edit, kolom Penanggung Jawab/Status BPK)
pages/temuan/[id].js                 (diperbarui — tombol Edit Data, tampilkan Penanggung Jawab/Status BPK)
pages/temuan/tambah.js               (diperbarui — field Penanggung Jawab & Status BPK)
pages/temuan/edit/[id].js            (BARU — form edit data temuan)
pages/laporan.js                     (diperbarui — ekspor Excel sertakan Penanggung Jawab & Status BPK)
supabase_schema_upgrade_v3.sql       (BARU — migrasi kolom status_bpk & penanggung_jawab)
```
