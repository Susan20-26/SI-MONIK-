// components/NotificationBell.js
// Lonceng notifikasi untuk admin utama: memantau aktivitas Operator OPD
// (upload bukti setoran, tambah temuan, dsb.) secara real-time tanpa
// perlu konfirmasi manual ke OPD. Sumber datanya adalah tabel
// log_aktivitas yang sudah dipakai di seluruh halaman -- lihat
// supabase_schema_notifikasi.sql untuk migrasi yang dibutuhkan
// (kolom `dibaca`, policy update admin, dan realtime publication).
//
// Hanya tampil untuk profile.role === 'admin'; untuk role lain
// komponen ini tidak merender apa pun.

import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

function waktuRelatif(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const menit = Math.floor(diffMs / 60000);
  if (menit < 1) return 'baru saja';
  if (menit < 60) return `${menit} menit lalu`;
  const jam = Math.floor(menit / 60);
  if (jam < 24) return `${jam} jam lalu`;
  const hari = Math.floor(jam / 24);
  return `${hari} hari lalu`;
}

export default function NotificationBell({ profile }) {
  const isAdmin = profile?.role === 'admin';
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const operatorIds = useRef(new Set());
  const wrapperRef = useRef(null);

  async function loadOperatorIds() {
    const { data } = await supabase.from('profiles').select('id').eq('role', 'operator_opd');
    operatorIds.current = new Set((data || []).map((p) => p.id));
  }

  async function loadNotifikasi() {
    const { data } = await supabase
      .from('log_aktivitas')
      .select('id, aksi, keterangan, created_at, dibaca, actor:user_id(nama, role)')
      .eq('dibaca', false)
      .order('created_at', { ascending: false })
      .limit(30);
    const filtered = (data || []).filter((n) => n.actor?.role === 'operator_opd');
    setItems(filtered);
  }

  useEffect(() => {
    if (!isAdmin) return;
    let channel;

    async function init() {
      await loadOperatorIds();
      await loadNotifikasi();

      channel = supabase
        .channel('notifikasi-log-aktivitas')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'log_aktivitas' },
          (payload) => {
            const row = payload.new;
            if (row.dibaca || !operatorIds.current.has(row.user_id)) return;
            loadNotifikasi();
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'log_aktivitas' },
          (payload) => {
            if (payload.new?.dibaca) {
              setItems((prev) => prev.filter((n) => n.id !== payload.new.id));
            }
          }
        )
        .subscribe();
    }

    init();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isAdmin) return null;

  async function tandaiDibaca(id) {
    setItems((prev) => prev.filter((n) => n.id !== id));
    await supabase.from('log_aktivitas').update({ dibaca: true }).eq('id', id);
  }

  async function tandaiSemuaDibaca() {
    const ids = items.map((n) => n.id);
    setItems([]);
    if (ids.length) await supabase.from('log_aktivitas').update({ dibaca: true }).in('id', ids);
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-300"
        title="Notifikasi aktivitas Operator OPD"
      >
        <span className="text-lg">🔔</span>
        {items.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] leading-none rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
            {items.length > 9 ? '9+' : items.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-11 w-80 bg-white text-slate-800 rounded-xl shadow-lg border z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b bg-slate-50">
            <p className="text-sm font-semibold">Notifikasi Aktivitas OPD</p>
            {items.length > 0 && (
              <button onClick={tandaiSemuaDibaca} className="text-xs text-emerald-600 font-medium hover:underline">
                Tandai semua dibaca
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto divide-y">
            {items.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-6">Belum ada aktivitas baru.</p>
            )}
            {items.map((n) => (
              <button
                key={n.id}
                onClick={() => tandaiDibaca(n.id)}
                className="w-full text-left px-4 py-3 hover:bg-slate-50 text-sm"
              >
                <p className="font-medium text-slate-700">{n.actor?.nama || 'Operator OPD'}</p>
                <p className="text-slate-500">{n.keterangan}</p>
                <p className="text-slate-400 text-xs mt-1">{waktuRelatif(n.created_at)}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
