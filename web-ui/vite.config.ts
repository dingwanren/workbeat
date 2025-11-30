import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// 自定义插件：在 HTML 中注入构建时间戳
const htmlTimestampPlugin = () => {
  return {
    name: 'html-timestamp',
    transformIndexHtml(html) {
      const timestamp = new Date().toISOString();
      // 在 </body> 标签前插入版本信息
      return html.replace('</body>', `  <!-- Version: ${timestamp} -->\n</body>`)
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), htmlTimestampPlugin()],
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
    emptyOutDir: true, // 清空输出目录
    // 或者禁用所有压缩
    minify: false,
    rollupOptions: {
      treeshake: {
        preset: 'recommended',
        // 保留 console.log
        moduleSideEffects: true
      },
      output: {
        // 为 JavaScript 文件添加哈希
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          // 为 CSS 文件添加哈希，其他资源也添加哈希
          if (assetInfo.name.endsWith('.css')) {
            return 'assets/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        }
      }
    }
  },
  resolve: {
    alias: {
      '@/': resolve(__dirname, 'src/')
    }
  }
})