import React, { useEffect, useRef, useState, Suspense } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api';
import { soundService } from '../../services/soundService';
import { exportNodeToPdf, safeFilename } from '../../services/karnamaPdf';
import { TEMPLATE_LIST } from '../../cvTemplates/registry';
import { ArrowRight, CheckCircle2, Download, Eye, Crown, Sparkles, Check } from 'lucide-react';

const NK = "'Noto Kufi Arabic', 'Vazirmatn', system-ui, sans-serif";
const TEAL = '#12796b';

export const KarnamaTemplatePicker = ({ baseResume, onBack, onDone }) => {
  const { token } = useAuth();
  const [filterType, setFilterType] = useState('all'); // all | free | paid
  const [selectedId, setSelectedId] = useState('FreeExecutiveLine');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const previewRef = useRef(null);

  // Filter list
  const templates = [
    {
      id: 'FreeExecutiveLine',
      name: 'ئەدیتۆریال',
      isFree: true,
      priceText: 'بەخۆڕایی',
      preview: 'linear-gradient(180deg, #12796b 0%, #0d5c50 15%, #ffffff 15%)',
    },
    {
      id: 'FreeModernMinimal',
      name: 'دوو ستوونی',
      isFree: true,
      priceText: 'بەخۆڕایی',
      preview: 'linear-gradient(90deg, #f0f4f2 0%, #f0f4f2 35%, #ffffff 35%)',
    },
    {
      id: 'ProBronzeRibbon',
      name: 'پریمیەم زێڕین',
      isFree: false,
      isVip: true,
      priceText: '7,000 IQD',
      preview: 'linear-gradient(180deg, #d4af37 0%, #aa820a 20%, #ffffff 20%)',
    },
    {
      id: 'FreeCleanATS',
      name: 'کۆمپاکت',
      isFree: false,
      priceText: '5,000 IQD',
      preview: 'linear-gradient(180deg, #111d1a 0%, #334155 12%, #ffffff 12%)',
    },
  ];

  const filteredTemplates = templates.filter(t => {
    if (filterType === 'free') return t.isFree;
    if (filterType === 'paid') return !t.isFree;
    return true;
  });

  const selectedTemplate = templates.find(t => t.id === selectedId) || templates[0];

  const handleDownload = async () => {
    soundService.playTick?.();
    setBusy(true);
    try {
      if (onDone) {
        onDone(selectedTemplate);
      }
    } catch (e) {}
    setBusy(false);
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen select-none"
      style={{
        background: '#f4f7f6',
        fontFamily: NK,
        paddingBottom: 'calc(7rem + env(safe-area-inset-bottom))',
      }}
    >
      <div
        className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 space-y-6"
        style={{
          paddingTop: 'max(16px, calc(env(safe-area-inset-top) + 12px))',
        }}
      >

        {/* ── Top Header Navigation ────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-10 h-10 rounded-2xl bg-white border border-[#e8eeed] flex items-center justify-center text-[#111d1a] shadow-2xs hover:bg-[#f8faf9] active:scale-95 transition"
              aria-label="گەڕانەوە"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
            <span className="text-xs font-bold text-[#7b8e88]">
              قۆناغی ١ لە ٦
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#7b8e88]">
              بە هێزکراوی ئیش خواز
            </span>
            <span className="text-sm font-black text-[#111d1a]">
              کارنامە
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#12796b] text-white flex items-center justify-center font-black text-xs">
              ک
            </div>
          </div>
        </div>

        {/* ── Title & Intro ────────────────────────────────────── */}
        <div className="text-center space-y-1 pt-2">
          <h1 className="text-2xl sm:text-3xl font-black text-[#111d1a] tracking-tight">
            شێوازی کارنامەکەت هەڵبژێرە
          </h1>
          <p className="text-xs text-[#7b8e88] font-bold">
            هەموو شێوازەکان بە کوردی و ڕاست بۆ چەپ. دەتوانیت دواتر بگۆڕیت.
          </p>
        </div>

        {/* ── Filter Chips Row ─────────────────────────────────── */}
        <div className="flex items-center justify-center gap-2 pt-2">
          {[
            { id: 'all', label: 'هەموو' },
            { id: 'free', label: 'بەخۆڕایی' },
            { id: 'paid', label: 'بارمەدان' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => {
                soundService.playTick?.();
                setFilterType(f.id);
              }}
              className={`px-5 py-2 rounded-2xl text-xs font-black transition-all active:scale-95 ${
                filterType === f.id
                  ? 'bg-[#111d1a] text-white shadow-xs'
                  : 'bg-white text-[#62736e] border border-[#e8eeed] hover:border-[#12796b]/40'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* ── 4-Column Template Grid (Matching Image 2) ────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
          {filteredTemplates.map(t => {
            const isSelected = selectedId === t.id;

            return (
              <div
                key={t.id}
                onClick={() => {
                  soundService.playTick?.();
                  setSelectedId(t.id);
                }}
                className={`bg-white rounded-[28px] border-2 p-3 pb-4 transition-all duration-200 cursor-pointer flex flex-col justify-between group ${
                  isSelected
                    ? 'border-[#12796b] shadow-[0_4px_24px_rgba(18,121,107,0.12)]'
                    : 'border-[#e8eeec] hover:border-[#cbd5d1] shadow-2xs'
                }`}
              >
                {/* Visual Preview Box */}
                <div
                  className="w-full h-72 rounded-[22px] border border-[#e8eeed] relative overflow-hidden bg-white shadow-inner flex flex-col p-4 space-y-2.5"
                >
                  {/* Badge top left */}
                  {t.isVip && (
                    <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-[#12796b] text-white text-[9px] font-black flex items-center gap-1 shadow-2xs">
                      <Crown className="w-2.5 h-2.5" /> VIP
                    </span>
                  )}
                  {!t.isFree && !t.isVip && (
                    <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-[#111d1a] text-white text-[9px] font-black">
                      پارەدان
                    </span>
                  )}

                  {/* Mock CV wireframe elements */}
                  <div className="h-4 w-3/4 rounded-md" style={{ background: t.isFree ? '#12796b' : '#334155' }} />
                  <div className="h-2 w-1/2 rounded bg-[#e2e8e5]" />
                  <div className="h-px w-full bg-[#e8eeed] my-2" />
                  <div className="space-y-1.5 pt-1">
                    <div className="h-2 w-full rounded bg-[#f0f4f2]" />
                    <div className="h-2 w-5/6 rounded bg-[#f0f4f2]" />
                    <div className="h-2 w-4/6 rounded bg-[#f0f4f2]" />
                  </div>
                </div>

                {/* Card Title & Pricing */}
                <div className="pt-3.5 px-2 flex items-center justify-between">
                  <div className="text-right">
                    <h4 className="text-sm font-black text-[#111d1a]">{t.name}</h4>
                    <p className="text-[11px] text-[#7b8e88] font-bold mt-0.5">{t.priceText}</p>
                  </div>

                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-[#12796b] text-white flex items-center justify-center text-xs font-black shadow-2xs">
                      ✓
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Bottom Floating Bar (Matching Image 2) ──────────── */}
        <div className="fixed inset-x-0 bottom-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#e8eeec] px-4 sm:px-8 py-3.5 shadow-lg">
          <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-4">
            
            {/* Left Action Buttons in RTL */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                className="px-4 py-3 rounded-2xl bg-white border border-[#e8eeed] text-[#4a5854] text-xs font-black hover:bg-[#f8faf9] active:scale-95 transition flex items-center gap-1.5"
              >
                <Eye className="w-4 h-4" />
                <span>پێشبینین</span>
              </button>

              <button
                type="button"
                onClick={handleDownload}
                disabled={busy}
                className="px-6 py-3 rounded-2xl bg-[#12796b] hover:bg-[#0d5c50] text-white text-xs font-black shadow-[0_4px_14px_rgba(18,121,107,0.3)] active:scale-95 transition flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>دروستکردن و داگرتن</span>
              </button>
            </div>

            {/* Right Status Text in RTL */}
            <div className="text-right text-xs font-bold text-[#7b8e88]">
              <span>شێوازی هەڵبژێردراو: </span>
              <strong className="text-[#111d1a] font-black">{selectedTemplate.name}</strong>
              <span> — </span>
              <span className="text-[#12796b]">{selectedTemplate.priceText}</span>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
