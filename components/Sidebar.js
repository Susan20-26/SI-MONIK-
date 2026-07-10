import Link from 'next/link';
import { useRouter } from 'next/router';

const MENU = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/temuan', label: 'Data Temuan BPK', icon: '📁' },
  { href: '/temuan/tambah', label: 'Tambah Temuan', icon: '➕' },
  { href: '/laporan', label: 'Laporan & Ekspor', icon: '📄' },
  { href: '/log', label: 'Riwayat Aktivitas', icon: '🕒' },
  { href: '/pengguna', label: 'Manajemen Pengguna', icon: '👥' },
];

export default function Sidebar() {
  const router = useRouter();
  return (
    <aside className="w-64 min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <div className="px-5 py-6 border-b border-slate-700">
        <h1 className="text-xl font-bold tracking-wide">SI-MONIK</h1>
        <p className="text-xs text-slate-400">Inspektorat Sumba Barat</p>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-1">
        {MENU.map((item) => (
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
