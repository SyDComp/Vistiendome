import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// El Agilizador (orquestador de arranque) inyecta VITE_API_BASE con el puerto
// real del backend antes de correr `yarn dev`. Sin esa variable (ej. server
// corriendo aparte a mano) cae al puerto clásico 8000.
const apiTarget = process.env.VITE_API_BASE || 'http://127.0.0.1:8000'
const wsTarget = apiTarget.replace(/^http/, 'ws')

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  test: {
    environment: 'jsdom',
    globals: true,
  },
  server: {
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true
      },
      '/ws': {
        target: wsTarget,
        ws: true
      },
      '/static': {
        target: apiTarget,
        changeOrigin: true
      },
      '/media': {
        target: apiTarget,
        changeOrigin: true
      }
    }
  }
})


