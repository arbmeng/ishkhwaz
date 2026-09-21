import React, { useEffect, useMemo, useState } from 'react';
import { PageHeader } from './PageHeader';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api';
import { getPlanIcon, getPlanColor, getContrastColor, formatCredits } from '../../utils/planPresets';
import {
  UserPlus, UserCog, Search, Send, Activity, MessageCircle, Crown, Building2, PlusCircle, Inbox, Users, BarChart3,
  Play, ChevronDown, Lightbulb, Check, Rocket, Zap, Briefcase, Mail,
} from 'lucide-react';

const NK = "'IBM Plex Sans Arabic','Noto Kufi Arabic','Vazirmatn',system-ui,sans-serif";
const TEAL = '#12796b';
const TEAL_DEEP = '#0d5c50';
const TEAL_SOFT = '#e7f4f1';
const GRAD = 'linear-gradient(155deg,#12897a 0%,#0d6a5d 48%,#083f37 100%)';

const SEEKER = [
  { icon: UserPlus, title: 'تۆمارکردن و دڵنیاکردنەوەی ئیمەیڵ', body: 'هەژمارێک دروست بکە: ناو، ژمارەی مۆبایل، ئیمەیڵ و وشەی نهێنی (لانیکم ٨ پیت). یان بە یەک کرتە بە گووگڵ.',
    details: ['ژمارەی مۆبایل بەبێ سفری سەرەتا بنووسە، بۆ نموونە 750 123 4567', 'کۆدێکی ٦ ژمارەیی بۆ ئیمەیڵەکەت دێت و ١٠ خولەک کاردەکات', 'ئەگەر نەگەیشت، سندوقی Spam بپشکنە و «دووبارە بینێرە» بکە'],
    tip: 'ئیمەیڵ پێویستە چونکە کۆدی دڵنیاکردنەوە و گەڕاندنەوەی وشەی نهێنی پێی دەنێردرێت.' },
  { icon: UserCog, title: 'پڕۆفایلەکەت تەواو بکە', body: 'پڕۆفایلێکی تەواو زۆر زیاتر دەبینرێت. لە «پڕۆفایل ← دەستکاری» هەموو بەشەکان بە جیا دەکرێنەوە.',
    details: ['وێنە، دەربارە و ناونیشانی پیشەیی', 'شار، قەزا و ناحیە', 'شارەزاییەکان (وەک #React #ژمێریاری)، ئەزموون، زمان و خوێندن', 'تۆڕە کۆمەڵایەتییەکان: Instagram، WhatsApp، LinkedIn...'],
    tip: 'ڕێژەی تەواوی پڕۆفایل لەسەر پڕۆفایلەکەت پیشان دەدرێت. بگەیەنە ١٠٠٪.' },
  { icon: Search, title: 'گەڕان بەدوای کار', body: 'لە «ماڵەوە» هەلی کارە نوێیەکان و پێشنیارە تایبەتەکان دەبینیت. لە «گەڕان» کۆمپانیا، کار و کارخوازان دەگەڕێیت.',
    details: ['فلتەر بەپێی بواری کار، شار و ناوچە', 'دوگمەی «شوێنی من» نزیکترین پارێزگا دیاری دەکات', 'دڵ یان نیشانە بکە بۆ پاشەکەوتکردنی کارەکە'],
    tip: 'کارەکانی بەرزکراو لە سەرەوە و بە کارتی گەورەتر پیشان دەدرێن.' },
  { icon: Send, title: 'ناردنی سیڤی', body: 'لە وردەکاری کار، «ناردنی سیڤی» بکە. پڕۆفایلەکەت وەک CV دەنێردرێت، یان CVـیەکی تایبەت هەڵبژێرە.',
    details: ['هەر پلانێک ژمارەیەک کرێدیتی هەیە؛ هەر سیڤییەک کرێدیتێک بەکاردەهێنێت', 'ئەگەر کرێدیتت نەما، دەتوانیت بۆ هەمان سیڤی بە ZeraPay پارە بدەیت', 'بەرزکردنەوەی پلان کرێدیتی زیاتر دەدات'],
    tip: 'پلانی VIP سیڤی بێ سنووری هەیە.' },
  { icon: Activity, title: 'بەدواداچوونی داواکاری', body: 'لە تابی «داواکاری» دۆخی هەر سیڤییەک دەبینیت و ئاگادارکردنەوەت پێدەگات.',
    details: ['لە پشکنین (پارەدان) ← لای کۆمپانیا ← پەسەندکراو یان ڕەتکراو', 'ئەگەر پەسەند کرا، ڕاستەوخۆ پەیام بۆ کۆمپانیا بنێرە', 'هەڵسەنگاندنی کۆمپانیا دوای کۆتایی'],
    tip: 'هەر داواکارییەک کە هێشتا لە پشکنیندایە دەتوانیت بیسڕیتەوە.' },
  { icon: MessageCircle, title: 'پەیام و ئۆفەر', body: 'کۆمپانیاکان دەتوانن ئۆفەرت بۆ بنێرن. لە «پەیام» گفتوگۆ دەکەیت و ئۆفەرەکان قبووڵ یان ڕەت دەکەیتەوە.',
    details: ['پەیام بێ ئەپی تر، ڕاستەوخۆ لەناو ئیش خواز', 'ڕێبەری ئەپ وەڵامی پرسیارەکانت دەداتەوە', 'کارنامە AI (VIP) سیڤیەکەت بۆ دروست دەکات'],
    tip: 'ژمارەی سووری سەر تابی پەیام واتە پەیامی نەخوێندراو.' },
  { icon: Crown, title: 'پلانەکان و بەرزکردنەوە', body: 'پلانی Pro و VIP کرێدیتی زیاتر، بەرزکردنەوەی پڕۆفایل و کارتی تایبەت لە لیستی کارخوازان دەدەن.',
    details: ['کڕینێکی یەکجارە، بێ تێچووی مانگانە', 'پڕۆفایلی بەرزکراو لە سەرەوەی لیستی کۆمپانیاکان دەردەکەوێت', 'VIP کارتی تاریک و نیشانەی تایبەتی هەیە'],
    tip: 'جیاوازی هەموو پلانەکان لە پەڕەی «پلانەکان» بە بەراوردێکی تەواو دیارە.' },
];

