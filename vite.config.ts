import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// 어드민과 뷰어는 **각자 독립된 앱**이다. `root`를 앱 폴더로 내려서
// dev 서버가 그 앱 하나만 열게 한다 — 어드민 서버에서 뷰어는 404다.
//
//   npm run dev          어드민 :5173
//   npm run dev:viewer   뷰어   :5174   (뒤에 --mode viewer가 붙는다)
//
// 빌드도 따로 나온다: dist-admin/index.html · dist-viewer/index.html.
// 둘 다 index.html이라 Vercel에 Project 2개로 그대로 붙는다.
// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const viewer = mode === 'viewer'
  const root = path.resolve(import.meta.dirname, 'src', viewer ? 'viewer' : 'admin')

  return {
    root,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    server: {
      port: viewer ? 5174 : 5173,
      // 포트가 밀리면 "어드민은 5173"이 거짓이 된다. 조용히 옮기지 말고 실패할 것.
      strictPort: true,
    },
    build: {
      // root 바깥이라 절대경로로 준다. emptyOutDir도 그래서 명시해야 한다.
      outDir: path.resolve(import.meta.dirname, viewer ? 'dist-viewer' : 'dist-admin'),
      emptyOutDir: true,
    },
  }
})
