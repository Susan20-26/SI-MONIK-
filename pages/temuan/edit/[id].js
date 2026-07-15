// pages/temuan/edit/[id].js
// Form Edit Data Temuan -- dipakai admin (bebas OPD) maupun Operator OPD
// (hanya baris OPD miliknya sendiri) untuk membetulkan kesalahan input,
// tanpa perlu menghapus dan menambah ulang datanya. RLS di database
// (temuan_update_scoped) tetap menjadi lapis pertahanan sesungguhnya;
// pengecekan di sini hanya untuk pengalaman pengguna.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Sidebar from '../../../components/Sidebar';
import { supabase } from '../../../lib/supabaseClient';
import { canEditTemuan } from '../../../lib/roleAccess';
import { withRoleGuard } from '../../../lib/withRoleGuard';

function EditTemuan({ profile }) {
  const router = useRouter();
  const { id } = router.query;
  const isOperator = profile.role === 'operator_opd';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notFoundOrForbidden, setNotFoundOrForbidden] = useState(false);
  const [opdList, setOpdList] = useState([]);
  const [original, setOriginal] = useState(null);
  const [form, setForm] = useState(null);

  useEffect(() => {
    async function load() {
      if (!id) return;
      const { data: opd } = await supabase.from('opd').select('*').eq('aktif', true).order('nama');
      setOpdList(opd || []);

      const { data: t, error } = await supabase.from('temuan_bpk').select('*').eq('id', id).single();
      if (error || !t || !canEditTemuan(profile, t)) {
        setNotFoundOrForbidden(true);
        setLoading(false);
        return;
      }
      setOriginal(t);
      setForm({
        nomor_temuan: t.nomor_temuan || '',
        judul_temuan: t.judul_temuan || '',
        opd_id: t.opd_id || '',
        nama_wajib_setor: t.nama_wajib_setor || '',
        penanggung_jawab: t.penanggung_jawab || '',
        status_bpk: t.status_bpk || '',
        nilai_kerugian: t.nilai_kerugian ?? '',
        tanggal_temuan: t.tanggal_temuan || '',
        keterangan: t.keterangan || '',
      });
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, profile]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function ringkasPerubahan(before, after, opdNamaBaru) {
    const label = {
      nomor_temuan: 'No. LHP',
      judul_temuan: 'Jenis Temuan',
      opd_id: 'OPD/SKPD',
      nama_wajib_setor: 'Wajib Setor',
      penanggung_jawab: 'Penanggung Jawab',
      status_bpk: 'Status',
      nilai_kerugian: 'Nilai Kerugian',
      tanggal_temuan: 'Tanggal Temuan',
      keterangan: 'Keterangan',
    };
    const changed = [];
    Object.keys(label).forEach((key) => {
      const beforeVal = key === 'opd_id' ? before.opd : String(before[key] ?? '');
      const afterVal = key === 'opd_id' ? opdNamaBaru : String(after[key] ?? '');
      if (String(beforeVal) !== String(afterVal)) changed.push(label[key]);
    });
    return changed;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.opd_id) return alert('Pilih OPD/SKPD terlebih dahulu');
    if (isOperator && form.opd_id !== profile.opd_id) {
      return alert('Anda hanya dapat mengedit data untuk OPD Anda sendiri.');
    }

    setSaving(true);
    const opdNama = opdList.find((o) => o.id === form.opd_id)?.nama || '';
    const payload = {
      nomor_temuan: form.nomor_temuan,
      judul_temuan: form.judul_temuan,
      opd_id: form.opd_id,
      opd: opdNama,
      nama_wajib_setor: form.nama_wajib_setor,
      penanggung_jawab: form.penanggung_jawab || null,
      status_bpk: form.status_bpk || null,
      nilai_kerugian: form.nilai_kerugian,
      tanggal_temuan: form.tanggal_temuan,
      keterangan: form.keterangan || null,
    };

    const { error } = await supabase.from('temuan_bpk').update(payload).eq('id', id);

    if (!error) {
      const changed = ringkasPerubahan(original, form, opdNama);
      await supabase.from('log_aktivitas').insert({
        user_id: profile.id,
        aksi: 'edit_temuan',
        keterangan:
          `Mengubah data temuan ${form.nomor_temuan}` +
          (changed.length ? ` (kolom: ${changed.join(', ')})` : ''),
      });
      router.push('/temuan');
    } else {
      alert(error.message);
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex">
        <Sidebar profile={profile} />
        <main className="flex-1 p-8 bg-slate-50 min-h-screen">
          <p className="text-slate-400 text-sm">Memuat data...</p>
        </main>
      </div>
    );
  }

  if (notFoundOrForbidden) {
    return (
      <div className="flex">
        <Sidebar profile={profile} />
        <main className="flex-1 p-8 bg-slate-50 min-h-screen">
          <div className="bg-white rounded-xl shadow-sm border p-6 max-w-lg">
            <h2 className="text-lg font-semibold text-slate-800 mb-2">Tidak dapat mengedit data ini</h2>
            <p className="text-sm text-slate-500 mb-4">
              Data tidak ditemukan, sudah dihapus, atau bukan milik OPD Anda.
            </p>
            <button
              onClick={() => router.push('/temuan')}
              className="text-emerald-600 text-sm font-medium hover:underline"
            >
              ← Kembali ke Data Temuan
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex">
      <Sidebar profile={profile} />
      <main className="flex-1 p-8 bg-slate-50 min-h-screen">
        <h2 className="text-2xl font-bold text-slate-800 mb-1">Edit Data Temuan</h2>
        <p className="text-slate-500 text-sm mb-6">
          Perbaiki kesalahan input pada temuan {original?.nomor_temuan}.
        </p>
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border p-6 max-w-2xl space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-600">No. LHP</label>
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
            <label className="text-sm text-slate-600">Jenis Temuan</label>
            <input name="judul_temuan" required value={form.judul_temuan} onChange={handleChange}
              className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-600">Wajib Setor</label>
              <input name="nama_wajib_setor" required value={form.nama_wajib_setor} onChange={handleChange}
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-sm text-slate-600">Penanggung Jawab</label>
              <input name="penanggung_jawab" value={form.penanggung_jawab} onChange={handleChange}
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-600">Nilai Kerugian (Rp)</label>
              <input name="nilai_kerugian" type="number" required value={form.nilai_kerugian} onChange={handleChange}
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-sm text-slate-600">Status (menurut BPK)</label>
              <input name="status_bpk" placeholder="mis. Belum, Proses, Selesai" value={form.status_bpk} onChange={handleChange}
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
          <div className="flex gap-3">
            <button type="submit" disabled={saving}
              className="bg-emerald-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-60">
              {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
            <button type="button" onClick={() => router.push('/temuan')}
              className="border text-slate-600 px-5 py-2 rounded-lg font-medium hover:bg-slate-100">
              Batal
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default withRoleGuard(EditTemuan, { menuKey: 'editTemuan' });
