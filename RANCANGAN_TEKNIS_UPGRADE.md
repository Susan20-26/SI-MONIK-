# Rancangan Teknis Upgrade — SI-MONIK v2

## 1. Ringkasan Perubahan

| Area | Perubahan |
|---|---|
| Database | Tabel baru `opd`, kolom `opd_id` di `profiles` & `temuan_bpk`, kolom soft delete (`deleted_at`, `deleted_by`) di `temuan_bpk`, fungsi RLS bantu, kebijakan RLS baru per-OPD |
| Middleware | `lib/withRoleGuard.js` — HOC yang mengecek sesi + role sebelum halaman dirender |
| Hak akses | `lib/roleAccess.js` — matriks tunggal menu & aksi per role |
| Dashboard | Grafik progres tindak lanjut (pie), rekap per OPD (bar chart), log aktivitas terbaru, tombol upload Excel |
| Upload Excel | `components/UploadExcelParser.js` — validasi template, parsing, insert batch, dibatasi per-OPD untuk operator |
| Hapus data | Soft delete dengan `ConfirmDialog`, arsip data terhapus, pemulihan oleh admin |
| Manajemen pengguna | Tambah user baru (auth + profil + OPD) via endpoint server `pages/api/admin/create-user.js` |

## 2. Model Data

```
opd
 ├─ id (uuid, pk)
 ├─ kode
 ├─ nama
 └─ aktif

profiles
 ├─ id (uuid, pk, = auth.users.id)
 ├─ role  ('admin' | 'pimpinan' | 'operator_opd' | legacy 'auditor')
 └─ opd_id (fk -> opd.id, wajib untuk operator_opd)

temuan_bpk
 ├─ ...kolom lama...
 ├─ opd_id (fk -> opd.id)
 ├─ deleted_at (soft delete)
 └─ deleted_by (fk -> profiles.id)
```

Kolom teks `opd` pada `temuan_bpk` dipertahankan untuk kompatibilitas
mundur/tampilan, namun **sumber kebenaran akses (RLS) memakai `opd_id`**.
Skrip migrasi melakukan backfill otomatis berdasarkan kecocokan nama;
baris yang tidak cocok persis perlu dicocokkan manual sekali saja.

## 3. Matriks Hak Akses

| Menu / Aksi | Admin | Pimpinan | Operator OPD |
|---|:---:|:---:|:---:|
| Dashboard Pengawasan | ✓ (semua OPD) | ✓ (semua OPD) | ✓ (OPD sendiri) |
| Data Temuan | ✓ | ✓ (lihat) | ✓ (OPD sendiri) |
| Tambah Temuan | ✓ | – | ✓ (OPD sendiri) |
| Upload Excel | ✓ (semua OPD) | – | ✓ (baris OPD sendiri saja, baris lain ditolak) |
| Hapus / Pulihkan Temuan | ✓ | – | – |
| Laporan & Ekspor | ✓ | ✓ | – |
| Riwayat Aktivitas (log) | ✓ | – | – |
| Manajemen Pengguna | ✓ | – | – |

Implementasi berlapis dua:
1. **UI/menu** — `lib/roleAccess.js` menyembunyikan menu & tombol yang tidak diizinkan, `lib/withRoleGuard.js` menolak akses halaman langsung via URL.
2. **Database (RLS)** — kebijakan Postgres di `supabase_schema_upgrade.sql` adalah lapis pertahanan sesungguhnya; UI hanya untuk pengalaman pengguna. Operator OPD yang mencoba mengakses data OPD lain lewat API langsung tetap akan ditolak oleh RLS.

## 4. Middleware Role-Check

Next.js Pages Router (yang dipakai proyek ini) tidak memiliki middleware
server bawaan yang mudah membaca sesi Supabase Auth tanpa paket Auth
Helpers tambahan. Solusi yang dipakai:

- **`withRoleGuard(Component, { menuKey })`** — dijalankan di client saat
  halaman mount: mengambil sesi via `supabase.auth.getSession()`, lalu
  profil (`role`, `opd_id`) dari tabel `profiles`, dan mencocokkannya
  dengan `MENU_ACCESS` di `roleAccess.js`. Selama proses, halaman
  menampilkan layar "Memuat..." agar konten tidak sempat terlihat.
- Setiap halaman yang butuh proteksi dibungkus:
  ```js
  export default withRoleGuard(Dashboard, { menuKey: 'dashboard' });
  ```
- **Catatan pengembangan lanjutan (opsional, lebih kuat):** bila proyek
  dimigrasikan ke App Router, gunakan `@supabase/ssr` agar cek sesi bisa
  dilakukan di `middleware.ts` sisi server sebelum HTML dikirim —
  menghindari "flash" konten sama sekali. Untuk saat ini, karena stack
  proyek adalah Pages Router, pendekatan client-side guard + RLS di atas
  sudah memberikan keamanan data yang memadai (data sensitif tidak akan
  pernah terkirim oleh Supabase bila RLS menolak, terlepas dari apa yang
  dirender di client).

## 5. Validasi Upload Excel

Kolom wajib pada template (header baris pertama, tidak case-sensitive):

```
OPD/SKPD | No. LHP | Jenis Temuan | Nilai Temuan (Rp) | Jumlah Disetor (Rp) | Status Penanggung Jawab
```

