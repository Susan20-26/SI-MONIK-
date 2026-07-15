import { useState } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { supabase } from '../lib/supabaseClient';

// Tipografi premium sesuai brief desain. Di-scope lewat className,
// tidak menimpa font default halaman lain.
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

// --- Ikon inline (tanpa dependensi tambahan) -----------------------------
function IconEmail(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="m3.5 7 8.5 6 8.5-6" />
    </svg>
  );
}

function IconLock(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function IconEye(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconEyeOff(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 3l18 18" />
      <path d="M10.6 5.2A10.6 10.6 0 0 1 12 5c6.4 0 10 7 10 7a17.5 17.5 0 0 1-3.2 4.1M6.6 6.6C4 8.3 2 12 2 12s3.6 7 10 7a9.7 9.7 0 0 0 4.2-.9" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}
// --------------------------------------------------------------------------

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Logic autentikasi TIDAK diubah -- tetap memanggil Supabase Auth
  // persis seperti sebelumnya, hanya tampilannya yang di-upgrade.
  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      router.push('/dashboard');
    }
  }

  return (
    <div className={`${jakarta.className} relative min-h-screen w-full overflow-hidden flex items-center justify-center px-4 py-10`}>
      {/* Latar belakang: foto Rumah Adat Sumba, blur halus + overlay gelap */}
      <div className="absolute inset-0 -z-20">
        <div className="absolute inset-0 animate-slow-zoom">
          <Image
            src="/rumah-adat-sumba.png"
            alt="Rumah Adat Sumba Barat"
            fill
            priority
            sizes="100vw"
            quality={90}
            className="object-cover blur-[5px] scale-105"
          />
        </div>
        {/* Overlay gelap transparan 25-35% + sedikit gradasi emerald di bawah untuk kedalaman */}
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10" />
      </div>

      {/* Kartu login glassmorphism */}
      <div className="relative z-10 w-full max-w-[460px] animate-fade-slide-up">
        <div
          className="rounded-[28px] border border-white/40 bg-white/20 backdrop-blur-[30px] px-8 py-10 sm:px-11 sm:py-12
                     shadow-[0_25px_70px_-15px_rgba(0,0,0,0.45)] ring-1 ring-white/10"
        >
          {/* Logo resmi Kabupaten Sumba Barat -- satu, kecil, tanpa efek dekoratif */}
          <div className="flex justify-center mb-5">
            <Image
              src="/logo-sumba-barat.png"
              alt="Logo Kabupaten Sumba Barat"
              width={64}
              height={74}
              className="h-16 w-auto drop-shadow-md select-none"
              priority
            />
          </div>

          <div className="text-center mb-8">
            <h1 className="text-[40px] sm:text-[42px] font-extrabold leading-tight text-white tracking-tight drop-shadow-sm">
              SI-MONIK
            </h1>
            <p className="mt-2 text-[15px] sm:text-[16px] text-white/80 font-medium">
              Sistem Monitoring — Inspektorat Kabupaten Sumba Barat
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded-2xl border border-red-200/60 bg-red-50/80 backdrop-blur-sm px-4 py-3 text-sm text-red-700 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="mb-1.5 block text-[13px] font-semibold text-white/85">
                Email
              </label>
              <div className="relative group">
                <IconEmail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 transition-colors group-focus-within:text-blue-500" />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@instansi.go.id"
                  className="h-14 w-full rounded-2xl border border-white/50 bg-white/70 pl-12 pr-4 text-[15px] text-slate-800
                             placeholder:text-slate-400 shadow-sm outline-none transition-all duration-300
                             focus:bg-white/90 focus:border-blue-400 focus:ring-4 focus:ring-blue-400/25"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-[13px] font-semibold text-white/85">
                Kata Sandi
              </label>
              <div className="relative group">
                <IconLock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 transition-colors group-focus-within:text-blue-500" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-14 w-full rounded-2xl border border-white/50 bg-white/70 pl-12 pr-12 text-[15px] text-slate-800
                             placeholder:text-slate-400 shadow-sm outline-none transition-all duration-300
                             focus:bg-white/90 focus:border-blue-400 focus:ring-4 focus:ring-blue-400/25"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors
                             focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-md"
                >
                  {showPassword ? <IconEyeOff className="h-5 w-5" /> : <IconEye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 h-14 w-full rounded-2xl text-[16px] font-bold text-white
                         bg-gradient-to-r from-[#00A86B] to-[#007B55]
                         shadow-[0_10px_25px_-8px_rgba(0,123,85,0.65)]
                         transition-all duration-300 ease-out
                         hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-8px_rgba(0,123,85,0.75)] hover:scale-[1.015]
                         active:scale-[0.99] active:translate-y-0
                         disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:scale-100
                         focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300/60"
            >
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-[12.5px] text-white/70 font-medium tracking-wide">
          © {new Date().getFullYear()} Inspektorat Kabupaten Sumba Barat — Akses internal & rahasia
        </p>
      </div>
    </div>
  );
}
