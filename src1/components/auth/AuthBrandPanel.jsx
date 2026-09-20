import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Sparkles, X, Send, ArrowLeft } from 'lucide-react';
import {
  LOGIN_STEPS, LOGIN_QUESTIONS, registerSteps, registerQuestions,
} from './authGuide';

// Width of the desktop brand panel (it sits on the right, the reading side in RTL); pages add the same
// amount of right padding so the form centres in what's left. Shared by login and register.
export const AUTH_PANEL_W = 'min(44vw, 600px)';
export const AUTH_PAD_LG = 'lg:pr-[min(44vw,600px)]';
export const AUTH_GRADIENT = 'linear-gradient(155deg,#12897a 0%,#0d6a5d 48%,#083f37 100%)';
const KUFI = "'IBM Plex Sans Arabic','Vazirmatn',system-ui,sans-serif";

const COPY = {
  login: {
    title: 'بەخێربێیتەوە',
    guide: 'چۆن بچمە ژوورەوە؟',
    text: 'تەنها سێ هەنگاو ماوە تا بگەڕێیتەوە بۆ هەلی کارەکانت.',
  },
  register: {
    title: 'پڕۆفایلی خۆت بنیات بنێ',
    guide: 'چۆن هەژمار دروست بکەم؟',
    text: 'هەنگاو بە هەنگاو ڕێت پیشان دەدەین. هەنگاوی ئێستا نیشانە کراوە.',
  },
};

// Numbered vertical timeline. `current` is 1-based; steps before it are ticked.
const StepList = ({ steps, current }) => (
  <ol className="mt-8 space-y-0">
    {steps.map((s, i) => {
      const n = i + 1;
      const done = n < current;
      const active = n === current;
      const last = i === steps.length - 1;
      return (
        <li key={s.title} className="relative flex items-start gap-4 pb-6 last:pb-0">
          {!last && <span className={`absolute right-[19px] top-10 bottom-0 w-px ${done ? 'bg-[#8ff0dc]/70' : 'bg-white/20'}`} />}
          <span
            className={`relative grid h-10 w-10 shrink-0 place-items-center rounded-2xl border text-sm font-black transition-all duration-300 ${
              done ? 'border-[#8ff0dc] bg-[#8ff0dc] text-[#08453c]'
                : active ? 'border-white bg-white text-[#0d6a5d] shadow-[0_0_0_6px_rgba(255,255,255,.14)]'
                  : 'border-white/25 bg-white/10 text-white/70'
            }`}
          >
            {done ? <Check className="h-4 w-4" strokeWidth={3} /> : n}
          </span>
          <span className={`pt-0.5 transition-opacity duration-300 ${active || done || !current ? 'opacity-100' : 'opacity-60'}`}>
            <span className="block text-sm font-black">{s.title}</span>
            <span className="mt-1 block text-xs font-bold leading-6 text-white/65">{s.text}</span>
          </span>
        </li>
      );
    })}
  </ol>
);

