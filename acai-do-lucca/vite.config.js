import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// vitejs.dev
export default defineConfig({
  plugins: [react()],
  base: '/cardapio-online-acai/', // <-- Esta linha é crucial
  esbuild: {
    drop: ['console', 'debugger'],
  },
})
