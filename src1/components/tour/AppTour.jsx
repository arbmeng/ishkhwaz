import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, X, Sparkles, PartyPopper } from 'lucide-react';
import { canSeePlans } from '../../config/features';

const NK = "'IBM Plex Sans Arabic','Noto Kufi Arabic','Vazirmatn',system-ui,sans-serif";
const TEAL = '#12796b';
export const TOUR_DONE_KEY = 'ishkhwaz_tour_done';

// `target` lists alternatives (phone nav / desktop header / on-page element); the first one that is
// actually visible gets the spotlight. `tab` is opened first when the step lives on another page.
const nav = (id) => [`[data-tour="nav-${id}"]`, `[data-tour="hdr-${id}"]`];

const buildSteps = (user) => {
  const employer = user?.role === 'employer' || user?.role === 'owner' || user?.role === 'admin';
  const steps = [
    { title: 'بەخێربێیت بۆ ئیش خواز 👋', text: 'با بە کورتی پیشانت بدەین چۆن ئەپەکە بەکاربهێنیت. لەگەڵ هەر هەنگاوێک شوێنی ڕاستەقینەی دوگمەکان دیاری دەکەین.' },
    { tab: 'home', target: nav('home'), title: 'ماڵەوە', text: employer ? 'لێرەدا کارخوازانی گونجاو دەبینیت و بەپێی پیشە و شار دەیانگەڕێیت.' : 'لێرەدا هەلی کارە نوێیەکان و پێشنیارە تایبەتەکان بۆ تۆ دەبینیت. فلتەری بوار و شار بەکاربهێنە.' },
    { tab: 'search', target: nav('search'), title: 'گەڕان', text: employer ? 'کارخوازانی Pro و VIP بگەڕێ، پڕۆفایلیان ببینە و داواکاری بۆیان بنێرە.' : 'کۆمپانیاکان، کارەکان و کارخوازان لە یەک شوێن. بەپێی شار و بوار فلتەر بکە و کارە دڵخوازەکان پاشەکەوت بکە.' },
    employer
      ? { tab: 'my_company_dashboard', target: [...nav('my_company_dashboard'), '[data-tour="dash-post"]'], title: 'داشبۆرد', text: 'لێرە کار بڵاودەکەیتەوە، داواکارییەکان پەسەند یان ڕەت دەکەیت و شیکاری بینین و داواکاری دەبینیت.' }
      : { tab: 'my_applications', target: nav('my_applications'), title: 'داواکارییەکانم', text: 'دۆخی هەموو سیڤییەکانت لێرە دەبینیت: لە پشکنین، لای کۆمپانیا، پەسەندکراو یان ڕەتکراو.' },
    { tab: 'messages', target: nav('messages'), title: 'پەیامەکان', text: 'ڕاستەوخۆ لەگەڵ کۆمپانیا یان کارخواز گفتوگۆ بکە. ژمارەی سووری سەر ئایکۆنەکە پەیامی نەخوێندراوە.' },
    { tab: 'profile', target: nav('profile'), title: 'پڕۆفایل', text: 'هەموو زانیارییەکانت، کارنامە و ڕێکخستنەکان لێرەن.' },
    { tab: 'profile', target: ['[data-tour="profile-edit"]'], title: 'پڕۆفایلەکەت تەواو بکە', text: 'وێنە، شارەزایی، زمان، خوێندن و تۆڕە کۆمەڵایەتییەکانت زیاد بکە. پڕۆفایلێکی تەواو زۆر زیاتر دەبینرێت.' },
  ];
  if (canSeePlans(user)) {
    steps.push({ tab: 'profile', target: ['[data-tour="profile-plans"]', '[data-tour="hdr-plans"]'], title: 'پلانەکان', text: 'کرێدیتی زیاتر بۆ ناردنی سیڤی و بەرزکردنەوەی پڕۆفایل. پلانەکان کڕینێکی یەکجارەن.' });
  }
  steps.push({ tab: 'profile', target: ['[data-tour="profile-contact"]'], title: 'یارمەتی', text: 'هەر کێشەیەک هەبوو، لێرەوە نامە بۆمان بنێرە.' });
  steps.push({ title: 'ئامادەیت! 🎉', text: 'ئێستا دەتوانیت دەستپێبکەیت. هەر کاتێک ویستت، لە «چۆنیەتی کارکردن» ئەم ڕێبەرە دووبارە بکەرەوە.', done: true });
  return steps;
};

