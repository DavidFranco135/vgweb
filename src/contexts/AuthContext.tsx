/**
 * AuthContext.tsx
 * Usa onSnapshot para ouvir mudanças em tempo real no Firestore.
 * Assim, quando o server.ts atualiza o statusConexao via IXC/Webhook,
 * o app reflete automaticamente sem precisar recarregar.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  refreshStatus: () => Promise<void>; // força nova consulta ao IXC
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  refreshStatus: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Consulta o IXC e atualiza o Firestore (que dispara o onSnapshot abaixo)
  const refreshStatus = async () => {
    if (!auth.currentUser) return;
    try {
      const token = await auth.currentUser.getIdToken();
      await fetch('/api/ixc/status', {
        headers: { Authorization: `Bearer ${token}` },
      });
      // O server.ts atualiza o Firestore, e o onSnapshot cuida do resto
    } catch (err) {
      console.warn('[AuthContext] Não foi possível consultar status IXC:', err);
    }
  };

  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      setUser(firebaseUser);

      // Remove listener anterior se existir
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }

      if (firebaseUser) {
        // onSnapshot: escuta mudanças em TEMPO REAL no documento do usuário
        // Sempre que o backend atualizar statusConexao, o app reflete instantaneamente
        const docRef = doc(db, 'users', firebaseUser.uid);
        unsubscribeSnapshot = onSnapshot(
          docRef,
          (snap) => {
            if (snap.exists()) {
              setProfile(snap.data() as UserProfile);
            } else {
              setProfile(null);
            }
            setLoading(false);
          },
          (error) => {
            console.error('[AuthContext] Erro no onSnapshot:', error);
            setProfile(null);
            setLoading(false);
          }
        );

        // Consulta o status IXC ao fazer login
        setTimeout(() => refreshStatus(), 1500);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshStatus }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
