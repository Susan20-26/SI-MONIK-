import { useEffect, useState } from 'react';
import Link from 'next/link';
import Sidebar from '../../components/Sidebar';
import { supabase } from '../../lib/supabaseClient';

export default function DataTemuan() {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('semua');

  useEffect(() => {
    async function loadData() {
      const { data } = await supabase
        .from('temuan_bpk')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) setData(data);
    }
    loadData();
  }, []);

  const filtered = data.filter((d) => {
    const cocokSearch =
      d.nomor_temuan.toLowerCase().includes(search.toLowerCase()) ||
      d.nama_wajib_setor.toLowerCase().includes(search.toLowerCase());
    const cocokFilter = filter === 'semua' || d.status === filter;
    return cocokSearch && cocokFilter;
  });

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8 bg-slate-50 min-h-screen">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Data Temuan BPK</h2>
          <Link
            href="/temuan/tambah"
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700"
          >
            + Tambah Data
          </Link>
        </div>

        <div className="flex gap-3 mb-4">
          <input
            placeholder="Cari nomor temuan / nama wajib setor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-3 py-2 border rounded-lg text-sm"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="semua">Semua Status</option>
            <option value="belum_lunas">Belum Lunas</option>
            <option value="cicilan">Cicilan</option>
            <option value="lunas">Lunas</option>
          </select>
        </div>

        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-600">
              <tr className="text-left">
                <th className="py-3 px-4">Nomor Temuan</th>
                <th>OPD</th>
                <th>Wajib Setor</th>
                <th>Nilai Kerugian</th>
                <th>Sisa Saldo</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-t hover:bg-slate-50">
                  <td className="py-3 px-4">{t.nomor_temuan}</td>
                  <td>{t.opd}</td>
                  <td>{t.nama_wajib_setor}</td>
                  <td>Rp {Number(t.nilai_kerugian).toLocaleString('id-ID')}</td>
                  <td>Rp {Number(t.sisa_saldo).toLocaleString('id-ID')}</td>
                  <td>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        t.status === 'lunas'
                          ? 'bg-emerald-100 text-emerald-700'
                          : t.status === 'cicilan'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td>
                    <Link href={`/temuan/${t.id}`} className="text-emerald-600 text-sm font-medium">
                      Detail →
                    </Link>
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
