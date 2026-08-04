import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// 어드민과 뷰어는 진입점이 달라 따로 빌드한다(뷰어는 `--mode viewer`).
// 결과가 dist-admin/ · dist-viewer/로 갈려서 서로 다른 도메인에 올릴 수 있고,
// 뷰어 번들에는 파서(papaparse·SheetJS)와 사이드바가 들어가지 않는다.
//
// dev 서버는 하나로 둘 다 연다 — `/`가 어드민, `/view.html`이 뷰어.
// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const viewer = mode === 'viewer'

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    build: {
      outDir: viewer ? 'dist-viewer' : 'dist-admin',
      rollupOptions: {
        input: path.resolve(import.meta.dirname, viewer ? 'view.html' : 'index.html'),
      },
    },
  }
})
