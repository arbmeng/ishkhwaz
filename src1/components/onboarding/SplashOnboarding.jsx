import React, { useState, useEffect } from 'react';
import { soundService } from '../../services/soundService';

// Brand teal — matches the new logo mark (teal briefcase-notched "ئ").
const TEAL = '#12796b';
const EASE = 'cubic-bezier(.22,.9,.34,1)';

const SLIDES = [
  {
    illustration: 'search',
    title: 'کارێک بدۆزەرەوە لە نزیکترین ناوچەت',
    desc: 'لە پێنج پارێزگا و هەموو ناحیەکانیان بگەڕێ — سلێمانی، هەولێر، دهۆک، کەرکووک و هەڵەبجە.',
  },
  {
    illustration: 'location',
    title: 'فلتەرکردنی دقیق بەپێی شار، قەزا و ناحیەکان',
    desc: 'دۆزینەوەی ئیش تەنانەت لە بچووکترین ناوچە و ناحیەکان: تەکیەی کاکەمەند، بازیان، باوانج، چەمچەماڵ، زاخۆ و عەنکاوە.',
  },
  {
    illustration: 'shield',
    title: 'سیستەمی پارێزراوی ناردنی سیڤی و پارەدان',
    desc: 'تەنها بە بڕێکی زۆر کەم سیڤییەکەت ڕەوانە بکە، بە ڕاستەوخۆیی دۆخی داواکارییەکەت لە دەستی ئەدمین و کۆمپانیا دەبینیت.',
  },
];

// What the splash's feature row promotes — same three pillars the onboarding
// carousel goes on to explain in full.
const FEATURES = [
  { icon: '🔍', label: 'دۆزینەوەی ئیش' },
  { icon: '📍', label: 'گەڕانی وردی ناوچەیی' },
  { icon: '🔒', label: 'پارەدانی پارێزراو' },
];

// Real hand-drawn SVG illustrations for each onboarding slide — brand teal,
// no external image assets. Replaces the old "illustration — {name}" text
// placeholder that used to sit here during development.
const SearchIllustration = () => (
  <svg viewBox="0 0 200 200" className="w-[62%] h-[62%]" fill="none">
    <rect x="34" y="46" width="108" height="30" rx="8" fill="#fff" stroke="#cfe6e0" strokeWidth="2" />
    <rect x="46" y="55" width="46" height="5" rx="2.5" fill="#12796b" opacity="0.85" />
    <rect x="46" y="65" width="66" height="4" rx="2" fill="#cfe6e0" />
    <rect x="26" y="86" width="108" height="30" rx="8" fill="#fff" stroke="#cfe6e0" strokeWidth="2" />
    <rect x="38" y="95" width="46" height="5" rx="2.5" fill="#12796b" opacity="0.85" />
    <rect x="38" y="105" width="66" height="4" rx="2" fill="#cfe6e0" />
    <circle cx="128" cy="132" r="30" fill="#eaf6f3" stroke="#12796b" strokeWidth="6" />
    <path d="M149 153 L167 171" stroke="#12796b" strokeWidth="8" strokeLinecap="round" />
    <path d="M116 132 a12 12 0 0 1 12 -12" stroke="#5fb8a8" strokeWidth="4" strokeLinecap="round" />
  </svg>
);

const LocationIllustration = () => (
  <svg viewBox="0 0 200 200" className="w-[62%] h-[62%]" fill="none">
    <ellipse cx="100" cy="168" rx="46" ry="8" fill="#cfe6e0" opacity="0.6" />
    <circle cx="46" cy="60" r="5" fill="#5fb8a8" opacity="0.7" />
    <circle cx="152" cy="70" r="4" fill="#5fb8a8" opacity="0.5" />
    <circle cx="160" cy="130" r="5" fill="#5fb8a8" opacity="0.6" />
    <circle cx="38" cy="120" r="4" fill="#5fb8a8" opacity="0.5" />
    <path
      d="M100 30 C126 30 147 51 147 77 C147 112 100 158 100 158 C100 158 53 112 53 77 C53 51 74 30 100 30 Z"
      fill="#12796b"
    />
    <circle cx="100" cy="78" r="24" fill="#fff" />
    <circle cx="100" cy="78" r="11" fill="#12796b" />
  </svg>
);

const ShieldIllustration = () => (
  <svg viewBox="0 0 200 200" className="w-[62%] h-[62%]" fill="none">
    <path
      d="M100 28 L152 46 C152 46 156 108 100 158 C44 108 48 46 48 46 Z"
      fill="#eaf6f3"
      stroke="#12796b"
      strokeWidth="6"
    />
    <path d="M78 88 L94 106 L126 68" stroke="#12796b" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="132" y="118" width="40" height="30" rx="8" fill="#12796b" />
    <path d="M140 118 v-8 a12 12 0 0 1 24 0 v8" stroke="#12796b" strokeWidth="6" fill="none" strokeLinecap="round" />
    <circle cx="152" cy="132" r="4" fill="#fff" />
  </svg>
);

const ILLUSTRATIONS = {
  search: SearchIllustration,
  location: LocationIllustration,
  shield: ShieldIllustration,
};

