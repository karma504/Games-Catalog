import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    server: {
      port: 5173,
      proxy: {
        '/api': { target: env.DEV_API_TARGET || 'http://localhost:3000', changeOrigin: true },
      },
    },
  }
})
