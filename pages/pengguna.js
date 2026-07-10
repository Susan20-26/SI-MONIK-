import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { supabase } from '../lib/supabaseClient';
import { withRoleGuard } from '../lib/withRoleGuard';

function ManajemenPengguna({ profile }) {
  const [users, setUsers] = useState([]);
  const [opdList, setOpdList] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    email: '', password: '', nama: '', nip: '', jabatan: '', role: 'operator_opd', opd_id: '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  async function loadData() {
    const { data } = await supabase
      .from('profiles')
      .select('*, opd:opd_id(nama)')
      .order('created_at');
    if (data) setUsers(data);
  }

  async function loadOpd() {
    const { data } = await supabase.from('opd').select('*').eq('aktif', true).order('nama');
    if (data) setOpdList(data);
  }

  useEffect(() => {
    loadData();
    loadOpd();
  }, []);

  async function ubahRole(id, role, opd_id) {
    await supabase.from('profiles').update({ role, opd_id: role === 'operator_opd' ? opd_id : null }).eq('id', id);
    await loadData();
  }

  async function ubahOpd(id, opd_id) {
    await supabase.from('profiles').update({ opd_id }).eq('id', id);
    await loadData();
  }

  // Catatan: Supabase Auth (pembuatan akun baru dengan email/password)
  // memerlukan hak admin di API dan idealnya dijalankan lewat Supabase
  // Edge Function / server route dengan service_role key -- BUKAN dari
  // klien. Form di bawah memanggil endpoint /api/admin/create-user
  // (lihat catatan implementasi di RANCANGAN_TEKNIS_UPGRADE.md).
  async function handleAddUser(e) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal membuat pengguna');

      await supabase.from('log_aktivitas').insert({
        user_id: profile.id,
        aksi: 'tambah_pengguna',
        keterangan: `Menambahkan pengguna ${form.nama} (${form.role})`,
      });

      setMessage({ ok: true, text: 'Pengguna berhasil ditambahkan.' });
      setForm({ email: '', password: '', nama: '', nip: '', jabatan: '', role: 'operator_opd', opd_id: '' });
      setShowAdd(false);
      await loadData();
    } catch (err) {
      setMessage({ ok: false, text: err.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex">
      <Sidebar profile={profile} />
      <main className="flex-1 p-8 bg-slate-50 min-h-screen">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Manajemen Pengguna</h2>
          <button
            onClick={() => setShowAdd((v) => !v)}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700"
          >
            {showAdd ? 'Batal' : '+ Tambah Pengguna'}
          </button>
        </div>

        {message && (
          <p className={`text-sm mb-4 ${message.ok ? 'text-emerald-600' : 'text-red-600'}`}>
            {message.text}
          </p>
        )}

        {showAdd && (
          <form onSubmit={handleAddUser} className="bg-white rounded-xl shadow-sm border p-5 mb-6 grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-500">Nama</label>
              <input required value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })}
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500">Email</label>
              <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500">Password Sementara</label>
              <input required type="password" minLength={6} value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500">NIP</label>
              <input value={form.nip} onChange={(e) => setForm({ ...form, nip: e.target.value })}
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500">Jabatan</label>
              <input value={form.jabatan} onChange={(e) => setForm({ ...form, jabatan: e.target.value })}
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500">Role</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                <option value="admin">Admin</option>
                <option value="pimpinan">Pimpinan</option>
                <option value="operator_opd">Operator OPD</option>
              </select>
            </div>
            {form.role === 'operator_opd' && (
              <div>
                <label className="text-xs text-slate-500">OPD/SKPD</label>
                <select required value={form.opd_id} onChange={(e) => setForm({ ...form, opd_id: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                  <option value="">Pilih OPD...</option>
                  {opdList.map((o) => (
                    <option key={o.id} value={o.id}>{o.nama}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="col-span-2">
              <button type="submit" disabled={saving}
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60">
                {saving ? 'Menyimpan...' : 'Simpan Pengguna'}
              </button>
            </div>
          </form>
        )}

        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-600">
              <tr className="text-left">
                <th className="py-3 px-4">Nama</th>
                <th>NIP</th>
                <th>Jabatan</th>
                <th>Role</th>
                <th>OPD/SKPD</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="py-3 px-4">{u.nama}</td>
                  <td>{u.nip}</td>
                  <td>{u.jabatan}</td>
                  <td>
                    <select
                      value={u.role}
                      onChange={(e) => ubahRole(u.id, e.target.value, u.opd_id)}
                      className="border rounded-lg px-2 py-1 text-xs"
                    >
                      <option value="admin">Admin</option>
                      <option value="pimpinan">Pimpinan</option>
                      <option value="operator_opd">Operator OPD</option>
                    </select>
                  </td>
                  <td>
                    {u.role === 'operator_opd' ? (
                      <select
                        value={u.opd_id || ''}
                        onChange={(e) => ubahOpd(u.id, e.target.value)}
                        className="border rounded-lg px-2 py-1 text-xs"
                      >
                        <option value="">Belum ditentukan</option>
                        {opdList.map((o) => (
                          <option key={o.id} value={o.id}>{o.nama}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

export default withRoleGuard(ManajemenPengguna, { menuKey: 'pengguna' });
