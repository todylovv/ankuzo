import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/ankuzo/',
  plugins: [react()],
  build: {
    target: 'es2020'
  }
});
