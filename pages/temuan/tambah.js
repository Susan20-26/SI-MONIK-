import { useState } from 'react';
import { useRouter } from 'next/router';
import Sidebar from '../../components/Sidebar';
import { supabase } from '../../lib/supabaseClient';

export default function TambahTemuan() {
  const router = useRouter();
  const [form, setForm] = useState({
    nomor_temuan: '',
    judul_temuan: '',
    opd: '',
    nama_wajib_setor: '',
    nilai_kerugian: '',
    tanggal_temuan: '',
    keterangan: '',
  });
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('temuan_bpk').insert([form]);
    setLoading(false);
    if (!error) router.push('/temuan');
    else alert(error.message);
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8 bg-slate-50 min-h-screen">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">Tambah Data Temuan</h2>
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border p-6 max-w-2xl space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-600">Nomor Temuan</label>
              <input name="nomor_temuan" required onChange={handleChange}
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-sm text-slate-600">OPD / Objek Pemeriksaan</label>
              <input name="opd" required onChange={handleChange}
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
            </div>
          </div>
          <div>
            <label className="text-sm text-slate-600">Judul Temuan</label>
            <input name="judul_temuan" required onChange={handleChange}
              className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-600">Nama Wajib Setor</label>
              <input name="nama_wajib_setor" required onChange={handleChange}
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-sm text-slate-600">Nilai Kerugian (Rp)</label>
              <input name="nilai_kerugian" type="number" required onChange={handleChange}
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
            </div>
          </div>
          <div>
            <label className="text-sm text-slate-600">Tanggal Temuan</label>
            <input name="tanggal_temuan" type="date" required onChange={handleChange}
              className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-sm text-slate-600">Keterangan</label>
            <textarea name="keterangan" onChange={handleChange}
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
