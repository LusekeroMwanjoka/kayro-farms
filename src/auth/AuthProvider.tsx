import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { isConfigured, supabase } from '../lib/supabase';

export type Role = 'manager' | 'admin';
export type Profile = { id: string; full_name: string; role: Role; active: boolean };

type AuthValue = {
  loading: boolean;
  signingIn: boolean;
  error: string | null;
  session: Session | null;
  profile: Profile | null;
  productCount: number | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthValue | null>(null);
const CACHE_KEY = 'kayro.profile.v1';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [productCount, setProductCount] = useState<number | null>(null);

  // Session only. No awaited Supabase calls inside this callback.
  useEffect(() => {
    if (!isConfigured) {
      setError('App is not configured. Add your Supabase URL and key to .env.local.');
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (!s) {
        setProfile(null);
        setProductCount(null);
        setLoading(false);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id ?? null;

  // Role always comes from the server. The cache is only for starting offline.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        const { data, error: err } = await supabase
          .from('profiles')
          .select('id, full_name, role, active')
          .eq('id', userId)
          .single();
        if (err) throw err;
        if (cancelled) return;
        const p = data as Profile;
        if (!p.active) {
          setError('This account is not active yet. Ask the owner to activate it.');
          await AsyncStorage.removeItem(CACHE_KEY);
          await supabase.auth.signOut();
          return;
        }
        setProfile(p);
        AsyncStorage.setItem(CACHE_KEY, JSON.stringify(p)).catch(() => {});
        const { count } = await supabase.from('products').select('id', { count: 'exact', head: true });
        if (!cancelled) setProductCount(count ?? 0);
      } catch (e: any) {
        if (cancelled) return;
        const raw = await AsyncStorage.getItem(CACHE_KEY).catch(() => null);
        const cached = raw ? (JSON.parse(raw) as Profile) : null;
        if (cached && cached.id === userId) setProfile(cached);
        else setError(e?.message ?? 'Could not load your profile. Check your connection.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const signIn = useCallback(async (email: string, password: string) => {
    setSigningIn(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (err) setError(err.message);
    setSigningIn(false);
  }, []);

  const signOut = useCallback(async () => {
    await AsyncStorage.removeItem(CACHE_KEY).catch(() => {});
    setProfile(null);
    setProductCount(null);
    await supabase.auth.signOut().catch(() => {});
  }, []);

  const value = useMemo(
    () => ({ loading, signingIn, error, session, profile, productCount, signIn, signOut }),
    [loading, signingIn, error, session, profile, productCount, signIn, signOut],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}
