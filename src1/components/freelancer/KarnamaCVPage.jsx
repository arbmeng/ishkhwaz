import React, { useState, useEffect } from 'react';
import { PageHeader } from '../layout/PageHeader';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api';
import { soundService } from '../../services/soundService';
import { readFileAsDataUri } from '../../utils/file';
import { parseSocial } from '../ui/SocialLinks';
import { kurdistanGovernorates } from '../../data/kurdistanLocations';
import {
  ChevronLeft, ChevronRight, Sparkles, Plus, Trash2, Loader2, Wand2, X, Search, Upload, Lightbulb,
  User, Briefcase, GraduationCap, Layers, Languages, Award, FolderGit2, Users2, CheckCircle2,
} from 'lucide-react';

const TEAL = '#641bd9';
const TEAL_DEEP = '#4b13a5';
const TEAL_SOFT = '#ece7f4';

const newId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const emptyPersonal = (user) => ({
  fullName: user?.name || '', jobTitle: user?.profession || '', photo: user?.avatar || '',
  email: user?.email || '', phone: user?.phone || '', address: '', city: '', country: 'کوردستان',
  website: '', linkedin: '', summary: user?.bio || '',
});
const emptyExperience = () => ({ id: newId(), company: '', role: '', startDate: '', endDate: '', current: false, location: '', description: '' });
const emptyEducation = () => ({ id: newId(), institution: '', degree: '', field: '', startDate: '', endDate: '', description: '' });
const emptySkill = () => ({ id: newId(), name: '', level: 3 });
const emptyLanguage = () => ({ id: newId(), name: '', level: 'مامناوەند' });
const emptyCertification = () => ({ id: newId(), name: '', issuer: '', date: '', fileUrl: '', fileName: '' });
const emptyProject = () => ({ id: newId(), name: '', description: '', link: '' });
const emptyReference = () => ({ id: newId(), name: '', relation: '', phone: '', email: '' });

const SKILL_SUGGESTIONS = ['React', 'Node.js', 'Figma', 'Photoshop', 'Excel', 'بەڕێوەبردنی پڕۆژە', 'فرۆشتن', 'کوالیتی', 'Laravel'];
const LANGUAGE_LEVELS = ['سەرەتایی', 'مامناوەند', 'باش', 'زگماکی'];

const DRAFT_KEY = 'ishkhwaz_karnama_cv_draft';

const asList = (v) => { if (Array.isArray(v)) return v; try { const p = JSON.parse(v || '[]'); return Array.isArray(p) ? p : []; } catch { return []; } };

// Everything the account settings already know, turned into CV fields the person can then change.
const prefillFromProfile = (user) => {
  const social = parseSocial(user?.social_links);
  const gov = kurdistanGovernorates.find(g => g.id === user?.governorate || g.name_ku === user?.governorate);
  const dist = gov?.districts?.find(d => d.id === user?.district || d.name_ku === user?.district);
  return {
    personal: {
      ...emptyPersonal(user),
      city: [dist?.name_ku, gov?.name_ku].filter(Boolean).join('، ') || (typeof user?.governorate === 'string' ? user.governorate : ''),
      website: social.website || '',
      linkedin: social.linkedin || '',
    },
    experience: asList(user?.experience).map(e => ({ ...emptyExperience(), role: e.title || '', description: [e.period, e.description].filter(Boolean).join(' — ') })),
    education: asList(user?.education).filter(e => e && (e.title || e.place)).map(e => ({ ...emptyEducation(), degree: e.title || '', institution: e.place || '', description: e.period || '' })),
    skills: asList(user?.skills).filter(Boolean).map(n => ({ ...emptySkill(), name: String(n), level: 4 })),
    languages: asList(user?.languages).filter(Boolean).map(n => ({ ...emptyLanguage(), name: String(n), level: 'باش' })),
  };
};

