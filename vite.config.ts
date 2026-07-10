import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/romanji/' : '/',
  plugins: [react()],
  server: {
    host: true, // 允许局域网设备（如手机）通过 Mac IP 直接访问
    port: 5173
  }
})
