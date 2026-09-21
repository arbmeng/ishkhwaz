import React, { useState, useEffect, useRef } from 'react';
import { PageHeader } from '../layout/PageHeader';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { apiService } from '../../services/api';
import { soundService } from '../../services/soundService';
import { Plus, Trash2, FileText, Loader2, Send, Pencil, Globe, Eye, ExternalLink } from 'lucide-react';

const TEAL = '#641bd9';
const TEAL_DEEP = '#4b13a5';
const TEAL_SOFT = '#ece7f4';

// The real CV, shrunk into a card — loaded only when it scrolls into view.
const Thumb = ({ src }) => {
  const ref = useRef(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) { setOn(true); return undefined; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect(); } }, { rootMargin: '150px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className="relative h-[132px] w-[94px] shrink-0 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
      {on && src ? <iframe src={src} title="cv" loading="lazy" tabIndex={-1} className="pointer-events-none absolute left-0 top-0 border-0" style={{ width: 794, height: 1123, transform: 'scale(.118)', transformOrigin: '0 0' }} /> : <FileText className="m-auto mt-12 h-6 w-6 text-stone-300" />}
    </div>
  );
};

export const ResumesPage = ({ onBack, onCreateNew, onEdit }) => {
  const { token, user } = useAuth();
  const { addToast, planTiers = [] } = useStore();
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [publicIds, setPublicIds] = useState(new Set());
  const [settingPublicId, setSettingPublicId] = useState(null);

  const userTier = planTiers.find(t => t.id === user?.plan);
  const maxCvs = userTier ? Number(userTier.max_cvs ?? 1) : 1;
  const atLimit = maxCvs > 0 && resumes.length >= maxCvs;

  const load = async () => {
    setLoading(true);
    const res = await apiService.getResumes(token);
    if (res?.success) { setResumes(res.resumes || []); setPublicIds(new Set((res.resumes || []).filter(r => Number(r.is_public) === 1).map(r => r.id))); }
    setLoading(false);
  };
  useEffect(() => { if (token) load(); }, [token]);

  const handleDelete = async (id) => {
    if (!window.confirm('ئەم سیڤیە بسڕدرێتەوە؟ لینکەکەشی کار ناکات.')) return;
    soundService.playTick?.();
    setDeletingId(id);
    const res = await apiService.deleteResume(id, token);
    setDeletingId(null);
    if (res?.success) {
      setResumes(prev => prev.filter(r => r.id !== id));
      setPublicIds(prev => { const n = new Set(prev); n.delete(id); return n; });
      addToast?.({ title: 'سڕایەوە', message: 'سیڤیەکە سڕایەوە.', type: 'info' });
    } else addToast?.({ title: 'سەرنەکەوت', message: res?.message || 'سڕینەوە سەرکەوتوو نەبوو.', type: 'error' });
  };

  // Any number of CVs can be shown to companies on the freelancer profile.
  const handleTogglePublic = async (id) => {
    soundService.playTick?.();
    const want = !publicIds.has(id);
    setSettingPublicId(id);
    const res = await apiService.setPublicResume(id, want, token);
    setSettingPublicId(null);
    if (res?.success) {
      setPublicIds(prev => { const n = new Set(prev); if (want) n.add(id); else n.delete(id); return n; });
      addToast?.({ title: want ? 'بۆ کۆمپانیاکان دیارە ✓' : 'شاردرایەوە', message: want ? 'کۆمپانیاکان دەتوانن ئەم CV یە لە پرۆفایلەکەتدا ببینن و بیکەنەوە.' : 'ئەم CV یە ئیتر لە پرۆفایلەکەتدا نابینرێت.', type: 'success' });
    } else addToast?.({ title: 'سەرنەکەوت', message: res?.message || 'کێشەیەک ڕوویدا.', type: 'error' });
  };

  const fmt = (d) => { try { return new Date(String(d).replace(' ', 'T')).toLocaleDateString('en-GB'); } catch { return ''; } };

  return (
    <div dir="rtl" className="min-h-screen font-vazirmatn" style={{ background: '#f5f4f7', paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' }}>
      <PageHeader title={`سیڤیەکانم · ${resumes.length} / ${maxCvs > 0 ? maxCvs : '∞'}`} onBack={() => { soundService.playTick?.(); onBack?.(); }} />

      <div className="mx-auto max-w-3xl space-y-4 px-4 pt-5 sm:px-6">
        <button type="button"
          onClick={() => {
            soundService.playTick?.();
            if (atLimit) { addToast?.({ title: 'گەیشتیت بە سنووری پلانەکەت', message: `پلانەکەت ڕێگە بە ${maxCvs} سیڤی دەدات. سیڤیەکی کۆن بسڕەوە یان پلانەکەت بەرزبکەرەوە.`, type: 'warning' }); return; }
            onCreateNew?.();
          }}
          className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-black text-white transition active:scale-[0.98]"
          style={{ background: atLimit ? '#a8b0ac' : `linear-gradient(135deg,${TEAL},${TEAL_DEEP})` }}>
          <Plus className="h-4 w-4" />سیڤیەکی نوێ دروست بکە
        </button>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-stone-300" /></div>
        ) : resumes.length === 0 ? (
          <div className="space-y-2 rounded-3xl border border-stone-200 bg-white py-16 text-center">
            <FileText className="mx-auto h-8 w-8 text-stone-300" />
            <p className="text-sm font-bold text-stone-400">هێشتا هیچ سیڤیەکت دروست نەکردووە.</p>
            <p className="px-6 text-xs text-stone-400">زانیارییەکانت لە پرۆفایلەکەتەوە خۆکارانە دێنە ناو سیڤیەکە و دەتوانیت بیانگۆڕیت.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {resumes.map(r => {
              const isPublic = publicIds.has(r.id);
              return (
                <div key={r.id} className={`space-y-3 rounded-3xl border bg-white p-4 ${isPublic ? 'border-[#641bd9]' : 'border-stone-200'}`}>
                  <div className="flex items-start gap-3.5">
                    <a href={r.view_url} target="_blank" rel="noopener noreferrer" aria-label="بینین"><Thumb src={r.embed_url} /></a>
                    <div className="min-w-0 flex-1 pt-1">
                      <h3 className="truncate text-sm font-black text-stone-900">{r.title}</h3>
                      <p className="mt-0.5 text-[11px] font-bold text-stone-400">{r.template_id} · {fmt(r.updated_at)}</p>
                      {isPublic && <span className="mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-black" style={{ background: TEAL_SOFT, color: TEAL_DEEP }}>دیارە بۆ کۆمپانیاکان</span>}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <a href={r.view_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-black text-white" style={{ background: TEAL }}><Eye className="h-3.5 w-3.5" />بینین / PDF</a>
                        <button onClick={() => { soundService.playTick?.(); onEdit?.(r.id); }} className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-[11px] font-black text-stone-600"><Pencil className="h-3.5 w-3.5" />دەستکاری</button>
                        <a href={r.view_url} target="_blank" rel="noopener noreferrer" className="grid h-9 w-9 place-items-center rounded-xl border border-stone-200 bg-stone-50 text-stone-600" aria-label="کردنەوە"><ExternalLink className="h-3.5 w-3.5" /></a>
                        <button onClick={() => handleDelete(r.id)} disabled={deletingId === r.id} className="grid h-9 w-9 place-items-center rounded-xl border border-rose-100 bg-rose-50 text-rose-500 disabled:opacity-50" aria-label="سڕینەوە">
                          {deletingId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => handleTogglePublic(r.id)} disabled={settingPublicId === r.id}
                    className={`flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition active:scale-95 disabled:opacity-50 ${isPublic ? 'text-white' : 'border border-stone-200 bg-stone-50 text-stone-500'}`}
                    style={isPublic ? { background: TEAL } : {}}>
                    {settingPublicId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Globe className="h-3.5 w-3.5" />}
                    {isPublic ? 'دیارە لەسەر پرۆفایل — کرتە بکە بۆ شاردنەوە' : 'نیشانی کۆمپانیاکان بدە لە پرۆفایلەکەم'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-start gap-2.5 rounded-2xl p-3.5" style={{ background: TEAL_SOFT }}>
          <Send className="mt-0.5 h-4 w-4 shrink-0" style={{ color: TEAL_DEEP }} />
          <p className="text-[11px] font-bold leading-relaxed" style={{ color: TEAL_DEEP }}>کاتێک داواکاری بۆ هەلی کارێک دەنێریت، دەتوانیت هەڵبژێریت کام لەم سیڤیانە بنێریت.</p>
        </div>
      </div>
    </div>
  );
};
