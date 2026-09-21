import React, { useEffect, useState } from 'react';
import { soundService } from '../../services/soundService';
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Check,
  ChevronLeft,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

const TEAL = '#641bd9';
const TEAL_DEEP = '#4b13a5';
const EASE = 'cubic-bezier(.22,.9,.34,1)';

const SLIDES = [
  {
    illustration: 'search',
    eyebrow: 'گەڕانێکی زیرەک',
    title: 'کاری گونجاو بە ئاسانی بدۆزەرەوە',
    desc: 'لە پێنج پارێزگا و هەموو ناوچەکانیان بگەڕێ — سلێمانی، هەولێر، دهۆک، کەرکووک و هەڵەبجە.',
  },
  {
    illustration: 'location',
    eyebrow: 'ناوچەی ورد',
    title: 'کارەکان لە نزیکترین شوێنەوە',
    desc: 'بەپێی شار، قەزا و ناحیە فلتەر بکە و تەنانەت لە بچووکترین ناوچەکاندا کار بدۆزەرەوە.',
  },
  {
    illustration: 'shield',
    eyebrow: 'پارێزراو و متمانەپێکراو',
    title: 'سیڤی بنێرە و داواکارییەکەت بەدوادا بچۆ',
    desc: 'بە شێوەیەکی پارێزراو سیڤییەکەت ڕەوانە بکە و دۆخی داواکارییەکەت لە سیستەمەکە ببینە.',
  },
];

const FEATURES = [
  { icon: Search, label: 'دۆزینەوەی ئیش' },
  { icon: MapPin, label: 'گەڕانی ناوچەیی' },
  { icon: ShieldCheck, label: 'پارێزراو' },
];

const SearchIllustration = () => (
  <svg viewBox="0 0 320 280" className="h-full w-full" fill="none">
    <defs>
      <linearGradient id="searchCard" x1="40" y1="30" x2="260" y2="250">
        <stop stopColor="#ffffff" />
        <stop offset="1" stopColor="#efeaf6" />
      </linearGradient>
      <filter id="searchShadow" x="-30%" y="-30%" width="160%" height="170%">
        <feDropShadow dx="0" dy="12" stdDeviation="12" floodColor="#641bd9" floodOpacity=".13" />
      </filter>
    </defs>
    <circle cx="244" cy="64" r="44" fill="#641bd9" opacity=".07" />
    <circle cx="74" cy="218" r="58" fill="#641bd9" opacity=".05" />
    <g filter="url(#searchShadow)">
      <rect x="50" y="52" width="178" height="132" rx="24" fill="url(#searchCard)" stroke="#d8cee7" />
      <rect x="72" y="76" width="88" height="10" rx="5" fill="#641bd9" opacity=".9" />
      <rect x="72" y="96" width="128" height="7" rx="3.5" fill="#dcd5e7" />
      <rect x="72" y="112" width="104" height="7" rx="3.5" fill="#e7e3ee" />
      <rect x="72" y="140" width="64" height="18" rx="9" fill="#efeaf6" />
      <rect x="144" y="140" width="50" height="18" rx="9" fill="#f3f1f5" />
    </g>
    <circle cx="224" cy="178" r="45" fill="#ffffff" stroke="#641bd9" strokeWidth="8" />
    <circle cx="224" cy="178" r="19" fill="#efeaf6" stroke="#641bd9" strokeWidth="5" />
    <path d="M256 210l28 28" stroke="#641bd9" strokeWidth="11" strokeLinecap="round" />
    <path d="M214 178h20M224 168v20" stroke="#641bd9" strokeWidth="4" strokeLinecap="round" opacity=".8" />
  </svg>
);

const LocationIllustration = () => (
  <svg viewBox="0 0 320 280" className="h-full w-full" fill="none">
    <defs>
      <filter id="pinShadow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="12" stdDeviation="12" floodColor="#641bd9" floodOpacity=".18" />
      </filter>
    </defs>
    <ellipse cx="160" cy="237" rx="80" ry="12" fill="#641bd9" opacity=".08" />
    <circle cx="70" cy="74" r="7" fill="#641bd9" opacity=".28" />
    <circle cx="248" cy="82" r="6" fill="#641bd9" opacity=".2" />
    <circle cx="262" cy="190" r="8" fill="#641bd9" opacity=".18" />
    <path d="M70 130h180M102 88h116M102 172h116" stroke="#d8cee7" strokeWidth="3" strokeLinecap="round" />
    <g filter="url(#pinShadow)">
      <path
        d="M160 42c-39 0-70 31-70 70 0 52 70 111 70 111s70-59 70-111c0-39-31-70-70-70Z"
        fill="#641bd9"
      />
      <circle cx="160" cy="112" r="34" fill="#fff" />
      <circle cx="160" cy="112" r="15" fill="#641bd9" />
      <circle cx="160" cy="112" r="7" fill="#e1d7f1" />
    </g>
  </svg>
);

