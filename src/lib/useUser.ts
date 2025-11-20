import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { useRouter } from 'next/navigation';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
}

export function useUser() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
    setupAutoLogout();
  }, []);

  const setupAutoLogout = () => {
    let timeout: NodeJS.Timeout;
    const INACTIVITY_TIME = 2 * 60 * 60 * 1000; // 2 saat

    const resetTimer = () => {
      clearTimeout(timeout);
      timeout = setTimeout(async () => {
        console.log('2 saat hareketsizlik - Otomatik çıkış yapılıyor...');
        await supabase.auth.signOut();
        router.push('/login');
      }, INACTIVITY_TIME);
    };

    // Kullanıcı aktivitelerini dinle
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, resetTimer);
    });

    resetTimer();

    // Cleanup
    return () => {
      clearTimeout(timeout);
      events.forEach(event => {
        document.removeEventListener(event, resetTimer);
      });
    };
  };

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      const displayName = 
        profile?.name || 
        authUser.user_metadata?.name || 
        authUser.user_metadata?.full_name || 
        authUser.email?.split('@')[0] || 
        'Kullanıcı';

      setUser({
        id: authUser.id,
        email: authUser.email || '',
        name: displayName,
        avatar_url: profile?.avatar_url
      });
    } catch (err) {
      console.error('useUser error:', err);
    } finally {
      setLoading(false);
    }
  };

  return { user, loading };
}
