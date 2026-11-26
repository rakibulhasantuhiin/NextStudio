import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface Props {
  lang: 'bn' | 'en';
}

export const OfflineIndicator: React.FC<Props> = ({ lang }) => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="no-print fixed bottom-16 lg:bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-slate-900/80 dark:bg-amber-600/85 backdrop-blur-xl px-3.5 py-2 text-xs font-semibold text-white shadow-xl border border-white/15 dark:border-amber-300/35 studio-panel-enter"
    >
      <WifiOff className="w-3.5 h-3.5 text-amber-400 dark:text-white shrink-0" />
      <span>
        {lang === 'bn'
          ? 'অফলাইন মোড চালু — সব ফিচার ও প্রিন্টিং স্বাভাবিকভাবে কাজ করছে'
          : 'Offline Mode — All NextStudio tools & printing work offline'}
      </span>
    </div>
  );
};
