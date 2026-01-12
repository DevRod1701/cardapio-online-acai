import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  esbuild: {
    // Isso remove todos os consoles e debuggers na versão final
    drop: ['console', 'debugger'],
  },
})