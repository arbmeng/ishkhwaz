import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export const OfflineBanner = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => {
      setIsOffline(false);
      setShowRestored(true);
      setTimeout(() => setShowRestored(false), 3500);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (!isOffline && !showRestored) return null;

  return (
    <div className={`w-full py-2 px-4 text-center text-xs font-bold font-vazirmatn transition-all duration-300 ${
      isOffline ? 'bg-amber-500 text-slate-950 shadow-md' : 'bg-emerald-600 text-white'
    }`}>
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
        {isOffline ? (
          <>
            <WifiOff className="w-4 h-4 animate-pulse shrink-0" />
            <span>پەیوەندی هێڵی ئینتەرنێت پچڕاوە. زانیارییەکان لەسەر میمۆری پاشەکەوتکراو کاتژمێری (Offline) پیشاندەدرێن.</span>
          </>
        ) : (
          <>
            <Wifi className="w-4 h-4 shrink-0" />
            <span>پەیوەندی ئینتەرنێت پەیوەستبووەوە! ڕووکارەکە نوێکرایەوە.</span>
          </>
        )}
      </div>
    </div>
  );
};
