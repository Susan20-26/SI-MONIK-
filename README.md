# SI-MONIK
**Sistem Informasi Monitoring dan Kendali** — Digitalisasi Pengarsipan Bukti Setoran
Pengembalian Kerugian Daerah dan Negara atas Temuan BPK
Inspektorat Kabupaten Sumba Barat

## Tech Stack
- **Frontend:** Next.js (React) + Tailwind CSS
- **Backend & Database:** Supabase (PostgreSQL, Auth, Storage)
- **Hosting:** Vercel

## Fitur Menu
| Menu | Deskripsi |
|---|---|
| Login | Autentikasi pengguna via Supabase Auth |
| Dashboard | Ringkasan total temuan, status lunas/belum lunas, total nilai kerugian |
| Data Temuan BPK | Daftar temuan dengan pencarian & filter status |
| Tambah Temuan | Form input data temuan baru |
| Detail Temuan | Progress pelunasan + upload & riwayat bukti setoran (STS) |
| Laporan & Ekspor | Ekspor data ke Excel |
| Riwayat Aktivitas | Log audit trail seluruh aksi pengguna |
| Manajemen Pengguna | Pengaturan role pengguna (admin/pimpinan/auditor) |

## Menjalankan secara Lokal
```bash
npm install
cp .env.example .env.local   # isi dengan kredensial Supabase Anda
npm run dev
```

## Struktur Folder
```
simonik-app/
├── components/       # Sidebar, StatCard, dll
├── lib/              # supabaseClient.js
├── pages/            # Semua halaman & routing Next.js
│   └── temuan/       # List, tambah, detail temuan
├── styles/           # globals.css (Tailwind)
├── supabase_schema.sql
├── .env.example
└── package.json
```

Lihat **Panduan_Pembuatan_Aplikasi_SI-MONIK.docx** untuk instruksi
langkah-demi-langkah setup GitHub, Supabase, dan deploy ke Vercel.

## Upgrade v2 (Role & Hak Akses per OPD)

Proyek ini sudah mencakup upgrade: dashboard pengawasan (grafik progres,
rekap per OPD, log aktivitas), upload Excel/CSV dengan parsing otomatis,
soft delete pada Data Temuan, serta role & hak akses per OPD
(admin / pimpinan / operator_opd).

**Langkah setup upgrade:**
1. Jalankan `supabase_schema_upgrade.sql` di Supabase SQL Editor (setelah `supabase_schema.sql`).
2. Tambahkan `SUPABASE_SERVICE_ROLE_KEY` ke `.env.local` dan ke Environment Variables Vercel.
3. Perbarui profil pengguna operator yang sudah ada menjadi `role='operator_opd'` beserta `opd_id`-nya lewat menu Manajemen Pengguna.

Detail rancangan teknis lengkap ada di `RANCANGAN_TEKNIS_UPGRADE.md`.