// The photo must be small for the CV service: shrink the profile picture to a 360px JPEG.
const shrinkPhoto = (src) => new Promise((resolve) => {
  if (!src) return resolve('');
  if (/^https:\/\//i.test(src)) return resolve(src);
  const img = new Image();
  img.onload = () => {
    const S = 360, r = Math.min(1, S / Math.max(img.width, img.height));
    const cv = document.createElement('canvas');
    cv.width = Math.round(img.width * r); cv.height = Math.round(img.height * r);
    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
    let q = 0.82, out = cv.toDataURL('image/jpeg', q);
    while (out.length > 200000 && q > 0.4) { q -= 0.1; out = cv.toDataURL('image/jpeg', q); }
    resolve(out.length <= 250000 ? out : '');
  };
  img.onerror = () => resolve('');
  img.src = src;
});
const withIds = (arr) => (Array.isArray(arr) ? arr : []).map(x => ({ id: newId(), ...x }));

const inputCls = "w-full py-3 px-3.5 bg-white border border-stone-200 rounded-xl text-sm font-bold text-stone-900 focus:outline-none transition-all";
const labelCls = "block text-xs font-black text-stone-700 mb-1.5";

const STEPS = [
  { key: 'personal', label: 'زانیاری کەسی', Icon: User },
  { key: 'experience', label: 'ئەزموونی کار', Icon: Briefcase },
  { key: 'education', label: 'خوێندن', Icon: GraduationCap },
  { key: 'skills', label: 'بەهرەکان', Icon: Layers },
  { key: 'languages', label: 'زمانەکان', Icon: Languages },
  { key: 'certifications', label: 'بروانامەکان', Icon: Award },
  { key: 'projects', label: 'پڕۆژەکان', Icon: FolderGit2 },
  { key: 'references', label: 'کەسی متمانەپێکراو', Icon: Users2 },
];

// A short, real, contextual hint under a step's own content — not filler
// chrome, each one says something concretely useful for that step.
const TipBox = ({ children }) => (
  <div className="flex items-start gap-2.5 p-3.5 rounded-2xl" style={{ background: TEAL_SOFT }}>
    <Lightbulb className="w-4 h-4 shrink-0 mt-0.5" style={{ color: TEAL_DEEP }} />
    <p className="text-[11px] font-bold leading-relaxed" style={{ color: TEAL_DEEP }}>{children}</p>
  </div>
);

// Every field the app can send Karnama's real CV schema — id/factory pairs
// matching Karnama/src/data/schema.js exactly, so the CV it creates renders
// correctly in every one of its own templates.
function RepeatableList({ items, setItems, factory, renderFields, addLabel, emptyHint }) {
  const update = (i, patch) => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  const remove = (i) => setItems(prev => prev.filter((_, idx) => idx !== i));
  const add = () => setItems(prev => [...prev, factory()]);

  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 && (
        <p className="text-xs text-stone-400 font-bold text-center py-4">{emptyHint}</p>
      )}
      {items.map((item, i) => (
        <div key={item.id} className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
          {renderFields(item, (patch) => update(i, patch))}
          <button type="button" onClick={() => remove(i)} className="flex items-center gap-1.5 text-[11px] font-bold text-rose-500 hover:text-rose-600">
            <Trash2 className="w-3.5 h-3.5" />سڕینەوە
          </button>
        </div>
      ))}
      <button type="button" onClick={add} className="flex items-center justify-center gap-1.5 py-3 rounded-xl border-2 border-dashed border-stone-300 text-xs font-black text-stone-500 transition"
        onMouseEnter={e => { e.currentTarget.style.borderColor = TEAL; e.currentTarget.style.color = TEAL_DEEP; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.color = ''; }}
      >
        <Plus className="w-4 h-4" />{addLabel}
      </button>
    </div>
  );
}

