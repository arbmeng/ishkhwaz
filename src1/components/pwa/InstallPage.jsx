import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight, Check, CheckCircle2, Copy, Download, Globe, Laptop, MoreVertical, PlusSquare,
  Share, Smartphone, Sparkles, TriangleAlert, Zap, ShieldCheck, Maximize2,
} from 'lucide-react';

const FONT = "'IBM Plex Sans Arabic','Vazirmatn',system-ui,sans-serif";
const GRAD = 'linear-gradient(155deg,#12897a 0%,#0d6a5d 48%,#083f37 100%)';

const STEPS = {
  ios: [
    { title: 'دوگمەی هاوبەشکردن (Share) بکە', text: 'لە خوارەوەی Safari، ئایکۆنی چوارگۆشەی تیرەکە دەبینیت.' },
    { title: '«Add to Home Screen» هەڵبژێرە', text: 'لیستەکە بۆ سەرەوە بگەڕێنە ئەگەر یەکسەر نەبینرا.' },
    { title: '«Add» بکە', text: 'لە سەرەوەی لای ڕاست. ناوی ئەپەکە «ئیش خواز» دەبێت.' },
    { title: 'ئەپەکە لە شاشەی سەرەکی بکەرەوە', text: 'ئێستا وەک ئەپێکی ڕاستەقینە و بە شاشەی تەواو کار دەکات.' },
  ],
  android: [
    { title: 'مێنیوی سێ خاڵ (⋮) بکەرەوە', text: 'لە سەرەوەی Chrome، لای ڕاست.' },
    { title: '«Install app» یان «Add to Home screen»', text: 'یەکێکیان دەبینیت، هەرکامیان بێت هەڵیبژێرە.' },
    { title: '«Install» پەسەند بکە', text: 'چەند چرکەیەک دەخایەنێت و هیچ شتێک ناگۆڕێت.' },
    { title: 'ئەپەکە لە شاشەی سەرەکی بکەرەوە', text: 'ئایکۆنی ئیش خواز لەگەڵ ئەپەکانی تر دەبینیت.' },
  ],
  desktop: [
    { title: 'ئایکۆنی دابەزاندن لە address bar بکە', text: 'لە Chrome یان Edge، لای ڕاستی شریتی ناونیشان.' },
    { title: '«Install» پەسەند بکە', text: 'ئەپەکە لە پەنجەرەی تایبەت خۆی دەکرێتەوە.' },
    { title: 'لە Start یان Desktop بیکەرەوە', text: 'وەک هەر ئەپێکی تری کۆمپیوتەرەکەت.' },
  ],
};

const TABS = [
  { id: 'ios', label: 'ئایفۆن / ئایپاد', icon: Smartphone },
  { id: 'android', label: 'ئەندرۆید', icon: Smartphone },
  { id: 'desktop', label: 'کۆمپیوتەر', icon: Laptop },
];

// Keep Latin phrases (Safari button names etc.) from flipping the neighbouring «quotes» in RTL text.
const bidi = (t) => t.replace(/[A-Za-z][A-Za-z ]*[A-Za-z]|[A-Za-z]/g, (m) => `⁦${m}⁩`);

const detect = () => {
  if (typeof navigator === 'undefined') return { platform: 'desktop', inApp: false, ios: false, chromeIos: false, standalone: false };
  const ua = navigator.userAgent || '';
  const ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const android = /android/i.test(ua);
  return {
    platform: ios ? 'ios' : android ? 'android' : 'desktop',
    ios,
    chromeIos: ios && /crios|fxios|edgios/i.test(ua),
    inApp: /FBAN|FBAV|Instagram|Line\/|TikTok|Snapchat|MicroMessenger|Telegram|; wv\)/i.test(ua),
    standalone: !!(window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone),
  };
};

/* ───────── phone mock ───────── */

const AppIcon = ({ className = '' }) => (
  <div className={`grid place-items-center rounded-[22%] bg-white shadow-md ${className}`}>
    <img src="/logo-flat.png" alt="" className="h-[68%] w-auto object-contain" />
  </div>
);

