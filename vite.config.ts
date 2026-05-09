import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig, loadEnv} from 'vite';

let extraDefines: Record<string, string> = {};
try {
  const firebaseConfigPath = path.resolve(__dirname, 'firebase-applet-config.json');
  if (fs.existsSync(firebaseConfigPath)) {
    const defaultFirebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf-8'));
    extraDefines['process.env.LOCAL_FIREBASE_CONFIG'] = JSON.stringify(defaultFirebaseConfig);
  } else {
    extraDefines['process.env.LOCAL_FIREBASE_CONFIG'] = JSON.stringify(null);
  }
} catch (e) {
  extraDefines['process.env.LOCAL_FIREBASE_CONFIG'] = JSON.stringify(null);
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      ...extraDefines
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
