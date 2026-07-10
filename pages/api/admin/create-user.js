// pages/api/admin/create-user.js
// Endpoint server-side untuk membuat akun pengguna baru. Dijalankan di
// server (bukan browser) karena memerlukan SUPABASE_SERVICE_ROLE_KEY,
// yang TIDAK BOLEH pernah dikirim ke client. Tambahkan kunci ini hanya
// di .env.local dan environment variables Vercel (jangan pakai prefix
// NEXT_PUBLIC_).
//
// Keamanan: endpoint ini memverifikasi bahwa pemanggil adalah admin
// dengan membaca token sesi dari header Authorization, sebelum
// menggunakan service_role client untuk membuat user + profil.

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Verifikasi pemanggil adalah admin
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Token tidak ditemukan' });
    }

    const { data: userResult, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userResult?.user) {
      return res.status(401).json({ error: 'Sesi tidak valid' });
    }

    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userResult.user.id)
      .single();

    if (!callerProfile || callerProfile.role !== 'admin') {
      return res.status(403).json({ error: 'Hanya admin yang dapat menambahkan pengguna' });
    }

    // 2. Validasi input
    const { email, password, nama, nip, jabatan, role, opd_id } = req.body;
    if (!email || !password || !nama || !role) {
      return res.status(400).json({ error: 'Data tidak lengkap' });
    }
    if (!['admin', 'pimpinan', 'operator_opd'].includes(role)) {
      return res.status(400).json({ error: 'Role tidak valid' });
    }
    if (role === 'operator_opd' && !opd_id) {
      return res.status(400).json({ error: 'OPD wajib dipilih untuk role Operator OPD' });
    }

    // 3. Buat akun auth
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createErr) throw createErr;

    // 4. Upsert profil (trigger fn_handle_new_user sudah membuat baris dasar,
    //    di sini kita lengkapi field tambahan)
    const { error: profileErr } = await supabaseAdmin
      .from('profiles')
      .update({ nama, nip, jabatan, role, opd_id: role === 'operator_opd' ? opd_id : null })
      .eq('id', created.user.id);
    if (profileErr) throw profileErr;

    return res.status(200).json({ id: created.user.id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
