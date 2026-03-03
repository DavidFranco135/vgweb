import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { copyFileSync, existsSync, readdirSync } from 'fs';
import { resolve } from 'path';

// ── Plugin inline: renomeia ícones antes do build ─────────────
// Resolve nomes com espaços/parênteses gerados pelo GitHub:
// "icon-192 (1).png" → "icon-192.png"
const renameIconsPlugin = () => ({
  name: 'rename-icons',
  buildStart() {
    const publicDir = resolve(process.cwd(), 'public');
    if (!existsSync(publicDir)) return;

    const iconMap: [string, string][] = [
      ['icon-192 (1).png',         'icon-192.png'],
      ['icon-512 (1).png',         'icon-512.png'],
      ['icon-512 (2).png',         'icon-512.png'],
      ['apple-touch-icon (1).png', 'apple-touch-icon.png'],
    ];

    for (const [src, dst] of iconMap) {
      const srcPath = resolve(publicDir, src);
      const dstPath = resolve(publicDir, dst);
      if (existsSync(srcPath) && !existsSync(dstPath)) {
        copyFileSync(srcPath, dstPath);
        console.log(`✓ Ícone copiado: ${src} → ${dst}`);
      }
    }
  },
});

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    renameIconsPlugin(),
  ],
  server: {
    port: 5173,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
