# SI-MONIK — Changelog Upgrade v4

Perbaikan atas 4 laporan:

## 1. Upload Excel gagal disimpan — "Could not find the 'penanggung_jawab' column..."
**Penyebab:** kolom `status_bpk` dan `penanggung_jawab` pada tabel `temuan_bpk` belum
pernah dibuat di database, karena migrasi `supabase_schema_upgrade_v3.sql` belum
pernah dijalankan di project Supabase ini. Kode aplikasi sudah benar sejak awal —
ini murni migrasi database yang belum jalan.

**Perbaikan:** `supabase_schema_upgrade_v4.sql` menambahkan kembali kedua kolom
tsb (aman diulang bila sudah ada) dan memanggil `NOTIFY pgrst, 'reload schema'`
supaya PostgREST langsung mengenali skema terbaru tanpa perlu me-restart project
secara manual.

## 2. Admin utama tidak bisa menyimpan perubahan Edit Data
**Penyebab:** sama seperti #1 — error yang muncul di modal ("Could not find the
'penanggung_jawab' column...") persis error skema yang sama, karena form Edit
Data juga mengirim kolom `penanggung_jawab` dan `status_bpk`.

**Perbaikan:** otomatis selesai begitu migrasi v4 dijalankan.

## 3. Operator OPD tidak boleh mengakses Tambah Temuan, Upload Excel, dan Edit
**Perbaikan (2 lapis):**
- **UI** (`lib/roleAccess.js`): menu `tambahTemuan`, `editTemuan`, dan
  `uploadExcel` sekarang hanya terdaftar untuk role `admin`. Tombol "+ Tambah
  Data", "Update Excel / Parsing Otomatis", dan tautan "Edit" otomatis hilang
  dari tampilan Operator OPD di semua halaman (Dashboard, Data Temuan, Detail
  Temuan). Jika Operator OPD mencoba membuka URL-nya langsung, halaman akan
  menampilkan "Akses Ditolak".
- **Database** (`supabase_schema_upgrade_v4.sql`): kebijakan RLS
  `temuan_insert_scoped` dan `temuan_update_scoped` pada tabel `temuan_bpk`
  diubah menjadi khusus admin, sehingga pembatasan ini juga berlaku di level
  API/database — bukan hanya disembunyikan di tampilan.
- Operator OPD tetap bisa **melihat** data OPD-nya sendiri dan **mengunggah
  bukti setoran** seperti biasa (tidak berubah).

## 4. Notifikasi lonceng saat Operator OPD menyimpan bukti setoran
Fitur ini **sudah ada di kode** (`components/NotificationBell.js` +
`pages/temuan/[id].js`): setiap kali Operator OPD menyimpan bukti setoran,
baris `log_aktivitas` dengan `aksi = 'upload_bukti'` otomatis dibuat, dan
lonceng notifikasi admin utama akan menampilkannya (real-time + polling setiap
20 detik sebagai cadangan). Lonceng ini **hanya tampil untuk role `admin`**.

Ini hanya akan aktif dengan benar jika `supabase_schema_notifikasi.sql` sudah
pernah dijalankan (menambahkan kolom `dibaca` + policy + realtime publication
pada `log_aktivitas`). Jika lonceng masih tidak muncul setelah upload bukti
setoran, jalankan file itu.

---

## Urutan menjalankan migrasi SQL (Supabase → SQL Editor)
Jalankan berurutan, semuanya aman diulang jika sudah pernah dijalankan
sebagian:

1. `supabase_schema.sql` (hanya jika project masih benar-benar baru/kosong)
2. `supabase_schema_upgrade.sql` (v2 — OPD, RLS per-OPD, soft delete)
3. `supabase_schema_notifikasi.sql` (notifikasi lonceng admin)
4. `supabase_schema_upgrade_v3.sql` (kolom status_bpk & penanggung_jawab)
5. **`supabase_schema_upgrade_v4.sql`** (baru — perbaikan schema cache +
   RLS admin-only untuk tambah/edit/upload Excel)

Setelah menjalankan file di atas, jangan lupa **deploy ulang** aplikasi
(Vercel) dengan kode terbaru ini agar perubahan `lib/roleAccess.js` ikut aktif.
