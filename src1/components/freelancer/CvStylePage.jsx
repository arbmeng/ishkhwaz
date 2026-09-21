import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PageHeader } from '../layout/PageHeader';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { apiService } from '../../services/api';
import { soundService } from '../../services/soundService';
import { Loader2, Lock, CheckCircle2, Check, Sparkles, ExternalLink, FileText } from 'lucide-react';

const TEAL = '#641bd9';
const DEEP = '#4b13a5';
const SOFT = '#ece7f4';
const COLORS = ['#641bd9', '#2563eb', '#0284c7', '#0d9488', '#059669', '#c27803', '#dc2626', '#db2777', '#334155', '#0f172a'];
const LANGS = [['ku', 'کوردی'], ['ar', 'العربية'], ['en', 'English']];
const CATS = { modern: 'مۆدێرن', ats: 'ATS', creative: 'داهێنەر', student: 'قوتابی', executive: 'بەڕێوەبەر' };

// A live preview of the template, loaded only once it scrolls into view (13 iframes at once would be slow).
const LazyPreview = ({ src }) => {
  const ref = useRef(null);
  const [on, setOn] = useState(false);
  const [scale, setScale] = useState(0.3);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const fit = () => setScale(el.clientWidth / 794);
    fit();
    const ro = 'ResizeObserver' in window ? new ResizeObserver(fit) : null;
    ro?.observe(el);
    let io;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect(); } }, { rootMargin: '200px' });
      io.observe(el);
    } else setOn(true);
    return () => { ro?.disconnect(); io?.disconnect(); };
  }, []);
  return (
    <div ref={ref} className="relative h-full w-full overflow-hidden bg-white">
      {on ? (
        <iframe src={src} title="preview" loading="lazy" tabIndex={-1} className="pointer-events-none absolute left-0 top-0 border-0"
          style={{ width: 794, height: 1123, transform: `scale(${scale})`, transformOrigin: '0 0' }} />
      ) : <div className="grid h-full place-items-center"><FileText className="h-6 w-6 text-stone-300" /></div>}
    </div>
  );
};