const EMPLOYER = [
  { icon: Building2, title: 'تۆمارکردنی کۆمپانیا', body: 'وەک «کۆمپانیا / خاوەنکار» تۆمار بکە: زانیاری کەسی، پاشان ناوی کۆمپانیا، ژمارەی مۆبایلی کۆمپانیا، بوار و شوێن.',
    details: ['ئیمەیڵ پێویستە و بە کۆدی ٦ ژمارەیی دڵنیا دەکرێتەوە', 'شار، قەزا و ناحیەی کۆمپانیا دیاری بکە', 'لۆگۆ و وێنەی کۆمپانیا زیاد بکە'],
    tip: 'ناوی کۆمپانیا و ژمارەی مۆبایلی کۆمپانیا پێویستن.' },
  { icon: UserCog, title: 'پڕۆفایلی کۆمپانیا', body: 'کۆمپانیایەکی تەواو باوەڕپێکراوترە. لە «پڕۆفایل ← دەستکاری» هەموو بەشەکان بە جیا دەکرێنەوە.',
    details: ['لۆگۆ، کەڤەر و وەسفی کۆمپانیا', 'تۆڕە کۆمەڵایەتییەکان و ماڵپەڕ', 'بەستەری هاوبەشکردن: کاتێک بڵاوی دەکەیتەوە، پێشبینینی وێنە و ناو دەردەکەوێت'],
    tip: 'ئەگەر کۆمپانیا پشتڕاستکراو بێت، نیشانەی پشتڕاستکراو دەردەکەوێت.' },
  { icon: PlusCircle, title: 'بڵاوکردنەوەی هەلی کار', body: 'لە «داشبۆرد» دوگمەی «بڵاوکردنەوەی کار» بکە و وردەکاریەکان پڕبکەرەوە.',
    details: ['جۆری کار (حکومی، تایبەت، بازرگانی...) و جۆری کات (تەواو، بەشی، ڕیمۆت)', 'مووچە، شوێن، مەرجەکان و وەسفی تەواو', 'کارەکە دوای پشکنینی ئەدمین چالاک دەبێت؛ لە داشبۆرد دۆخەکەی دەبینیت'],
    tip: 'وەسفی ورد و مووچەی ڕوون زیاتر کاندید دەهێنێت.' },
  { icon: Inbox, title: 'وەرگرتنی داواکاری', body: 'لە «داشبۆرد ← داواکارییەکان» هەموو سیڤییەکان دەبینیت.',
    details: ['بینینی CV و پڕۆفایلی کاندید', 'پەسەندکردن یان ڕەتکردنەوە بە یەک کرتە', 'دوای پەسەندکردن، پەیام بنێرە و هەڵسەنگاندن بکە'],
    tip: 'فلتەری بوار و گەڕان بەکاربێنە بۆ دۆزینەوەی خێرای کاندید.' },
  { icon: Users, title: 'گەڕان لەناو کارخوازاندا', body: 'لە «گەڕان ← کارخوازان» کارخوازانی Pro و VIP دەبینیت، بە هاشتاگی شارەزاییەکانیانەوە.',
    details: ['کارتی VIP و Pro بە شێوازی تایبەت دەردەکەون', 'پڕۆفایلیان بکەرەوە و «ناردنی داواکاری» بکە', 'ئۆفەری کار بۆ کاندیدی دڵخواز بنێرە'],
    tip: 'ئەوانەی پڕۆفایلیان بەرزکراوە لە سەرەوە دەبینرێن.' },
  { icon: BarChart3, title: 'شیکاری', body: 'لە تابی «شیکاری» بینینی پڕۆفایل و ژمارەی داواکاری ١٤ ڕۆژی ڕابردوو دەبینیت.',
    details: ['دیاریکردنی کاتی باشترین بینین', 'بەراوردکردنی بینین و داواکاری'],
    tip: 'ئەگەر بینین زۆرە و داواکاری کەمە، وەسفی کارەکە باشتر بکە.' },
  { icon: MessageCircle, title: 'پەیام و بەدواداچوون', body: 'لەگەڵ کاندیدەکان ڕاستەوخۆ لەناو ئەپەکە پەیوەندی بکە. ئاگادارکردنەوە بۆ هەر داواکارییەکی نوێ دێت.',
    details: ['هەموو گفتوگۆکان لە «پەیام»', 'ئاگادارکردنەوەی نوێ لە زەنگی سەرەوە'],
    tip: 'ئاگادارکردنەوەی ئامێر لە پڕۆفایل ← ڕێکخستن چالاک بکە.' },
];

