import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(({ command, mode }) => {
  const local = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    define: command === 'build' ? { 'process.env.NODE_ENV': JSON.stringify('production') } : {},
    server: {
      proxy: {
        '/api':
          'http://localhost:' + (process.env.API_PORT || local.API_PORT || local.PORT || '5000'),
      },
    },
  };
});
