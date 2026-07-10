// components/UploadExcelParser.js
// Menu "Update Excel / Parsing Otomatis". Menerima .xlsx, .xls, .csv
// (maks 100MB), memvalidasi header sesuai template, lalu insert ke
// tabel temuan_bpk. Operator OPD hanya boleh mengunggah data untuk
// OPD miliknya sendiri (RLS di server juga menegakkan ini sebagai lapis kedua).

import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabaseClient';
import { CAN } from '../lib/roleAccess';

const MAX_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB

// Header yang dikenali (case-insensitive, spasi dirapikan). Nilai di
// kanan adalah kolom tujuan pada tabel temuan_bpk.
const TEMPLATE_COLUMNS = {
  'opd/skpd': 'opd',
  'no. lhp': 'nomor_temuan',
  'no lhp': 'nomor_temuan',
  'jenis temuan': 'judul_temuan',
  'nilai temuan (rp)': 'nilai_kerugian',
  'nilai temuan': 'nilai_kerugian',
  'jumlah disetor (rp)': 'total_disetor',
  'jumlah disetor': 'total_disetor',
  'status penanggung jawab': 'status_penanggung_jawab', // disimpan di kolom keterangan
};

const REQUIRED_TARGETS = [
  'opd',
  'nomor_temuan',
  'judul_temuan',
  'nilai_kerugian',
  'total_disetor',
];