export const AuthBrandPanel = ({ variant = 'login', step = 1, isRecruiter = false }) => {
  const c = COPY[variant] || COPY.login;
  const steps = variant === 'register' ? registerSteps(isRecruiter) : LOGIN_STEPS;
  const current = variant === 'register' ? step : 0;
  return (
    <aside
      aria-label={c.guide}
      className="hidden lg:flex fixed right-0 top-0 bottom-0 z-0 flex-col justify-between overflow-hidden p-10 xl:p-14 text-white"
      style={{ width: AUTH_PANEL_W, background: AUTH_GRADIENT, fontFamily: KUFI }}
    >
      <div className="pointer-events-none absolute -left-24 -top-24 h-[420px] w-[420px] rounded-full bg-[#43d1b8]/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-[440px] w-[440px] rounded-full bg-[#052e28]/60 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 opacity-[.07]"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.9) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.9) 1px,transparent 1px)', backgroundSize: '46px 46px' }} />

      <div className="relative flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white shadow-lg overflow-hidden">
          <img src="/logo-flat.png" alt="" className="h-9 w-auto object-contain" />
        </div>
        <div>
          <div className="text-xs font-black tracking-[0.24em]">ISHKHWAZ</div>
          <div className="mt-0.5 text-[10px] font-bold text-white/60">کار لە کوردستان</div>
        </div>
      </div>

      <div className="relative max-w-[460px]">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-black text-[#c8fff3]">
          <Sparkles className="h-3.5 w-3.5" /> {c.guide}
        </span>
        <h2 className="mt-4 text-[34px] xl:text-[40px] font-black leading-[1.5]">{c.title}</h2>
        <p className="mt-2 text-sm font-bold leading-7 text-white/70">{c.text}</p>
        <StepList steps={steps} current={current} />
      </div>

      <div className="relative text-[10px] font-bold tracking-[0.22em] text-white/40 text-center">ZERA GROUP • ISHKHWAZ</div>
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

// ─── Mobile assistant ───────────────────────────────────────────────────────────────────────────
// A chat-style helper for phones. It is a scripted guide (no server / no AI model): tap a question
// chip and it "types" the prepared answer, with a button that jumps to the right screen when useful.
const Typing = () => (
  <div className="flex w-fit items-center gap-1 rounded-2xl rounded-br-md bg-white px-4 py-3 shadow-sm">
    {[0, 1, 2].map(i => (
      <span key={i} className="h-1.5 w-1.5 rounded-full bg-[#12796b]/60 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
    ))}
  </div>
);

export const AuthAssistant = ({ variant = 'login', step = 1, isRecruiter = false, actions = {} }) => {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([]);
  const [typing, setTyping] = useState(false);
  const endRef = useRef(null);
  const timer = useRef(null);

  const isRegister = variant === 'register';
  const steps = isRegister ? registerSteps(isRecruiter) : LOGIN_STEPS;
  const total = steps.length;
  const stepInfo = isRegister ? steps[Math.min(step, total) - 1] : null;
  const questions = isRegister ? registerQuestions(isRecruiter, step > total ? null : stepInfo) : LOGIN_QUESTIONS;

  const greeting = isRegister
    ? [{ from: 'bot', text: 'سڵاو! 👋 من یاریدەدەری ئیش خوازم. لە تۆمارکردنەکەدا هەنگاو بە هەنگاو یارمەتیت دەدەم.' },
      { from: 'bot', text: step > total ? 'هەموو هەنگاوەکانت تەواو کرد! 🎉' : `ئێستا لە هەنگاوی ${step} لە ${total}یت: «${stepInfo.title}». ${stepInfo.text}` }]
    : [{ from: 'bot', text: 'سڵاو! 👋 من یاریدەدەری ئیش خوازم. دەتوانم پیشانت بدەم چۆن بچیتە ژوورەوە.' },
      { from: 'bot', text: 'یەکێک لە پرسیارەکانی خوارەوە هەڵبژێرە:' }];

  // Fresh conversation whenever the sheet opens or the register step changes.
  useEffect(() => { setMsgs(open ? greeting : []); setTyping(false); clearTimeout(timer.current); }, [open, step, isRecruiter]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [msgs, typing]);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const ask = (item) => {
    if (typing) return;
    setMsgs(m => [...m, { from: 'me', text: item.q }]);
    setTyping(true);
    const answer = item.dynamic === 'remaining'
      ? (step > total ? 'هیچ هەنگاوێک نەماوە. 🎉' : step === total ? 'ئەمە دوایین هەنگاوە!' : `${total - step} هەنگاوی تر ماوە دوای ئەم هەنگاوە.`)
      : item.answer;
    timer.current = setTimeout(() => {
      setTyping(false);
      setMsgs(m => [...m, { from: 'bot', text: answer, action: item.action }]);
    }, 700);
  };

  const runAction = (key) => { setOpen(false); actions[key]?.(); };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="یاریدەدەر"
        className="lg:hidden fixed z-[45] end-4 grid h-14 w-14 place-items-center rounded-full text-white shadow-[0_14px_34px_rgba(13,106,93,.45)] active:scale-95 transition"
        style={{ bottom: 'max(1.25rem, env(safe-area-inset-bottom))', background: AUTH_GRADIENT }}
      >
        <span className="absolute inset-0 rounded-full bg-[#12796b]/40 animate-ping" style={{ animationDuration: '2.6s' }} />
        <Sparkles className="relative h-6 w-6" />
      </button>

      {open && createPortal(
        <div className="lg:hidden fixed inset-0 z-[10000] flex items-end bg-black/45 backdrop-blur-[2px]" onClick={() => setOpen(false)} dir="rtl">
          <div
            role="dialog"
            aria-label="یاریدەدەر"
            onClick={e => e.stopPropagation()}
            className="mx-auto flex h-[78dvh] w-full max-w-[560px] flex-col overflow-hidden rounded-t-[28px] bg-[#f3f7f6] shadow-2xl"
            style={{ fontFamily: KUFI, animation: 'assistUp .28s cubic-bezier(.22,.9,.34,1)' }}
          >
            <style>{'@keyframes assistUp{from{transform:translateY(40px);opacity:0}to{transform:none;opacity:1}}'}</style>
            <div className="flex items-center gap-3 px-4 py-3.5 text-white" style={{ background: AUTH_GRADIENT }}>
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/15"><Sparkles className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-black">یاریدەدەری ئیش خواز</div>
                <div className="text-[10px] font-bold text-white/70">{isRegister ? `هەنگاوی ${Math.min(step, total)} لە ${total}` : 'یارمەتی چوونەژوورەوە'}</div>
              </div>
              <button onClick={() => setOpen(false)} aria-label="داخستن" className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 active:scale-95"><X className="h-4 w-4" /></button>
            </div>

            <div className="flex-1 space-y-2.5 overflow-y-auto px-4 py-4">
              {msgs.map((m, i) => (
                <div key={i} className={`flex ${m.from === 'me' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[86%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-[13px] font-bold leading-7 shadow-sm ${
                    m.from === 'me' ? 'rounded-bl-md bg-[#12796b] text-white' : 'rounded-br-md bg-white text-[#20312d]'
                  }`}>
                    {m.text}
                    {m.action && actions[m.action.key] && (
                      <button onClick={() => runAction(m.action.key)} className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#12796b] px-3 py-2 text-xs font-black text-white active:scale-95">
                        {m.action.label}<ArrowLeft className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {typing && <div className="flex justify-end"><Typing /></div>}
              <div ref={endRef} />
            </div>

            <div className="border-t border-[#dde8e5] bg-white px-3 pt-3" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
              <div className="mb-2 flex items-center gap-1.5 text-[10px] font-black text-[#7b8e88]"><Send className="h-3 w-3" /> پرسیارێک هەڵبژێرە</div>
              <div className="flex flex-wrap gap-2">
                {questions.map(item => (
                  <button key={item.q} onClick={() => ask(item)} disabled={typing}
                    className="rounded-full border border-[#cfe3de] bg-[#f0f8f6] px-3.5 py-2 text-[11px] font-black text-[#0d5c50] transition active:scale-95 disabled:opacity-50">
                    {item.q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
};
