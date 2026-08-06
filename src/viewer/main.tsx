import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/shared/index.css'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import '@/shared/grid.css'
import ViewerApp from './viewer-app.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ViewerApp />
  </StrictMode>,
)