function normalizeHeader(h) {
  return String(h || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function toNumber(v) {
  if (typeof v === 'number') return v;
  if (!v) return 0;
  const cleaned = String(v).replace(/[^\d.,-]/g, '').replace(/\./g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function computeStatus(nilai, disetor) {
  if (disetor <= 0) return 'belum_lunas';
  if (disetor >= nilai) return 'lunas';
  return 'cicilan';
}

export default function UploadExcelParser({ profile, opdList, onDone }) {
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState([]);
  const [errors, setErrors] = useState([]);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);

  const canUploadAnyOpd = CAN.uploadExcelAnyOpd(profile?.role);
  const canUploadOwnOnly = CAN.uploadExcelOwnOpdOnly(profile?.role);

  function opdIdByName(nama) {
    const found = opdList.find(
      (o) => o.nama.trim().toLowerCase() === String(nama).trim().toLowerCase()
    );
    return found ? found.id : null;
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);
    setErrors([]);
    setRows([]);
    setFileName(file.name);

    if (file.size > MAX_SIZE_BYTES) {
      setErrors([`Ukuran file ${(file.size / 1024 / 1024).toFixed(1)} MB melebihi batas 100 MB.`]);
      return;
    }

    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      setErrors(['Format file tidak didukung. Gunakan .xlsx, .xls, atau .csv.']);
      return;
    }

    setParsing(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (raw.length === 0) {
        setErrors(['File tidak berisi data.']);
        setParsing(false);
        return;
      }

      // Validasi header: petakan header asli -> nama target
      const sampleHeaders = Object.keys(raw[0]).map(normalizeHeader);
      const mapping = {}; // header asli -> target field
      Object.keys(raw[0]).forEach((originalHeader) => {
        const norm = normalizeHeader(originalHeader);
        if (TEMPLATE_COLUMNS[norm]) {
          mapping[originalHeader] = TEMPLATE_COLUMNS[norm];
        }
      });

      const mappedTargets = new Set(Object.values(mapping));
      const missing = REQUIRED_TARGETS.filter((t) => !mappedTargets.has(t));
      if (missing.length > 0) {
        setErrors([
          `Header tidak sesuai template. Kolom wajib yang tidak ditemukan: ${missing.join(', ')}.`,
          `Header yang terdeteksi pada file: ${sampleHeaders.join(', ')}`,
        ]);
        setParsing(false);
        return;
      }

      const parsedRows = [];
      const rowErrors = [];

      raw.forEach((r, idx) => {
        const record = {};
        Object.entries(mapping).forEach(([originalHeader, target]) => {
          record[target] = r[originalHeader];
        });

        const opdNama = String(record.opd || '').trim();
        const opdId = opdIdByName(opdNama);
        const nilai = toNumber(record.nilai_kerugian);
        const disetor = toNumber(record.total_disetor);

        const lineNo = idx + 2; // +2: header row + 1-index

        if (!opdNama || !opdId) {
          rowErrors.push(`Baris ${lineNo}: OPD/SKPD "${opdNama}" tidak dikenali.`);
          return;
        }
        if (canUploadOwnOnly && opdId !== profile.opd_id) {
          rowErrors.push(`Baris ${lineNo}: OPD "${opdNama}" bukan OPD Anda, baris dilewati.`);
          return;
        }
        if (!record.nomor_temuan) {
          rowErrors.push(`Baris ${lineNo}: No. LHP kosong.`);
          return;
        }

        parsedRows.push({
          opd: opdNama,
          opd_id: opdId,
          nomor_temuan: String(record.nomor_temuan).trim(),
          judul_temuan: String(record.judul_temuan || '').trim(),
          nama_wajib_setor: opdNama,
          nilai_kerugian: nilai,
          total_disetor: disetor,
          status: computeStatus(nilai, disetor),
          keterangan: record.status_penanggung_jawab
            ? `Status Penanggung Jawab: ${record.status_penanggung_jawab}`
            : null,
          tanggal_temuan: new Date().toISOString().slice(0, 10),
        });
      });

      setRows(parsedRows);
      setErrors(rowErrors);
    } catch (err) {
      setErrors([`Gagal membaca file: ${err.message}`]);
    } finally {
      setParsing(false);
    }
  }

  async function handleSave() {
    if (rows.length === 0) return;
    setSaving(true);
    try {
      const { error, data } = await supabase.from('temuan_bpk').insert(rows).select('id');
      if (error) throw error;

      await supabase.from('log_aktivitas').insert({
        user_id: profile.id,
        aksi: 'upload_excel',
        keterangan: `Mengunggah ${data.length} baris temuan dari file ${fileName}`,
      });

      setResult({ success: true, count: data.length });
      setRows([]);
      setFileName('');
      if (inputRef.current) inputRef.current.value = '';
      onDone?.();
    } catch (err) {
      setResult({ success: false, message: err.message });
    } finally {
      setSaving(false);
    }
  }

  if (!canUploadAnyOpd && !canUploadOwnOnly) {
    return (
      <p className="text-sm text-slate-400">
        Anda tidak memiliki akses untuk mengunggah file Excel.
      </p>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border p-5">
      <h3 className="font-semibold text-slate-700 mb-1">Update Excel / Parsing Otomatis</h3>
      <p className="text-xs text-slate-400 mb-4">
        Format: .xlsx, .xls, .csv — maks. 100 MB. Kolom wajib: OPD/SKPD, No. LHP,
        Jenis Temuan, Nilai Temuan (Rp), Jumlah Disetor (Rp), Status Penanggung Jawab.
        {canUploadOwnOnly && ' Hanya baris untuk OPD Anda yang akan diproses.'}
      </p>

      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFile}
        className="text-sm mb-3"
      />

      {parsing && <p className="text-sm text-slate-400">Membaca file...</p>}

      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700 space-y-1 mb-3 max-h-40 overflow-y-auto">
          {errors.map((e, i) => (
            <p key={i}>⚠ {e}</p>
          ))}
        </div>
      )}

      {rows.length > 0 && (
        <>
          <p className="text-sm text-slate-600 mb-2">
            {rows.length} baris siap diproses (setelah validasi).
          </p>
          <div className="max-h-48 overflow-y-auto border rounded-lg mb-3">
            <table className="w-full text-xs">
              <thead className="bg-slate-100 sticky top-0">
                <tr className="text-left">
                  <th className="px-2 py-1">OPD</th>
                  <th className="px-2 py-1">No. LHP</th>
                  <th className="px-2 py-1">Nilai</th>
                  <th className="px-2 py-1">Disetor</th>
                  <th className="px-2 py-1">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 50).map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-2 py-1">{r.opd}</td>
                    <td className="px-2 py-1">{r.nomor_temuan}</td>
                    <td className="px-2 py-1">{r.nilai_kerugian.toLocaleString('id-ID')}</td>
                    <td className="px-2 py-1">{r.total_disetor.toLocaleString('id-ID')}</td>
                    <td className="px-2 py-1">{r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving ? 'Menyimpan...' : `Simpan ${rows.length} Baris ke Database`}
          </button>
        </>
      )}

      {result && result.success && (
        <p className="text-sm text-emerald-600 mt-3">
          ✓ Berhasil menyimpan {result.count} temuan baru.
        </p>
      )}
      {result && !result.success && (
        <p className="text-sm text-red-600 mt-3">✗ Gagal menyimpan: {result.message}</p>
      )}
    </div>
  );
}
