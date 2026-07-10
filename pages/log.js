import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { supabase } from '../lib/supabaseClient';
import { withRoleGuard } from '../lib/withRoleGuard';

function LogAktivitas({ profile }) {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    async function loadData() {
      const { data } = await supabase
        .from('log_aktivitas')
        .select('*, profiles(nama)')
        .order('created_at', { ascending: false })
        .limit(100);
      if (data) setLogs(data);
    }
    loadData();
  }, []);

  return (
    <div className="flex">
      <Sidebar profile={profile} />
      <main className="flex-1 p-8 bg-slate-50 min-h-screen">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">Riwayat Aktivitas</h2>
        <div className="bg-white rounded-xl shadow-sm border divide-y">
          {logs.map((l) => (
            <div key={l.id} className="p-4 text-sm flex justify-between">
              <div>
                <p className="font-medium">{l.profiles?.nama || 'Pengguna'}</p>
                <p className="text-slate-500">{l.aksi} — {l.keterangan}</p>
              </div>
              <span className="text-slate-400 text-xs">
                {new Date(l.created_at).toLocaleString('id-ID')}
              </span>
            </div>
          ))}
          {logs.length === 0 && <p className="p-4 text-slate-400 text-sm">Belum ada aktivitas tercatat.</p>}
        </div>
      </main>
    </div>
  );
}

export default withRoleGuard(LogAktivitas, { menuKey: 'log' });
