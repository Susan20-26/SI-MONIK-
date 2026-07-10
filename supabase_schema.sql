-- =====================================================================
-- SI-MONIK  |  Skema Database Supabase (PostgreSQL)
-- Digitalisasi Pengarsipan Bukti Setoran Pengembalian Kerugian Daerah
-- Inspektorat Kabupaten Sumba Barat
-- =====================================================================
-- Cara pakai:
-- 1. Buka project Supabase -> SQL Editor -> New Query
-- 2. Copy seluruh isi file ini -> Run
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. TABEL PROFIL PENGGUNA (extends auth.users bawaan Supabase)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  nama text not null,
  nip text,
  jabatan text,
  role text not null default 'auditor' check (role in ('admin','pimpinan','auditor')),
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------
-- 2. TABEL TEMUAN BPK (data induk kerugian daerah/negara)
-- ---------------------------------------------------------------------
create table if not exists public.temuan_bpk (
  id uuid primary key default gen_random_uuid(),
  nomor_temuan text not null,
  judul_temuan text not null,
  opd text not null,                          -- OPD/objek pemeriksaan
  nama_wajib_setor text not null,
  nilai_kerugian numeric(18,2) not null default 0,
  total_disetor numeric(18,2) not null default 0,
  sisa_saldo numeric(18,2) generated always as (nilai_kerugian - total_disetor) stored,
  tanggal_temuan date not null,
  status text not null default 'belum_lunas' check (status in ('belum_lunas','cicilan','lunas')),
  keterangan text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------------------------------------------------------------------
-- 3. TABEL BUKTI SETORAN (STS) - riwayat setoran per temuan
-- ---------------------------------------------------------------------
create table if not exists public.bukti_setoran (
  id uuid primary key default gen_random_uuid(),
  temuan_id uuid references public.temuan_bpk(id) on delete cascade,
  nomor_sts text,
  tanggal_setor date not null,
  jumlah_setor numeric(18,2) not null,
  file_path text not null,                    -- path di Supabase Storage
  file_name text,
  keterangan text,
  uploaded_by uuid references public.profiles(id),
  uploaded_at timestamptz default now()
);

-- ---------------------------------------------------------------------
-- 4. TABEL LOG AKTIVITAS (audit trail / monitoring)
-- ---------------------------------------------------------------------
create table if not exists public.log_aktivitas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  aksi text not null,                         -- contoh: 'tambah_temuan','upload_bukti','update_status'
  keterangan text,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------
-- 5. TRIGGER: update total_disetor & status otomatis saat ada setoran
-- ---------------------------------------------------------------------
create or replace function public.fn_update_total_setoran()
returns trigger as $$
begin
  update public.temuan_bpk
  set total_disetor = (
        select coalesce(sum(jumlah_setor),0) from public.bukti_setoran
        where temuan_id = coalesce(new.temuan_id, old.temuan_id)
      ),
      updated_at = now()
  where id = coalesce(new.temuan_id, old.temuan_id);

  update public.temuan_bpk
  set status = case
        when total_disetor <= 0 then 'belum_lunas'
        when total_disetor >= nilai_kerugian then 'lunas'
        else 'cicilan'
      end
  where id = coalesce(new.temuan_id, old.temuan_id);

  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_update_total_setoran on public.bukti_setoran;
create trigger trg_update_total_setoran
after insert or update or delete on public.bukti_setoran
for each row execute function public.fn_update_total_setoran();

-- ---------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS)
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.temuan_bpk enable row level security;
alter table public.bukti_setoran enable row level security;
alter table public.log_aktivitas enable row level security;

-- profiles: user boleh lihat semua profil, tapi hanya bisa edit profil sendiri
create policy "profiles_select_all" on public.profiles for select using (true);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- temuan_bpk: semua user login boleh baca; insert/update oleh auditor & admin
create policy "temuan_select_authenticated" on public.temuan_bpk
  for select using (auth.role() = 'authenticated');
create policy "temuan_insert_authenticated" on public.temuan_bpk
  for insert with check (auth.role() = 'authenticated');
create policy "temuan_update_authenticated" on public.temuan_bpk
  for update using (auth.role() = 'authenticated');
create policy "temuan_delete_admin" on public.temuan_bpk
  for delete using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- bukti_setoran: semua user login boleh baca & upload
create policy "bukti_select_authenticated" on public.bukti_setoran
  for select using (auth.role() = 'authenticated');
create policy "bukti_insert_authenticated" on public.bukti_setoran
  for insert with check (auth.role() = 'authenticated');
create policy "bukti_delete_admin" on public.bukti_setoran
  for delete using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- log_aktivitas: semua user login boleh baca & tulis log
create policy "log_select_authenticated" on public.log_aktivitas
  for select using (auth.role() = 'authenticated');
create policy "log_insert_authenticated" on public.log_aktivitas
  for insert with check (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------
-- 7. STORAGE BUCKET untuk file bukti setoran (dijalankan via SQL Editor)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('bukti-setoran', 'bukti-setoran', false)
on conflict (id) do nothing;

create policy "storage_select_authenticated"
  on storage.objects for select
  using ( bucket_id = 'bukti-setoran' and auth.role() = 'authenticated' );

create policy "storage_insert_authenticated"
  on storage.objects for insert
  with check ( bucket_id = 'bukti-setoran' and auth.role() = 'authenticated' );

-- ---------------------------------------------------------------------
-- 8. TRIGGER: buat profil otomatis saat user baru register
-- ---------------------------------------------------------------------
create or replace function public.fn_handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, nama, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'nama', new.email), 'auditor');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
after insert on auth.users
for each row execute function public.fn_handle_new_user();

-- =====================================================================
-- SELESAI. Lanjutkan dengan membuat bucket "bukti-setoran" via SQL di atas
-- atau melalui menu Storage pada dashboard Supabase.
-- =====================================================================