const ShieldIllustration = () => (
  <svg viewBox="0 0 320 280" className="h-full w-full" fill="none">
    <defs>
      <linearGradient id="shieldFill" x1="90" y1="40" x2="240" y2="230">
        <stop stopColor="#faf7ff" />
        <stop offset="1" stopColor="#eae4f4" />
      </linearGradient>
      <filter id="shieldShadow" x="-30%" y="-30%" width="160%" height="170%">
        <feDropShadow dx="0" dy="12" stdDeviation="12" floodColor="#641bd9" floodOpacity=".15" />
      </filter>
    </defs>
    <circle cx="88" cy="64" r="44" fill="#641bd9" opacity=".06" />
    <circle cx="246" cy="214" r="52" fill="#641bd9" opacity=".05" />
    <g filter="url(#shieldShadow)">
      <path
        d="M160 34 232 60s4 86-72 154C84 146 88 60 88 60l72-26Z"
        fill="url(#shieldFill)"
        stroke="#641bd9"
        strokeWidth="8"
      />
      <path d="m125 112 24 25 48-55" stroke="#641bd9" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
    </g>
    <rect x="204" y="158" width="60" height="48" rx="14" fill="#641bd9" />
    <path d="M218 158v-10c0-13 10-23 23-23s23 10 23 23v10" stroke="#641bd9" strokeWidth="9" strokeLinecap="round" />
    <circle cx="234" cy="181" r="5" fill="#fff" />
  </svg>
);

const ILLUSTRATIONS = {
  search: SearchIllustration,
  location: LocationIllustration,
  shield: ShieldIllustration,
};