const FAQ = [
  ['پارەدان پێویستە بۆ ناردنی سیڤی؟', 'هەر پلانێک ژمارەیەک کرێدیتی هەیە. تا کرێدیتت ماوە پارە نادەیت. ئەگەر کرێدیتت نەما، بۆ هەر سیڤییەک دەتوانیت بە ZeraPay پارە بدەیت، یان پلانێک بکڕیت.'],
  ['کۆدی ئیمەیڵم پێنەگەیشت، چی بکەم؟', 'سندوقی Spam بپشکنە و پاشان «کۆدەکەم پێنەگەیشت» بکە. کۆدەکە ١٠ خولەک کاردەکات و دوای هەر ١ خولەک دەتوانیت دووبارە بینێریت.'],
  ['وشەی نهێنیم لەبیرچووە', 'لە پەڕەی چوونەژوورەوە «وشەی نهێنیت لەبیرچووە؟» بکە. کۆدێکی ٦ ژمارەیی بۆ ئیمەیڵەکەت دەنێردرێت و وشەی نوێ دادەنێیت.'],
  ['کارەکەم بۆچی هێشتا نابینرێت؟', 'کارە نوێیەکان دوای پشکنینی ئەدمین چالاک دەبن. دۆخەکەی لە داشبۆرد دەبینیت.'],
  ['چۆن ئیش خواز وەک ئەپ دابمەزرێنم؟', 'لە ماڵپەڕەکەدا «دابەزاندن» بکە. ڕێنمایی ئایفۆن و ئەندرۆید بە وێنە لەوێیە. هیچ App Store یان Google Play پێویست نییە.'],
];

