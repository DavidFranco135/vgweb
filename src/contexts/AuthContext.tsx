/**
 * AuthContext.tsx — Multi-tenant + FCM token automático
 * Coloque em: src/contexts/AuthContext.tsx
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { getDoc, updateDoc } from 'firebase/firestore';
import { auth } from '../lib/firebase';
import { requestFCMToken } from '../lib/firebase';
import { Doc } from '../lib/tenant';

export interface UserProfile {
  uid:            string;
  nome:           string;
  email:          string;
  cpf:            string;
  tipo:           'admin' | 'client';
  fotoUrl?:       string;
  statusConexao?: string;
  numeroCliente?: string;
  telefone?:      string;
  fcmToken?:      string;
  bairro?:        string;
  endereco?:      { rua: string; numero: string; bairro: string; cidade: string; cep: string };
}

interface AuthContextType {
  user:    User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null, profile: null, loading: true, isAdmin: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user,    setUser   ] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const snap = await getDoc(Doc.user(u.uid));
          if (snap.exists()) {
            const profileData = { uid: u.uid, ...snap.data() } as UserProfile;
            setProfile(profileData);

            // ── Registra FCM token automaticamente após login ──
            // Só para clientes (admin não precisa receber push)
            if (profileData.tipo === 'client') {
              registerFCMToken(u.uid);
            }
          }
        } catch {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin: profile?.tipo === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
};

// ── Registra/atualiza FCM token no servidor ─────────────────────
async function registerFCMToken(uid: string) {
  try {
    const token = await requestFCMToken();
    if (!token) return;

    // Salva no servidor (server.ts route POST /api/fcm/token)
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) return;

    await fetch('/api/fcm/token', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({ token }),
    });
  } catch (err) {
    // Silencioso — não bloqueia o login
    console.warn('[FCM] Falha ao registrar token:', err);
  }
}

export const useAuth = () => useContext(AuthContext);