export const SplashOnboarding = ({ onComplete }) => {
  const [phase, setPhase] = useState('splash');
  const [leaving, setLeaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(0);
  const [stepVisible, setStepVisible] = useState(true);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setMounted(true));
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (phase !== 'splash') return undefined;

    const alreadyOnboarded =
      localStorage.getItem('ishkhwaz_splash_seen') === 'true';

    const delay = alreadyOnboarded ? 1700 : 2500;
    const leaveTimer = window.setTimeout(() => {
      setLeaving(true);
      window.setTimeout(() => {
        if (alreadyOnboarded) {
          onComplete?.();
        } else {
          setPhase('onboarding');
        }
      }, 420);
    }, delay);

    return () => window.clearTimeout(leaveTimer);
  }, [phase, onComplete]);

  const goStep = (next) => {
    setStepVisible(false);
    window.setTimeout(() => {
      setStep(next);
      setStepVisible(true);
    }, 190);
  };

  const handleNext = () => {
    soundService.playTick?.();

    if (step < SLIDES.length - 1) {
      goStep(step + 1);
    } else {
      soundService.playSuccess?.();
      localStorage.setItem('ishkhwaz_splash_seen', 'true');
      onComplete?.();
    }
  };

  const handleSkip = () => {
    soundService.playTick?.();
    localStorage.setItem('ishkhwaz_splash_seen', 'true');
    onComplete?.();
  };

  const currentSlide = SLIDES[step];
  const Illustration = ILLUSTRATIONS[currentSlide.illustration];

  if (phase === 'splash') {
    return (
      <div
        dir="rtl"
        className="fixed inset-0 z-[10001] flex min-h-[100dvh] items-center justify-center overflow-hidden select-none"
        style={{
          background:
            'radial-gradient(90% 65% at 50% 35%, #e7def5 0%, #f1eef7 42%, #f8f7fa 78%, #ffffff 100%)',
          opacity: leaving ? 0 : 1,
          transform: leaving ? 'scale(1.025)' : 'scale(1)',
          transition: `opacity 420ms ${EASE}, transform 420ms ${EASE}`,
        }}
      >
        <style>{`
          @keyframes ishkLogoIn {
            0% { opacity: 0; transform: translateY(24px) scale(.72); filter: blur(8px); }
            65% { opacity: 1; transform: translateY(-5px) scale(1.06); filter: blur(0); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
          }
          @keyframes ishkFloat {
            0%,100% { transform: translateY(0); }
            50% { transform: translateY(-7px); }
          }
          @keyframes ishkText {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes ishkOrb {
            0%,100% { transform: scale(1) translate(0,0); opacity:.4; }
            50% { transform: scale(1.12) translate(4px,-5px); opacity:.65; }
          }
          @keyframes ishkBar {
            from { transform: translateX(-120%); }
            to { transform: translateX(330%); }
          }
        `}</style>

        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full"
            style={{ background: `radial-gradient(circle, ${TEAL}22, transparent 68%)`, animation: mounted ? 'ishkOrb 7s ease-in-out infinite' : 'none' }} />
          <div className="absolute -bottom-32 -left-24 h-96 w-96 rounded-full"
            style={{ background: 'radial-gradient(circle, #a88dd333, transparent 68%)', animation: mounted ? 'ishkOrb 9s ease-in-out infinite reverse' : 'none' }} />
          <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ background: `radial-gradient(circle, ${TEAL}30, transparent 68%)` }} />
        </div>

        <div className="relative flex w-full max-w-md flex-col items-center px-6">
          <div
            className="relative mb-7 h-28 w-28"
            style={{
              animation: mounted
                ? 'ishkLogoIn 850ms cubic-bezier(.34,1.35,.4,1) both, ishkFloat 3.4s ease-in-out 850ms infinite'
                : 'none',
              opacity: mounted ? undefined : 0,
              filter: `drop-shadow(0 16px 24px ${TEAL}45)`,
            }}
          >
            <img src="/logo-app.png" alt="ئیش خواز" className="h-full w-full rounded-[22%] border-2 border-white/70 object-cover" />
          </div>

          <div
            className="flex flex-col items-center"
            style={{
              animation: mounted ? 'ishkText 650ms ease 260ms both' : 'none',
              opacity: mounted ? undefined : 0,
            }}
          >
            <h1
              className="text-4xl font-black tracking-tight"
              style={{ color: '#121015', fontFamily: "'Vazirmatn', sans-serif" }}
            >
              ئیش خواز
            </h1>
            <p className="mt-1 text-sm font-bold text-[#687773]">
              کار لە کوردستان، بە شێوەیەکی زیرەک
            </p>
          </div>

          <div className="mt-7 flex flex-wrap justify-center gap-2">
            {FEATURES.map(({ icon: Icon, label }, index) => (
              <div
                key={label}
                className="flex items-center gap-2 rounded-full border bg-white/75 px-3.5 py-2 shadow-sm backdrop-blur-md"
                style={{
                  borderColor: `${TEAL}55`,
                  animation: mounted
                    ? `ishkText 520ms ${EASE} ${650 + index * 120}ms both`
                    : 'none',
                  opacity: mounted ? undefined : 0,
                }}
              >
                <Icon className="h-3.5 w-3.5" style={{ color: TEAL }} />
                <span className="text-[10.5px] font-bold text-[#3f4c48]">{label}</span>
              </div>
            ))}
          </div>

          <div
            className="absolute top-[calc(100vh-100px)] flex flex-col items-center gap-3"
            style={{ opacity: mounted ? 1 : 0, transition: 'opacity 500ms ease 500ms' }}
          >
            <div className="h-1 w-36 overflow-hidden rounded-full bg-[#e0dce6]">
              <div
                className="relative h-full rounded-full"
                style={{
                  width: mounted ? '100%' : '0%',
                  background: `linear-gradient(90deg, ${TEAL_DEEP}, ${TEAL})`,
                  transition: `width ${alreadyOnboardedPlaceholder()}ms ${EASE} 250ms`,
                }}
              >
                <div
                  className="absolute inset-y-0 w-1/3"
                  style={{
                    background:
                      'linear-gradient(90deg, transparent, rgba(255,255,255,.75), transparent)',
                    animation: mounted ? 'ishkBar 1.2s ease-in-out infinite' : 'none',
                  }}
                />
              </div>
            </div>
            <span className="text-[9px] font-bold tracking-[0.22em] text-[#9aa5a1]">
              ZERA GROUP
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[10001] flex min-h-[100dvh] flex-col overflow-hidden select-none"
      style={{
        background:
          'radial-gradient(100% 50% at 50% 0%, #e8e2f3 0%, #f6f4f8 52%, #f9f8fa 100%)',
      }}
    >
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: `linear-gradient(90deg, ${TEAL_DEEP}, ${TEAL})` }}
      />

      <header
        className="relative flex items-center justify-between px-5 py-4 sm:px-8"
        style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
      >
        <div className="flex items-center gap-2">
          <img src="/logo-app.png" alt="" className="h-7 w-7 object-contain" />
          <span className="text-xs font-black text-[#4c425a]">ئیش خواز</span>
        </div>

        <button
          type="button"
          onClick={handleSkip}
          className="rounded-full border bg-white/70 px-4 py-2 text-[11px] font-black text-[#71807b] shadow-sm backdrop-blur-md transition hover:bg-white active:scale-95"
          style={{ borderColor: "#c9bce8" }}
        >
          تێپەڕاندن
        </button>
      </header>

      <main className="relative mx-auto flex min-h-0 w-full max-w-5xl flex-1 items-center px-4 pb-5 sm:px-8 lg:px-12">
        <div
          className="grid w-full items-center gap-8 lg:grid-cols-[1.05fr_.95fr] lg:gap-14"
          style={{
            opacity: stepVisible ? 1 : 0,
            transform: stepVisible ? 'translateY(0)' : 'translateY(12px)',
            transition: `opacity 220ms ${EASE}, transform 220ms ${EASE}`,
          }}
        >
          <div className="order-1 lg:order-2">
            <div
              className="relative mx-auto aspect-square w-full max-w-[430px] overflow-hidden rounded-[38px] border bg-white/65 p-5 shadow-[0_28px_90px_rgba(75,19,165,.10)] backdrop-blur-xl sm:p-8"
              style={{ borderColor: "#c9bce8" }}
            >
              <div className="absolute right-7 top-7 flex items-center gap-1.5 rounded-full border bg-white/75 px-3 py-1.5 text-[9px] font-black text-[#aea6ba] backdrop-blur-md">
                <Sparkles className="h-3 w-3" style={{ color: TEAL }} />
                ئیش خواز
              </div>

              <div
                className="absolute left-8 top-16 h-20 w-20 rounded-full blur-2xl"
                style={{ background: `${TEAL}15` }}
              />
              <div
                className="absolute bottom-7 right-8 h-24 w-24 rounded-full blur-2xl"
                style={{ background: '#b49dda22' }}
              />

              <div className="relative h-full w-full">
                <Illustration />
              </div>
            </div>
          </div>

          <div className="order-2 text-right lg:order-1">
            <div
              className="mb-4 inline-flex items-center gap-2 rounded-full border bg-white/70 px-3 py-1.5 text-[10px] font-black text-[#5b716b] shadow-sm backdrop-blur-md"
              style={{ borderColor: "#c9bce8" }}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: TEAL }} />
              {currentSlide.eyebrow}
            </div>

            <h2
              className="max-w-xl text-[30px] font-black leading-[1.45] tracking-tight text-[#131117] sm:text-[38px] lg:text-[44px]"
              style={{ fontFamily: "'Vazirmatn', sans-serif" }}
            >
              {currentSlide.title}
            </h2>

            <p className="mt-4 max-w-xl text-[14px] font-medium leading-[2] text-[#667570] sm:text-[15px]">
              {currentSlide.desc}
            </p>

            <div className="mt-7 flex items-center gap-2">
              {SLIDES.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    soundService.playTick?.();
                    goStep(index);
                  }}
                  aria-label={`قۆناغی ${index + 1}`}
                  className="h-2 rounded-full transition-all duration-300"
                  style={{
                    width: index === step ? 34 : 8,
                    background: index === step ? TEAL : '#dad5e1',
                  }}
                />
              ))}
              <span className="mr-2 text-[10px] font-black text-[#98a39f]">
                {step + 1} / {SLIDES.length}
              </span>
            </div>

            <button
              type="button"
              onClick={handleNext}
              className="group mt-7 flex w-full max-w-sm items-center justify-between rounded-[20px] px-5 py-4 text-sm font-black text-white shadow-[0_16px_34px_rgba(100,27,217,.22)] transition-all duration-200 hover:-translate-y-1 active:translate-y-0 active:scale-[.985]"
              style={{
                background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DEEP})`,
              }}
            >
              <span>{step === SLIDES.length - 1 ? 'دەستپێکردن' : 'بەردەوام بە'}</span>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 transition-transform duration-200 group-hover:-translate-x-1">
                <ArrowLeft className="h-4 w-4" />
              </span>
            </button>
          </div>
        </div>
      </main>

      <footer
        className="px-5 pb-5 text-center sm:px-8"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between border-t pt-4 text-[9px] font-bold text-[#a0aaa7]" style={{ borderColor: '#e3e0e8' }}>
          <span>کار لە کوردستان</span>
          <span className="tracking-[0.18em]">ZERA GROUP</span>
        </div>
      </footer>
    </div>
  );
};

// Kept as a tiny helper so the splash progress animation stays visually tied
// to the splash duration without introducing another piece of component state.
const alreadyOnboardedPlaceholder = () => 2250;
