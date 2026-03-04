/**
 * tenant.ts — Configuração central multi-tenant
 * Coloque em: src/lib/tenant.ts
 */

import { collection, doc } from 'firebase/firestore';
import { db } from './firebase';

export const PROVEDOR_ID: string =
  (import.meta.env.VITE_PROVEDOR_ID as string) || 'giganet';

// ── Coleções ────────────────────────────────────────────────────
export const Col = {
  users:         () => collection(db, 'provedores', PROVEDOR_ID, 'users'),
  announcements: () => collection(db, 'provedores', PROVEDOR_ID, 'announcements'),
  deviceImages:  () => collection(db, 'provedores', PROVEDOR_ID, 'deviceImages'),
  plans:         () => collection(db, 'provedores', PROVEDOR_ID, 'plans'),
  tickets:       () => collection(db, 'provedores', PROVEDOR_ID, 'tickets'),
  notificacoes:  () => collection(db, 'provedores', PROVEDOR_ID, 'notificacoes'),
};

// ── Documentos ──────────────────────────────────────────────────
export const Doc = {
  profile: ()            => doc(db, 'provedores', PROVEDOR_ID, 'settings', 'profile'),
  user:    (uid: string) => doc(db, 'provedores', PROVEDOR_ID, 'users', uid),
  plan:    (id: string)  => doc(db, 'provedores', PROVEDOR_ID, 'plans', id),
  ticket:  (id: string)  => doc(db, 'provedores', PROVEDOR_ID, 'tickets', id),
};
