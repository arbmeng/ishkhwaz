import React from 'react';
import { ArrowRight, Briefcase, Building2, MapPin, MessageSquareText, ShieldCheck, FileText, Search } from 'lucide-react';

const NK = "'IBM Plex Sans Arabic','Noto Kufi Arabic','Vazirmatn',system-ui,sans-serif";
const GRAD = 'linear-gradient(155deg,#12897a 0%,#0d6a5d 48%,#083f37 100%)';

const VALUES = [
  { icon: Briefcase, title: 'بۆ کارخوازان', text: 'هەلی کاری گونجاو بدۆزەرەوە، CV ی پیشەیی دروست بکە و بە چەند هەنگاوێک داواکاری بنێرە.' },
  { icon: Building2, title: 'بۆ کۆمپانیاکان', text: 'کار بڵاوبکەرەوە، پڕۆفایلی کارخوازان ببینە و کاندیدی گونجاو بە خێرایی بدۆزەرەوە.' },
  { icon: ShieldCheck, title: 'شەفاف و ڕاستەوخۆ', text: 'بەیەکگەیاندنی ڕاستەوخۆی خاوەنکار و کارخواز، بێ ناوەندگیر و بە پرۆسەیەکی ڕوون.' },
];

const POINTS = [
  { icon: Search, text: 'گەڕانی ورد بەپێی شار، قەزا و جۆری کار' },
  { icon: FileText, text: 'دروستکردن و ناردنی CV لە یەک شوێن' },
  { icon: MessageSquareText, text: 'پەیوەندی نێوان کۆمپانیا و کارخواز' },
  { icon: MapPin, text: 'سلێمانی، هەولێر، دهۆک، هەڵەبجە و کەرکووک' },
];

export const AboutPage = ({ onBack, onNavigate }) => (
  <div dir="rtl" className="min-h-screen bg-[#f4f7f6] text-right text-[#111d1a]" style={{ fontFamily: NK }}>
    <section className="relative overflow-hidden text-white" style={{ background: GRAD }}>
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#43d1b8]/25 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 opacity-[.07]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.9) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.9) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
      <div className="relative mx-auto max-w-5xl px-4 pb-12 sm:px-6 sm:pb-20" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
        {/* phones: the back button lives inside the green card; on PC the site header is enough */}
        <button type="button" onClick={onBack} aria-label="گەڕانەوە" className="mb-6 grid h-11 w-11 place-items-center rounded-2xl bg-white/15 backdrop-blur active:scale-95 lg:hidden"><ArrowRight className="h-5 w-5" /></button>
        <div className="mb-5 grid h-14 w-14 place-items-center overflow-hidden rounded-2xl bg-white shadow-lg"><img src="/logo-flat.png" alt="" className="h-10 w-auto" /></div>
        <h1 className="max-w-2xl text-[30px] font-bold leading-[1.5] sm:text-[44px]">پلاتفۆرمی کار و دۆزینەوەی ئیش لە کوردستان</h1>
        <p className="mt-4 max-w-2xl text-[14px] leading-8 text-white/75 sm:text-[16px]">
          ئیش خواز بۆ بەیەکگەیاندنی ڕاستەوخۆ و شەفافی خاوەنکاران و کارخوازانە لە چەمچەماڵ، هەولێر، سلێمانی، دهۆک و سەرانسەری عێراق.
        </p>
      </div>
    </section>

    <main className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 sm:py-12">
      <div className="grid gap-3 md:grid-cols-3">
        {VALUES.map(({ icon: Icon, title, text }) => (
          <article key={title} className="rounded-[24px] border border-[#e5ece9] bg-white p-5 shadow-[0_6px_24px_rgba(13,60,52,.04)]">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#e7f4f1] text-[#12796b]"><Icon className="h-5 w-5" /></span>
            <h2 className="mt-4 text-base font-bold">{title}</h2>
            <p className="mt-2 text-[13px] leading-7 text-[#60706c]">{text}</p>
          </article>
        ))}
      </div>

      <section className="rounded-[28px] border border-[#e5ece9] bg-white p-5 sm:p-8">
        <h2 className="text-lg font-bold">لە ئیش خوازدا دەتوانیت...</h2>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {POINTS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 rounded-2xl bg-[#f6f9f8] p-3.5 text-[13px] font-medium">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-[#12796b] shadow-sm"><Icon className="h-4 w-4" /></span>{text}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col items-start justify-between gap-4 rounded-[28px] p-6 text-white sm:flex-row sm:items-center sm:p-8" style={{ background: GRAD }}>
        <div>
          <h2 className="text-xl font-bold">پرسیارت هەیە؟</h2>
          <p className="mt-1 text-[13px] text-white/75">تیمی ئیش خواز ئامادەیە یارمەتیت بدات.</p>
        </div>
        <button type="button" onClick={() => onNavigate?.('contact')} className="rounded-full bg-white px-7 py-3.5 text-sm font-bold text-[#0d5c50] shadow-lg transition active:scale-95">پەیوەندیمان پێوە بکە</button>
      </section>
    </main>
  </div>
);
