import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@/shared/index.css'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import '@/shared/grid.css'
import ViewerApp from './viewer-app.tsx'

// KRISO 라이브 데이터 fetch 전용(뷰어에만 있음 — 어드민 번들에는 안 들어간다).
const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ViewerApp />
    </QueryClientProvider>
  </StrictMode>,
)
