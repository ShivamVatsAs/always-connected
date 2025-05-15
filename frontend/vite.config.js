// frontend/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // You can specify the port for the dev server
    strictPort: true, // If port is already in use, exit instead of trying next available port
    // Optional: Proxy for API requests to backend during development
    // proxy: {
    //   '/api': {
    //     target: 'http://localhost:3001', // Your backend server
    //     changeOrigin: true,
    //     // rewrite: (path) => path.replace(/^\/api/, '') // if your backend doesn't have /api prefix
    //   }
    // }
  },
  build: {
    outDir: 'dist', // Output directory for production build
  },
  // define: { // If you need to expose .env variables not prefixed with VITE_
  //   // This is generally not recommended for sensitive keys.
  //   // 'process.env.VITE_CUSTOM_ENV_VAR': JSON.stringify(process.env.VITE_CUSTOM_ENV_VAR),
  // }
});
