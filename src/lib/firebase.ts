import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyDhvezaII8Q77ydkl97ggothgjcwCqVMRQ",
  authDomain: "giganet-1d32c.firebaseapp.com",
  projectId: "giganet-1d32c",
  storageBucket: "giganet-1d32c.firebasestorage.app",
  messagingSenderId: "56077285821",
  appId: "1:56077285821:web:fca406a59c0f5138937ad4",
  measurementId: "G-VD522S6N26"
};

const app = initializeApp(firebaseConfig);

export const auth      = getAuth(app);
export const db        = getFirestore(app);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
export const storage   = null; // removido — use imgbbService.ts

// ── Firebase Cloud Messaging (notificações push) ─────────────────
// Só inicializa no browser (não em SSR/Node)
let _messaging: ReturnType<typeof getMessaging> | null = null;

export async function getMessagingInstance() {
  if (typeof window === 'undefined') return null;
  try {
    const supported = await isSupported();
    if (!supported) return null;
    if (!_messaging) _messaging = getMessaging(app);
    return _messaging;
  } catch {
    return null;
  }
}

/**
 * Solicita permissão de notificação e retorna o FCM token.
 * Chame isso após o login do usuário.
 *
 * VITE_VAPID_KEY: gere em Firebase Console → Project Settings
 *   → Cloud Messaging → Web Push certificates → Generate key pair
 */
export async function requestFCMToken(): Promise<string | null> {
  try {
    const messaging = await getMessagingInstance();
    if (!messaging) return null;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_VAPID_KEY,
    });
    return token || null;
  } catch (err) {
    console.warn('[FCM] Erro ao obter token:', err);
    return null;
  }
}

/**
 * Escuta notificações quando o app está em foreground (aberto).
 * Para background, o service worker (firebase-messaging-sw.js) cuida.
 */
export async function onForegroundMessage(
  callback: (payload: any) => void
) {
  const messaging = await getMessagingInstance();
  if (!messaging) return () => {};
  return onMessage(messaging, callback);
}
