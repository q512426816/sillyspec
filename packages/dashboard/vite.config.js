import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default {
  plugins: [vue(), tailwindcss()],
  build: {
    outDir: 'dist'
  },
  server: {
    port: 3456
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
}
