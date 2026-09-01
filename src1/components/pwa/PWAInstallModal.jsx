import React, { useState, useEffect } from 'react';
import { Download, Share2, Smartphone, Apple, CheckCircle2, QrCode, Copy, Check, ExternalLink, X, ArrowDown, Sparkles, Layers, PlusSquare } from 'lucide-react';

export const PWAInstallModal = ({ isOpen, onClose }) => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [platform, setPlatform] = useState('unknown'); // 'android' | 'ios' | 'desktop'
  const [copied, setCopied] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Detect OS Platform
    if (typeof window !== 'undefined') {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isIOS = /iphone|ipad|ipod/.test(userAgent);
      const isAndroid = /android/.test(userAgent);

      if (isIOS) {
        setPlatform('ios');
      } else if (isAndroid) {
        setPlatform('android');
      } else {
        setPlatform('desktop');
      }

      // Check if already running as standalone PWA app
      if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
        setIsInstalled(true);
      }
    }

    // Capture Android PWA install prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  if (!isOpen) return null;

  // Trigger Native Android PWA Installation Prompt
  const handleAndroidInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      alert('تکایە لە مێنیوی وێبگەڕەکەتدا (Menu) دابگرە لەسەر: "Install app" یان "Add to Home screen"');
    }
  };

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/install` : 'https://ishkhwaz.zeraworld.com/install';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div dir="rtl" className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 select-none font-vazirmatn animate-fadeIn">
      
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-lime-400/15 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative w-full max-w-lg bg-[#0e1117] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.9)] space-y-6 text-right overflow-hidden">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 left-5 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-900/80 border border-slate-800 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-lime-400/10 border border-lime-400/30 text-lime-400 text-xs font-bold font-mono">
            <Sparkles className="w-4 h-4 text-lime-400" />
            <span>PWA SMART INSTALLATION LINK</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white font-naskh">
            داگرتنی ئەپڵیکەیشنی فەرمی ئیش خواز
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 font-light leading-relaxed">
            بەکارهێنانی خێرا و ڕاستەوخۆ لەسەر شاشەی سەرەکی مۆبایلەکەت بەبێ پێویستی بە App Store یان Google Play.
          </p>
        </div>

        {/* 📱 ANDROID INSTALLATION SECTION */}
        {platform === 'android' && (
          <div className="p-5 rounded-2xl bg-[#141a24] border border-lime-400/40 space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-lime-400 text-slate-950 flex items-center justify-center font-bold shadow-lg shadow-lime-400/30 shrink-0">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">سیستەمی ئەندرۆید (Android PWA)</h3>
                <p className="text-xs text-slate-300">داگرتنی ڕاستەوخۆی ئەپ بۆ سەر شاشەی مۆبایل</p>
              </div>
            </div>

            <button
              onClick={handleAndroidInstall}
              className="w-full py-3.5 px-4 rounded-xl bg-lime-400 hover:bg-lime-300 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-lime-400/25 transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5 text-slate-950" />
              <span>داگرتنی ڕاستەوخۆی ئەپلیکەیشن (Install Now)</span>
            </button>
          </div>
        )}

        {/* 🍎 iOS IPHONE/IPAD INSTALLATION SECTION */}
        {platform === 'ios' && (
          <div className="p-5 rounded-2xl bg-[#17131e] border border-purple-500/40 space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-500 text-white flex items-center justify-center font-bold shadow-lg shadow-purple-500/30 shrink-0">
                <Apple className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">سیستەمی ئایفۆن و ئایپاد</h3>
                <p className="text-xs text-purple-200">ئەم ڕێگایە تاکە ڕێگای فەرمی ئەپڵییە بۆ کارکردن وەک ئەپی ڕاستەقینە (بێ نواری وێبگەڕ)</p>
              </div>
            </div>

            {/* Step-by-Step iOS Guide — the ONLY correct way to get real standalone/full-screen behavior on iOS */}
            <div className="space-y-3 text-xs text-slate-200 bg-[#0c0912] p-4 rounded-xl border border-purple-500/20">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 font-bold text-[11px] flex items-center justify-center shrink-0">١</span>
                <span className="flex items-center gap-1.5">لەم پەڕەیە بە <b>Safari</b> بیکەرەوە و کلیک لە دوگمەی <Share2 className="w-3.5 h-3.5 text-purple-300 inline" /> <b>Share</b> لە خوارەوەی شاشەکە بکە.</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 font-bold text-[11px] flex items-center justify-center shrink-0">٢</span>
                <span className="flex items-center gap-1.5">بگەڕێ خوارەوە و کلیک لە <PlusSquare className="w-3.5 h-3.5 text-purple-300 inline" /> <b>"Add to Home Screen"</b> بکە.</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 font-bold text-[11px] flex items-center justify-center shrink-0">٣</span>
                <span>کلیک لە <b>"Add"</b> بکە — ئایکۆنی ئیش خواز دەچێتە سەر شاشەی سەرەکیت و وەک ئەپی تەواو (بێ نواری وێبگەڕ) دەکرێتەوە.</span>
              </div>
            </div>

            <p className="text-[10px] text-purple-300/60 leading-relaxed">
              ⚠️ ئایفۆن هیچ ڕێگایەکی تر بۆ دامەزراندنی ئەپ لە دەرەوەی App Store پێشکەش ناکات — پرۆفایلی .mobileconfig هیچ سوودێکی زیاتری نییە و هەندێک جار وەک بوکمارک هەڵدەسوڕێت، لەبەرئەوە تەنها ئەم ڕێگایە پێشنیار دەکرێت.
            </p>
          </div>
        )}

        {/* 💻 DESKTOP OR GENERIC SHARE LINK SECTION */}
        <div className="p-5 rounded-2xl bg-[#0a0d14] border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Share2 className="w-4 h-4 text-lime-400" />
              <span>لینکی فەرمی بڵاوکردنەوە و داگرتن:</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 bg-[#121620] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-lime-400 font-mono outline-none"
            />
            <button
              onClick={handleCopyLink}
              className="px-4 py-2.5 rounded-xl bg-lime-400 text-slate-950 font-bold text-xs shadow-md shadow-lime-400/20 hover:bg-lime-300 transition-all flex items-center gap-1.5 shrink-0"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'کۆپیکرا' : 'کۆپیکردن'}</span>
            </button>
          </div>

          {/* Social Share Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <a
              href={`https://api.whatsapp.com/send?text=${encodeURIComponent('ئەپلیکەیشنی فەرمی ئیش خواز دابگرە بۆ دەستکەوتنی کار لە کوردستان:\n' + shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-400 font-bold text-xs text-center flex items-center justify-center gap-1.5 transition-all"
            >
              <span>💬 ناردن لە واتسئاپ</span>
            </a>

            <a
              href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent('ئەپلیکەیشنی فەرمی ئیش خواز دابگرە:')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 px-3 rounded-xl bg-sky-500/10 border border-sky-500/30 hover:bg-sky-500/20 text-sky-400 font-bold text-xs text-center flex items-center justify-center gap-1.5 transition-all"
            >
              <span>✈️ ناردن لە تێلیگرام</span>
            </a>
          </div>
        </div>

      </div>

    </div>
  );
};
