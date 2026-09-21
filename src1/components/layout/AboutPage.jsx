import React from 'react';
import { PageHeader } from './PageHeader';
import { Briefcase, Building2, MapPin, MessageSquareText, ShieldCheck, FileText, Search } from 'lucide-react';

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
    <PageHeader title="دەربارەی ئیش خواز" subtitle="پلاتفۆرمی کار و دۆزینەوەی ئیش لە کوردستان" onBack={onBack} />

    <main className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 sm:py-12">
      <p className="max-w-3xl text-[15px] leading-9 text-[#4a5b55]">ئیش خواز بۆ بەیەکگەیاندنی ڕاستەوخۆ و شەفافی خاوەنکاران و کارخوازانە لە چەمچەماڵ، هەولێر، سلێمانی، دهۆک و سەرانسەری عێراق.</p>
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
