import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 3000,
    open: true, // 自动打开浏览器
    cors: true
  },
  build: {
    outDir: '../dist-vue' // 构建到主项目的 dist-vue 目录
  }
})