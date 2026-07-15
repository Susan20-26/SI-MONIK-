import Link from 'next/link';
import { useRouter } from 'next/router';
import { hasMenuAccess } from '../lib/roleAccess';
import NotificationBell from './NotificationBell';

const MENU = [
  { key: 'dashboard', href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { key: 'temuan', href: '/temuan', label: 'Data Temuan BPK', icon: '📁' },
  { key: 'tambahTemuan', href: '/temuan/tambah', label: 'Tambah Temuan', icon: '➕' },
  { key: 'laporan', href: '/laporan', label: 'Laporan & Ekspor', icon: '📄' },
  { key: 'log', href: '/log', label: 'Riwayat Aktivitas', icon: '🕒' },
  { key: 'pengguna', href: '/pengguna', label: 'Manajemen Pengguna', icon: '👥' },
];

// profile: { role, opd: { nama } | null }
export default function Sidebar({ profile }) {
  const router = useRouter();
  const role = profile?.role;
  const visibleMenu = MENU.filter((item) => hasMenuAccess(item.key, role));

  return (
    <aside className="w-64 min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <div className="px-5 py-6 border-b border-slate-700 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-wide">SI-MONIK</h1>
          <p className="text-xs text-slate-400">Inspektorat Sumba Barat</p>
        </div>
        <NotificationBell profile={profile} />
      </div>

      {profile && (
        <div className="px-5 py-3 border-b border-slate-800 text-xs">
          <p className="text-slate-200 font-medium truncate">{profile.nama}</p>
          <p className="text-slate-500 capitalize">
            {profile.role?.replace('_', ' ')}
            {profile.opd?.nama ? ` — ${profile.opd.nama}` : ''}
          </p>
        </div>
      )}

      <nav className="flex-1 px-2 py-4 space-y-1">
        {visibleMenu.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition ${
              router.pathname === item.href
                ? 'bg-emerald-600 text-white'
                : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
