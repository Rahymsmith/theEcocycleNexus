import { createContext, useContext, useEffect, useState } from "react";
import { getSession, onAuthStateChange, fetchProfile, signOut as doSignOut } from "../lib/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = loading, null = signed out
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (sess) => {
    if (sess?.user) {
      try {
        const p = await fetchProfile(sess.user.id);
        setProfile(p);
      } catch (e) {
        setProfile(null);
      }
    } else {
      setProfile(null);
    }
  };

  useEffect(() => {
    let unsub;
    (async () => {
      const sess = await getSession();
      setSession(sess);
      await loadProfile(sess);
      setLoading(false);
    })();
    unsub = onAuthStateChange((sess) => {
      setSession(sess);
      // Keep Supabase's auth callback synchronous; load profile on the next tick.
      queueMicrotask(() => loadProfile(sess));
    });
    return () => unsub && unsub();
  }, []);

  const refreshProfile = async () => {
    await loadProfile(session);
  };

  const signOut = async () => {
    await doSignOut();
    setSession(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ session, profile, loading, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
