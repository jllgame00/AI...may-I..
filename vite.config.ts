import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // GitHub project Pages: jllgame00/AI...may-I.. (without the .git suffix).
  base: '/AI...may-I../',
  plugins: [react(), tailwindcss()],
})
