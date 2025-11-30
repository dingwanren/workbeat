import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 3000,
    open: true, // 自动打开浏览器
    cors: true,
    // 代理 API 请求到后端服务器，用于开发
    proxy: {
      '/api': {
        target: 'http://localhost:3001', // 假设后端服务器在 3001 端口
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  build: {
    outDir: '../dist/static', // 构建到主项目的 dist/static 目录 (from web-ui directory: web-ui/../dist/static = project-root/dist/static)
    emptyOutDir: true // 清空输出目录
  },
  resolve: {
    alias: {
      '@/': resolve(__dirname, 'src/')
    }
  }
})