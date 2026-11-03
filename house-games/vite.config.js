import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' lets the site work on GitHub Pages (https://user.github.io/repo-name/) and on any normal host.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5173, open: true },
});
