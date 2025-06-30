import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg'], // ✅ This prevents pre-bundling ffmpeg
  },
build: {
    outDir: 'dist', // output directory (default is 'dist')
    sourcemap: false, // or true if you want source maps
    minify: 'esbuild', // or 'terser' or false
    target: 'esnext', // JavaScript target
    assetsDir: 'assets', // directory under outDir to place assets
    rollupOptions: {
      output: {
        manualChunks: undefined, // customize chunk splitting
      },
    },
  },
})
