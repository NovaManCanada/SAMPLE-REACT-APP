import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const devHost = env.VITE_DEV_HOST;

  return {
    plugins: [react()],
    server: {
      host: true,
      port: 5173,
      // Lets the dev server accept a custom hostname (e.g. so emailed verification/reset
      // links work when opened from another device). Set VITE_DEV_HOST in client/.env.
      allowedHosts: devHost ? [devHost] : undefined,
      proxy: {
        // Dev convenience only — production must serve the API from its real, TLS-terminated origin.
        '/api': {
          target: 'http://localhost:4000',
          changeOrigin: true,
        },
      },
    },
  };
});
