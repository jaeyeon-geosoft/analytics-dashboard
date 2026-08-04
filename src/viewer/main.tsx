import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/shared/index.css'
import ViewerApp from './viewer-app.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ViewerApp />
  </StrictMode>,
)
