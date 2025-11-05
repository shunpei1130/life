import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  GoogleAuthProvider,
  User,
  getAuth,
  onIdTokenChanged,
  signInWithPopup,
  signOut
} from 'firebase/auth';

import { getFirebaseApp } from '@/lib/firebase';

type AuthContextValue = {
  user: User | null;
  idToken: string | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  refreshIdToken: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const isBrowser = typeof window !== 'undefined';
  const [authInstance, setAuthInstance] = useState<ReturnType<typeof getAuth> | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isBrowser) {
      setLoading(false);
      return;
    }

    try {
      const app = getFirebaseApp();
      const auth = getAuth(app);
      setAuthInstance(auth);
    } catch (error) {
      console.error('Failed to initialize Firebase App', error);
      setLoading(false);
    }
  }, [isBrowser]);

  useEffect(() => {
    if (!authInstance) {
      return;
    }

    const unsubscribe = onIdTokenChanged(authInstance, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const token = await firebaseUser.getIdToken();
        setIdToken(token);
      } else {
        setUser(null);
        setIdToken(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [authInstance]);

  const refreshIdToken = useCallback(async () => {
    if (!authInstance?.currentUser) return null;
    const token = await authInstance.currentUser.getIdToken(true);
    setIdToken(token);
    return token;
  }, [authInstance]);

  const signInWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    if (!authInstance) {
      throw new Error('Firebase Auth is not available.');
    }
    await signInWithPopup(authInstance, provider);
  }, [authInstance]);

  const signOutUser = useCallback(async () => {
    if (!authInstance) return;
    await signOut(authInstance);
  }, [authInstance]);

  const value: AuthContextValue = useMemo(
    () => ({ user, idToken, loading, signInWithGoogle, signOutUser, refreshIdToken }),
    [user, idToken, loading, signInWithGoogle, signOutUser, refreshIdToken]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