const Pulse = ({ children, className = '' }) => (
  <span className={`relative inline-grid place-items-center ${className}`}>
    <span className="absolute inset-[-6px] rounded-full bg-[#12796b]/30 animate-ping" style={{ animationDuration: '1.8s' }} />
    <span className="absolute inset-[-3px] rounded-full ring-2 ring-[#12796b]" />
    <span className="relative">{children}</span>
  </span>
);

const Line = ({ w = 'w-full', h = 'h-2', tone = 'bg-[#e4ece9]' }) => <div className={`${h} ${w} rounded-full ${tone}`} />;

const FakePage = () => (
  <div className="flex-1 space-y-3 bg-[#f6faf9] p-3">
    <div className="flex items-center gap-2">
      <AppIcon className="h-8 w-8" />
      <div className="flex-1 space-y-1.5"><Line w="w-1/2" /><Line w="w-1/3" h="h-1.5" /></div>
    </div>
    <div className="h-20 rounded-2xl bg-gradient-to-br from-[#d9efe9] to-[#f0faf7]" />
    <Line /><Line w="w-4/5" /><Line w="w-2/3" />
    <div className="h-12 rounded-xl bg-white shadow-sm" />
  </div>
);

const HomeScreen = () => (
  <div className="flex-1 bg-gradient-to-b from-[#1f7f74] via-[#166a60] to-[#0c463f] p-4 pt-8">
    <div className="grid grid-cols-4 gap-x-3 gap-y-4">
      {Array.from({ length: 11 }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-1">
          <div className="h-10 w-10 rounded-[22%] bg-white/25" />
          <div className="h-1 w-7 rounded-full bg-white/30" />
        </div>
      ))}
      <div className="flex flex-col items-center gap-1" style={{ animation: 'instPop .6s cubic-bezier(.22,1.4,.36,1) both' }}>
        <div className="relative">
          <span className="absolute inset-[-5px] rounded-[26%] ring-2 ring-white/90" />
          <AppIcon className="h-10 w-10" />
        </div>
        <div className="text-[8px] font-bold text-white">ئیش خواز</div>
      </div>
    </div>
  </div>
);

