import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { apiService } from '../../services/api';
import { soundService } from '../../services/soundService';
import { exportNodeToPdf, safeFilename } from '../../services/karnamaPdf';
import { getTemplate } from '../../cvTemplates/registry';
import { ArrowLeft, Plus, Download, Trash2, FileText, Loader2, Send } from 'lucide-react';

const TEAL = '#12796b';
const TEAL_DEEP = '#0d5c50';
const TEAL_SOFT = '#e7f4f1';
const A4_W = 794;

// Offscreen full-size render of one saved resume, used purely to screenshot
// into a real PDF — same technique as the template picker's own export.
const HiddenExportNode = ({ resume, innerRef }) => {
  const template = getTemplate(resume.template_id);
  const Comp = template.component;
  return (
    <div style={{ position: 'fixed', top: 0, left: -9999, pointerEvents: 'none' }} aria-hidden="true">
      <div ref={innerRef}>
        <Suspense fallback={null}>
          <Comp resume={{ ...resume.resume_data, accentColor: template.accentColorDefault }} />
        </Suspense>
      </div>
    </div>
  );
};

export const ResumesPage = ({ onBack, onCreateNew }) => {
  const { token, user } = useAuth();
  const { addToast, planTiers = [] } = useStore();
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const exportRef = useRef(null);

  const userTier = planTiers.find(t => t.id === user?.plan);
  const maxCvs = userTier ? Number(userTier.max_cvs ?? 1) : 1;
  const atLimit = maxCvs > 0 && resumes.length >= maxCvs;

  const load = async () => {
    setLoading(true);
    const res = await apiService.getResumes(token);
    if (res?.success) setResumes(res.resumes || []);
    setLoading(false);
  };

  useEffect(() => { if (token) load(); }, [token]);

  const handleDelete = async (id) => {
    soundService.playTick?.();
    setDeletingId(id);
    const res = await apiService.deleteResume(id, token);
    setDeletingId(null);
    if (res?.success) {
      setResumes(prev => prev.filter(r => r.id !== id));
      addToast?.({ title: 'سڕایەوە', message: 'سیڤیەکە سڕایەوە.', type: 'info' });
    } else {
      addToast?.({ title: 'سەرنەکەوت', message: res?.message || 'سڕینەوە سەرکەوتوو نەبوو.', type: 'error' });
    }
  };

  const handleDownload = async (resume) => {
    soundService.playTick?.();
    setDownloadingId(resume.id);
    // Let the hidden export node actually mount with this resume's data first.
    await new Promise(r => setTimeout(r, 50));
    try {
      if (!exportRef.current) throw new Error('no node');
      await exportNodeToPdf(exportRef.current, `${safeFilename(resume.title)}.pdf`);
      addToast?.({ title: 'داگیرا ✓', message: 'سیڤیەکەت بە سەرکەوتوویی داگیرا.', type: 'success' });
    } catch (e) {
      addToast?.({ title: 'سەرنەکەوت', message: 'دروستکردنی PDF سەرکەوتوو نەبوو، دووبارە هەوڵبدەرەوە.', type: 'error' });
    }
    setDownloadingId(null);
  };

  const downloadingResume = resumes.find(r => r.id === downloadingId);

  return (
    <div dir="rtl" className="min-h-screen font-vazirmatn" style={{ background: '#f4f7f6', paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' }}>
      <div
        className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-stone-200 px-4 sm:px-6 lg:px-8"
        style={{ paddingTop: 'max(16px, calc(env(safe-area-inset-top) + 12px))', paddingBottom: '14px' }}
      >
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <button onClick={() => { soundService.playTick?.(); onBack?.(); }}
            className="flex items-center gap-1.5 text-xs font-bold text-stone-500 hover:text-stone-900 transition-colors">
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" />گەڕانەوە
          </button>
          <div className="text-center">
            <h1 className="text-sm font-black text-stone-900">سیڤیەکانم</h1>
            <div dir="ltr" className="text-[10px] text-stone-400 font-bold">{resumes.length} / {maxCvs > 0 ? maxCvs : '∞'}</div>
          </div>
          <div className="w-16" />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 space-y-4">

        <button
          type="button"
          onClick={() => {
            soundService.playTick?.();
            if (atLimit) {
              addToast?.({ title: 'گەیشتیت بە سنووری پلانەکەت', message: `پلانەکەت ڕێگە بە ${maxCvs} سیڤی دەدات. سیڤیەکی کۆن بسڕەوە یان پلانەکەت بەرزبکەرەوە.`, type: 'warning' });
              return;
            }
            onCreateNew?.();
          }}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-black text-white active:scale-[0.98] transition"
          style={{ background: atLimit ? '#a8b0ac' : `linear-gradient(135deg,${TEAL},${TEAL_DEEP})` }}
        >
          <Plus className="w-4 h-4" />سیڤیەکی نوێ دروست بکە
        </button>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-stone-300" /></div>
        ) : resumes.length === 0 ? (
          <div className="bg-white rounded-3xl border border-stone-200 py-16 text-center space-y-2">
            <FileText className="w-8 h-8 text-stone-300 mx-auto" />
            <p className="text-sm font-bold text-stone-400">هێشتا هیچ سیڤیەکت دروست نەکردووە.</p>
            <p className="text-xs text-stone-400">دەتوانیت چەند سیڤیەکی جیاواز دروست بکەیت — یەکێک بۆ هەر بواری کارێک — و کاتی ناردنی داواکاری هەڵیبژێریت.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {resumes.map(r => {
              const template = getTemplate(r.template_id);
              return (
                <div key={r.id} className="bg-white rounded-3xl border border-stone-200 p-4 flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: TEAL_SOFT }}>
                    <FileText className="w-5 h-5" style={{ color: TEAL_DEEP }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-black text-stone-900 truncate">{r.title}</h3>
                    <p className="text-[11px] text-stone-400 font-bold truncate">{template.name}</p>
                  </div>
                  <button
                    onClick={() => handleDownload(r)}
                    disabled={downloadingId === r.id}
                    className="w-10 h-10 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-center text-stone-600 active:scale-95 transition shrink-0 disabled:opacity-50"
                    aria-label="داگرتن"
                  >
                    {downloadingId === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleDelete(r.id)}
                    disabled={deletingId === r.id}
                    className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 active:scale-95 transition shrink-0 disabled:opacity-50"
                    aria-label="سڕینەوە"
                  >
                    {deletingId === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-start gap-2.5 p-3.5 rounded-2xl" style={{ background: TEAL_SOFT }}>
          <Send className="w-4 h-4 shrink-0 mt-0.5" style={{ color: TEAL_DEEP }} />
          <p className="text-[11px] font-bold leading-relaxed" style={{ color: TEAL_DEEP }}>
            کاتێک داواکاری بۆ هەلی کارێک دەنێریت، دەتوانیت هەڵبژێریت کام لەم سیڤیانە بنێریت — گونجاوترینیان بۆ ئەو کارە.
          </p>
        </div>
      </div>

      {downloadingResume && <HiddenExportNode resume={downloadingResume} innerRef={exportRef} />}
    </div>
  );
};
