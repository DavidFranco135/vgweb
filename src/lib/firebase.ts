import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

/**
 * NOTA: Firebase Storage foi REMOVIDO intencionalmente.
 * Todos os uploads de imagem usam o ImgBB (src/lib/imgbbService.ts)
 * para evitar erros de CORS ao hospedar no Cloudflare Pages.
 *
 * Se precisar reativar o Storage futuramente, configure as regras de CORS
 * no bucket via Google Cloud Console:
 * https://firebase.google.com/docs/storage/web/download-files#cors_configuration
 */

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

// storage removido — use imgbbService.ts para uploads
export const storage = null;
