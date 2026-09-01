import React, { useRef, useState, Suspense } from 'react';
import { useStore } from '../../context/StoreContext';
import { soundService } from '../../services/soundService';
import { exportNodeToPdf, safeFilename } from '../../services/karnamaPdf';
import { TEMPLATE_LIST } from '../../cvTemplates/registry';
import { ArrowRight, Download, Eye, Crown, X, Loader2 } from 'lucide-react';

const NK = "'Noto Kufi Arabic', 'Vazirmatn', system-ui, sans-serif";
const TEAL = '#12796b';

// Real A4 template dimensions (see cvTemplates/*.jsx — every one renders at
// this fixed pixel size so the PDF export screenshots it 1:1). Thumbnails
// scale that same live component down instead of faking a wireframe.
const A4_W = 794;
const A4_H = 1123;
const THUMB_SCALE = 0.24;

const TemplateFallback = () => (
  <div className="w-full h-full flex items-center justify-center">
    <Loader2 className="w-5 h-5 animate-spin text-stone-300" />
  </div>
);

// One real template, scaled down and clipped to a thumbnail box — the
// actual resume data renders here, with each template's own graceful
// placeholder text for any field the user hasn't filled in yet (see
// cvTemplates/shared/placeholderText.js), never a fabricated wireframe.
const LiveThumbnail = ({ template, resume }) => {
  const Comp = template.component;
  return (
    <div className="w-full h-72 rounded-[22px] border border-[#e8eeed] relative overflow-hidden bg-white shadow-inner flex items-center justify-center">
      <div style={{ width: A4_W * THUMB_SCALE, height: A4_H * THUMB_SCALE, overflow: 'hidden' }}>
        <div style={{ width: A4_W, height: A4_H, transform: `scale(${THUMB_SCALE})`, transformOrigin: 'top right' }}>
          <Suspense fallback={<TemplateFallback />}>
            <Comp resume={{ ...resume, accentColor: template.accentColorDefault }} />
          </Suspense>
        </div>
      </div>
      {template.isPremium && (
        <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-[#12796b] text-white text-[9px] font-black flex items-center gap-1 shadow-2xs">
          <Crown className="w-2.5 h-2.5" /> پارەدان
        </span>
      )}
    </div>
  );
};

export const KarnamaTemplatePicker = ({ baseResume, onBack, onDone }) => {
  const { addToast } = useStore();
  const [filterType, setFilterType] = useState('all'); // all | free | paid
  const [selectedId, setSelectedId] = useState(TEMPLATE_LIST[0].id);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const previewRef = useRef(null);

  const filteredTemplates = TEMPLATE_LIST.filter(t => {
    if (filterType === 'free') return !t.isPremium;
    if (filterType === 'paid') return t.isPremium;
    return true;
  });

  const selectedTemplate = TEMPLATE_LIST.find(t => t.id === selectedId) || TEMPLATE_LIST[0];
  const SelectedComp = selectedTemplate.component;
  const selectedResume = { ...baseResume, accentColor: selectedTemplate.accentColorDefault };

  // Real client-side export — screenshots the live, full-size template DOM
  // (see services/karnamaPdf.js) into a real multi-page PDF. Premium
  // templates aren't wired to a purchase flow yet, so downloading one is
  // honestly blocked with a real message instead of either giving it away
  // free or silently doing nothing.
  const handleDownload = async () => {
    soundService.playTick?.();
    if (selectedTemplate.isPremium) {
      addToast?.({ title: 'پێویستە بیکڕیت', message: 'ئەم دیزاینە پارەدانە — تایبەتمەندی کڕینی هێشتا چالاک نییە.', type: 'info' });
      return;
    }
    if (!previewRef.current) {
      addToast?.({ title: 'چاوەڕوان بە', message: 'تکایە دووبارە هەوڵبدەرەوە.', type: 'info' });
      return;
    }
    setBusy(true);
    try {
      await exportNodeToPdf(previewRef.current, `${safeFilename(baseResume?.name)}.pdf`);
      addToast?.({ title: 'داگیرا ✓', message: 'سیڤیەکەت بە سەرکەوتوویی داگیرا.', type: 'success' });
      onDone?.(selectedTemplate);
    } catch (e) {
      addToast?.({ title: 'سەرنەکەوت', message: 'دروستکردنی PDF سەرکەوتوو نەبوو، دووبارە هەوڵبدەرەوە.', type: 'error' });
    }
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

        {/* ── Template Grid — every card is the real component, real data ── */}
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
                <LiveThumbnail template={t} resume={baseResume} />

                <div className="pt-3.5 px-2 flex items-center justify-between">
                  <div className="text-right">
                    <h4 className="text-sm font-black text-[#111d1a]">{t.name}</h4>
                    <p className="text-[11px] text-[#7b8e88] font-bold mt-0.5">{t.isPremium ? 'پارەدان' : 'بەخۆڕایی'}</p>
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

        {/* ── Bottom Floating Bar ──────────────────────────────── */}
        <div className="fixed inset-x-0 bottom-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#e8eeec] px-4 sm:px-8 py-3.5 shadow-lg">
          <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-4">

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => { soundService.playTick?.(); setPreviewOpen(true); }}
                className="px-4 py-3 rounded-2xl bg-white border border-[#e8eeed] text-[#4a5854] text-xs font-black hover:bg-[#f8faf9] active:scale-95 transition flex items-center gap-1.5"
              >
                <Eye className="w-4 h-4" />
                <span>پێشبینین</span>
              </button>

              <button
                type="button"
                onClick={handleDownload}
                disabled={busy}
                className="px-6 py-3 rounded-2xl bg-[#12796b] hover:bg-[#0d5c50] text-white text-xs font-black shadow-[0_4px_14px_rgba(18,121,107,0.3)] active:scale-95 transition flex items-center gap-2 disabled:opacity-60"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span>{busy ? 'دروستکردن...' : 'دروستکردن و داگرتن'}</span>
              </button>
            </div>

            <div className="text-right text-xs font-bold text-[#7b8e88]">
              <span>شێوازی هەڵبژێردراو: </span>
              <strong className="text-[#111d1a] font-black">{selectedTemplate.name}</strong>
              <span> — </span>
              <span className="text-[#12796b]">{selectedTemplate.isPremium ? 'پارەدان' : 'بەخۆڕایی'}</span>
            </div>

          </div>
        </div>

        {/* ── Full-size real preview — the same live component that's about
             to be exported, not a mock. Purely visual; the node handleDownload
             actually screenshots is the always-mounted offscreen copy below,
             so downloading never depends on the preview modal being open. ── */}
        {previewOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col items-center overflow-y-auto py-8 px-4" onClick={() => setPreviewOpen(false)}>
            <button
              onClick={() => setPreviewOpen(false)}
              className="fixed top-4 left-4 w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-lg active:scale-95 transition z-10"
              aria-label="داخستن"
            >
              <X className="w-5 h-5 text-[#111d1a]" />
            </button>
            <div
              onClick={e => e.stopPropagation()}
              className="shadow-2xl"
              style={{ width: A4_W, transform: 'scale(0.9)', transformOrigin: 'top center' }}
            >
              <Suspense fallback={<div style={{ width: A4_W, height: A4_H }} className="bg-white flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-stone-300" /></div>}>
                <SelectedComp resume={selectedResume} />
              </Suspense>
            </div>
          </div>
        )}

        {/* Offscreen full-size render of whatever's selected — always mounted
            so handleDownload can screenshot it immediately, with no dependency
            on the preview modal ever having been opened. */}
        <div style={{ position: 'fixed', top: 0, left: -9999, pointerEvents: 'none' }} aria-hidden="true">
          <div ref={previewRef}>
            <Suspense fallback={null}>
              <SelectedComp resume={selectedResume} />
            </Suspense>
          </div>
        </div>

      </div>
    </div>
  );
};
