import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import Sidebar from '../components/Sidebar';
import { supabase } from '../lib/supabaseClient';
import { applyOpdScope, CAN } from '../lib/roleAccess';
import { withRoleGuard } from '../lib/withRoleGuard';

function Laporan({ profile }) {
  const [data, setData] = useState([]);

  useEffect(() => {
    async function loadData() {
      let query = supabase.from('temuan_bpk').select('*, opd:opd_id(nama)').is('deleted_at', null);
      query = applyOpdScope(query, profile);
      const { data } = await query.order('tanggal_temuan');
      if (data) setData(data);
    }
    loadData();
  }, [profile]);

  function exportExcel() {
    const rows = data.map((d) => ({
      'Nomor Temuan': d.nomor_temuan,
      'OPD': d.opd?.nama || d.opd,
      'Wajib Setor': d.nama_wajib_setor,
      'Nilai Kerugian': d.nilai_kerugian,
      'Total Disetor': d.total_disetor,
      'Sisa Saldo': d.sisa_saldo,
      'Status': d.status,
      'Tanggal Temuan': d.tanggal_temuan,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan Temuan');
    XLSX.writeFile(wb, `Laporan_SI-MONIK_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <div className="flex">
      <Sidebar profile={profile} />
      <main className="flex-1 p-8 bg-slate-50 min-h-screen">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Laporan & Ekspor Data</h2>
          {CAN.exportLaporan(profile.role) && (
            <button onClick={exportExcel}
              className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700">
              Ekspor ke Excel
            </button>
          )}
        </div>
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-600">
              <tr className="text-left">
                <th className="py-3 px-4">Nomor Temuan</th>
                <th>OPD</th>
                <th>Nilai Kerugian</th>
                <th>Total Disetor</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.id} className="border-t">
                  <td className="py-3 px-4">{d.nomor_temuan}</td>
                  <td>{d.opd?.nama || d.opd}</td>
                  <td>Rp {Number(d.nilai_kerugian).toLocaleString('id-ID')}</td>
                  <td>Rp {Number(d.total_disetor).toLocaleString('id-ID')}</td>
                  <td>{d.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

export default withRoleGuard(Laporan, { menuKey: 'laporan' });
