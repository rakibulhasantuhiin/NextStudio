import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Register Service Worker immediately for 100% offline-first capability
registerSW({
  immediate: true,
  onOfflineReady() {
    window.dispatchEvent(new CustomEvent('nextstudio-offline-ready'));
  },
  onNeedRefresh() {
    window.dispatchEvent(new CustomEvent('nextstudio-sw-updated'));
  },
});

createRoot(document.getElementById('root')!).render(<App />);
