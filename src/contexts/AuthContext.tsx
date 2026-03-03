/**
 * AuthContext.tsx — Multi-tenant
 * Coloque em: src/contexts/AuthContext.tsx
 * 
 * Mudança: users/{uid} → provedores/{PROVEDOR_ID}/users/{uid}
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { getDoc } from 'firebase/firestore';
import { auth } from '../lib/firebase';
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
  endereco?:      { rua: string; numero: string; bairro: string; cidade: string; cep: string };
}

interface AuthContextType {
  user:       User | null;
  profile:    UserProfile | null;
  loading:    boolean;
  isAdmin:    boolean;
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
          // ✅ Multi-tenant: busca user dentro do provedor
          const snap = await getDoc(Doc.user(u.uid));
          if (snap.exists()) setProfile({ uid: u.uid, ...snap.data() } as UserProfile);
        } catch { setProfile(null); }
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

export const useAuth = () => useContext(AuthContext);
