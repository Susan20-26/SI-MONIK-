import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Sidebar from '../../components/Sidebar';
import { supabase } from '../../lib/supabaseClient';
import { withRoleGuard } from '../../lib/withRoleGuard';

function TambahTemuan({ profile }) {
  const router = useRouter();
  const isOperator = profile.role === 'operator_opd';

  const [opdList, setOpdList] = useState([]);
  const [form, setForm] = useState({
    nomor_temuan: '',
    judul_temuan: '',
    opd_id: isOperator ? profile.opd_id || '' : '',
    nama_wajib_setor: '',
    nilai_kerugian: '',
    tanggal_temuan: '',
    keterangan: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadOpd() {
      const { data } = await supabase.from('opd').select('*').eq('aktif', true).order('nama');
      if (data) setOpdList(data);
    }
    loadOpd();
  }, []);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.opd_id) return alert('Pilih OPD/SKPD terlebih dahulu');

    setLoading(true);
    const opdNama = opdList.find((o) => o.id === form.opd_id)?.nama || '';
    const { error } = await supabase.from('temuan_bpk').insert([
      { ...form, opd: opdNama, created_by: profile.id },
    ]);

    if (!error) {
      await supabase.from('log_aktivitas').insert({
        user_id: profile.id,
        aksi: 'tambah_temuan',
        keterangan: `Menambahkan temuan ${form.nomor_temuan} (${opdNama})`,
      });
      router.push('/temuan');
    } else {
      alert(error.message);
    }
    setLoading(false);
  }

  return (
    <div className="flex">
      <Sidebar profile={profile} />
      <main className="flex-1 p-8 bg-slate-50 min-h-screen">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">Tambah Data Temuan</h2>
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border p-6 max-w-2xl space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-600">Nomor Temuan</label>
              <input name="nomor_temuan" required value={form.nomor_temuan} onChange={handleChange}
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-sm text-slate-600">OPD / SKPD</label>
              {isOperator ? (
                <input
                  disabled
                  value={opdList.find((o) => o.id === form.opd_id)?.nama || 'OPD Anda'}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-slate-100 text-slate-500"
                />
              ) : (
                <select name="opd_id" required value={form.opd_id} onChange={handleChange}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                  <option value="">Pilih OPD...</option>
                  {opdList.map((o) => (
                    <option key={o.id} value={o.id}>{o.nama}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
          <div>
            <label className="text-sm text-slate-600">Judul Temuan</label>
            <input name="judul_temuan" required value={form.judul_temuan} onChange={handleChange}
              className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-600">Nama Wajib Setor</label>
              <input name="nama_wajib_setor" required value={form.nama_wajib_setor} onChange={handleChange}
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-sm text-slate-600">Nilai Kerugian (Rp)</label>
              <input name="nilai_kerugian" type="number" required value={form.nilai_kerugian} onChange={handleChange}
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
            </div>
          </div>
          <div>
            <label className="text-sm text-slate-600">Tanggal Temuan</label>
            <input name="tanggal_temuan" type="date" required value={form.tanggal_temuan} onChange={handleChange}
              className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-sm text-slate-600">Keterangan</label>
            <textarea name="keterangan" value={form.keterangan} onChange={handleChange}
              className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" rows={3} />
          </div>
          <button type="submit" disabled={loading}
            className="bg-emerald-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-emerald-700">
            {loading ? 'Menyimpan...' : 'Simpan Data'}
          </button>
        </form>
      </main>
    </div>
  );
}

export default withRoleGuard(TambahTemuan, { menuKey: 'tambahTemuan' });
