import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Sidebar from '../../components/Sidebar';
import { supabase } from '../../lib/supabaseClient';
import { canEditTemuan } from '../../lib/roleAccess';
import { withRoleGuard } from '../../lib/withRoleGuard';

function DetailTemuan({ profile }) {
  const router = useRouter();
  const { id } = router.query;
  const [temuan, setTemuan] = useState(null);
  const [bukti, setBukti] = useState([]);
  const [file, setFile] = useState(null);
  const [jumlah, setJumlah] = useState('');
  const [tanggal, setTanggal] = useState('');
  const [uploading, setUploading] = useState(false);

  async function loadData() {
    if (!id) return;
    const { data: t } = await supabase.from('temuan_bpk').select('*').eq('id', id).single();
    const { data: b } = await supabase
      .from('bukti_setoran')
      .select('*')
      .eq('temuan_id', id)
      .order('tanggal_setor', { ascending: false });
    setTemuan(t);
    setBukti(b || []);
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line
  }, [id]);

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) return alert('Pilih file bukti setoran terlebih dahulu');
    setUploading(true);

    const filePath = `${id}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('bukti-setoran')
      .upload(filePath, file);

    if (uploadError) {
      setUploading(false);
      return alert(uploadError.message);
    }

    const { error: insertError } = await supabase.from('bukti_setoran').insert([
      {
        temuan_id: id,
        tanggal_setor: tanggal,
        jumlah_setor: jumlah,
        file_path: filePath,
        file_name: file.name,
        uploaded_by: profile.id,
      },
    ]);

    if (!insertError) {
      await supabase.from('log_aktivitas').insert({
        user_id: profile.id,
        aksi: 'upload_bukti',
        keterangan: `Mengunggah bukti setoran untuk temuan ${temuan?.nomor_temuan || id}`,
      });
    }

    setUploading(false);
    if (insertError) return alert(insertError.message);

    setFile(null);
    setJumlah('');
    setTanggal('');
    loadData();
  }

  async function unduhFile(path) {
    const { data } = await supabase.storage.from('bukti-setoran').createSignedUrl(path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  }

  if (!temuan) return null;

  const progres = Math.min(100, Math.round((temuan.total_disetor / temuan.nilai_kerugian) * 100));

  return (
    <div className="flex">
      <Sidebar profile={profile} />
      <main className="flex-1 p-8 bg-slate-50 min-h-screen">
        <div className="flex justify-between items-start mb-1">
          <h2 className="text-2xl font-bold text-slate-800">{temuan.nomor_temuan}</h2>
          {canEditTemuan(profile, temuan) && (
            <Link href={`/temuan/edit/${temuan.id}`}
              className="border text-sky-600 border-sky-200 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-sky-50">
              Edit Data
            </Link>
          )}
        </div>
        <p className="text-slate-500 mb-6">{temuan.judul_temuan}</p>

        <div className="bg-white rounded-xl shadow-sm border p-5 mb-6">
          <div className="grid grid-cols-3 gap-4 text-sm mb-4">
            <div><span className="text-slate-500">Wajib Setor</span><p className="font-medium">{temuan.nama_wajib_setor}</p></div>
            <div><span className="text-slate-500">Nilai Kerugian</span><p className="font-medium">Rp {Number(temuan.nilai_kerugian).toLocaleString('id-ID')}</p></div>
            <div><span className="text-slate-500">Sisa Saldo</span><p className="font-medium">Rp {Number(temuan.sisa_saldo).toLocaleString('id-ID')}</p></div>
            <div><span className="text-slate-500">Penanggung Jawab</span><p className="font-medium">{temuan.penanggung_jawab || '-'}</p></div>
            <div><span className="text-slate-500">Status (BPK)</span><p className="font-medium">{temuan.status_bpk || '-'}</p></div>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-3">
            <div className="bg-emerald-600 h-3 rounded-full" style={{ width: `${progres}%` }} />
          </div>
          <p className="text-xs text-slate-500 mt-1">{progres}% terselesaikan</p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <h3 className="font-semibold text-slate-700 mb-3">Upload Bukti Setoran</h3>
            <form onSubmit={handleUpload} className="space-y-3">
              <input type="date" required value={tanggal} onChange={(e) => setTanggal(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
              <input type="number" required placeholder="Jumlah setor (Rp)" value={jumlah}
                onChange={(e) => setJumlah(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
              <input type="file" required onChange={(e) => setFile(e.target.files[0])}
                className="w-full text-sm" />
              <button type="submit" disabled={uploading}
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700">
                {uploading ? 'Mengunggah...' : 'Simpan Bukti Setoran'}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-5">
            <h3 className="font-semibold text-slate-700 mb-3">Riwayat Setoran</h3>
            <ul className="divide-y text-sm">
              {bukti.map((b) => (
                <li key={b.id} className="py-2 flex justify-between items-center">
                  <div>
                    <p className="font-medium">Rp {Number(b.jumlah_setor).toLocaleString('id-ID')}</p>
                    <p className="text-slate-500 text-xs">{b.tanggal_setor}</p>
                  </div>
                  <button onClick={() => unduhFile(b.file_path)} className="text-emerald-600 text-xs font-medium">
                    Lihat Berkas
                  </button>
                </li>
              ))}
              {bukti.length === 0 && <p className="text-slate-400 text-sm py-2">Belum ada setoran tercatat.</p>}
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}

export default withRoleGuard(DetailTemuan, { menuKey: 'temuan' });
