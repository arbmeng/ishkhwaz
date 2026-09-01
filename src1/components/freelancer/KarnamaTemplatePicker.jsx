import React, { useState, Suspense } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { apiService } from '../../services/api';
import { soundService } from '../../services/soundService';
import { TEMPLATE_LIST } from '../../cvTemplates/registry';
import { ArrowRight, Check, Eye, Crown, X, Loader2, Lock } from 'lucide-react';

const NK = "'Noto Kufi Arabic', 'Vazirmatn', system-ui, sans-serif";
const TEAL = '#12796b';

// Real A4 template dimensions (see cvTemplates/*.jsx — every one renders at
// this fixed pixel size so the Resumes page's PDF export screenshots it
// 1:1). Thumbnails scale that same live component down instead of faking a
// wireframe.
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
const LiveThumbnail = ({ template, resume, locked }) => {
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
      {locked && (
        <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center">
          <div className="w-9 h-9 rounded-full bg-[#111d1a] text-white flex items-center justify-center shadow-lg">
            <Lock className="w-4 h-4" />
          </div>
        </div>
      )}
    </div>
  );
};

export const KarnamaTemplatePicker = ({ baseResume, onBack, onDone }) => {
  const { token, user } = useAuth();
  const { addToast, planTiers = [] } = useStore();
  const [filterType, setFilterType] = useState('all'); // all | free | paid
  const [selectedId, setSelectedId] = useState(TEMPLATE_LIST[0].id);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(baseResume?.personalInfo?.jobTitle || '');

  // Real plan check — same price>0 pattern used everywhere else in the app
  // (PlansPage, FreelancerProfileModal, etc.), not a separate fake purchase
  // flow per template.
  const userTier = planTiers.find(t => t.id === user?.plan);
  const hasPaidPlan = !!userTier && Number(userTier.price) > 0;

  const filteredTemplates = TEMPLATE_LIST.filter(t => {
    if (filterType === 'free') return !t.isPremium;
    if (filterType === 'paid') return t.isPremium;
    return true;
  });

  const selectedTemplate = TEMPLATE_LIST.find(t => t.id === selectedId) || TEMPLATE_LIST[0];
  const SelectedComp = selectedTemplate.component;
  const selectedResume = { ...baseResume, accentColor: selectedTemplate.accentColorDefault };
  const selectedLocked = selectedTemplate.isPremium && !hasPaidPlan;

  const pickTemplate = (t) => {
    soundService.playTick?.();
    if (t.isPremium && !hasPaidPlan) {
      addToast?.({ title: 'پێویستە پلانێکی پارەدانت هەبێت', message: 'ئەم دیزاینە تەنها بۆ بەکارهێنەرانی پلانی پرۆ/VIP بەردەستە.', type: 'info' });
      return;
    }
    setSelectedId(t.id);
  };

  // Saves the assembled resume for real — no PDF export here anymore (that
  // now lives on the Resumes page, per each already-saved resume). The
  // server enforces the real per-plan resume limit; a full plan just gets
  // the real error message back, not a fabricated success.
  const handleSelect = async () => {
    soundService.playTick?.();
    if (selectedLocked) {
      addToast?.({ title: 'پێویستە پلانێکی پارەدانت هەبێت', message: 'ئەم دیزاینە تەنها بۆ بەکارهێنەرانی پلانی پرۆ/VIP بەردەستە.', type: 'info' });
      return;
    }
    if (!title.trim()) {
      addToast?.({ title: 'ناونیشان پێویستە', message: 'ناوێک بۆ ئەم سیڤییە بنووسە (بۆ نموونە: سیڤی بواری تەکنیکی).', type: 'warning' });
      return;
    }
    setSaving(true);
    const res = await apiService.createResume({
      title: title.trim(),
      template_id: selectedTemplate.id,
      resume_data: baseResume,
    }, token);
    setSaving(false);

    if (res?.success) {
      addToast?.({ title: 'پاشەکەوتکرا ✓', message: 'سیڤیەکەت زیادکرا بۆ لیستی سیڤیەکانت.', type: 'success' });
      onDone?.(selectedTemplate);
    } else {
      addToast?.({ title: 'سەرنەکەوت', message: res?.message || 'پاشەکەوتکردن سەرکەوتوو نەبوو.', type: 'error' });
    }
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen select-none"
      style={{
        background: '#f4f7f6',
        fontFamily: NK,
        paddingBottom: 'calc(8.5rem + env(safe-area-inset-bottom))',
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
            const locked = t.isPremium && !hasPaidPlan;

            return (
              <div
                key={t.id}
                onClick={() => pickTemplate(t)}
                className={`bg-white rounded-[28px] border-2 p-3 pb-4 transition-all duration-200 cursor-pointer flex flex-col justify-between group ${
                  isSelected
                    ? 'border-[#12796b] shadow-[0_4px_24px_rgba(18,121,107,0.12)]'
                    : 'border-[#e8eeec] hover:border-[#cbd5d1] shadow-2xs'
                }`}
              >
                <LiveThumbnail template={t} resume={baseResume} locked={locked} />

                <div className="pt-3.5 px-2 flex items-center justify-between">
                  <div className="text-right">
                    <h4 className="text-sm font-black text-[#111d1a]">{t.name}</h4>
                    <p className="text-[11px] text-[#7b8e88] font-bold mt-0.5">{t.isPremium ? 'پارەدان — پلانی پرۆ/VIP' : 'بەخۆڕایی'}</p>
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
        <div className="fixed inset-x-0 bottom-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#e8eeec] px-4 sm:px-8 py-3.5 shadow-lg space-y-2.5">
          <div className="max-w-[1400px] mx-auto flex items-center gap-3">
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="ناوی ئەم سیڤییە (بۆ نموونە: سیڤی بواری تەکنیکی)"
              className="flex-1 min-w-0 py-2.5 px-3.5 rounded-xl bg-[#f4f7f6] border border-[#e8eeed] text-xs font-bold text-[#111d1a] outline-none focus:border-[#12796b]"
            />
          </div>
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
                onClick={handleSelect}
                disabled={saving}
                className="px-6 py-3 rounded-2xl bg-[#12796b] hover:bg-[#0d5c50] text-white text-xs font-black shadow-[0_4px_14px_rgba(18,121,107,0.3)] active:scale-95 transition flex items-center gap-2 disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>{saving ? 'پاشەکەوتکردن...' : 'دیاریکردنی ئەم شێوازە'}</span>
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
             to be saved, not a mock. ── */}
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

      </div>
    </div>
  );
};
