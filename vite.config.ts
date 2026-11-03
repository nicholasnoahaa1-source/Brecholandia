import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    // Em desenvolvimento, as chamadas /api vão para o servidor Node (npm run api).
    proxy: { '/api': 'http://localhost:3001' },
  },
})
