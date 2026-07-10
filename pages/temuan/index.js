import { useEffect, useState } from 'react';
import Link from 'next/link';
import Sidebar from '../../components/Sidebar';
import ConfirmDialog from '../../components/ConfirmDialog';
import { supabase } from '../../lib/supabaseClient';
import { applyOpdScope, CAN } from '../../lib/roleAccess';
import { withRoleGuard } from '../../lib/withRoleGuard';

function DataTemuan({ profile }) {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('semua');
  const [showDeleted, setShowDeleted] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [busy, setBusy] = useState(false);

  const canAdd = CAN.editAnyOpd(profile.role) || CAN.editOwnOpdOnly(profile.role);
  const canDelete = CAN.deleteTemuan(profile.role);
  const canRestore = CAN.restoreTemuan(profile.role);

  async function loadData() {
    let query = supabase.from('temuan_bpk').select('*, opd:opd_id(nama)');
    query = showDeleted ? query.not('deleted_at', 'is', null) : query.is('deleted_at', null);
    query = applyOpdScope(query, profile);
    const { data } = await query.order('created_at', { ascending: false });
    if (data) setData(data);
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDeleted]);

  const filtered = data.filter((d) => {
    const cocokSearch =
      d.nomor_temuan.toLowerCase().includes(search.toLowerCase()) ||
      d.nama_wajib_setor.toLowerCase().includes(search.toLowerCase());
    const cocokFilter = filter === 'semua' || d.status === filter;
    return cocokSearch && cocokFilter;
  });

  async function confirmDelete() {
    if (!toDelete) return;
    setBusy(true);
    const { error } = await supabase
      .from('temuan_bpk')
      .update({ deleted_at: new Date().toISOString(), deleted_by: profile.id })
      .eq('id', toDelete.id);

    if (!error) {
      await supabase.from('log_aktivitas').insert({
        user_id: profile.id,
        aksi: 'hapus_temuan',
        keterangan: `Menghapus (soft delete) temuan ${toDelete.nomor_temuan}`,
      });
      setToDelete(null);
      await loadData();
    } else {
      alert(error.message);
    }
    setBusy(false);
  }

  async function restore(row) {
    setBusy(true);
    const { error } = await supabase
      .from('temuan_bpk')
      .update({ deleted_at: null, deleted_by: null })
      .eq('id', row.id);
    if (!error) {
      await supabase.from('log_aktivitas').insert({
        user_id: profile.id,
        aksi: 'pulihkan_temuan',
        keterangan: `Memulihkan temuan ${row.nomor_temuan}`,
      });
      await loadData();
    } else {
      alert(error.message);
    }
    setBusy(false);
  }

  return (
    <div className="flex">
      <Sidebar profile={profile} />
      <main className="flex-1 p-8 bg-slate-50 min-h-screen">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Data Temuan BPK</h2>
          <div className="flex gap-2">
            {canRestore && (
              <button
                onClick={() => setShowDeleted((v) => !v)}
                className="border text-slate-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-100"
              >
                {showDeleted ? 'Lihat Data Aktif' : 'Lihat Data Terhapus'}
              </button>
            )}
            {canAdd && !showDeleted && (
              <Link
                href="/temuan/tambah"
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700"
              >
                + Tambah Data
              </Link>
            )}
          </div>
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
                <th className="text-right pr-4">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-t hover:bg-slate-50">
                  <td className="py-3 px-4">{t.nomor_temuan}</td>
                  <td>{t.opd?.nama || t.opd}</td>
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
                  <td className="text-right pr-4">
                    <div className="flex justify-end items-center gap-3">
                      {!showDeleted && (
                        <Link href={`/temuan/${t.id}`} className="text-emerald-600 text-xs font-medium">
                          Detail →
                        </Link>
                      )}
                      {!showDeleted && canDelete && (
                        <button
                          onClick={() => setToDelete(t)}
                          className="text-red-600 hover:underline text-xs font-medium"
                        >
                          Hapus
                        </button>
                      )}
                      {showDeleted && canRestore && (
                        <button
                          onClick={() => restore(t)}
                          disabled={busy}
                          className="text-emerald-600 hover:underline text-xs font-medium"
                        >
                          Pulihkan
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-slate-400 py-6">
                    Tidak ada data.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      <ConfirmDialog
        open={!!toDelete}
        title="Hapus Temuan"
        message={`Yakin ingin menghapus temuan "${toDelete?.nomor_temuan}"? Data akan dipindahkan ke arsip dan dapat dipulihkan oleh admin.`}
        confirmLabel="Ya, Hapus"
        loading={busy}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

export default withRoleGuard(DataTemuan, { menuKey: 'temuan' });