// One shared "write it for me" trigger — used next to the summary field and
// each experience item's description. Fails soft: on error it just shows a
// small inline message and leaves whatever the user already typed alone.
function AIWriteButton({ kind, input, onResult, label = 'نووسینی خۆکار بە AI' }) {
  const { token } = useAuth();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const run = async () => {
    setBusy(true);
    setErr('');
    soundService.playTick?.();
    const res = await apiService.aiWrite(kind, input, token);
    setBusy(false);
    if (res?.success && res.text) {
      onResult(res.text);
    } else {
      setErr(res?.message || 'AI ئێستا وەڵامی نەدایەوە.');
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" onClick={run} disabled={busy}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black disabled:opacity-50 transition-colors"
        style={{ background: TEAL_SOFT, color: TEAL_DEEP }}>
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
        {busy ? 'نووسین...' : label}
      </button>
      {err && <span className="text-[10px] text-rose-500 font-bold">{err}</span>}
    </div>
  );
}

export const KarnamaCVPage = ({ onBack, onProceed, resumeId = null }) => {
  const { user, token } = useAuth();
  const [editing, setEditing] = useState(null);
  const [fromProfile, setFromProfile] = useState(false);
  const [busyProceed, setBusyProceed] = useState(false);
  const [step, setStep] = useState(0);
  const [restored, setRestored] = useState(false);
  const [personal, setPersonal] = useState(() => emptyPersonal(user));
  const [experience, setExperience] = useState([]);
  const [education, setEducation] = useState([]);
  const [skills, setSkills] = useState([]);
  const [skillQuery, setSkillQuery] = useState('');
  const [languages, setLanguages] = useState([]);
  const [certifications, setCertifications] = useState([]);
  const [projects, setProjects] = useState([]);
  const [references, setReferences] = useState([]);
  const [error, setError] = useState('');
  const [certUploadErr, setCertUploadErr] = useState('');

  // Real auto-save — a multi-step form like this is exactly the kind of
  // thing that gets lost to an accidental back-swipe or a dropped connection.
  // Restores once on mount only; every change after that re-saves silently.
  useEffect(() => {
    let cancelled = false;
    const apply = (d) => {
      setPersonal(prev => ({ ...prev, ...(d.personal || {}) }));
      setExperience(d.experience || []); setEducation(d.education || []); setSkills(d.skills || []);
      setLanguages(d.languages || []); setCertifications(d.certifications || []); setProjects(d.projects || []); setReferences(d.references || []);
    };
    (async () => {
      if (resumeId && token) {
        const res = await apiService.getResumes(token);
        const row = (res?.resumes || []).find(r => r.id === resumeId);
        if (row && !cancelled) {
          setEditing(row);
          const d = row.resume_data || {}, sec = d.sections || {};
          apply({ personal: { ...emptyPersonal(user), ...(d.personalInfo || {}) }, experience: withIds(sec.experience), education: withIds(sec.education), skills: withIds(sec.skills), languages: withIds(sec.languages), certifications: withIds(sec.certifications), projects: withIds(sec.projects), references: withIds(sec.references) });
          setRestored(true);
          return;
        }
      }
      let draft = null;
      try { const raw = localStorage.getItem(DRAFT_KEY); if (raw) draft = JSON.parse(raw); } catch { /* ignore a corrupt draft */ }
      if (draft && (draft.personal || draft.experience)) {
        apply({ personal: draft.personal, experience: draft.experience, education: draft.education, skills: draft.skills, languages: draft.languages, certifications: draft.certifications, projects: draft.projects, references: draft.references });
      } else if (user) {
        apply(prefillFromProfile(user));
        setFromProfile(true);
      }
      if (!cancelled) setRestored(true);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!restored || resumeId) return; // don't overwrite a not-yet-loaded draft; edits are saved on the server
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ personal, experience, education, skills, languages, certifications, projects, references }));
    } catch { /* storage full/unavailable — fail silent, nothing user-facing depends on this */ }
  }, [restored, personal, experience, education, skills, languages, certifications, projects, references]);

  const setPersonalField = (field, value) => setPersonal(prev => ({ ...prev, [field]: value }));

  const canSubmit = personal.fullName.trim().length > 0;

  // Real completeness — used for the checklist on the last step, not a
  // fabricated "100% done" claim.
  const sectionDone = {
    personal: personal.fullName.trim().length > 0,
    experience: experience.length > 0,
    education: education.length > 0,
    skills: skills.length > 0,
    languages: languages.length > 0,
  };

  const addSkillByName = (name) => {
    const n = name.trim();
    if (!n || skills.some(s => s.name.toLowerCase() === n.toLowerCase())) return;
    setSkills(prev => [...prev, { ...emptySkill(), name: n }]);
    setSkillQuery('');
  };

  const handleCertFile = async (index, file) => {
    if (!file) return;
    setCertUploadErr('');
    try {
      const dataUri = await readFileAsDataUri(file, 700000);
      setCertifications(prev => prev.map((c, i) => i === index ? { ...c, fileUrl: dataUri, fileName: file.name } : c));
      soundService.playTick?.();
    } catch {
      setCertUploadErr('قەبارەی فایلەکە زۆر گەورەیە (زیاتر لە 700kb) یان جۆرەکەی پشتگیری نەکراوە.');
    }
  };

  // Turns what was typed into the Karnama CV shape and hands it to the style step, which creates/updates the hosted CV.
  const handleSubmit = async () => {
    if (!canSubmit) { setStep(0); setError('تکایە ناوی تەواوت بنووسە.'); return; }
    soundService.playTick?.();
    setError('');
    setBusyProceed(true);
    const photo = await shrinkPhoto(personal.photo);
    const strip = ({ id, fileUrl, fileName, link, ...rest }) => rest;
    const data = {
      personalInfo: { ...personal, photo },
      sections: {
        experience: experience.map(strip),
        education: education.map(strip),
        skills: skills.map(strip),
        languages: languages.map(strip),
        certifications: certifications.map(strip),
        projects: projects.map(p => ({ name: p.name, description: [p.description, p.link].filter(Boolean).join(' — ') })),
        references: references.map(strip),
      },
    };
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* fine either way */ }
    setBusyProceed(false);
    onProceed?.({ data, title: editing?.title || personal.jobTitle || personal.fullName, resume: editing });
  };

  const current = STEPS[step];
  const isLastStep = step === STEPS.length - 1;
  const unusedSuggestions = SKILL_SUGGESTIONS.filter(s => !skills.some(k => k.name.toLowerCase() === s.toLowerCase())).slice(0, 4);

  return (
    <div dir="rtl" className="min-h-screen font-vazirmatn" style={{ background: '#f5f4f7', paddingBottom: 'calc(7rem + env(safe-area-inset-bottom))' }}>
      {/* HEADER — shared page header; the step label + progress bars are plain content under it */}
      <PageHeader
        title={`دروستکردنی سیڤی پیشەیی · ${step + 1}/${STEPS.length}`}
        onBack={() => { soundService.playTick?.(); if (onBack) onBack(); }}
      />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <div className="text-[11px] text-stone-500 font-bold mb-2 text-right">{current.label}</div>
        <div className="flex gap-1">
          {STEPS.map((s, i) => (
            <div key={s.key} className="h-1.5 flex-1 rounded-full overflow-hidden bg-stone-200">
              <div className="h-full rounded-full transition-all duration-300" style={{ width: i <= step ? '100%' : '0%', background: `linear-gradient(90deg,${TEAL_DEEP},${TEAL})` }} />
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 space-y-5">

        {step === 0 && (
          <div className="relative overflow-hidden rounded-3xl p-5 flex items-center gap-3" style={{ background: TEAL_SOFT }}>
            <Sparkles className="w-5 h-5 shrink-0" style={{ color: TEAL_DEEP }} />
            <p className="text-xs font-bold leading-relaxed" style={{ color: TEAL_DEEP }}>
              {editing ? 'زانیارییەکانی سیڤیەکە دەستکاری بکە؛ دواتر شێواز و ڕەنگەکەشی دەتوانیت بگۆڕیت.' : fromProfile ? 'زانیارییەکانت خۆکارانە لە ڕێکخستنەکانی پڕۆفایلەکەتەوە هێنراون. هەرچی دەتەوێت بیگۆڕە، و بەشە نەبووەکان (بروانامە، پڕۆژە، کەسی متمانەپێکراو) زیاد بکە تا باشترین سیڤیت دروست ببێت.' : 'زانیارییەکانت لێرەدا بنووسە، دواتر شێواز و ڕەنگی سیڤیەکە هەڵدەبژێریت و بە PDF دایدەگریت.'}
            </p>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">{error}</div>
        )}

        <div className="bg-white rounded-3xl border border-stone-200 p-5 sm:p-6 shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
          <h3 className="text-xs font-black text-stone-400 uppercase tracking-wider flex items-center gap-1.5 mb-4">
            <current.Icon className="w-3.5 h-3.5" />{current.label}
          </h3>

          {step === 0 && (
            <div className="flex flex-col gap-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className={labelCls}>ناوی تەواو *</label>
                  <input value={personal.fullName} onChange={e => setPersonalField('fullName', e.target.value)} className={inputCls} onFocus={e => e.target.style.borderColor = TEAL} onBlur={e => e.target.style.borderColor = ''} />
                </div>
                <div>
                  <label className={labelCls}>پیشە / ناونیشانی کار</label>
                  <input value={personal.jobTitle} onChange={e => setPersonalField('jobTitle', e.target.value)} placeholder="نموونە: React Developer" className={inputCls} onFocus={e => e.target.style.borderColor = TEAL} onBlur={e => e.target.style.borderColor = ''} />
                </div>
                <div>
                  <label className={labelCls}>ئیمەیڵ</label>
                  <input type="email" value={personal.email} onChange={e => setPersonalField('email', e.target.value)} className={inputCls + ' font-mono'} onFocus={e => e.target.style.borderColor = TEAL} onBlur={e => e.target.style.borderColor = ''} />
                </div>
                <div>
                  <label className={labelCls}>ژمارەی مۆبایل</label>
                  <input value={personal.phone} onChange={e => setPersonalField('phone', e.target.value)} className={inputCls + ' font-mono'} onFocus={e => e.target.style.borderColor = TEAL} onBlur={e => e.target.style.borderColor = ''} />
                </div>
                <div>
                  <label className={labelCls}>شار</label>
                  <input value={personal.city} onChange={e => setPersonalField('city', e.target.value)} placeholder="سلێمانی" className={inputCls} onFocus={e => e.target.style.borderColor = TEAL} onBlur={e => e.target.style.borderColor = ''} />
                </div>
                <div>
                  <label className={labelCls}>وڵات</label>
                  <input value={personal.country} onChange={e => setPersonalField('country', e.target.value)} className={inputCls} onFocus={e => e.target.style.borderColor = TEAL} onBlur={e => e.target.style.borderColor = ''} />
                </div>
                <div>
                  <label className={labelCls}>ماڵپەڕ (ئارەزوومەندانە)</label>
                  <input value={personal.website} onChange={e => setPersonalField('website', e.target.value)} placeholder="https://..." dir="ltr" className={inputCls + ' font-mono'} onFocus={e => e.target.style.borderColor = TEAL} onBlur={e => e.target.style.borderColor = ''} />
                </div>
                <div>
                  <label className={labelCls}>لینکدین (ئارەزوومەندانە)</label>
                  <input value={personal.linkedin} onChange={e => setPersonalField('linkedin', e.target.value)} placeholder="https://linkedin.com/in/..." dir="ltr" className={inputCls + ' font-mono'} onFocus={e => e.target.style.borderColor = TEAL} onBlur={e => e.target.style.borderColor = ''} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={labelCls + ' mb-0'}>پوختەیەک دەربارەی خۆت</label>
                  <AIWriteButton
                    kind="cv_summary"
                    input={{ fullName: personal.fullName, jobTitle: personal.jobTitle, notes: personal.summary }}
                    onResult={(text) => setPersonalField('summary', text)}
                  />
                </div>
                <textarea rows="4" value={personal.summary} onChange={e => setPersonalField('summary', e.target.value)}
                  placeholder="کورتەیەک دەربارەی ئەزموون و لێهاتووییەکانت بنووسە، یان دوگمەی سەرەوە بۆ نووسینی خۆکار بەکاربێنە..." className={inputCls + ' leading-relaxed'}
                  onFocus={e => e.target.style.borderColor = TEAL} onBlur={e => e.target.style.borderColor = ''} />
                <p className="text-[10px] text-stone-400 font-bold mt-1.5">سێ ڕستە بەس دەکات — خاوەنکار یەکەم جار ئەمە دەخوێنێتەوە.</p>
              </div>
              <p className="text-[10px] text-stone-400 font-bold text-center pt-1">ڕەشنووسەکەت خۆکار پاشەکەوت دەکرێت — دەتوانیت دواتر بگەڕێیتەوە.</p>
            </div>
          )}

          {step === 1 && (
            <RepeatableList
              items={experience} setItems={setExperience} factory={emptyExperience}
              addLabel="زیادکردنی ئەزموونێک" emptyHint="هێشتا هیچ ئەزموونێکی کارت زیاد نەکردووە."
              renderFields={(item, update) => (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input value={item.company} onChange={e => update({ company: e.target.value })} placeholder="ناوی کۆمپانیا" className={inputCls} />
                    <input value={item.role} onChange={e => update({ role: e.target.value })} placeholder="پۆست/ڕۆڵ" className={inputCls} />
                    <input value={item.startDate} onChange={e => update({ startDate: e.target.value })} placeholder="لە (2023)" className={inputCls + ' font-mono'} />
                    <input value={item.endDate} onChange={e => update({ endDate: e.target.value })} placeholder="بۆ (2025 یان ئێستا)" disabled={item.current} className={inputCls + ' font-mono disabled:opacity-50'} />
                    <input value={item.location} onChange={e => update({ location: e.target.value })} placeholder="شوێن" className={inputCls} />
                    <label className="flex items-center gap-2 text-xs font-bold text-stone-600">
                      <input type="checkbox" checked={item.current} onChange={e => update({ current: e.target.checked, endDate: e.target.checked ? '' : item.endDate })} />
                      ئێستاش لێرە کاردەکەم
                    </label>
                  </div>
                  <div className="flex items-center justify-end">
                    <AIWriteButton
                      kind="cv_experience"
                      input={{ role: item.role, company: item.company, notes: item.description }}
                      onResult={(text) => update({ description: text })}
                      label="باشترکردنی وەسف بە AI"
                    />
                  </div>
                  <textarea rows="2" value={item.description} onChange={e => update({ description: e.target.value })} placeholder="ئەرک و دەستکەوتەکانت..." className={inputCls} />
                </>
              )}
            />
          )}

          {step === 2 && (
            <RepeatableList
              items={education} setItems={setEducation} factory={emptyEducation}
              addLabel="زیادکردنی خوێندنێک" emptyHint="هێشتا هیچ خوێندنێکت زیاد نەکردووە."
              renderFields={(item, update) => (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input value={item.institution} onChange={e => update({ institution: e.target.value })} placeholder="ناوی قوتابخانە/زانکۆ" className={inputCls} />
                    <input value={item.degree} onChange={e => update({ degree: e.target.value })} placeholder="بڕوانامە (بەکالۆریۆس...)" className={inputCls} />
                    <input value={item.field} onChange={e => update({ field: e.target.value })} placeholder="بواری خوێندن" className={inputCls} />
                    <input value={item.startDate} onChange={e => update({ startDate: e.target.value })} placeholder="لە (2018)" className={inputCls + ' font-mono'} />
                    <input value={item.endDate} onChange={e => update({ endDate: e.target.value })} placeholder="بۆ (2022)" className={inputCls + ' font-mono'} />
                  </div>
                  <textarea rows="2" value={item.description} onChange={e => update({ description: e.target.value })} placeholder="تێبینی زیاتر (ئارەزوومەندانە)..." className={inputCls} />
                </>
              )}
            />
          )}

          {step === 3 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span dir="ltr" className="text-xs font-mono font-bold text-stone-400">{skills.length} / 12</span>
                <span className="text-xs font-black text-stone-700 flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" style={{ color: TEAL }} />بەهرەکان</span>
              </div>

              {skills.map((s, i) => (
                <div key={s.id} className="p-4 rounded-2xl bg-white border border-stone-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-stone-900">{s.name || 'بەهرەیەک'}</span>
                    <button type="button" onClick={() => setSkills(prev => prev.filter((_, idx) => idx !== i))} className="text-stone-400 hover:text-rose-500 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-black shrink-0 w-8" style={{ color: TEAL_DEEP }}>{s.level}/5</span>
                    <input type="range" min="1" max="5" value={s.level}
                      onChange={e => setSkills(prev => prev.map((x, idx) => idx === i ? { ...x, level: Number(e.target.value) } : x))}
                      className="flex-1 accent-current" style={{ accentColor: TEAL }} />
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-bold text-stone-400">
                    <span>سەرەتایی</span><span>مامناوەند</span><span>شارەزا</span>
                  </div>
                </div>
              ))}

              <div className="relative">
                <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-300 pointer-events-none" />
                <input
                  value={skillQuery}
                  onChange={e => setSkillQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkillByName(skillQuery); } }}
                  placeholder="نموونە: React, فرۆشتن..."
                  className={inputCls + ' pr-10'}
                  onFocus={e => e.target.style.borderColor = TEAL} onBlur={e => e.target.style.borderColor = ''}
                />
              </div>

              {unusedSuggestions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {unusedSuggestions.map(s => (
                    <button type="button" key={s} onClick={() => addSkillByName(s)}
                      className="px-3 py-1.5 rounded-full text-xs font-bold border transition-colors"
                      style={{ borderColor: `${TEAL}55`, color: TEAL_DEEP }}>
                      {s} +
                    </button>
                  ))}
                </div>
              )}

              {skillQuery.trim() && (
                <button type="button" onClick={() => addSkillByName(skillQuery)}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black text-white active:scale-95 transition"
                  style={{ background: TEAL }}>
                  <Plus className="w-3.5 h-3.5" />زیادکردنی «{skillQuery.trim()}»
                </button>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <RepeatableList
                items={languages} setItems={setLanguages} factory={emptyLanguage}
                addLabel="زیادکردنی زمانێک" emptyHint="هێشتا هیچ زمانێکت زیاد نەکردووە."
                renderFields={(item, update) => (
                  <div className="space-y-3">
                    <input value={item.name} onChange={e => update({ name: e.target.value })} placeholder="زمان (کوردی، ئینگلیزی...)" className={inputCls} />
                    <div className="grid grid-cols-4 gap-1.5">
                      {LANGUAGE_LEVELS.map(l => (
                        <button type="button" key={l} onClick={() => update({ level: l })}
                          className="py-2 rounded-xl text-[11px] font-bold transition-all"
                          style={item.level === l ? { background: TEAL, color: '#fff' } : { background: '#f5f4f7', color: '#5a6b65' }}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              />
              <TipBox>زۆربەی خاوەنکارەکان لە کوردستان بەدوای کوردی و ئینگلیزیدا دەگەڕێن.</TipBox>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-3">
              <RepeatableList
                items={certifications} setItems={setCertifications} factory={emptyCertification}
                addLabel="زیادکردنی بروانامەیەک" emptyHint="هێشتا هیچ بروانامەیەکت زیاد نەکردووە (ئارەزوومەندانەیە)."
                renderFields={(item, update) => (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input value={item.name} onChange={e => update({ name: e.target.value })} placeholder="ناوی بروانامە" className={inputCls} />
                    <input value={item.issuer} onChange={e => update({ issuer: e.target.value })} placeholder="لەلایەن..." className={inputCls} />
                    <input value={item.date} onChange={e => update({ date: e.target.value })} placeholder="ساڵ" className={inputCls + ' font-mono'} />
                  </div>
                )}
              />
              {/* Certificate file upload — RepeatableList's renderFields doesn't get the
                  real array index, so file input is wired directly per-item here instead. */}
              {certifications.map((c, i) => (
                <div key={`upload_${c.id}`} className="-mt-1">
                  <label className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl border-2 border-dashed border-stone-300 cursor-pointer transition-colors hover:border-current"
                    style={{ color: c.fileUrl ? TEAL_DEEP : '#78838a' }}>
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                      onChange={e => handleCertFile(i, e.target.files?.[0])} />
                    <Upload className="w-4 h-4" />
                    <span className="text-xs font-bold">{c.fileName || 'وێنەی بروانامە باربکە'}</span>
                    <span className="text-[10px] text-stone-400 font-bold">PDF · JPEG · PNG</span>
                  </label>
                </div>
              ))}
              {certUploadErr && <p className="text-[11px] font-bold text-rose-500">{certUploadErr}</p>}
            </div>
          )}

          {step === 6 && (
            <div className="space-y-3">
              <RepeatableList
                items={projects} setItems={setProjects} factory={emptyProject}
                addLabel="زیادکردنی پڕۆژەیەک" emptyHint="هێشتا هیچ پڕۆژەیەکت زیاد نەکردووە (ئارەزوومەندانەیە)."
                renderFields={(item, update) => (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input value={item.name} onChange={e => update({ name: e.target.value })} placeholder="ناوی پڕۆژە" className={inputCls} />
                      <input value={item.link} onChange={e => update({ link: e.target.value })} placeholder="لینک (ئارەزوومەندانە)" dir="ltr" className={inputCls + ' font-mono'} />
                    </div>
                    <textarea rows="2" value={item.description} onChange={e => update({ description: e.target.value })} placeholder="کورتەیەک لەسەر پڕۆژەکە..." className={inputCls} />
                  </>
                )}
              />
              <TipBox>دوو پڕۆژەی ڕاستەقینە زیاتر کاریگەرن لە دە بەهرەی نووسراو.</TipBox>
            </div>
          )}

          {step === 7 && (
            <div className="space-y-4">
              <RepeatableList
                items={references} setItems={setReferences} factory={emptyReference}
                addLabel="زیادکردنی کەسێک" emptyHint="هێشتا هیچ کەسێکی متمانەپێکراوت زیاد نەکردووە (ئارەزوومەندانەیە)."
                renderFields={(item, update) => (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input value={item.name} onChange={e => update({ name: e.target.value })} placeholder="ناو" className={inputCls} />
                    <input value={item.relation} onChange={e => update({ relation: e.target.value })} placeholder="پەیوەندی (سەرپەرشتیار...)" className={inputCls} />
                    <input value={item.phone} onChange={e => update({ phone: e.target.value })} placeholder="ژمارەی مۆبایل" className={inputCls + ' font-mono'} />
                    <input value={item.email} onChange={e => update({ email: e.target.value })} placeholder="ئیمەیل" className={inputCls + ' font-mono'} />
                  </div>
                )}
              />

              <div className="p-4 rounded-2xl border border-stone-200 space-y-2.5">
                <span className="text-xs font-black text-stone-700 block">سیڤیەکەت ئامادەیە</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { key: 'personal', label: 'زانیاری کەسی' },
                    { key: 'experience', label: 'ئەزموون' },
                    { key: 'education', label: 'خوێندن' },
                    { key: 'skills', label: 'بەهرەکان' },
                    { key: 'languages', label: 'زمانەکان' },
                  ].map(({ key, label }) => (
                    <span key={key} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold"
                      style={sectionDone[key] ? { background: TEAL_SOFT, color: TEAL_DEEP } : { background: '#f5f4f7', color: '#a8b0ac' }}>
                      {sectionDone[key] && <CheckCircle2 className="w-3 h-3" />}
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* NAV BAR */}
      <div className="fixed bottom-[84px] sm:bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-xl border-t border-stone-200 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-2.5">
          {step > 0 && (
            <button type="button" onClick={() => { soundService.playTick?.(); setStep(s => s - 1); }}
              className="px-5 py-3.5 rounded-2xl text-sm font-black bg-stone-100 text-stone-700 active:scale-95 transition flex items-center gap-1.5">
              <ChevronRight className="w-4 h-4 rtl:rotate-180" />پێشوو
            </button>
          )}
          {!isLastStep ? (
            <button type="button" onClick={() => { soundService.playTick?.(); setStep(s => s + 1); }}
              className="flex-1 py-3.5 rounded-2xl text-sm font-black text-white active:scale-95 transition flex items-center justify-center gap-1.5"
              style={{ background: `linear-gradient(135deg,${TEAL},${TEAL_DEEP})` }}>
              دواتر<ChevronLeft className="w-4 h-4 rtl:rotate-180" />
            </button>
          ) : (
            <button type="button" onClick={handleSubmit} disabled={!canSubmit}
              className="flex-1 py-3.5 rounded-2xl text-sm font-black text-white active:scale-95 transition flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: `linear-gradient(135deg,${TEAL},${TEAL_DEEP})` }}>
              {busyProceed ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}هەڵبژاردنی شێواز و ڕەنگ
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
