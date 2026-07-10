import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    async function checkSession() {
      const { data } = await supabase.auth.getSession();
      router.replace(data.session ? '/dashboard' : '/login');
    }
    checkSession();
  }, [router]);

  return null;
}
