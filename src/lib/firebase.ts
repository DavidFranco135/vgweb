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
  apiKey: "AIzaSyDoOG29I0ni48ClBKHJkuqd6vWuslJ85NQ",
  authDomain: "vgweb-34eec.firebaseapp.com",
  projectId: "vgweb-34eec",
  storageBucket: "vgweb-34eec.firebasestorage.app",
  messagingSenderId: "402905896960",
  appId: "1:402905896960:web:aeb6f44dc2370ef8fde0e5"
  measurementId: "G-VD522S6N26"
};

const app = initializeApp(firebaseConfig);

export const auth      = getAuth(app);
export const db        = getFirestore(app);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

// storage removido — use imgbbService.ts para uploads
export const storage = null;
