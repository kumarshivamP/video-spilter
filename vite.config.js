import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg'], // ✅ This prevents pre-bundling ffmpeg
  },
  server: {
    allowedHosts: [
      'localhost',
      '72a4-106-219-145-138.ngrok-free.app', // 👈 your current ngrok domain
    ]
  },
})
