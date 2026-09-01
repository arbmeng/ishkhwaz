import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { ArrowRight, LogIn, Search, Send, ShieldCheck, MessageCircle, Briefcase, Users, PlusCircle, Wallet, BadgeCheck } from 'lucide-react';

// Shared light theme — matches DesktopHeaderNav, UserProfilePage, Dashboard.
const NK = "'Noto Kufi Arabic', 'Vazirmatn', system-ui, sans-serif";
const TEAL = '#12796b';
const TEAL_DEEP = '#0d5c50';
const TEAL_SOFT = '#e7f4f1';

export const HowItWorksPage = ({ onBack }) => {
  const { user } = useAuth();
  const isEmployer = user?.role === 'employer' || user?.role === 'owner' || user?.role === 'admin';

  const steps = [
    {
      icon: LogIn,
      title: 'چوونەژوورەوە یان تۆمارکردن',
      body: 'بە ژمارەی مۆبایل یان هەژماری گووگڵ/فەیسبووک بچۆرەژوورەوە. یەکەم جار، جۆری هەژمارەکەت هەڵبژێرە — کارخواز (بۆ گەڕان بەدوای کار) یان خاوەنکار (بۆ بڵاوکردنەوەی کار) — چونکە هەموو ڕووکارەکە بەپێی ئەم هەڵبژاردنە دەگۆڕدرێت.',
    },
    isEmployer ? {
      icon: PlusCircle,
      title: 'بڵاوکردنەوەی هەلی کار',
      body: 'لە بەشی «داشبۆرد»، دوگمەی «بڵاوکردنەوەی کار» بکەرەوە، وردەکاری کارەکە پڕبکەرەوە (ناونیشان، پۆل، شوێن، مووچە) و بڵاوی بکەرەوە. کارەکە دەستبەجێ بۆ هەموو کارخوازان دەردەکەوێت.',
    } : {
      icon: Search,
      title: 'گەڕان بەدوای هەلی کار',
      body: 'لە بەشی «ماڵەوە» یان «گەڕان»، بەپێی پارێزگا، قەزا و ناحیە یان بەپێی پیشە فیلتەری هەلی کارەکان بکە. هەر کارێکت بەدڵ بوو، کلیکی لەسەر بکە بۆ بینینی وردەکاری تەواو.',
    },
    isEmployer ? {
      icon: Users,
      title: 'گەڕان لەناو کارخوازاندا',
      body: 'سەرەڕای چاوەڕوانی داواکاری، دەتوانیت خۆت بچیت بۆ بەشی «کارخوازان» و پرۆفایلی کاندیدەکان ببینیت، دواتر داواکارییەکی ڕاستەوخۆ بۆیان بنێریت (Send Invitation) بەبێ ئەوەی چاوەڕێی بکەن.',
    } : {
      icon: Send,
      title: 'ناردنی سیڤی',
      body: 'لە پەڕەی وردەکاری کار، دوگمەی «ناردنی سیڤی» بکەرەوە. پرۆفایلەکەت وەک CV دەنێردرێت، یان دەتوانیت CV ی تایبەت لە بەشی «کارنامەکان» دروستی بکەیت و بەکاری بهێنیت.',
    },
    !isEmployer && {
      icon: Wallet,
      title: 'پشتڕاستکردنەوەی پارەدان',
      body: 'ناردنی هەر سیڤیەک کۆمیسیۆنێکی بچووکی پێویستە. وەسڵی پارەدانەکەت (FastPay/FIB) باربکە، ئەدمین لەماوەیەکی کەمدا پشکنینی دەکات، پاشان CV ەکەت ڕاستەوخۆ بۆ کۆمپانیاکە دەنێردرێت.',
    },
    {
      icon: BadgeCheck,
      title: 'پەسەندکردن و چاوپێکەوتن',
      body: isEmployer
        ? 'داواکارییە وەرگیراوەکان لە «داشبۆرد»دا دەبینیت — CV ببینە، پەسەندی بکە یان ڕەتی بکەرەوە. دوای پەسەندکردن، ڕاستەوخۆ پەیوەندی بە کاندیدەکەوە بکە.'
        : 'دوای پەسەندکردنی کۆمپانیا، ئاگادارکردنەوەیەکت پێدەگات. لە «داشبۆرد»ی خۆتدا باری هەموو داواکارییەکانت — نێردراو یان وەرگیراو — بەردەستە.',
    },
    {
      icon: MessageCircle,
      title: 'پەیوەندی و بەدواداچوون',
      body: 'ڕاستەوخۆ لەناو ئەپەکەدا پەیام بنێرە، بێ پێویستی بە هیچ ئەپێکی تر. هەموو گفتوگۆیەکان تایبەت و پارێزراون بۆ هەردوو لایەن.',
    },
  ].filter(Boolean);

  return (
    <div dir="rtl" className="min-h-screen pb-16" style={{ background: '#f4f7f6', fontFamily: NK }}>
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#e8eeed] px-4 sm:px-8 py-4 flex items-center gap-3"
        style={{ paddingTop: 'max(16px, calc(env(safe-area-inset-top) + 8px))' }}>
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-2xl bg-white border border-[#e8eeed] flex items-center justify-center text-[#111d1a] shrink-0 active:scale-90 transition-transform shadow-2xs"
        >
          <ArrowRight className="w-5 h-5" />
        </button>
        <h1 className="text-base font-black text-[#111d1a]">چۆنیەتی کارکردنی ئیش خواز</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-8 pt-8 space-y-8">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto" style={{ background: TEAL_SOFT, color: TEAL }}>
            <Briefcase className="w-7 h-7" />
          </div>
          <p className="text-sm text-[#4a5854] leading-relaxed px-4">
            ڕێنماییەکی تەواو بۆ چوونەژوورەوە و بەکارهێنانی سیستەم — لە تۆمارکردنەوە تا وەرگرتنی کار.
          </p>
        </div>

        <div className="space-y-4">
          {steps.map((s, i) => (
            <div key={i} className="p-5 rounded-2xl bg-white border border-[#e8eeec] shadow-2xs flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black shrink-0" style={{ background: TEAL_SOFT, color: TEAL_DEEP }}>
                <s.icon className="w-5 h-5" />
              </div>
              <div className="text-right flex-1">
                <div className="flex items-center gap-2 justify-end">
                  <h3 className="text-sm font-black text-[#111d1a]">{s.title}</h3>
                  <span className="text-[10px] font-mono font-bold text-[#a0afa9]">{String(i + 1).padStart(2, '0')}</span>
                </div>
                <p className="text-xs text-[#7b8e88] mt-1.5 leading-relaxed">{s.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="p-5 rounded-2xl flex items-start gap-3" style={{ background: TEAL_SOFT }}>
          <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" style={{ color: TEAL_DEEP }} />
          <p className="text-xs leading-relaxed" style={{ color: TEAL_DEEP }}>
            هەموو پارەدانێک لەلایەن ئەدمینەوە بە دەستی پشکنین دەکرێت پێش ئەوەی هیچ زانیارییەک بگوازرێتەوە — هیچ کات ژمارەی کارتی بانکیت داوا ناکرێت لەناو ئەپەکەدا.
          </p>
        </div>
      </div>
    </div>
  );
};
