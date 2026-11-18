import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// ENTRY=simple|pro|test  ->  dist/<entry>/<entry>.html (one self-contained file, no server needed)
const entry = process.env.ENTRY || 'pro';
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  build: { target: 'es2020', chunkSizeWarningLimit: 4000, outDir: `dist/${entry}`, emptyOutDir: true, rollupOptions: { input: `${entry}.html` } },
});