export const HowItWorksPage = ({ onBack, onStartTour, onNavigate }) => {
  const { user } = useAuth();
  const isEmployerAcc = user?.role === 'employer' || user?.role === 'owner' || user?.role === 'admin';
  const [role, setRole] = useState(isEmployerAcc ? 'employer' : 'seeker');
  const [openFaq, setOpenFaq] = useState(0);
  const [openStep, setOpenStep] = useState(0);
  const [tiers, setTiers] = useState([]);

  useEffect(() => { apiService.getPlanTiers().then(t => setTiers(Array.isArray(t) ? t : [])); }, []);
  useEffect(() => { setOpenStep(0); }, [role]);

  const steps = role === 'employer' ? EMPLOYER : SEEKER;
  const plans = useMemo(() => tiers
    .filter(t => !t.audience || t.audience === 'both' || t.audience === (role === 'employer' ? 'employer' : 'freelancer'))
    .map(t => ({ id: t.id, name: t.name_ku, icon: getPlanIcon(t.icon), color: getPlanColor(t.color), price: Number(t.price) || 0, credits: Number(t.credits) || 0, boost: Number(t.boost_days) || 0 }))
    .sort((a, b) => a.price - b.price), [tiers, role]);

  return (
    <div dir="rtl" className="min-h-screen overflow-x-clip pb-24" style={{ background: '#f4f7f6', fontFamily: NK }}>
      <PageHeader title="چۆنیەتی کارکردنی ئیش خواز" subtitle="ڕێنمایی تەواو، هەنگاو بە هەنگاو" onBack={onBack} />

      <div className="mx-auto max-w-4xl space-y-8 px-4 pt-6 sm:px-6">
        {/* live tour */}
        <section className="relative overflow-hidden rounded-[28px] p-6 text-white sm:p-8" style={{ background: GRAD }}>
          <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-[#43d1b8]/25 blur-3xl" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-md">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-bold text-[#c8fff3]"><Lightbulb className="h-3.5 w-3.5" />ڕێبەری زیندوو</span>
              <h2 className="mt-3 text-[22px] font-bold leading-[1.5]">با بە کردەوە پیشانت بدەین</h2>
              <p className="mt-1.5 text-[13px] leading-7 text-white/75">ڕێبەرەکە دوگمە و بەشە ڕاستەقینەکانی ئەپەکە دیاری دەکات و پێت دەڵێت چی بکەیت، هەنگاو بە هەنگاو. نزیکەی یەک خولەک دەخایەنێت.</p>
            </div>
            <button type="button" onClick={() => onStartTour?.()} className="flex shrink-0 items-center justify-center gap-2 rounded-full bg-white px-7 py-4 text-sm font-bold text-[#0d5c50] shadow-[0_14px_34px_rgba(0,0,0,.2)] transition active:scale-95">
              <Play className="h-4 w-4 fill-[#0d5c50]" />دەستپێکردنی ڕێبەر
            </button>
          </div>
        </section>

        {/* role switch */}
        <div role="tablist" className="mx-auto grid max-w-sm grid-cols-2 gap-1.5 rounded-full bg-[#e6eeeb] p-1.5">
          {[['seeker', 'کارخواز', Briefcase], ['employer', 'کۆمپانیا', Building2]].map(([id, label, Icon]) => (
            <button key={id} role="tab" aria-selected={role === id} onClick={() => setRole(id)}
              className={`flex items-center justify-center gap-1.5 rounded-full py-3 text-xs font-bold transition ${role === id ? 'bg-white text-[#0d5c50] shadow-sm' : 'text-[#6d7d79]'}`}><Icon className="h-4 w-4" />{label}</button>
          ))}
        </div>

        {/* steps */}
        <ol className="relative space-y-3">
          <span className="absolute bottom-6 right-[27px] top-6 hidden w-px bg-[#d6e4df] sm:block" />
          {steps.map((s, i) => {
            const open = openStep === i;
            return (
              <li key={s.title} className="relative sm:pr-16">
                <span className="absolute right-0 top-5 hidden h-[54px] w-[54px] place-items-center rounded-2xl text-lg font-bold text-white shadow-md sm:grid" style={{ background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DEEP})` }}>{i + 1}</span>
                <div className={`overflow-hidden rounded-[24px] border bg-white transition ${open ? 'shadow-[0_16px_40px_rgba(13,60,52,.09)]' : ''}`} style={{ borderColor: open ? '#bfe3da' : '#e5ece9' }}>
                  <button type="button" onClick={() => setOpenStep(open ? -1 : i)} className="flex w-full items-center gap-3.5 p-4 text-right sm:p-5" aria-expanded={open}>
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl" style={{ background: TEAL_SOFT, color: TEAL }}><s.icon className="h-5 w-5" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="text-[11px] font-bold text-[#9aaaa4] sm:hidden">هەنگاوی {i + 1}</span>
                      <span className="block text-[15px] font-bold text-[#111d1a]">{s.title}</span>
                    </span>
                    <ChevronDown className={`h-5 w-5 shrink-0 text-[#9aaaa4] transition ${open ? 'rotate-180' : ''}`} />
                  </button>
                  {open && (
                    <div className="border-t px-4 pb-5 pt-4 sm:px-5" style={{ borderColor: '#eef3f1' }}>
                      <p className="text-[13px] font-medium leading-8 text-[#4a5b55]">{s.body}</p>
                      <ul className="mt-3 space-y-2">
                        {s.details.map(d => (
                          <li key={d} className="flex items-start gap-2.5 text-[13px] leading-7 text-[#33433e]">
                            <span className="mt-1.5 grid h-5 w-5 shrink-0 place-items-center rounded-full" style={{ background: TEAL_SOFT, color: TEAL_DEEP }}><Check className="h-3 w-3" strokeWidth={3} /></span>{d}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-[#fff8e6] p-3.5 text-[12px] font-medium leading-7 text-[#7a5a00]"><Lightbulb className="mt-0.5 h-4 w-4 shrink-0" />{s.tip}</div>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        {/* live plan prices (real data) */}
        {plans.length > 0 && (
          <section>
            <div className="mb-4 flex items-end justify-between gap-3">
              <div><h2 className="text-lg font-bold">نرخی پلانەکان</h2><p className="mt-1 text-xs font-medium text-[#7b8e88]">کڕینێکی یەکجارە، بێ تێچووی مانگانە</p></div>
              <button type="button" onClick={() => onNavigate?.('plans')} className="rounded-full bg-white px-4 py-2 text-xs font-bold text-[#0d5c50] shadow-sm ring-1 ring-[#e5ece9] active:scale-95">بەراوردی تەواو</button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {plans.map(p => { const Icon = p.icon; return (
                <div key={p.id} className="rounded-[24px] border border-[#e5ece9] bg-white p-5">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl" style={{ background: p.price > 0 ? p.color.accent : TEAL_SOFT, color: p.price > 0 ? getContrastColor(p.color.accent) : TEAL_DEEP }}><Icon className="h-5 w-5" /></span>
                  <h3 className="mt-3 text-[15px] font-bold">{p.name}</h3>
                  <div className="mt-1 text-[22px] font-bold" dir="ltr" style={{ textAlign: 'right' }}>{p.price === 0 ? 'بێ بەرامبەر' : `${p.price.toLocaleString()} IQD`}</div>
                  <div className="mt-3 space-y-1.5 text-[12px] font-medium text-[#4a5b55]">
                    <div className="flex items-center gap-2"><Zap className="h-3.5 w-3.5" style={{ color: TEAL }} />{formatCredits(p.credits)} کرێدیت</div>
                    <div className="flex items-center gap-2"><Rocket className="h-3.5 w-3.5" style={{ color: TEAL }} />{p.boost > 0 ? `${p.boost} ڕۆژ بەرزکردنەوە` : 'بێ بەرزکردنەوە'}</div>
                  </div>
                </div>); })}
            </div>
          </section>
        )}

        {/* faq */}
        <section>
          <h2 className="mb-4 text-lg font-bold">پرسیارە باوەکان</h2>
          <div className="divide-y divide-[#eef3f1] overflow-hidden rounded-[24px] border border-[#e5ece9] bg-white">
            {FAQ.map(([q, a], i) => (
              <div key={q}>
                <button type="button" onClick={() => setOpenFaq(openFaq === i ? -1 : i)} className="flex w-full items-center justify-between gap-3 p-4 text-right text-[14px] font-bold sm:p-5" aria-expanded={openFaq === i}>{q}<ChevronDown className={`h-4 w-4 shrink-0 text-[#9aaaa4] transition ${openFaq === i ? 'rotate-180' : ''}`} /></button>
                {openFaq === i && <p className="px-4 pb-5 text-[13px] font-medium leading-8 text-[#60706c] sm:px-5">{a}</p>}
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col items-start justify-between gap-4 rounded-[28px] p-6 text-white sm:flex-row sm:items-center" style={{ background: GRAD }}>
          <div><h2 className="text-lg font-bold">هێشتا پرسیارت هەیە؟</h2><p className="mt-1 text-[13px] text-white/75">نامەیەکمان بۆ بنێرە، یارمەتیت دەدەین.</p></div>
          <button type="button" onClick={() => onNavigate?.('contact')} className="flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-bold text-[#0d5c50] active:scale-95"><Mail className="h-4 w-4" />پەیوەندیمان پێوە بکە</button>
        </section>
      </div>
    </div>
  );
};
