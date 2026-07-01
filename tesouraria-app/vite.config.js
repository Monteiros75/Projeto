import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Evita os "quase F5" em desenvolvimento quando mudas de separador / Alt+Tab.
  // Trade-off: deixas de ter hot-reload automatico ao gravar ficheiros.
  server: { hmr: false },
})