export const SplashOnboarding = ({ onComplete }) => {
  const [phase, setPhase] = useState('splash'); // 'splash' | 'onboarding'
  const [leaving, setLeaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(0);
  const [stepVisible, setStepVisible] = useState(true);

  useEffect(() => {
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setMounted(true)));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (phase !== 'splash') return;
    // A full, unhurried page — not a flashed-past modal — so this holds for
    // a couple of seconds before the leave transition kicks off.
    const t = setTimeout(() => {
      setLeaving(true);
      setTimeout(() => {
        // Onboarding itself only ever plays once — every visit after the
        // first just shows this brief splash, then straight into the app.
        const alreadyOnboarded = localStorage.getItem('ishkhwaz_splash_seen') === 'true';
        if (alreadyOnboarded) onComplete();
        else setPhase('onboarding');
      }, 380);
    }, 2850);
    return () => clearTimeout(t);
  }, [phase]);

  const goStep = (next) => {
    setStepVisible(false);
    setTimeout(() => {
      setStep(next);
      setStepVisible(true);
    }, 180);
  };

  const handleNext = () => {
    soundService.playTick();
    if (step < SLIDES.length - 1) {
      goStep(step + 1);
    } else {
      soundService.playSuccess();
      onComplete();
    }
  };

  if (phase === 'splash') {
    return (
      <div
        dir="rtl"
        className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-7 select-none overflow-hidden"
        style={{
          backgroundColor: '#f4f7f6',
          backgroundImage: 'radial-gradient(120% 60% at 50% 28%, #cdeae4, #f4f7f6 68%)',
          opacity: leaving ? 0 : 1,
          transform: leaving ? 'scale(1.03)' : 'scale(1)',
          transition: `opacity 380ms ${EASE}, transform 380ms ${EASE}`,
        }}
      >
        <style>{`
          @keyframes ishkLogoPop {
            0%   { transform: scale(0.5) translateY(16px); opacity: 0; }
            58%  { transform: scale(1.09) translateY(-3px); opacity: 1; }
            78%  { transform: scale(0.97) translateY(1px); }
            100% { transform: scale(1) translateY(0); opacity: 1; }
          }
          @keyframes ishkGlowPulse {
            0%, 100% { opacity: 0.24; transform: translate(-50%, -50%) scale(1); }
            50%      { opacity: 0.4; transform: translate(-50%, -50%) scale(1.12); }
          }
          @keyframes ishkTextIn {
            0%   { opacity: 0; transform: translateY(12px); filter: blur(5px); }
            100% { opacity: 1; transform: translateY(0); filter: blur(0); }
          }
          @keyframes ishkShimmer {
            0%   { transform: translateX(-140%); }
            100% { transform: translateX(280%); }
          }
          @keyframes ishkFloat {
            0%, 100% { transform: translateY(0); }
            50%      { transform: translateY(-6px); }
          }
          @keyframes ishkChipIn {
            0%   { opacity: 0; transform: translateY(10px) scale(0.94); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
          }
          @keyframes ishkBlobA {
            0%, 100% { transform: translate(-8%, -6%) scale(1); }
            50%      { transform: translate(4%, 5%) scale(1.12); }
          }
          @keyframes ishkBlobB {
            0%, 100% { transform: translate(6%, 4%) scale(1); }
            50%      { transform: translate(-5%, -6%) scale(1.1); }
          }
        `}</style>

        {/* Ambient background shapes — a full, designed page, not a flat flash.
            Kept faint and pinned to the corners so they never compete with
            the logo, even at the peak of their slow pulse. */}
        <div aria-hidden="true" className="absolute pointer-events-none" style={{
          top: '-10%', right: '-18%', width: 220, height: 220, borderRadius: '50%',
          background: `radial-gradient(circle, ${TEAL}14, transparent 72%)`,
          filter: 'blur(6px)', animation: mounted ? 'ishkBlobA 9s ease-in-out infinite' : 'none',
        }} />
        <div aria-hidden="true" className="absolute pointer-events-none" style={{
          bottom: '-12%', left: '-20%', width: 260, height: 260, borderRadius: '50%',
          background: 'radial-gradient(circle, #a8d8cd20, transparent 72%)',
          filter: 'blur(6px)', animation: mounted ? 'ishkBlobB 11s ease-in-out infinite' : 'none',
        }} />

        {/* Soft breathing glow behind the mark */}
        <div
          aria-hidden="true"
          className="absolute rounded-full pointer-events-none"
          style={{
            top: '32%', left: '50%', width: 200, height: 200,
            background: `radial-gradient(circle, ${TEAL}40, transparent 70%)`,
            filter: 'blur(18px)',
            animation: mounted ? 'ishkGlowPulse 2.6s ease-in-out infinite' : 'none',
            opacity: mounted ? undefined : 0,
          }}
        />

        <div
          className="relative h-24 w-[52px]"
          style={{
            filter: `drop-shadow(0 10px 20px ${TEAL}55)`,
            animation: mounted ? 'ishkLogoPop 780ms cubic-bezier(.34,1.4,.4,1) both, ishkFloat 3.2s ease-in-out 780ms infinite' : 'none',
            opacity: mounted ? undefined : 0,
          }}
        >
          <img src="/logo-flat.png" alt="ئیش خواز" className="w-full h-full object-contain" />
        </div>

        <div
          className="relative flex flex-col items-center gap-1.5"
          style={{ animation: mounted ? 'ishkTextIn 620ms ease 260ms both' : 'none', opacity: mounted ? undefined : 0 }}
        >
          <h1 className="text-3xl font-black" style={{ fontFamily: "'Vazirmatn', sans-serif", color: '#111' }}>ئیش خواز</h1>
          <p className="text-sm font-bold" style={{ color: '#6b7280' }}>کار لە کوردستان</p>
        </div>

        {/* Feature row — gives the splash real content, not just a logo flash */}
        <div className="relative flex items-center gap-2.5 px-6">
          {FEATURES.map((f, i) => (
            <div
              key={f.label}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full"
              style={{
                background: 'rgba(255,255,255,0.65)',
                border: '1px solid rgba(18,121,107,0.14)',
                boxShadow: '0 4px 14px rgba(18,121,107,0.08)',
                animation: mounted ? `ishkChipIn 520ms ${EASE} ${740 + i * 130}ms both` : 'none',
                opacity: mounted ? undefined : 0,
              }}
            >
              <span className="text-[13px] leading-none">{f.icon}</span>
              <span className="text-[10.5px] font-bold whitespace-nowrap" style={{ color: '#3b4744' }}>{f.label}</span>
            </div>
          ))}
        </div>

        <div
          className="absolute bottom-20 flex flex-col items-center gap-3"
          style={{ opacity: mounted ? 1 : 0, transition: 'opacity 500ms ease 420ms' }}
        >
          <div className="relative w-[130px] h-[3px] rounded-full overflow-hidden" style={{ background: '#e2e5e3' }}>
            <div
              className="relative h-full rounded-full overflow-hidden"
              style={{ width: mounted ? '100%' : '0%', background: TEAL, transition: `width 2250ms ${EASE} 500ms` }}
            >
              <div
                aria-hidden="true"
                className="absolute inset-y-0"
                style={{
                  width: '40%',
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.65), transparent)',
                  animation: mounted ? 'ishkShimmer 1.35s ease-in-out 500ms' : 'none',
                }}
              />
            </div>
          </div>
          <span className="text-[10px] font-bold tracking-[0.2em]" style={{ color: '#9aa1a0' }}>ZERA GROUP</span>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="fixed inset-0 z-50 flex flex-col select-none" style={{ background: '#f4f7f6' }}>
      <div className="flex justify-start p-4 shrink-0" style={{ paddingTop: 'max(16px, calc(env(safe-area-inset-top) + 8px))' }}>
        <button onClick={onComplete} className="text-[13px] font-semibold px-2 py-2" style={{ color: '#8b938d' }}>تێپەڕاندن</button>
      </div>

      <div
        className="flex-1 flex flex-col justify-center gap-8 px-8 max-w-md mx-auto w-full"
        style={{
          opacity: stepVisible ? 1 : 0,
          transform: stepVisible ? 'translateY(0)' : 'translateY(10px)',
          transition: `opacity 220ms ${EASE}, transform 220ms ${EASE}`,
        }}
      >
        <div
          className="aspect-square flex items-center justify-center relative"
          style={{ borderRadius: 24, border: '1px solid #d7e8e4', background: 'radial-gradient(120% 100% at 50% 20%, #eaf6f3, #f4f7f6 75%)' }}
        >
          {(() => { const Illustration = ILLUSTRATIONS[SLIDES[step].illustration]; return <Illustration />; })()}
        </div>
        <div className="flex flex-col gap-3">
          <h2 style={{ margin: 0, fontFamily: "'Vazirmatn', sans-serif", fontSize: 24, fontWeight: 800, lineHeight: 1.4, color: '#111' }}>{SLIDES[step].title}</h2>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.9, color: '#6b7280' }}>{SLIDES[step].desc}</p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-5 px-8 pb-10 shrink-0 max-w-md mx-auto w-full" style={{ paddingBottom: 'max(40px, calc(env(safe-area-inset-bottom) + 16px))' }}>
        <div className="flex items-center gap-2">
          {SLIDES.map((_, i) => (
            <div key={i} className="rounded-full"
              style={{ height: 7, width: i === step ? 22 : 7, background: i === step ? TEAL : '#dfe3e1', transition: `width 320ms ${EASE}, background 320ms ${EASE}` }} />
          ))}
        </div>
        <button onClick={handleNext} className="w-full text-center active:scale-[0.97]"
          style={{ padding: 17, borderRadius: 14, fontFamily: 'inherit', fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer', background: TEAL, color: '#fff', boxShadow: `0 3px 12px ${TEAL}40`, transition: `transform 150ms ${EASE}` }}>
          {step === SLIDES.length - 1 ? 'دەستپێکردن' : 'بەردەوام بە'}
        </button>
      </div>
    </div>
  );
};
