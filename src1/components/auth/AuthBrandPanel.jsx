import React from 'react';
import { MapPin, FileText, ShieldCheck } from 'lucide-react';

// Width of the desktop brand panel; pages add the same amount of left padding so the form centres in
// what's left. Shared by the login and register pages so they read as one product.
export const AUTH_PANEL_W = 'min(44vw, 600px)';
export const AUTH_PAD_LG = 'lg:pl-[min(44vw,600px)]';
export const AUTH_GRADIENT = 'linear-gradient(155deg,#12897a 0%,#0d6a5d 48%,#083f37 100%)';

const COPY = {
  login: {
    title: <>دەرگایەک بۆ<br />دەستپێکردنی کارەکەت.</>,
    text: 'لە ئیش خواز، هەلی کار و تواناکانت بە شێوەیەکی سادە و نوێ بەیەک دەگەن.',
  },
  register: {
    title: <>پڕۆفایلی خۆت<br />بنیات بنێ.</>,
    text: 'تەنها چەند هەنگاوێک، تا ئیش خواز بتوانێت تواناکان و ئامانجەکانت باشتر بناسێت.',
  },
};

const POINTS = [
  { icon: MapPin, title: 'لە هەموو پارێزگاکان', text: 'سلێمانی، هەولێر، دهۆک، هەڵەبجە و کەرکووک' },
  { icon: FileText, title: 'سیڤی و داواکاری', text: 'CV ی پیشەیی دروست بکە و بە یەک کرتە بینێرە' },
  { icon: ShieldCheck, title: 'پەیوەندی ڕاستەوخۆ', text: 'گفتوگۆ لەگەڵ کۆمپانیاکان، بێ ناوەندگیر' },
];

export const AuthBrandPanel = ({ variant = 'login' }) => {
  const c = COPY[variant] || COPY.login;
  return (
    <aside
      aria-hidden="true"
      className="hidden lg:flex fixed left-0 top-0 bottom-0 z-0 flex-col justify-between overflow-hidden p-10 xl:p-14 text-white"
      style={{ width: AUTH_PANEL_W, background: AUTH_GRADIENT }}
    >
      {/* atmosphere */}
      <div className="pointer-events-none absolute -right-24 -top-24 h-[420px] w-[420px] rounded-full bg-[#43d1b8]/25 blur-3xl" />
      <div className="pointer-events-none absolute -left-32 bottom-0 h-[440px] w-[440px] rounded-full bg-[#052e28]/60 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 opacity-[.07]"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.9) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.9) 1px,transparent 1px)', backgroundSize: '46px 46px' }} />


      {/* brand */}
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white shadow-lg overflow-hidden">
            <img src="/logo-flat.png" alt="" className="h-9 w-auto object-contain" />
          </div>
          <div>
            <div className="text-xs font-black tracking-[0.24em]">ISHKHWAZ</div>
            <div className="text-[10px] font-bold text-white/60 mt-0.5">کار لە کوردستان</div>
          </div>
        </div>
      </div>

      {/* message */}
      <div className="relative max-w-[440px] self-end text-right">
        <h2 className="text-4xl xl:text-[44px] font-black leading-[1.25] tracking-tight">{c.title}</h2>
        <p className="mt-4 text-sm font-bold leading-7 text-white/70">{c.text}</p>

        <ul className="mt-9 space-y-4">
          {POINTS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-start gap-3.5">
              <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/12 border border-white/15">
                <Icon className="h-[18px] w-[18px] text-[#8ff0dc]" />
              </span>
              <span>
                <span className="block text-sm font-black">{title}</span>
                <span className="mt-0.5 block text-xs font-bold text-white/55 leading-6">{text}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="relative text-[10px] font-bold tracking-[0.22em] text-white/40 text-center">ZERA GROUP • ISHKHWAZ</div>

      <style>{`
        @keyframes authFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
        .auth-float{animation:authFloat 7s ease-in-out infinite}
        @media (prefers-reduced-motion:reduce){.auth-float{animation:none}}
      `}</style>
    </aside>
  );
};

// Compact brand header for phones and tablets (the panel above only exists on lg+).
export const AuthMobileHero = ({ children }) => (
  <div
    className="lg:hidden relative w-full overflow-hidden text-white"
    style={{ background: AUTH_GRADIENT, paddingTop: 'max(1.25rem, env(safe-area-inset-top))' }}
  >
    <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#43d1b8]/25 blur-2xl" />
    <div className="pointer-events-none absolute inset-0 opacity-[.07]"
      style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.9) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.9) 1px,transparent 1px)', backgroundSize: '34px 34px' }} />
    <div className="relative mx-auto flex w-full max-w-[520px] items-center gap-3 px-6 pb-14 pt-3">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white shadow-lg overflow-hidden shrink-0">
        <img src="/logo-flat.png" alt="ئیش خواز" className="h-9 w-auto object-contain" />
      </div>
      <div className="min-w-0">
        <div className="text-xs font-black tracking-[0.24em]">ISHKHWAZ</div>
        <div className="mt-0.5 text-[11px] font-bold text-white/70">پلاتفۆرمی کار و پیشە لە کوردستان</div>
      </div>
      {children}
    </div>
  </div>
);
