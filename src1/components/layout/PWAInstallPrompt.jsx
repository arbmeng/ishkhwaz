import React, { useState, useEffect } from 'react';
import { Download, X, Sparkles } from 'lucide-react';

export const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50 p-4 rounded-3xl bg-slate-900/95 border border-lime-500/40 shadow-2xl backdrop-blur-2xl font-vazirmatn animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-3">
          <img src="/logo-v2.png" alt="ئیش خواز" className="w-12 h-12 rounded-2xl object-cover ring-2 ring-lime-500/40 shrink-0" />
          <div>
            <div className="flex items-center gap-1.5 text-lime-400 text-xs font-black">
              <Sparkles className="w-3.5 h-3.5" />
              <span>دابەزاندنی ئەپڵیکەیشنی ئیش خواز</span>
            </div>
            <h4 className="text-sm font-extrabold text-slate-100 mt-0.5">ئەپڵیکەیشنی (App) ئیش خواز دابەزێنە</h4>
            <p className="text-[11px] text-slate-400 mt-1">بۆ بەکارهێنانی خێراتر بێ پێویستی بە وێبگەڕ (Offline Ready).</p>
          </div>
        </div>
        <button
          onClick={() => setShowPrompt(false)}
          className="text-slate-400 hover:text-slate-200 p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-3.5 flex gap-2">
        <button
          onClick={handleInstall}
          className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-lime-500 to-emerald-600 hover:from-lime-400 hover:to-emerald-500 text-slate-950 font-black text-xs transition shadow-md shadow-lime-950 flex items-center justify-center gap-1.5"
        >
          <Download className="w-4 h-4 text-slate-950" />
          <span>دابەزاندنی ئەپ (Install App)</span>
        </button>
        <button
          onClick={() => setShowPrompt(false)}
          className="py-2 px-3 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 transition"
        >
          دواتر
        </button>
      </div>
    </div>
  );
};
