import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import './index.css'
import App from './App.tsx'

function setStatusBarHeight(height: number) {
  if (height <= 0) return
  document.documentElement.style.setProperty('--native-status-bar-height', `${height}px`)
}

async function refreshNativeSafeArea() {
  try {
    const info = await StatusBar.getInfo()
    setStatusBarHeight(info.height)
  } catch {
    // Browsers rely on CSS safe-area environment variables.
  }
}

async function initSafeArea() {
  if (!Capacitor.isNativePlatform()) return

  document.documentElement.dataset.platform = Capacitor.getPlatform()
  await StatusBar.setStyle({ style: Style.Light })

  // Android 16 enforces edge-to-edge, so WebView content must apply the
  // native status-bar inset itself. Retrying covers the first layout pass.
  await refreshNativeSafeArea()
  window.setTimeout(refreshNativeSafeArea, 120)
  window.setTimeout(refreshNativeSafeArea, 500)
  window.addEventListener('resize', refreshNativeSafeArea)
}

void initSafeArea()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
