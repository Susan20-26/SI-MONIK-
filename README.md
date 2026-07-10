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
