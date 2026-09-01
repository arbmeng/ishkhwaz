import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { soundService } from '../../services/soundService';
import {
  ChevronLeft, Sparkles, CheckCircle2, User, Mail, Phone,
  Plus, Trash2, ExternalLink, Award, FileText, Layers, BadgeCheck, FileStack, ArrowLeft
} from 'lucide-react';

const parseJsonArray = (val) => {
  if (Array.isArray(val)) return val;
  try { const p = JSON.parse(val || '[]'); return Array.isArray(p) ? p : []; } catch { return []; }
};

const emptyExperience = () => ({ title: '', link: '', period: '', description: '' });

export const CVBuilderPage = ({ onBack, onSuccess, onOpenKarnama }) => {
  const { user, updateUserProfile } = useAuth();
  const { addToast, syncBackendData } = useStore();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profession, setProfession] = useState(user?.profession || user?.title_ku || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [skillsInput, setSkillsInput] = useState('');
  const [skills, setSkills] = useState(() => parseJsonArray(user?.skills));
  const [experience, setExperience] = useState(() => {
    const parsed = parseJsonArray(user?.experience);
    return parsed.length > 0 ? parsed : [emptyExperience()];
  });

  const [isSaving, setIsSaving] = useState(false);

  const initials = (name || user?.name || '؟').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const completion = [
    Boolean(name.trim()),
    Boolean(profession.trim()),
    Boolean(bio.trim()),
    skills.length > 0,
    experience.some(e => e.title.trim()),
  ].filter(Boolean).length;
  const completionPct = Math.round((completion / 5) * 100);

  const addSkill = () => {
    const s = skillsInput.trim();
    if (s && !skills.includes(s)) setSkills(prev => [...prev, s]);
    setSkillsInput('');
  };
  const removeSkill = (s) => setSkills(prev => prev.filter(x => x !== s));

  const updateExperience = (i, field, value) => {
    setExperience(prev => prev.map((exp, idx) => idx === i ? { ...exp, [field]: value } : exp));
  };
  const addExperience = () => setExperience(prev => [...prev, emptyExperience()]);
  const removeExperience = (i) => setExperience(prev => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async (e) => {
    e.preventDefault();
    soundService.playSuccess?.();
    setIsSaving(true);

    const cleanExperience = experience
      .filter(exp => exp.title.trim())
      .map(exp => ({ ...exp, title: exp.title.trim(), link: exp.link.trim(), period: exp.period.trim(), description: exp.description.trim() }));

    if (updateUserProfile) {
      await updateUserProfile({ name, email, profession, bio, skills, experience: cleanExperience });
    }

    // Refresh the freelancers directory so the updated CV is visible immediately
    if (syncBackendData) syncBackendData().catch(() => {});

    setIsSaving(false);
    addToast?.({ title: 'پاشەکەوتکرا ✓', message: 'پڕۆفایل و CVـەکەت نوێکرایەوە — دیرەکتری نوێکرایەوە', type: 'success' });
    if (onSuccess) onSuccess(); else if (onBack) onBack();
  };

  const inputCls = "w-full py-3 px-3.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-lime-500 focus:ring-2 focus:ring-lime-100 transition-all";
  const labelCls = "block text-xs font-black text-slate-700 mb-1.5 uppercase tracking-wider";

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 font-vazirmatn" style={{ paddingBottom: 'calc(7rem + env(safe-area-inset-bottom))' }}>

      {/* ── TOP HEADER ── */}
      <div
        className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-slate-200 px-4 sm:px-6 lg:px-8"
        style={{
          paddingTop: 'max(16px, calc(env(safe-area-inset-top) + 12px))',
          paddingBottom: '14px',
        }}
      >
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <button onClick={() => { soundService.playTick?.(); if (onBack) onBack(); }}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors">
            <ChevronLeft className="w-4 h-4 rtl:rotate-180" />گەڕانەوە
          </button>
          <div className="text-center">
            <h1 className="text-sm font-black text-slate-900">پڕۆفایل و CVـی من</h1>
            <div className="text-[10px] text-slate-500">{completionPct}% تەواو</div>
          </div>
          <div className="w-16" />
        </div>
        <div className="max-w-3xl mx-auto mt-3">
          <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${completionPct}%`, background: 'linear-gradient(90deg,#a3e635,#65a30d)' }} />
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 space-y-5">

        {/* Hero card */}
        <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8" style={{ background: 'linear-gradient(120deg,#0d1117 0%,#16210a 100%)' }}>
          <div className="absolute -top-10 -left-10 w-56 h-56 rounded-full blur-[90px] pointer-events-none" style={{ background: 'rgba(163,230,53,0.14)' }} />
          <div className="relative z-10 flex items-center gap-5">
            {user?.avatar ? (
              <img src={user.avatar} alt={name} className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover ring-4 shrink-0" style={{ ringColor: 'rgba(163,230,53,0.4)' }} />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-xl sm:text-2xl font-black text-lime-400 shrink-0"
                style={{ background: 'linear-gradient(135deg,#1a2008,#2a3a10)', border: '3px solid rgba(163,230,53,0.3)' }}>
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white truncate">{name || 'ناوی تۆ'}</h2>
                <BadgeCheck className="w-4 h-4 text-lime-400 shrink-0" />
              </div>
              <p className="text-xs text-white/40 mt-0.5">ئەم پەڕەیە پڕۆفایلی فەرمیت دروستدەکات — کۆمپانیاکان ئەم CVـە دەبینن کاتێک سیڤیت دەنێریت.</p>
            </div>
          </div>
        </div>

        {/* Karnama CV entry point — a real, downloadable PDF built from a
            professional template, distinct from this page (which only
            edits the in-app profile companies see). */}
        {onOpenKarnama && (
          <button
            type="button"
            onClick={() => { soundService.playTick?.(); onOpenKarnama(); }}
            className="w-full flex items-center gap-4 p-5 rounded-3xl border border-lime-200 bg-lime-50 hover:bg-lime-100 transition text-right"
          >
            <div className="w-12 h-12 rounded-2xl bg-slate-950 flex items-center justify-center shrink-0">
              <FileStack className="w-5 h-5 text-lime-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-black text-slate-900">دروستکردنی سیڤی پیشەیی (PDF)</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">لەگەڵ کارنەما — دیزاینی پیشەیی هەڵبژێرە و بە PDF داونلۆدی بکە</p>
            </div>
            <ArrowLeft className="w-4 h-4 text-lime-700 rtl:rotate-180 shrink-0" />
          </button>
        )}

        {/* Personal info */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />زانیاری کەسی
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className={labelCls}>ناوی تەواو *</label>
              <input required value={name} onChange={e => setName(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}><Mail className="w-3 h-3 inline mb-0.5" /> ئیمەیڵ</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="info@ishkhwaz.iq" className={inputCls + ' font-mono'} />
            </div>
          </div>
          {/* Profession / job title — shown as subtitle in the freelancer directory card */}
          <div>
            <label className={labelCls}><BadgeCheck className="w-3 h-3 inline mb-0.5" /> پیشە / ناونیشانی کار *</label>
            <input
              value={profession}
              onChange={e => setProfession(e.target.value)}
              placeholder="نموونە: React Developer، گرافیک دیزاینەر، فرۆشیار..."
              className={inputCls}
            />
            <p className="text-[10px] text-slate-400 mt-1">ئەمە دەکرێت لە کارتی تۆ لە دیرەکتری فریلانسەران بدرێتە رووی خەڵک.</p>
          </div>
          <div>
            <label className={labelCls}><Phone className="w-3 h-3 inline mb-0.5" /> ژمارەی مۆبایل</label>
            <input value={user?.phone || ''} disabled className={inputCls + ' font-mono opacity-60 cursor-not-allowed'} />
            <p className="text-[10px] text-slate-400 mt-1">ژمارەی مۆبایل ناتوانرێت لێرەوە بگۆڕدرێت — لەگەڵ پشتیوانی پەیوەندی بکە.</p>
          </div>
        </div>

        {/* Bio */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-3">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" />دەربارەی خۆت
          </h3>
          <textarea rows="4" value={bio} onChange={e => setBio(e.target.value)}
            placeholder="کورتەیەک دەربارەی ئەزموون و لێهاتووییەکانت بنووسە..."
            className={inputCls + ' leading-relaxed'} />
        </div>

        {/* Skills */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-3">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />بەهرەکان
          </h3>
          <div className="flex gap-2">
            <input value={skillsInput} onChange={e => setSkillsInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
              placeholder="نموونە: React, فرۆشتن, عەرەبی..." className={inputCls} />
            <button type="button" onClick={addSkill} className="px-5 rounded-xl bg-slate-950 text-lime-400 shrink-0 hover:bg-slate-800 transition">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {skills.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {skills.map(s => (
                <span key={s} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-lime-50 border border-lime-200 text-xs font-bold text-lime-800">
                  {s}
                  <button type="button" onClick={() => removeSkill(s)} className="text-lime-600 hover:text-rose-500 transition-colors">✕</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Experience & portfolio */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5" />ئەزموون و کارە پێشووەکان
            </h3>
            <button type="button" onClick={addExperience} className="flex items-center gap-1 text-[11px] font-bold text-lime-700 hover:text-lime-800">
              <Plus className="w-3.5 h-3.5" />زیادکردنی دانەیەک
            </button>
          </div>

          {experience.map((exp, i) => (
            <div key={i} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <input value={exp.title} onChange={e => updateExperience(i, 'title', e.target.value)}
                  placeholder="ناونیشان: بۆ نموونە React Developer لە XYZ کۆمپانیا"
                  className="flex-1 py-2.5 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-slate-900" />
                {experience.length > 1 && (
                  <button type="button" onClick={() => removeExperience(i)} className="p-2.5 rounded-xl text-rose-400 hover:bg-rose-50 transition shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input value={exp.period} onChange={e => updateExperience(i, 'period', e.target.value)}
                  placeholder="ماوە: نموونە 2023 - 2025"
                  className="py-2.5 px-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-900" />
                <div className="relative">
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input value={exp.link} onChange={e => updateExperience(i, 'link', e.target.value)}
                    placeholder="لینکی ماڵپەڕ یان کارەکە (ئارەزوومەندانە)"
                    className="w-full py-2.5 pr-9 pl-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-900" />
                </div>
              </div>
              <textarea rows="2" value={exp.description} onChange={e => updateExperience(i, 'description', e.target.value)}
                placeholder="کورتەیەک لەسەر ئەرکەکانت و ئەوەی کردووتە..."
                className="w-full py-2.5 px-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 leading-relaxed focus:outline-none focus:border-slate-900" />
            </div>
          ))}
        </div>
      </form>

      {/* ── STICKY SAVE BAR ── */}
      <div className="fixed bottom-[84px] inset-x-0 z-30 bg-white/95 backdrop-blur-xl border-t border-slate-200 px-4 py-3 sm:hidden">
        <button onClick={handleSubmit} disabled={isSaving}
          className="w-full py-3.5 rounded-2xl text-sm font-black transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2 disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg,#a3e635,#65a30d)', color: '#0d1117' }}>
          <Sparkles className="w-4 h-4" />
          <span>{isSaving ? 'پاشەکەوتکردن...' : 'پاشەکەوتکردنی پڕۆفایل'}</span>
        </button>
      </div>
      <div className="hidden sm:block max-w-3xl mx-auto px-4 mt-2">
        <button onClick={handleSubmit} disabled={isSaving}
          className="w-full py-4 rounded-2xl text-sm font-black transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2 disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg,#a3e635,#65a30d)', color: '#0d1117' }}>
          {isSaving ? <CheckCircle2 className="w-4 h-4 animate-pulse" /> : <Sparkles className="w-4 h-4" />}
          <span>{isSaving ? 'پاشەکەوتکردن...' : 'پاشەکەوتکردنی پڕۆفایل ✨'}</span>
        </button>
      </div>
    </div>
  );
};
