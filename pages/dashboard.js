import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import StatCard from '../components/StatCard';
import { supabase } from '../lib/supabaseClient';

export default function Dashboard() {
  const [stats, setStats] = useState({ total: 0, lunas: 0, belum: 0, nilai: 0 });
  const [terbaru, setTerbaru] = useState([]);

  useEffect(() => {
    async function loadData() {
      const { data } = await supabase.from('temuan_bpk').select('*');
      if (data) {
        const lunas = data.filter((d) => d.status === 'lunas').length;
        const belum = data.filter((d) => d.status !== 'lunas').length;
        const nilai = data.reduce((sum, d) => sum + Number(d.nilai_kerugian), 0);
        setStats({ total: data.length, lunas, belum, nilai });
        setTerbaru(data.slice(-5).reverse());
      }
    }
    loadData();
  }, []);

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8 bg-slate-50 min-h-screen">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">Dashboard Monitoring</h2>
        <div className="grid grid-cols-4 gap-4 mb-8">
          <StatCard title="Total Temuan" value={stats.total} color="sky" />
          <StatCard title="Sudah Lunas" value={stats.lunas} color="emerald" />
          <StatCard title="Belum Lunas" value={stats.belum} color="red" />
          <StatCard
            title="Total Nilai Kerugian"
            value={`Rp ${stats.nilai.toLocaleString('id-ID')}`}
            color="amber"
          />
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h3 className="font-semibold text-slate-700 mb-3">Temuan Terbaru</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b">
                <th className="py-2">Nomor Temuan</th>
                <th>Wajib Setor</th>
                <th>Nilai</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {terbaru.map((t) => (
                <tr key={t.id} className="border-b last:border-0">
                  <td className="py-2">{t.nomor_temuan}</td>
                  <td>{t.nama_wajib_setor}</td>
                  <td>Rp {Number(t.nilai_kerugian).toLocaleString('id-ID')}</td>
                  <td>{t.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
