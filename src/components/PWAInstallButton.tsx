import React, { useState } from 'react';
import { Download, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface Props {
  lang: 'bn' | 'en';
}

export const PWAInstallButton: React.FC<Props> = ({ lang }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition"
        title={lang === 'bn' ? 'অ্যাপ হিসেবে ইন্সটল করুন' : 'Install as PWA App'}
      >
        <Download className="w-3.5 h-3.5" />
        <span>{lang === 'bn' ? 'অ্যাপ ইন্সটল' : 'Install App'}</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>{lang === 'bn' ? 'আইওএস অ্যাপ' : 'iOS Install'}</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-sm rounded-xl bg-white dark:bg-slate-900 p-5 shadow-2xl border border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {lang === 'bn' ? 'আইফোন / আইপ্যাডে অ্যাপ ইন্সটল' : 'Install on iPhone / iPad'}
              </h3>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 space-y-1">
                {lang === 'bn' ? (
                  <>
                    ১. সাফারি ব্রাউজারের নিচে <strong>শেয়ার (Share)</strong> বাটনে ট্যাপ করুন।<br />
                    ২. নিচে স্ক্রল করে <strong>Add to Home Screen</strong> চাপুন।
                  </>
                ) : (
                  <>
                    1. Tap the <strong>Share</strong> icon in Safari toolbar.<br />
                    2. Scroll down and tap <strong>Add to Home Screen</strong>.
                  </>
                )}
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded-lg bg-blue-600 hover:bg-blue-700 py-2 text-sm font-semibold text-white transition"
              >
                {lang === 'bn' ? 'বুঝেছি (বন্ধ করুন)' : 'Got it (Close)'}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
