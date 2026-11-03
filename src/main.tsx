import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { MotionConfig } from 'motion/react'
import App from './App'
import { refresh } from './lib/db'
import { DialogProvider } from './components/Dialog'
import './styles.css'

refresh()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* reducedMotion="user": respeita a preferência do sistema por menos movimento */}
    <MotionConfig reducedMotion="user">
      <HashRouter>
        <DialogProvider>
          <App />
        </DialogProvider>
      </HashRouter>
    </MotionConfig>
  </StrictMode>,
)
