import React from 'react';
import { X, Briefcase, Mail, Globe, ShieldCheck } from 'lucide-react';

// Shared light theme — matches DesktopHeaderNav, UserProfilePage, Dashboard.
const NK = "'Noto Kufi Arabic', 'Vazirmatn', system-ui, sans-serif";
const TEAL = '#12796b';
const TEAL_SOFT = '#e7f4f1';

// Real contact info only — info@ishkhwaz.iq is the address already used as
// the placeholder/example everywhere else in the app (CV templates, forms).
// No phone/social handles here since none exist anywhere else in the app —
// don't invent ones later without checking first.
export const AboutModal = ({ onClose }) => {
  return (
    <div dir="rtl" className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-fadeIn" style={{ fontFamily: NK }}>
      <div className="relative w-full max-w-md bg-white border border-[#e8eeec] rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6 my-auto max-h-[90vh] overflow-y-auto text-right">

        <button
          onClick={onClose}
          className="absolute top-5 left-5 p-2 rounded-xl bg-[#f4f7f6] border border-[#e8eeed] text-[#7b8e88] hover:text-[#111d1a] transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto text-white font-black text-xl" style={{ background: TEAL }}>
            ئ
          </div>
          <h2 className="text-xl font-black text-[#111d1a]">ئیش خواز</h2>
          <p className="text-xs text-[#7b8e88]">پلاتفۆرمی کار و دۆزینەوەی ئیش لە عێراق</p>
        </div>

        <p className="text-xs text-[#4a5854] leading-relaxed text-center px-2">
          بەیەکگەیاندنی ڕاستەوخۆ و شەفافی خاوەنکاران و کارخوازان لە چەمچەماڵ، هەولێر، سلێمانی، دهۆک و سەرانسەری عێراق.
        </p>

        <div className="space-y-2.5">
          <div className="p-4 rounded-2xl bg-[#f8faf9] border border-[#e8eeec] flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: TEAL_SOFT, color: TEAL }}>
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-[#7b8e88]">پەیوەندی و پشتگیری</div>
              <a href="mailto:info@ishkhwaz.iq" className="text-xs font-black" style={{ color: TEAL }} dir="ltr">info@ishkhwaz.iq</a>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#f8faf9] border border-[#e8eeec] flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: TEAL_SOFT, color: TEAL }}>
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-[#7b8e88]">ماڵپەڕ</div>
              <a href="https://ishkhwaz.zeraworld.com" target="_blank" rel="noopener noreferrer" className="text-xs font-black" style={{ color: TEAL }} dir="ltr">ishkhwaz.zeraworld.com</a>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#f8faf9] border border-[#e8eeec] flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: TEAL_SOFT, color: TEAL }}>
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-[#7b8e88]">وەشان</div>
              <span className="text-xs font-black text-[#111d1a] font-mono" dir="ltr">v2.5.0</span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3.5 px-4 rounded-xl text-white font-extrabold text-xs transition"
          style={{ background: TEAL }}
        >
          داخستن
        </button>

      </div>
    </div>
  );
};
