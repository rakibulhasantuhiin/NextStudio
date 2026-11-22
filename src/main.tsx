import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Register Service Worker in production builds for offline-first capability
if (import.meta.env.PROD) {
  registerSW({
    immediate: true,
    onOfflineReady() {
      window.dispatchEvent(new CustomEvent('nextstudio-offline-ready'));
    },
    onNeedRefresh() {
      window.dispatchEvent(new CustomEvent('nextstudio-sw-updated'));
    },
    onRegisterError() {
      // Ignore SW registration errors in sandboxed iframes or restricted contexts
    },
  });
}

createRoot(document.getElementById('root')!).render(<App />);