Alur validasi (`components/UploadExcelParser.js`):
1. Cek ekstensi file (`.xlsx`, `.xls`, `.csv`) dan ukuran (≤ 100 MB).
2. Parse dengan `xlsx` (mendukung ketiga format tersebut).
3. Cocokkan header ke kolom target; bila kolom wajib hilang, tampilkan
   pesan sekaligus daftar header yang terdeteksi agar mudah dikoreksi.
4. Per baris: validasi nama OPD dikenali (via tabel `opd`), nilai numerik
   dibersihkan dari format ribuan/rupiah, status dihitung otomatis
   (`belum_lunas` / `cicilan` / `lunas`) dari nilai temuan vs. jumlah disetor.
5. Operator OPD: baris dengan OPD selain miliknya otomatis dilewati dan
   dicatat sebagai peringatan — bukan disisipkan diam-diam.
6. Pratinjau maksimum 50 baris ditampilkan sebelum pengguna menekan
   "Simpan ke Database"; insert dilakukan dalam satu batch.
7. Setiap upload tercatat ke `log_aktivitas`.

**Catatan:** kolom "Status Penanggung Jawab" pada template tidak identik
dengan status pelunasan (`belum_lunas/cicilan/lunas`) di skema saat ini —
disimpan sebagai catatan tambahan pada kolom `keterangan`. Bila tim
memerlukan kolom terpisah, tambahkan `status_penanggung_jawab text` pada
`temuan_bpk` di migrasi berikutnya. Template juga tidak menyertakan
tanggal temuan; sistem memakai tanggal upload sebagai default — sesuaikan
bila template Excel final memiliki kolom tanggal.

## 6. Soft Delete

- Hapus temuan mengubah `deleted_at`/`deleted_by`, bukan `DELETE` fisik.
- Semua query tampilan data aktif menambahkan `.is('deleted_at', null)`.
- Admin dapat beralih ke tampilan "Data Terhapus" dan memulihkan (`deleted_at = null`).
- Hard delete tetap tersedia di level database (kebijakan `temuan_delete_admin_hard`) untuk kasus pembersihan data oleh admin lewat SQL Editor bila benar-benar diperlukan; UI tidak mengeksposnya.

## 7. Manajemen Pengguna & Pembuatan Akun

Pembuatan akun Supabase Auth (email + password) memerlukan hak admin API
(`service_role key`), yang **tidak boleh** dipakai di browser. Karena itu:

- Form "Tambah Pengguna" di `pages/pengguna.js` memanggil endpoint server
  `pages/api/admin/create-user.js`.
- Endpoint ini memverifikasi token sesi pemanggil benar-benar berperan
  `admin` (dibaca dari tabel `profiles`) sebelum membuat user + melengkapi
  profil (`nama`, `nip`, `jabatan`, `role`, `opd_id`).
- `SUPABASE_SERVICE_ROLE_KEY` disimpan hanya di variabel lingkungan
  server (`.env.local` / Vercel Environment Variables), **tanpa** prefix
  `NEXT_PUBLIC_`.

## 8. Langkah Penerapan

1. Jalankan `supabase_schema_upgrade.sql` di Supabase SQL Editor.
2. Perbarui profil operator yang sudah ada: set `role='operator_opd'` dan `opd_id` sesuai OPD masing-masing (lewat menu Manajemen Pengguna setelah kode di-deploy, atau langsung via SQL sekali saja untuk data awal).
3. Salin file-file ini ke struktur proyek Next.js yang sudah ada (lihat pemetaan di bawah), lalu commit.
4. Tambahkan `SUPABASE_SERVICE_ROLE_KEY` ke environment variables Vercel bila belum ada.
5. `npm install` (tidak ada dependency baru — `recharts` dan `xlsx` sudah ada di `package.json`).
6. Deploy ulang.

## 9. Pemetaan File ke Struktur Proyek

```
lib/roleAccess.js            -> lib/roleAccess.js
lib/withRoleGuard.js          -> lib/withRoleGuard.js
components/Sidebar.js         -> components/Sidebar.js (timpa)
components/ConfirmDialog.js   -> components/ConfirmDialog.js (baru)
components/UploadExcelParser.js -> components/UploadExcelParser.js (baru)
pages/dashboard.js            -> pages/dashboard.js (timpa)
pages/temuan/index.js         -> pages/temuan/index.js (baru — sebelumnya belum ada di kode yang diunggah)
pages/laporan.js              -> pages/laporan.js (timpa)
pages/log.js                  -> pages/log.js (timpa)
pages/pengguna.js             -> pages/pengguna.js (timpa)
pages/api/admin/create-user.js -> pages/api/admin/create-user.js (baru)
supabase_schema_upgrade.sql   -> jalankan di Supabase SQL Editor (bukan bagian dari kode aplikasi)
```

`pages/index.js`, `pages/login.js`, `lib/supabaseClient.js`, dan halaman
`temuan/tambah.js` (form tambah temuan) tidak diubah oleh upgrade ini
selain penambahan `opd_id` saat insert — sesuaikan form tersebut agar
menyertakan pemilihan/penguncian OPD sesuai profil pengguna yang login.