const Row = ({ icon: Icon, label, hot, dim }) => (
  <div className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-[10px] font-bold ${hot ? 'bg-[#12796b] text-white shadow-md' : 'bg-white text-[#3c4b47]'} ${dim ? 'opacity-70' : ''}`} dir="ltr">
    <span>{label}</span><Icon className="h-3.5 w-3.5" />
  </div>
);

const IosScreen = ({ step }) => {
  if (step === 3) return <HomeScreen />;
  return (
    <>
      <FakePage />
      {step === 0 && (
        <div className="flex items-center justify-around border-t border-[#dfe7e5] bg-[#f4f6f6]/95 px-3 py-3 pb-5">
          <span className="text-[#98a5a1]">‹</span><span className="text-[#98a5a1]">›</span>
          <Pulse><Share className="h-5 w-5 text-[#12796b]" /></Pulse>
          <span className="h-4 w-4 rounded border-2 border-[#98a5a1]" /><span className="h-4 w-4 rounded-full border-2 border-[#98a5a1]" />
        </div>
      )}
      {step === 1 && (
        <div className="absolute inset-x-0 bottom-0 space-y-1.5 rounded-t-3xl bg-[#eef2f1] p-3 pt-4 shadow-[0_-10px_30px_rgba(0,0,0,.2)]" style={{ animation: 'instUp .35s ease both' }}>
          <div className="mx-auto mb-1 h-1 w-8 rounded-full bg-[#c5d0cc]" />
          <Row icon={Copy} label="Copy" dim />
          <Row icon={Globe} label="Add to Bookmarks" dim />
          <Row icon={PlusSquare} label="Add to Home Screen" hot />
        </div>
      )}
      {step === 2 && (
        <div className="absolute inset-0 flex flex-col bg-[#f2f5f4]" style={{ animation: 'instUp .3s ease both' }}>
          <div className="flex items-center justify-between px-3 pb-2 pt-9 text-[10px] font-bold" dir="ltr">
            <span className="text-[#98a5a1]">Cancel</span>
            <span className="text-[#20312d]">Add to Home Screen</span>
            <Pulse><span className="rounded-full bg-[#12796b] px-2.5 py-1 text-white">Add</span></Pulse>
          </div>
          <div className="m-3 flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
            <AppIcon className="h-12 w-12 border border-[#e4ece9]" />
            <div className="flex-1 border-b border-[#e4ece9] pb-1 text-[11px] font-bold text-[#20312d]">ئیش خواز</div>
          </div>
        </div>
      )}
    </>
  );
};

const AndroidScreen = ({ step }) => {
  if (step === 3) return <HomeScreen />;
  return (
    <>
      <div className="flex items-center gap-2 border-b border-[#e2e9e7] bg-white px-3 pb-2 pt-8">
        <div className="flex-1 rounded-full bg-[#eef3f1] px-3 py-1.5 text-[9px] font-bold text-[#60706c]" dir="ltr">ishkhwaz.zeraworld.com</div>
        {step === 0 ? <Pulse><MoreVertical className="h-5 w-5 text-[#12796b]" /></Pulse> : <MoreVertical className="h-5 w-5 text-[#98a5a1]" />}
      </div>
      <FakePage />
      {step === 1 && (
        <div className="absolute right-2 top-14 w-40 space-y-0.5 rounded-2xl bg-white p-1.5 shadow-[0_12px_34px_rgba(0,0,0,.28)]" dir="ltr" style={{ animation: 'instUp .3s ease both' }}>
          {['New tab', 'Bookmarks', 'History'].map(t => <div key={t} className="rounded-lg px-2.5 py-2 text-[10px] font-bold text-[#8a9894]">{t}</div>)}
          <div className="flex items-center justify-between rounded-lg bg-[#12796b] px-2.5 py-2 text-[10px] font-bold text-white"><span>Install app</span><Download className="h-3 w-3" /></div>
        </div>
      )}
      {step === 2 && (
        <div className="absolute inset-0 grid place-items-center bg-black/45" style={{ animation: 'instUp .25s ease both' }}>
          <div className="w-[82%] rounded-3xl bg-white p-4 shadow-2xl" dir="ltr">
            <div className="flex items-center gap-3"><AppIcon className="h-10 w-10 border border-[#e4ece9]" /><div className="text-[11px] font-bold text-[#20312d]">Install app?<div className="text-[9px] font-medium text-[#8a9894]">ishkhwaz.zeraworld.com</div></div></div>
            <div className="mt-4 flex justify-end gap-2 text-[10px] font-bold"><span className="px-3 py-1.5 text-[#12796b]">Cancel</span><Pulse><span className="rounded-full bg-[#12796b] px-4 py-1.5 text-white">Install</span></Pulse></div>
          </div>
        </div>
      )}
    </>
  );
};

const DesktopMock = ({ step }) => (
  <div className="w-full overflow-hidden rounded-2xl border border-[#d5e2de] bg-white shadow-[0_24px_60px_rgba(16,67,60,.18)]" dir="ltr">
    <div className="flex items-center gap-2 border-b border-[#e2e9e7] bg-[#f1f5f4] px-3 py-2">
      <span className="h-2.5 w-2.5 rounded-full bg-[#f2b8b5]" /><span className="h-2.5 w-2.5 rounded-full bg-[#f1de9c]" /><span className="h-2.5 w-2.5 rounded-full bg-[#b6dfb9]" />
      <div className="mx-2 flex flex-1 items-center justify-between rounded-full bg-white px-3 py-1.5 text-[10px] font-bold text-[#60706c]">
        <span>ishkhwaz.zeraworld.com</span>
        {step === 0 ? <Pulse><Download className="h-3.5 w-3.5 text-[#12796b]" /></Pulse> : <Download className="h-3.5 w-3.5 text-[#98a5a1]" />}
      </div>
    </div>
    <div className="relative h-52 bg-[#f6faf9]">
      {step < 2 && <div className="p-4"><FakePage /></div>}
      {step === 1 && (
        <div className="absolute right-6 top-2 w-52 rounded-2xl bg-white p-3 shadow-[0_12px_34px_rgba(0,0,0,.25)]" style={{ animation: 'instUp .3s ease both' }}>
          <div className="flex items-center gap-2"><AppIcon className="h-9 w-9 border border-[#e4ece9]" /><div className="text-[11px] font-bold text-[#20312d]">Install app?</div></div>
          <div className="mt-3 flex justify-end gap-2 text-[10px] font-bold"><span className="px-2 py-1 text-[#12796b]">Cancel</span><Pulse><span className="rounded-full bg-[#12796b] px-3 py-1 text-white">Install</span></Pulse></div>
        </div>
      )}
      {step === 2 && (
        <div className="grid h-full place-items-center bg-gradient-to-br from-[#1f7f74] to-[#0c463f]">
          <div className="flex flex-col items-center gap-1" style={{ animation: 'instPop .6s cubic-bezier(.22,1.4,.36,1) both' }}>
            <div className="relative"><span className="absolute inset-[-6px] rounded-[26%] ring-2 ring-white/90" /><AppIcon className="h-14 w-14" /></div>
            <div className="text-[10px] font-bold text-white">ئیش خواز</div>
          </div>
        </div>
      )}
    </div>
  </div>
);

const PhoneMock = ({ platform, step }) => (
  <div className="relative mx-auto h-[440px] w-[226px] rounded-[38px] border-[7px] border-[#0b2f2a] bg-[#0b2f2a] shadow-[0_34px_70px_rgba(8,63,55,.35)]">
    <div className="absolute left-1/2 top-1.5 z-20 h-4 w-16 -translate-x-1/2 rounded-full bg-[#0b2f2a]" />
    <div className="relative flex h-full flex-col overflow-hidden rounded-[30px] bg-white">
      <div key={`${platform}-${step}`} className="relative flex h-full flex-col" style={{ animation: 'instFade .35s ease both' }}>
        {platform === 'ios' ? <IosScreen step={step} /> : <AndroidScreen step={step} />}
      </div>
    </div>
  </div>
);

/* ───────── page ───────── */

export const InstallPage = ({ onBack }) => {
  const env = useMemo(detect, []);
  const [tab, setTab] = useState(env.platform);
  const [step, setStep] = useState(0);
  const [manual, setManual] = useState(false);
  const [installed, setInstalled] = useState(env.standalone);
  const [copied, setCopied] = useState(false);
  const deferred = useRef(null);
  const [canPrompt, setCanPrompt] = useState(false);

  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); deferred.current = e; setCanPrompt(true); };
    const onDone = () => { setInstalled(true); setCanPrompt(false); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onDone);
    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onDone); };
  }, []);

  const steps = STEPS[tab];
  useEffect(() => { setStep(0); setManual(false); }, [tab]);
  useEffect(() => {
    if (manual || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const t = setInterval(() => setStep(s => (s + 1) % steps.length), 3400);
    return () => clearInterval(t);
  }, [manual, steps.length]);

  const pick = (i) => { setStep(i); setManual(true); };
  const install = async () => {
    const e = deferred.current;
    if (!e) return;
    e.prompt();
    await e.userChoice;
    deferred.current = null; setCanPrompt(false);
  };
  const url = typeof window !== 'undefined' ? window.location.origin : 'https://ishkhwaz.zeraworld.com';
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard blocked */ }
  };

  const showSafariWarn = tab === 'ios' && (env.inApp || env.chromeIos);
  const showAppBrowserWarn = tab === 'android' && env.inApp;

  return (
    <div dir="rtl" className="min-h-screen bg-[#f4f8f7] text-right text-[#20312d]" style={{ fontFamily: FONT }}>
      <style>{`
        @keyframes instFade{from{opacity:0;transform:scale(.985)}to{opacity:1;transform:none}}
        @keyframes instUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}
        @keyframes instPop{0%{opacity:0;transform:scale(.3)}100%{opacity:1;transform:scale(1)}}
        @media (prefers-reduced-motion:reduce){*{animation-duration:.01ms!important}}
      `}</style>

      {/* hero */}
      <header className="relative overflow-hidden text-white" style={{ background: GRAD, paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#43d1b8]/25 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 opacity-[.07]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.9) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.9) 1px,transparent 1px)', backgroundSize: '38px 38px' }} />
        <div className="relative mx-auto max-w-[1000px] px-4 pb-16 pt-3 sm:px-6 sm:pb-20">
          <div className="flex items-center justify-between">
            {onBack ? (
              <button onClick={onBack} className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-2 text-xs font-bold backdrop-blur active:scale-95">
                <ArrowRight className="h-4 w-4" /> گەڕانەوە
              </button>
            ) : <span />}
            <div className="flex items-center gap-2.5">
              <div className="text-left"><div className="text-[11px] font-bold tracking-[0.22em]">ISHKHWAZ</div><div className="text-[10px] font-medium text-white/65">کار لە کوردستان</div></div>
              <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-2xl bg-white shadow-lg"><img src="/logo-flat.png" alt="" className="h-8 w-auto" /></div>
            </div>
          </div>
          <div className="mt-8 max-w-xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-bold text-[#c8fff3]"><Sparkles className="h-3.5 w-3.5" /> بێ App Store و بێ Google Play</span>
            <h1 className="mt-4 text-[28px] font-bold leading-[1.5] sm:text-[38px]">ئیش خواز وەک ئەپ لەسەر مۆبایلەکەت دابمەزرێنە</h1>
            <p className="mt-2 text-sm leading-7 text-white/75">تەنها چەند چرکەیەک. ئایکۆنێک لەسەر شاشەی سەرەکی دادەنرێت و بە شاشەی تەواو، خێراتر دەکرێتەوە.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {[[Zap, 'خێرا'], [Maximize2, 'شاشەی تەواو'], [ShieldCheck, 'بێ بارکردنی قورس']].map(([Icon, t]) => (
                <span key={t} className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 text-[11px] font-bold"><Icon className="h-3.5 w-3.5 text-[#8ff0dc]" />{t}</span>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="relative mx-auto -mt-9 max-w-[1000px] px-4 pb-16 sm:px-6">
        {installed && (
          <div className="mb-4 flex items-center gap-3 rounded-2xl border border-[#c6e9e1] bg-white p-4 shadow-sm">
            <CheckCircle2 className="h-6 w-6 shrink-0 text-[#12796b]" />
            <div className="text-sm font-bold">ئەپەکە پێشتر دامەزراوە 🎉 <span className="block text-xs font-medium text-[#71807c]">لە شاشەی سەرەکی بیکەرەوە.</span></div>
          </div>
        )}

        <div className="rounded-[28px] border border-[#e0eae7] bg-white p-4 shadow-[0_24px_60px_rgba(14,54,48,.1)] sm:p-7">
          {/* platform tabs */}
          <div role="tablist" className="grid grid-cols-3 gap-1.5 rounded-2xl bg-[#eef4f2] p-1.5">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
                className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-3 text-[11px] font-bold transition sm:text-xs ${tab === id ? 'bg-white text-[#0d5c50] shadow-sm' : 'text-[#6d7d79]'}`}>
                <Icon className="hidden h-4 w-4 sm:block" />{label}
                {env.platform === id && <span className="rounded-full bg-[#12796b] px-1.5 py-0.5 text-[8px] text-white">ئامێرەکەت</span>}
              </button>
            ))}
          </div>

          {/* warnings */}
          {showSafariWarn && (
            <div className="mt-4 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-xs leading-6 text-amber-900">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <b>لە Safari بیکەرەوە.</b> ئایفۆن تەنها لە Safari دەتوانێت ئەپەکە دابمەزرێنێت{env.inApp ? ' و ئەم وێبگەڕە ناوەکییە (Facebook/Instagram...) ناتوانێت' : ''}. بەستەرەکە کۆپی بکە و لە Safari بینووسە.
                <button onClick={copy} className="mt-2 flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-[11px] font-bold text-white active:scale-95">{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copied ? 'کۆپی کرا' : 'کۆپیکردنی بەستەر'}</button>
              </div>
            </div>
          )}
          {showAppBrowserWarn && (
            <div className="mt-4 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-xs leading-6 text-amber-900">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <div><b>لە Chrome بیکەرەوە.</b> لەم وێبگەڕە ناوەکییەدا دامەزراندن کار ناکات. بەستەرەکە کۆپی بکە و لە Chrome بینووسە.
                <button onClick={copy} className="mt-2 flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-[11px] font-bold text-white active:scale-95">{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copied ? 'کۆپی کرا' : 'کۆپیکردنی بەستەر'}</button></div>
            </div>
          )}

          <div className="mt-6 grid items-center gap-8 lg:grid-cols-[1fr_1.1fr]">
            {/* mock */}
            <div className="order-1 lg:order-2">
              {tab === 'desktop' ? <DesktopMock step={step} /> : <PhoneMock platform={tab} step={step} />}
            </div>

            {/* steps */}
            <div className="order-2 lg:order-1">
              <ol className="space-y-2.5">
                {steps.map((s, i) => {
                  const on = i === step;
                  return (
                    <li key={s.title}>
                      <button onClick={() => pick(i)} className={`flex w-full items-start gap-3.5 rounded-2xl border p-3.5 text-right transition ${on ? 'border-[#12796b]/40 bg-[#effaf7] shadow-sm' : 'border-[#e6eeec] bg-white hover:border-[#12796b]/25'}`}>
                        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-bold transition ${i < step ? 'bg-[#8ff0dc] text-[#08453c]' : on ? 'bg-[#12796b] text-white' : 'bg-[#eef4f2] text-[#7b8e88]'}`}>
                          {i < step ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}
                        </span>
                        <span>
                          <span className={`block text-sm font-bold ${on ? 'text-[#0d5c50]' : ''}`}>{bidi(s.title)}</span>
                          {on && <span className="mt-1 block text-xs leading-6 text-[#60706c]">{bidi(s.text)}</span>}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>

              {tab === 'android' && canPrompt && !installed && (
                <button onClick={install} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold text-white shadow-[0_14px_32px_rgba(18,121,107,.3)] active:scale-[.98]" style={{ background: GRAD }}>
                  <Download className="h-5 w-5" /> دامەزراندنی ئەپ بە یەک کرتە
                </button>
              )}
              {tab === 'desktop' && canPrompt && !installed && (
                <button onClick={install} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold text-white shadow-[0_14px_32px_rgba(18,121,107,.3)] active:scale-[.98]" style={{ background: GRAD }}>
                  <Download className="h-5 w-5" /> دامەزراندنی ئەپ
                </button>
              )}

              <div className="mt-4 flex items-center gap-2 rounded-2xl bg-[#f4f8f7] p-2.5">
                <div className="min-w-0 flex-1 truncate px-2 text-left text-[11px] font-bold text-[#60706c]" dir="ltr">{url}</div>
                <button onClick={copy} className="flex shrink-0 items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-[11px] font-bold text-[#0d5c50] shadow-sm active:scale-95">
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copied ? 'کۆپی کرا' : 'کۆپی بەستەر'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] leading-6 text-[#7b8e88]">ئەپەکە هەمان ئیش خوازە، تەنها وەک ئەپ دەکرێتەوە. هەر کاتێک دەتوانیت لە مۆبایلەکەتەوە بیسڕیتەوە.</p>
      </main>
    </div>
  );
};