const visibleEl = (selectors = []) => {
  for (const sel of selectors) {
    const els = Array.from(document.querySelectorAll(sel));
    const el = els.find(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
    if (el) return el;
  }
  return null;
};

export const AppTour = ({ open, user, activeTab, onNavigate, onClose }) => {
  const steps = React.useMemo(() => buildSteps(user), [user]);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState(null);
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight });
  const trackRef = useRef(null);
  const step = steps[i] || steps[0];

  const finish = useCallback((completed) => {
    try { localStorage.setItem(TOUR_DONE_KEY, completed ? '1' : 'skipped'); } catch { /* private mode */ }
    onClose?.();
  }, [onClose]);

  useEffect(() => { if (open) setI(0); }, [open]);

  // follow the target while it moves (page scroll, layout change)
  const measure = useCallback(() => {
    const el = visibleEl(step?.target);
    trackRef.current = el;
    if (!el) { setRect(null); return; }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [step]);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    if (step?.tab && step.tab !== activeTab) onNavigate?.(step.tab);
    setRect(null);
    // wait for the page to render the target, then scroll it into view
    let tries = 0;
    const find = () => {
      if (cancelled) return;
      const el = visibleEl(step?.target);
      if (el) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        setTimeout(measure, 350);
        measure();
      } else if (step?.target && tries++ < 25) setTimeout(find, 120);
      else measure();
    };
    const t = setTimeout(find, step?.tab && step.tab !== activeTab ? 250 : 0);
    return () => { cancelled = true; clearTimeout(t); };
  }, [open, i]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return undefined;
    const on = () => { setVp({ w: window.innerWidth, h: window.innerHeight }); measure(); };
    window.addEventListener('resize', on);
    window.addEventListener('scroll', on, true);
    const id = setInterval(measure, 400);
    return () => { window.removeEventListener('resize', on); window.removeEventListener('scroll', on, true); clearInterval(id); };
  }, [open, measure]);

  useEffect(() => {
    if (!open) return undefined;
    const key = (e) => {
      if (e.key === 'Escape') finish(false);
      else if (e.key === 'ArrowLeft') setI(n => Math.min(steps.length - 1, n + 1));
      else if (e.key === 'ArrowRight') setI(n => Math.max(0, n - 1));
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [open, steps.length, finish]);

  useLayoutEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  const last = i === steps.length - 1;
  const pad = 8;
  const spot = rect && { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 };

  // card placement: below the spotlight if there is room, otherwise above; centred when there is no target
  const cardW = Math.min(340, vp.w - 24);
  let cardStyle = { width: cardW, left: Math.max(12, (vp.w - cardW) / 2), top: Math.max(12, vp.h / 2 - 130) };
  if (spot) {
    const below = spot.top + spot.height + 16;
    const roomBelow = vp.h - below > 210;
    const left = Math.min(Math.max(12, spot.left + spot.width / 2 - cardW / 2), vp.w - cardW - 12);
    cardStyle = roomBelow ? { width: cardW, left, top: below } : { width: cardW, left, bottom: Math.max(12, vp.h - spot.top + 16) };
  }

  return createPortal(
    <div className="fixed inset-0 z-[10050]" dir="rtl" style={{ fontFamily: NK }} role="dialog" aria-modal="true" aria-label="ڕێبەری ئەپ">
      <style>{'@keyframes tourPulse{0%,100%{box-shadow:0 0 0 9999px rgba(6,20,17,.74),0 0 0 3px rgba(67,209,184,.95)}50%{box-shadow:0 0 0 9999px rgba(6,20,17,.74),0 0 0 9px rgba(67,209,184,.25)}}@keyframes tourCard{from{opacity:0;transform:translateY(10px) scale(.98)}to{opacity:1;transform:none}}@media (prefers-reduced-motion:reduce){[data-tour-ui]{animation:none!important;transition:none!important}}'}</style>

      {/* click shield (a click outside does nothing; use the buttons) */}
      <div className="absolute inset-0" style={spot ? undefined : { background: 'rgba(6,20,17,.74)' }} />

      {spot && (
        <div data-tour-ui className="pointer-events-none absolute rounded-[20px]" style={{ top: spot.top, left: spot.left, width: spot.width, height: spot.height, animation: 'tourPulse 1.8s ease-in-out infinite', transition: 'top .3s ease, left .3s ease, width .3s ease, height .3s ease' }} />
      )}

      <div data-tour-ui key={i} className="absolute rounded-[24px] bg-white p-5 shadow-[0_30px_80px_rgba(0,0,0,.45)]" style={{ ...cardStyle, animation: 'tourCard .28s ease both' }}>
        <button type="button" onClick={() => finish(false)} aria-label="داخستن" className="absolute left-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-[#f3f6f5] text-[#60706c] active:scale-95"><X className="h-4 w-4" /></button>
        <div className="mb-3 flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl text-white" style={{ background: `linear-gradient(135deg, ${TEAL}, #0d5c50)` }}>{step.done ? <PartyPopper className="h-[18px] w-[18px]" /> : <Sparkles className="h-[18px] w-[18px]" />}</span>
          <span className="text-[11px] font-bold text-[#7b8e88]">{i + 1} / {steps.length}</span>
        </div>
        <h3 className="text-[17px] font-bold text-[#111d1a]">{step.title}</h3>
        <p className="mt-1.5 text-[13px] font-medium leading-7 text-[#4a5b55]">{step.text}</p>

        <div className="mt-4 flex items-center gap-1">
          {steps.map((_, k) => <span key={k} className="h-1.5 rounded-full transition-all" style={{ width: k === i ? 18 : 6, background: k <= i ? TEAL : '#dfe8e5' }} />)}
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <button type="button" onClick={() => finish(false)} className="px-2 py-2 text-xs font-bold text-[#7b8e88]">{last ? '' : 'پەڕاندن'}</button>
          <div className="flex items-center gap-2">
            {i > 0 && <button type="button" onClick={() => setI(n => n - 1)} className="grid h-11 w-11 place-items-center rounded-full bg-[#f3f6f5] text-[#0d5c50] active:scale-95" aria-label="پێشوو"><ArrowRight className="h-4 w-4" /></button>}
            <button type="button" onClick={() => (last ? finish(true) : setI(n => n + 1))}
              className="flex h-11 items-center gap-2 rounded-full px-6 text-[13px] font-bold text-white shadow-[0_10px_24px_rgba(18,121,107,.3)] active:scale-95" style={{ background: `linear-gradient(135deg, ${TEAL}, #0d5c50)` }}>
              {last ? 'دەستپێبکە' : 'دواتر'}{!last && <ArrowLeft className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};
