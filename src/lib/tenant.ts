/**
 * tenant.ts — Configuração central multi-tenant
 * Coloque em: src/lib/tenant.ts
 *
 * Cada provedor tem seu próprio deploy no Cloudflare Pages com:
 *   VITE_PROVEDOR_ID = vgweb
 *
 * Estrutura no Firestore:
 *   provedores/{provedor_id}/settings/profile     → logo, capa, bg login
 *   provedores/{provedor_id}/users/{uid}           → clientes
 *   provedores/{provedor_id}/announcements/{id}   → anúncios
 *   provedores/{provedor_id}/deviceImages/{id}    → dispositivos
 *   provedores/{provedor_id}/plans/{id}           → planos
 *   provedores/{provedor_id}/tickets/{id}         → chamados
 */

import { collection, doc } from 'firebase/firestore';
import { db } from './firebase';

// ID do provedor — vem da variável de ambiente do deploy
export const PROVEDOR_ID: string =
  (import.meta.env.VITE_PROVEDOR_ID as string) || 'vgweb';

// ── Coleções ────────────────────────────────────────────────────
export const Col = {
  users:         () => collection(db, 'provedores', PROVEDOR_ID, 'users'),
  announcements: () => collection(db, 'provedores', PROVEDOR_ID, 'announcements'),
  deviceImages:  () => collection(db, 'provedores', PROVEDOR_ID, 'deviceImages'),
  plans:         () => collection(db, 'provedores', PROVEDOR_ID, 'plans'),
  tickets:       () => collection(db, 'provedores', PROVEDOR_ID, 'tickets'),
};

// ── Documentos ──────────────────────────────────────────────────
export const Doc = {
  profile: ()            => doc(db, 'provedores', PROVEDOR_ID, 'settings', 'profile'),
  user:    (uid: string) => doc(db, 'provedores', PROVEDOR_ID, 'users', uid),
  plan:    (id: string)  => doc(db, 'provedores', PROVEDOR_ID, 'plans', id),
  ticket:  (id: string)  => doc(db, 'provedores', PROVEDOR_ID, 'tickets', id),
};
