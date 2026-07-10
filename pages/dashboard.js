import { useEffect, useState } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import Sidebar from '../components/Sidebar';
import StatCard from '../components/StatCard';
import UploadExcelParser from '../components/UploadExcelParser';
import { supabase } from '../lib/supabaseClient';
import { applyOpdScope, CAN } from '../lib/roleAccess';
import { withRoleGuard } from '../lib/withRoleGuard';

const STATUS_COLORS = {
  lunas: '#10b981',       // selesai
  cicilan: '#f59e0b',     // proses
  belum_lunas: '#ef4444', // belum
};
const STATUS_LABEL = {
  lunas: 'Selesai',
  cicilan: 'Proses',
  belum_lunas: 'Belum',
};

function Dashboard({ profile }) {
  const [stats, setStats] = useState({ total: 0, lunas: 0, belum: 0, nilai: 0 });
  const [statusChart, setStatusChart] = useState([]);
  const [rekapOpd, setRekapOpd] = useState([]);
  const [terbaru, setTerbaru] = useState([]);
  const [logTerbaru, setLogTerbaru] = useState([]);
  const [opdList, setOpdList] = useState([]);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    async function loadData() {
      let query = supabase.from('temuan_bpk').select('*, opd:opd_id(nama)').is('deleted_at', null);
      query = applyOpdScope(query, profile);
      const { data } = await query;

      if (data) {
        const lunas = data.filter((d) => d.status === 'lunas').length;
        const cicilan = data.filter((d) => d.status === 'cicilan').length;
        const belum = data.filter((d) => d.status === 'belum_lunas').length;
        const nilai = data.reduce((sum, d) => sum + Number(d.nilai_kerugian), 0);

        setStats({ total: data.length, lunas, belum: belum + cicilan, nilai });
        setStatusChart([
          { key: 'lunas', name: STATUS_LABEL.lunas, value: lunas },
          { key: 'cicilan', name: STATUS_LABEL.cicilan, value: cicilan },
          { key: 'belum_lunas', name: STATUS_LABEL.belum_lunas, value: belum },
        ]);
        setTerbaru([...data].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).slice(0, 5));

        // Rekapitulasi per OPD
        const byOpd = {};
        data.forEach((d) => {
          const nama = d.opd?.nama || d.opd || 'Tidak diketahui';
          if (!byOpd[nama]) byOpd[nama] = { opd: nama, jumlah_temuan: 0, nilai_kerugian: 0, total_disetor: 0 };
          byOpd[nama].jumlah_temuan += 1;
          byOpd[nama].nilai_kerugian += Number(d.nilai_kerugian);
          byOpd[nama].total_disetor += Number(d.total_disetor);
        });
        setRekapOpd(Object.values(byOpd));
      }
    }

    async function loadLog() {
      if (!CAN.viewLog(profile.role)) return;
      const { data } = await supabase
        .from('log_aktivitas')
        .select('*, profiles(nama)')
        .order('created_at', { ascending: false })
        .limit(6);
      if (data) setLogTerbaru(data);
    }

    async function loadOpd() {
      const { data } = await supabase.from('opd').select('*').eq('aktif', true).order('nama');
      if (data) setOpdList(data);
    }

    loadData();
    loadLog();
    loadOpd();
  }, [profile]);

  const canUpload = CAN.uploadExcelAnyOpd(profile.role) || CAN.uploadExcelOwnOpdOnly(profile.role);

  return (
    <div className="flex">
      <Sidebar profile={profile} />
      <main className="flex-1 p-8 bg-slate-50 min-h-screen">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Dashboard Pengawasan</h2>
          {canUpload && (
            <button
              onClick={() => setShowUpload((v) => !v)}
              className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700"
            >
              {showUpload ? 'Tutup Upload Excel' : 'Update Excel / Parsing Otomatis'}
            </button>
          )}
        </div>

        <div className="grid grid-cols-4 gap-4 mb-8">
          <StatCard title="Total Temuan" value={stats.total} color="sky" />
          <StatCard title="Sudah Lunas" value={stats.lunas} color="emerald" />
          <StatCard title="Belum Lunas / Proses" value={stats.belum} color="red" />
          <StatCard
            title="Total Nilai Kerugian"
            value={`Rp ${stats.nilai.toLocaleString('id-ID')}`}
            color="amber"
          />
        </div>

        {showUpload && (
          <div className="mb-8">
            <UploadExcelParser
              profile={profile}
              opdList={opdList}
              onDone={() => setShowUpload(false)}
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <h3 className="font-semibold text-slate-700 mb-3">Progres Tindak Lanjut</h3>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={statusChart}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {statusChart.map((entry) => (
                    <Cell key={entry.key} fill={STATUS_COLORS[entry.key]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-5">
            <h3 className="font-semibold text-slate-700 mb-3">Rekapitulasi Temuan per OPD/SKPD</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={rekapOpd} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="opd" width={140} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => `Rp ${Number(v).toLocaleString('id-ID')}`} />
                <Bar dataKey="nilai_kerugian" fill="#0284c7" name="Nilai Kerugian" />
                <Bar dataKey="total_disetor" fill="#10b981" name="Total Disetor" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <h3 className="font-semibold text-slate-700 mb-3">Temuan Terbaru</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b">
                  <th className="py-2">Nomor Temuan</th>
                  <th>OPD</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {terbaru.map((t) => (
                  <tr key={t.id} className="border-b last:border-0">
                    <td className="py-2">{t.nomor_temuan}</td>
                    <td>{t.opd?.nama || t.opd}</td>
                    <td>{STATUS_LABEL[t.status] || t.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {CAN.viewLog(profile.role) && (
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <h3 className="font-semibold text-slate-700 mb-3">Log Aktivitas Terbaru</h3>
              <div className="divide-y">
                {logTerbaru.map((l) => (
                  <div key={l.id} className="py-2 text-sm flex justify-between">
                    <div>
                      <p className="font-medium">{l.profiles?.nama || 'Pengguna'}</p>
                      <p className="text-slate-500 text-xs">{l.aksi} — {l.keterangan}</p>
                    </div>
                    <span className="text-slate-400 text-xs whitespace-nowrap">
                      {new Date(l.created_at).toLocaleString('id-ID')}
                    </span>
                  </div>
                ))}
                {logTerbaru.length === 0 && (
                  <p className="text-slate-400 text-sm py-2">Belum ada aktivitas.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default withRoleGuard(Dashboard, { menuKey: 'dashboard' });
