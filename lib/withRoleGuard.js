// lib/withRoleGuard.js
// HOC "middleware" sisi klien: cek sesi Supabase + role profil sebelum
// merender halaman. Next.js Pages Router tidak punya middleware server
// yang mudah mengakses cookie Supabase Auth Helpers tanpa paket tambahan,
// jadi guard ini dijalankan di client saat halaman mount, dengan layar
// loading agar konten tidak "flash" sebelum redirect.
//
// Pemakaian di halaman:
//   export default withRoleGuard(Dashboard, { menuKey: 'dashboard' });

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from './supabaseClient';
import { hasMenuAccess } from './roleAccess';

export function withRoleGuard(Component, { menuKey } = {}) {
  return function Guarded(props) {
    const router = useRouter();
    const [status, setStatus] = useState('checking'); // checking | ok | denied
    const [profile, setProfile] = useState(null);

    useEffect(() => {
      let active = true;

      async function check() {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          router.replace('/login');
          return;
        }

        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('id, nama, role, opd_id, opd:opd_id(nama)')
          .eq('id', sessionData.session.user.id)
          .single();

        if (!active) return;

        if (error || !profileData) {
          router.replace('/login');
          return;
        }

        if (menuKey && !hasMenuAccess(menuKey, profileData.role)) {
          setStatus('denied');
          return;
        }

        setProfile(profileData);
        setStatus('ok');
      }

      check();
      return () => {
        active = false;
      };
    }, [router]);

    if (status === 'checking') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400 text-sm">
          Memuat...
        </div>
      );
    }

    if (status === 'denied') {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-center px-4">
          <p className="text-4xl mb-2">🔒</p>
          <h1 className="text-xl font-bold text-slate-800">Akses Ditolak</h1>
          <p className="text-slate-500 text-sm mt-1">
            Anda tidak memiliki hak akses untuk membuka halaman ini.
          </p>
          <button
            onClick={() => router.replace('/dashboard')}
            className="mt-4 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-700"
          >
            Kembali ke Dashboard
          </button>
        </div>
      );
    }

    return <Component {...props} profile={profile} />;
  };
}
