import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

// Compares the build this page was loaded with to /version.json (always fetched fresh).
// When a newer deploy exists, shows a bar; tapping it clears the service worker + caches and hard-reloads.
const BUILD = typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : '';

const hardRefresh = async () => {
  try {
    const regs = await navigator.serviceWorker?.getRegistrations?.();
    await Promise.all((regs || []).map(r => r.unregister()));
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
  } catch { /* reload anyway */ }
  window.location.reload();
};

export default function UpdateBanner() {
  const [stale, setStale] = useState(false);

  useEffect(() => {
    if (!BUILD) return undefined;
    const check = async () => {
      try {
        const r = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
        const j = await r.json();
        if (j?.v && j.v !== BUILD) setStale(true);
      } catch { /* offline */ }
    };
    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    check();
    const id = setInterval(check, 3 * 60 * 1000);
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
  }, []);

  if (!stale) return null;
  return (
    <button type="button" onClick={hardRefresh} dir="rtl"
      className="fixed inset-x-3 z-[200] flex items-center gap-3 rounded-2xl bg-gradient-to-l from-[#7229e8] to-[#4b13a5] p-3 text-right text-white shadow-2xl active:scale-[.98] sm:left-1/2 sm:right-auto sm:w-[420px] sm:-translate-x-1/2"
      style={{ top: 'calc(10px + env(safe-area-inset-top))', fontFamily: 'inherit' }}>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/20"><RefreshCw className="h-5 w-5" /></span>
      <span className="min-w-0 flex-1">
        <b className="block text-[13px]">وەشانێکی نوێ هەیە</b>
        <span className="block text-[11px] text-white/80">کرتە بکە بۆ نوێکردنەوە (Hard refresh)</span>
      </span>
      <span className="rounded-xl bg-white px-3 py-1.5 text-[12px] font-black text-[#4b13a5]">نوێبکەرەوە</span>
    </button>
  );
}
