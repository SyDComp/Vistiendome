import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// El Agilizador (orquestador de arranque) inyecta VITE_API_BASE con el puerto
// real del backend antes de correr `yarn dev`. Sin esa variable (ej. server
// corriendo aparte a mano) cae al puerto clásico 8000.
const apiTarget = process.env.VITE_API_BASE || 'http://127.0.0.1:8000'
const wsTarget = apiTarget.replace(/^http/, 'ws')

// https://vite.dev/config/
// Un solo proxy para `dev` y `preview`. Sin esto, `vite preview` (la build de
// producción) no alcanza al backend, y medir sobre build es justamente donde
// las mediciones son ciertas: en `dev`, StrictMode duplica los efectos.
const proxy = {
  '/api': { target: apiTarget, changeOrigin: true },
  '/ws': { target: wsTarget, ws: true },
  '/static': { target: apiTarget, changeOrigin: true },
  '/media': { target: apiTarget, changeOrigin: true },
}

export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  test: {
    environment: 'jsdom',
    globals: true,
  },
  server: { proxy },
  preview: { proxy },
})