// Last step of making a CV: pick the template, colour and language, then create (or update) the hosted CV.
export const CvStylePage = ({ draft, resume = null, onBack, onDone }) => {
  const { token, user } = useAuth();
  const { planTiers = [], addToast } = useStore();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState('');
  const [templateId, setTemplateId] = useState(resume?.template_id || '');
  const [accent, setAccent] = useState(resume?.accent_color || '');
  const [lang, setLang] = useState(resume?.language || 'ku');
  const [title, setTitle] = useState(draft?.title || resume?.title || 'CV');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const tier = planTiers.find(t => t.id === user?.plan);
  const paid = (tier && Number(tier.price) > 0) || ['admin', 'owner'].includes(user?.role);

  useEffect(() => {
    let live = true;
    (async () => {
      const res = await apiService.getKarnamaTemplates(token);
      if (!live) return;
      if (res?.success) {
        setTemplates(res.templates || []);
        setTemplateId(prev => prev || res.templates?.find(t => t.tier === 'free')?.id || res.templates?.[0]?.id || '');
      } else setLoadErr(res?.message || 'ناتوانرێت شێوازەکان بهێنرێن.');
      setLoading(false);
    })();
    return () => { live = false; };
  }, [token]);

  const chosen = useMemo(() => templates.find(t => t.id === templateId), [templates, templateId]);
  const locked = (t) => t.tier !== 'free' && !paid;
  const accentValue = accent || chosen?.defaultAccentColor || TEAL;

  const pick = (t) => {
    soundService.playTick?.();
    if (locked(t)) { addToast?.({ title: 'تایبەتە بە Pro و VIP', message: 'ئەم شێوازە بۆ ئەندامانی پلانی Pro و VIP بەردەستە.', type: 'warning' }); return; }
    setTemplateId(t.id); setAccent('');
  };

  const save = async () => {
    if (!draft?.data && !resume) return;
    setBusy(true); setError('');
    soundService.playTick?.();
    const payload = { title: title.trim() || 'CV', template_id: templateId, accent_color: accent || '', language: lang, ...(draft?.data ? { data: draft.data } : {}) };
    const res = resume ? await apiService.updateResume(resume.id, payload, token) : await apiService.createResume(payload, token);
    setBusy(false);
    if (!res?.success) { setError(res?.message || 'سیڤیەکە پاشەکەوت نەکرا.'); return; }
    soundService.playSuccess?.();
    if (resume) {
      const list = await apiService.getResumes(token);
      setResult((list?.resumes || []).find(r => r.id === resume.id) || resume);
    } else setResult(res.resume);
  };

  // ---- done: show the finished CV
  if (result) {
    return (
      <div dir="rtl" className="flex min-h-screen flex-col font-vazirmatn" style={{ background: '#f5f4f7' }}>
        <PageHeader title="سیڤیەکەت ئامادەیە ✓" onBack={() => onDone?.()} />
        <div className="mx-auto w-full max-w-3xl flex-1 space-y-3 px-4 pb-24 pt-4">
          <div className="flex items-center gap-2.5 rounded-2xl bg-emerald-50 p-3.5 text-emerald-800">
            <CheckCircle2 className="h-5 w-5 shrink-0" /><p className="text-xs font-bold leading-6">سیڤیەکەت پاشەکەوت کرا. لێرە دەتوانیت شێواز و ڕەنگ بگۆڕیت و بە PDF دایبگریت.</p>
          </div>
          <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
            <iframe src={result.embed_url} title="CV" className="block w-full border-0" style={{ height: '78vh' }} />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <a href={result.view_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white py-3.5 text-xs font-black text-stone-700">
              <ExternalLink className="h-4 w-4" />کردنەوە
            </a>
            <button onClick={() => onDone?.()} className="rounded-2xl py-3.5 text-xs font-black text-white" style={{ background: `linear-gradient(135deg,${TEAL},${DEEP})` }}>سیڤیەکانم</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen font-vazirmatn" style={{ background: '#f5f4f7', paddingBottom: 'calc(7rem + env(safe-area-inset-bottom))' }}>
      <PageHeader title="شێواز و ڕەنگی سیڤی" onBack={() => { soundService.playTick?.(); onBack?.(); }} />
      <div className="mx-auto max-w-3xl space-y-5 px-4 pt-5">

        <section className="rounded-3xl border border-stone-200 bg-white p-4">
          <label className="mb-1.5 block text-xs font-black text-stone-700">ناوی سیڤی (تەنها بۆ خۆت)</label>
          <input value={title} onChange={e => setTitle(e.target.value)} maxLength={100} className="w-full rounded-xl border border-stone-200 px-3.5 py-3 text-sm font-bold outline-none focus:border-[#641bd9]" />
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-black text-stone-900">شێواز</h3>
            <span className="text-[11px] font-bold text-stone-400">{templates.length} دیزاین</span>
          </div>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-stone-300" /></div>
          ) : loadErr ? (
            <div className="rounded-2xl bg-rose-50 p-4 text-center text-xs font-bold text-rose-700">{loadErr}</div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {templates.map(t => {
                const on = t.id === templateId, lock = locked(t);
                return (
                  <button key={t.id} type="button" onClick={() => pick(t)}
                    className={`relative overflow-hidden rounded-2xl border bg-white text-right transition active:scale-[.98] ${on ? 'border-[#641bd9] shadow-[0_10px_26px_rgba(100,27,217,.22)] ring-2 ring-[#641bd9]/25' : 'border-stone-200'}`}>
                    <div className="relative aspect-[794/1123] w-full">
                      <LazyPreview src={t.previewUrl} />
                      {lock && <div className="absolute inset-0 grid place-items-center bg-[#1d0740]/55 backdrop-blur-[1px]"><span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-[#4b13a5]"><Lock className="h-3.5 w-3.5" />Pro / VIP</span></div>}
                      {on && <span className="absolute left-2 top-2 grid h-7 w-7 place-items-center rounded-full text-white shadow" style={{ background: TEAL }}><Check className="h-4 w-4" /></span>}
                    </div>
                    <div className="px-3 py-2.5">
                      <div className="truncate text-[12px] font-black text-stone-900">{t.name}</div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[10px] font-bold text-stone-400">
                        <span>{CATS[t.category] || t.category}</span>
                        {t.tier !== 'free' && <span className="rounded-full px-1.5 py-0.5 text-[9px] font-black" style={{ background: SOFT, color: DEEP }}>Premium</span>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="space-y-3 rounded-3xl border border-stone-200 bg-white p-4">
          <h3 className="text-sm font-black text-stone-900">ڕەنگ</h3>
          <div className="flex flex-wrap gap-2.5">
            {[chosen?.defaultAccentColor, ...COLORS].filter(Boolean).filter((c, i, a) => a.indexOf(c) === i).map(c => (
              <button key={c} type="button" onClick={() => { soundService.playTick?.(); setAccent(c); }} aria-label={c}
                className="grid h-10 w-10 place-items-center rounded-full border-2 transition active:scale-90" style={{ background: c, borderColor: accentValue === c ? '#16111d' : 'transparent' }}>
                {accentValue === c && <Check className="h-4 w-4 text-white" />}
              </button>
            ))}
          </div>
          <h3 className="pt-1 text-sm font-black text-stone-900">زمانی سیڤی</h3>
          <div className="grid grid-cols-3 gap-2 rounded-2xl p-1.5" style={{ background: SOFT }}>
            {LANGS.map(([id, l]) => (
              <button key={id} type="button" onClick={() => setLang(id)} className={`rounded-xl py-2.5 text-xs font-black transition ${lang === id ? 'bg-white shadow-sm' : 'text-stone-500'}`} style={lang === id ? { color: DEEP } : undefined}>{l}</button>
            ))}
          </div>
        </section>

        {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-700">{error}</div>}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 px-4 pt-3 backdrop-blur" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        <div className="mx-auto max-w-3xl">
          <button onClick={save} disabled={busy || !templateId}
            className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-black text-white shadow-[0_12px_28px_rgba(100,27,217,.3)] transition active:scale-[.98] disabled:opacity-60"
            style={{ background: `linear-gradient(135deg,${TEAL},${DEEP})` }}>
            {busy ? <><Loader2 className="h-4 w-4 animate-spin" />خەریکی دروستکردنە...</> : <><Sparkles className="h-4 w-4" />{resume ? 'پاشەکەوتکردنی گۆڕانکارییەکان' : 'دروستکردنی سیڤی'}</>}
          </button>
        </div>
      </div>
    </div>
  );
};
