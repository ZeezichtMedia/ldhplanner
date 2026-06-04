// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  server: { port: 4331 },
  vite: {
    plugins: [tailwindcss()],
  },
});
