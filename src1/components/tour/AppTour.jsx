import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, X, Sparkles, PartyPopper } from 'lucide-react';
import { canSeePlans } from '../../config/features';

const NK = "'IBM Plex Sans Arabic','Noto Kufi Arabic','Vazirmatn',system-ui,sans-serif";
const TEAL = '#641bd9';
export const TOUR_DONE_KEY = 'ishkhwaz_tour_done';

// `target` lists alternatives (phone nav / desktop header / on-page element); the first one that is
// actually visible gets the spotlight. `tab` is opened first when the step lives on another page.
const nav = (id) => [`[data-tour="nav-${id}"]`, `[data-tour="hdr-${id}"]`];

const buildSteps = (employer, showPlans) => {
  const S = [];
  S.push({ title: 'بەخێربێیت بۆ ئیش خواز 👋', text: employer
    ? 'ئەم ڕێبەرە هەموو بەشەکانی ئەپ بە ڕێکی پیشان دەدات: چۆن کار بڵاودەکەیتەوە، کارخواز دەدۆزیتەوە و داواکارییەکان بەڕێوە دەبەیت. نزیکەی دوو خولەک دەخایەنێت.'
    : 'ئەم ڕێبەرە هەموو بەشەکانی ئەپ بە ڕێکی پیشان دەدات: چۆن کار دەدۆزیتەوە، سیڤی دەنێریت و پڕۆفایلەکەت بەهێز دەکەیت. نزیکەی دوو خولەک دەخایەنێت.',
    tips: ['لەگەڵ هەر هەنگاوێک شوێنی ڕاستەقینەی دوگمەکان دیاری دەکرێت', 'دەتوانیت هەر کاتێک بیپەڕێنیت'] });

  S.push({ tab: 'home', target: nav('home'), title: '١. ماڵەوە', text: employer
    ? 'یەکەم لاپەڕە: کارخوازانی گونجاو و ئامارەکانت لێرە دەردەکەون.'
    : 'یەکەم لاپەڕە: هەلی کارە نوێیەکان و پێشنیارە تایبەتەکان بۆ تۆ.',
    tips: employer
      ? ['بەپێی پیشە و شار کارخواز بگەڕێ', 'کارخوازانی VIP و Pro لە سەرەوە دەردەکەون', 'کرتە لە کارتی کارخواز بکە بۆ بینینی زانیاری تەواو']
      : ['بە بوار (پارچەیی، تەواو، فریلانس...) فلتەر بکە', 'دڵی سەر هەر کارێک = پاشەکەوتکردن بۆ دواتر', 'کرتە لە کارتەکە بکە بۆ بینینی وردەکاری و ناردنی سیڤی'] });
  S.push({ tab: 'search', target: nav('search'), title: '٢. گەڕان', text: employer
    ? 'لێرە کارخواز، کۆمپانیا و کارەکان بگەڕێ.'
    : 'کۆمپانیاکان، هەلی کار و کارخوازان لە یەک شوێن.',
    tips: ['سێ تابی سەرەوە: کۆمپانیاکان / هەلی کار / کارخوازان', 'دوگمەی فلتەر بۆ شار و بوار', 'کاتێک دەچیتە خوارەوە سەرەوەی لاپەڕە بچووک دەبێتەوە بەڵام دەمێنێتەوە', 'نیشانەی Boost = پڕۆفایلی بەرزکراوە'] });
  if (employer) {
    S.push({ tab: 'my_company_dashboard', target: nav('my_company_dashboard'), title: '٣. داشبۆردی کۆمپانیا', text: 'ناوەندی کارەکانتە: کارەکانت، داواکارییە هاتووەکان و ئامارەکان.',
      tips: ['هەر کارێک بڵاوکراوەتەوە دۆخەکەی دەبینیت (چاوەڕوان / چالاک / داخراو)', 'داواکاری کارخوازان پەسەند یان ڕەت بکە', 'ئامار: بینین و داواکاری بۆ هەر کارێک'] });
    S.push({ tab: 'my_company_dashboard', target: ['[data-tour="dash-post"]'], title: 'بڵاوکردنەوەی کار', text: 'لێرەوە هەلی کاری نوێ دادەنێیت. فۆرمەکە هەر بەشێک بە جیا دەپرسێت.',
      tips: ['ناونیشان، بوار، شوێن و مووچە', 'ئەرک، مەرج و ئامانجەکان بە بەشی جیاواز', 'دوای پشکنین لە ئەپدا دەردەکەوێت'] });
  } else {
    S.push({ tab: 'my_applications', target: nav('my_applications'), title: '٣. داواکارییەکانم', text: 'دۆخی هەموو ئەو سیڤییانەی ناردووتە.',
      tips: ['ناردراو: ئەوانەی خۆت ناردووتە', 'ئۆفەرە وەرگیراوەکان: کۆمپانیا بانگهێشتی کردوویت', 'دۆخ: چاوەڕوان / پەسەندکراو / ڕەتکراو'] });
  }
  S.push({ tab: 'messages', target: nav('messages'), title: '٤. پەیامەکان', text: employer ? 'ڕاستەوخۆ لەگەڵ کارخوازەکان گفتوگۆ بکە.' : 'ڕاستەوخۆ لەگەڵ کۆمپانیاکان گفتوگۆ بکە.',
    tips: ['ژمارەی سووری سەر ئایکۆن = پەیامی نەخوێندراو', 'ئاگادارکردنەوەکانیش لە زەنگەکەی سەرەوە دەبینیت'] });
  S.push({ tab: 'profile', target: nav('profile'), title: '٥. پڕۆفایل', text: 'هەموو زانیارییەکانت و ڕێکخستنەکان لێرەن. با بەشەکانی بە ڕێکی ببینین.',
    tips: ['سەرەوە: ڕێژەی تەواوبوونی پڕۆفایل و ئامارەکانت', 'لێرە کارنامە، پاشەکەوتکراوەکان و پلانەکان دەبینیت'] });

  S.push({ tab: 'profile', target: ['[data-tour="profile-edit"]'], title: employer ? 'دەستکاری کۆمپانیا' : 'دەستکاری پڕۆفایل', text: 'هەموو زانیارییەکانت لێرە دەگۆڕیت و لە بنکەدراوە پاشەکەوت دەکرێن.',
    tips: employer
      ? ['لۆگۆ و وێنەی کۆمپانیا', 'ناو، بوار، قەبارە و جۆری کۆمپانیا', 'شوێنی ڕاستەقینە (شار، قەزا، ناحیە)', 'تۆڕە کۆمەڵایەتییەکان: ماڵپەڕ، WhatsApp، Instagram...']
      : ['وێنە و پیشە و دەربارەی خۆت', 'شارەزاییەکان (Skills) و ئەزموونی کار', 'زمانەکان و خوێندن', 'تۆڕە کۆمەڵایەتییەکان: WhatsApp، Instagram، LinkedIn...', 'ڕێژەی تەواوبوون بە زانیاری ڕاستەقینە حساب دەکرێت'] });
  if (!employer) {
    S.push({ tab: 'profile', target: ['[data-tour="profile-cv"]'], title: 'کارنامە (CV)', text: 'کارنامەی پیشەیی دروست بکە، دیزاین هەڵبژێرە و بە PDF دایبگرە.',
      tips: ['چەندین دیزاینی ئامادە', 'کۆمپانیاکان دەتوانن کارنامەی گشتیت ببینن'] });
    S.push({ tab: 'profile', target: ['[data-tour="profile-apps"]'], title: 'داواکارییەکانم', text: 'کورتەڕێگا بۆ دۆخی سیڤییەکانت، لەگەڵ ژمارەی داواکارییەکان.' });
    S.push({ tab: 'profile', target: ['[data-tour="profile-saved"]'], title: 'کارە پاشەکەوتکراوەکان', text: 'ئەو کارانەی بە دڵ کردووە لێرە کۆدەبنەوە؛ دواتر دەتوانیت سیڤییان بۆ بنێریت.' });
  } else {
    S.push({ tab: 'profile', target: ['[data-tour="profile-dash"]'], title: 'داشبۆردی کۆمپانیا', text: 'کورتەڕێگا بۆ کارەکان و داواکارییەکانت، لەگەڵ ژمارەی کارەکان.' });
  }
  S.push({ tab: 'profile', target: ['[data-tour="profile-viewers"]'], title: 'بینەرانی پڕۆفایل', text: employer ? 'دەزانیت کێ پڕۆفایلی کۆمپانیاکەتی بینیوە.' : 'دەزانیت کام کۆمپانیا پڕۆفایلەکەتی بینیوە؛ ئەمە نیشانەی بەرچاوکەوتنە.' });
  if (showPlans) {
    S.push({ tab: 'profile', target: ['[data-tour="profile-plans"]', '[data-tour="hdr-plans"]'], title: 'پلانەکان', text: 'پلانی Pro و VIP کاریگەری زیاتر دەدەن.',
      tips: employer ? ['کرێدیتی زیاتر بۆ بڵاوکردنەوەی کار', 'پێشخستنی کارەکانت'] : ['VIP: لە سەرەوەی لیستی گەڕان دەردەکەویت', 'Boost: بۆ ماوەیەک بەرزت دەکاتەوە', 'پلانەکان کڕینێکی یەکجارەن، نەک مانگانە'] });
  }
  S.push({ tab: 'profile', target: ['[data-tour="profile-how"]'], title: 'چۆنیەتی کارکردن', text: 'ڕێنمایی نووسراو و ئەم ڕێبەرە زیندووە هەر کاتێک ویستت لێرە دووبارە دەکەیتەوە.' });
  S.push({ tab: 'profile', target: ['[data-tour="profile-contact"]'], title: 'یارمەتی و پەیوەندی', text: 'هەر کێشە یان پێشنیارێکت هەبوو، لێرەوە نامەمان بۆ بنێرە.' });
  S.push({ title: 'ئامادەیت! 🎉', text: employer
    ? 'ئێستا دەتوانیت یەکەم کارت بڵاوبکەیتەوە و کارخوازی گونجاو بدۆزیتەوە.'
    : 'ئێستا دەتوانیت پڕۆفایلەکەت تەواو بکەیت و یەکەم سیڤیت بنێریت.',
    tips: ['ڕێبەرەکە هەر کاتێک لە «چۆنیەتی کارکردن» دووبارە دەکرێتەوە'], done: true });
  return S;
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
  const employer = user?.role === 'employer' || user?.role === 'owner' || user?.role === 'admin';
  const showPlans = canSeePlans(user);
  const steps = React.useMemo(() => buildSteps(employer, showPlans), [employer, showPlans]);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState(null);
  const [settled, setSettled] = useState(false);
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
    setSettled(!step?.target);
    // wait for the page to render the target, jump it into view (no smooth scroll, so the spotlight never chases it), then reveal
    let tries = 0;
    const reveal = () => { if (cancelled) return; measure(); setSettled(true); };
    const find = () => {
      if (cancelled) return;
      const el = visibleEl(step?.target);
      if (el) {
        el.scrollIntoView({ block: 'center', behavior: 'auto' });
        setTimeout(reveal, 160);
      } else if (step?.target && tries++ < 25) setTimeout(find, 120);
      else reveal();
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
  let cardStyle = { width: cardW, left: Math.max(12, (vp.w - cardW) / 2), top: Math.max(12, vp.h / 2 - (step.tips?.length ? 210 : 130)) };
  if (spot) {
    const below = spot.top + spot.height + 16;
    const roomBelow = vp.h - below > (step.tips?.length ? 380 : 210);
    const left = Math.min(Math.max(12, spot.left + spot.width / 2 - cardW / 2), vp.w - cardW - 12);
    cardStyle = roomBelow ? { width: cardW, left, top: below } : { width: cardW, left, bottom: Math.max(12, vp.h - spot.top + 16) };
  }

  return createPortal(
    <div className="fixed inset-0 z-[10050]" dir="rtl" style={{ fontFamily: NK }} role="dialog" aria-modal="true" aria-label="ڕێبەری ئەپ">
      <style>{'@keyframes tourPulse{0%,100%{box-shadow:0 0 0 9999px rgba(11,6,20,.74),0 0 0 3px rgba(157,116,224,.95)}50%{box-shadow:0 0 0 9999px rgba(11,6,20,.74),0 0 0 9px rgba(157,116,224,.25)}}@keyframes tourCard{from{opacity:0;transform:translateY(10px) scale(.98)}to{opacity:1;transform:none}}@media (prefers-reduced-motion:reduce){[data-tour-ui]{animation:none!important;transition:none!important}}'}</style>

      {/* click shield (a click outside does nothing; use the buttons) */}
      <div className="absolute inset-0" style={spot && settled ? undefined : { background: 'rgba(11,6,20,.74)' }} />

      {spot && settled && (
        <div data-tour-ui className="pointer-events-none absolute rounded-[20px]" style={{ top: spot.top, left: spot.left, width: spot.width, height: spot.height, animation: 'tourPulse 1.8s ease-in-out infinite', transition: 'none' }} />
      )}

      <div data-tour-ui key={i} className="absolute rounded-[24px] bg-white p-5 shadow-[0_30px_80px_rgba(0,0,0,.45)]" style={{ ...cardStyle, visibility: settled ? 'visible' : 'hidden', animation: 'tourCard .28s ease both' }}>
        <button type="button" onClick={() => finish(false)} aria-label="داخستن" className="absolute left-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-[#f4f3f6] text-[#60706c] active:scale-95"><X className="h-4 w-4" /></button>
        <div className="mb-3 flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl text-white" style={{ background: `linear-gradient(135deg, ${TEAL}, #4b13a5)` }}>{step.done ? <PartyPopper className="h-[18px] w-[18px]" /> : <Sparkles className="h-[18px] w-[18px]" />}</span>
          <span className="text-[11px] font-bold text-[#7b8e88]">{i + 1} / {steps.length}</span>
        </div>
        <h3 className="text-[17px] font-bold text-[#16111d]">{step.title}</h3>
        <p className="mt-1.5 text-[13px] font-medium leading-7 text-[#4a5b55]">{step.text}</p>
        {step.tips?.length > 0 && (
          <ul className="mt-2.5 space-y-1.5 rounded-2xl bg-[#f6f3fb] px-3.5 py-3">
            {step.tips.map((t, k) => (
              <li key={k} className="flex items-start gap-2 text-[12px] font-medium leading-6 text-[#3d3350]"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: TEAL }} />{t}</li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex items-center gap-1">
          {steps.map((_, k) => <span key={k} className="h-1.5 rounded-full transition-all" style={{ width: k === i ? 18 : 6, background: k <= i ? TEAL : '#e2dfe8' }} />)}
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <button type="button" onClick={() => finish(false)} className="px-2 py-2 text-xs font-bold text-[#7b8e88]">{last ? '' : 'پەڕاندن'}</button>
          <div className="flex items-center gap-2">
            {i > 0 && <button type="button" onClick={() => setI(n => n - 1)} className="grid h-11 w-11 place-items-center rounded-full bg-[#f4f3f6] text-[#4b13a5] active:scale-95" aria-label="پێشوو"><ArrowRight className="h-4 w-4" /></button>}
            <button type="button" onClick={() => (last ? finish(true) : setI(n => n + 1))}
              className="flex h-11 items-center gap-2 rounded-full px-6 text-[13px] font-bold text-white shadow-[0_10px_24px_rgba(100,27,217,.3)] active:scale-95" style={{ background: `linear-gradient(135deg, ${TEAL}, #4b13a5)` }}>
              {last ? 'دەستپێبکە' : 'دواتر'}{!last && <ArrowLeft className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};
