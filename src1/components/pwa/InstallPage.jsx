import React, { useState, useEffect } from 'react';
import { Download, Share2, Smartphone, Apple, Copy, Check, PlusSquare, Sparkles } from 'lucide-react';

export const InstallPage = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [platform, setPlatform] = useState('unknown');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ua = window.navigator.userAgent.toLowerCase();
      if (/iphone|ipad|ipod/.test(ua)) setPlatform('ios');
      else if (/android/.test(ua)) setPlatform('android');
      else setPlatform('desktop');
    }
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleAndroidInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    } else {
      alert('تکایە لە مێنیوی وێبگەڕەکەتدا (⋮) دابگرە لەسەر: "Install app" یان "Add to Home screen"');
    }
  };

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/install` : 'https://ishkhwaz.zeraworld.com/install';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#06080d] font-vazirmatn select-none flex items-center justify-center p-4">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-lime-400/15 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative w-full max-w-lg bg-[#0e1117] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.9)] space-y-6 text-right my-8">

        <div className="text-center space-y-3">
          <img src="/logo-v2.png" alt="ئیش خواز" className="w-16 h-16 mx-auto rounded-2xl object-cover border border-slate-800" />
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-lime-400/10 border border-lime-400/30 text-lime-400 text-xs font-bold font-mono">
            <Sparkles className="w-4 h-4" />
            <span>ئەپی فەرمی ئیش خواز</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            دامەزراندنی ئەپی ئیش خواز
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            بەکارهێنانی خێرا و ڕاستەوخۆ لەسەر شاشەی سەرەکی مۆبایلەکەت بەبێ پێویستی بە App Store یان Google Play.
          </p>
        </div>

        {platform === 'android' && (
          <div className="p-5 rounded-2xl bg-[#141a24] border border-lime-400/40 space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-lime-400 text-slate-950 flex items-center justify-center shrink-0">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">ئەندرۆید</h3>
                <p className="text-xs text-slate-300">داگرتنی ڕاستەوخۆی ئەپ بۆ سەر شاشەی مۆبایل</p>
              </div>
            </div>
            <button onClick={handleAndroidInstall}
              className="w-full py-3.5 px-4 rounded-xl bg-lime-400 hover:bg-lime-300 text-slate-950 font-bold text-sm shadow-lg shadow-lime-400/25 transition-all flex items-center justify-center gap-2">
              <Download className="w-5 h-5" />
              <span>دامەزراندنی ئەپ (Install)</span>
            </button>
          </div>
        )}

        {platform === 'ios' && (
          <div className="p-5 rounded-2xl bg-[#17131e] border border-purple-500/40 space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-500 text-white flex items-center justify-center shrink-0">
                <Apple className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">ئایفۆن و ئایپاد</h3>
                <p className="text-xs text-purple-200">تاکە ڕێگای فەرمی — بێ نواری وێبگەڕ</p>
              </div>
            </div>
            <div className="space-y-3 text-xs text-slate-200 bg-[#0c0912] p-4 rounded-xl border border-purple-500/20">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 font-bold text-[11px] flex items-center justify-center shrink-0">١</span>
                <span className="flex items-center gap-1.5">لەم پەڕەیە بە <b>Safari</b> بیکەرەوە و کلیک لە دوگمەی <Share2 className="w-3.5 h-3.5 text-purple-300 inline" /> <b>Share</b> بکە.</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 font-bold text-[11px] flex items-center justify-center shrink-0">٢</span>
                <span className="flex items-center gap-1.5">کلیک لە <PlusSquare className="w-3.5 h-3.5 text-purple-300 inline" /> <b>"Add to Home Screen"</b> بکە.</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 font-bold text-[11px] flex items-center justify-center shrink-0">٣</span>
                <span>کلیک لە <b>"Add"</b> بکە.</span>
              </div>
            </div>
          </div>
        )}

        <div className="p-5 rounded-2xl bg-[#0a0d14] border border-slate-800 space-y-4">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Share2 className="w-4 h-4 text-lime-400" />
            <span>لینکی داگرتن بۆ ناردن بۆ کەسانی تر:</span>
          </span>
          <div className="flex items-center gap-2">
            <input type="text" readOnly value={shareUrl}
              className="flex-1 bg-[#121620] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-lime-400 font-mono outline-none" />
            <button onClick={handleCopyLink}
              className="px-4 py-2.5 rounded-xl bg-lime-400 text-slate-950 font-bold text-xs shadow-md shadow-lime-400/20 hover:bg-lime-300 transition-all flex items-center gap-1.5 shrink-0">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'کۆپیکرا' : 'کۆپیکردن'}</span>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <a href={`https://api.whatsapp.com/send?text=${encodeURIComponent('ئەپلیکەیشنی فەرمی ئیش خواز دابگرە:\n' + shareUrl)}`}
              target="_blank" rel="noopener noreferrer"
              className="py-2.5 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-400 font-bold text-xs text-center transition-all">
              💬 واتسئاپ
            </a>
            <a href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent('ئەپلیکەیشنی فەرمی ئیش خواز:')}`}
              target="_blank" rel="noopener noreferrer"
              className="py-2.5 px-3 rounded-xl bg-sky-500/10 border border-sky-500/30 hover:bg-sky-500/20 text-sky-400 font-bold text-xs text-center transition-all">
              ✈️ تێلیگرام
            </a>
          </div>
        </div>

        <a href="/" className="block text-center text-xs text-slate-500 hover:text-slate-300 transition-colors">
          گەڕانەوە بۆ ماڵپەڕ →
        </a>
      </div>
    </div>
  );
};
