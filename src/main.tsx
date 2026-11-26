import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'motion/react';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Register Service Worker for instant offline-first caching across dev & prod
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    registerSW({
      immediate: true,
      onOfflineReady() {
        window.dispatchEvent(new CustomEvent('nextstudio-offline-ready'));
      },
      onNeedRefresh() {
        window.dispatchEvent(new CustomEvent('nextstudio-sw-updated'));
      },
      onRegisterError() {
        // Ignore SW registration errors in restricted sandboxed contexts
      },
    });
  } catch {
    // Ignore unsupported context
  }
}

createRoot(document.getElementById('root')!).render(
  <MotionConfig reducedMotion="user">
    <App />
  </MotionConfig>
);
