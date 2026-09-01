import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api';
import { soundService } from '../../services/soundService';
import {
  ChevronLeft, ChevronRight, Sparkles, Plus, Trash2, Loader2, Wand2,
  User, Briefcase, GraduationCap, Layers, Languages, Award, FolderGit2, Users2, CheckCircle2,
} from 'lucide-react';

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
const emptyCertification = () => ({ id: newId(), name: '', issuer: '', date: '' });
const emptyProject = () => ({ id: newId(), name: '', description: '', link: '' });
const emptyReference = () => ({ id: newId(), name: '', relation: '', phone: '', email: '' });

const inputCls = "w-full py-3 px-3.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-lime-500 focus:ring-2 focus:ring-lime-100 transition-all";
const labelCls = "block text-xs font-black text-slate-700 mb-1.5";

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
        <p className="text-xs text-slate-400 font-bold text-center py-4">{emptyHint}</p>
      )}
      {items.map((item, i) => (
        <div key={item.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          {renderFields(item, (patch) => update(i, patch))}
          <button type="button" onClick={() => remove(i)} className="flex items-center gap-1.5 text-[11px] font-bold text-rose-500 hover:text-rose-600">
            <Trash2 className="w-3.5 h-3.5" />سڕینەوە
          </button>
        </div>
      ))}
      <button type="button" onClick={add} className="flex items-center justify-center gap-1.5 py-3 rounded-xl border-2 border-dashed border-slate-300 text-xs font-black text-slate-500 hover:border-lime-400 hover:text-lime-700 transition">
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
        className="flex items-center gap-1.5 text-[11px] font-black text-lime-700 hover:text-lime-800 disabled:opacity-50 transition-colors">
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
        {busy ? 'نووسین...' : label}
      </button>
      {err && <span className="text-[10px] text-rose-500 font-bold">{err}</span>}
    </div>
  );
}

export const KarnamaCVPage = ({ onBack, onProceed }) => {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [personal, setPersonal] = useState(() => emptyPersonal(user));
  const [experience, setExperience] = useState([]);
  const [education, setEducation] = useState([]);
  const [skills, setSkills] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [certifications, setCertifications] = useState([]);
  const [projects, setProjects] = useState([]);
  const [references, setReferences] = useState([]);
  const [error, setError] = useState('');

  const setPersonalField = (field, value) => setPersonal(prev => ({ ...prev, [field]: value }));

  const canSubmit = personal.fullName.trim().length > 0;

  // Hands the assembled CV data straight to the in-app template picker — no
  // network call and no Karnama redirect here; the picker itself is what
  // saves to Karnama (in the background) once a design is actually chosen.
  const handleSubmit = () => {
    if (!canSubmit) { setStep(0); setError('تکایە ناوی تەواوت بنووسە.'); return; }
    soundService.playTick?.();
    setError('');

    const resume = {
      name: `${personal.fullName.trim()} - CV`,
      language: 'ku',
      direction: 'rtl',
      fontFamily: 'arabic',
      density: 'comfortable',
      personalInfo: personal,
      sections: { experience, education, skills, languages, certifications, projects, references },
      sectionOrder: ['experience', 'education', 'skills', 'languages', 'certifications', 'projects', 'references'],
      visibleSections: { experience: true, education: true, skills: true, languages: true, certifications: true, projects: true, references: true },
    };

    onProceed?.(resume);
  };

  const current = STEPS[step];
  const isLastStep = step === STEPS.length - 1;

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 font-vazirmatn" style={{ paddingBottom: 'calc(7rem + env(safe-area-inset-bottom))' }}>
      {/* HEADER */}
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
            <h1 className="text-sm font-black text-slate-900">دروستکردنی سیڤی پیشەیی</h1>
            <div className="text-[10px] text-slate-500">هەنگاوی {step + 1} لە {STEPS.length} — {current.label}</div>
          </div>
          <div className="w-16" />
        </div>
        <div className="max-w-3xl mx-auto mt-3 flex gap-1">
          {STEPS.map((s, i) => (
            <div key={s.key} className="h-1.5 flex-1 rounded-full overflow-hidden bg-slate-200">
              <div className="h-full rounded-full transition-all duration-300" style={{ width: i <= step ? '100%' : '0%', background: 'linear-gradient(90deg,#a3e635,#65a30d)' }} />
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 space-y-5">

        {/* Hero — only on step 0 */}
        {step === 0 && (
          <div className="relative overflow-hidden rounded-3xl p-6" style={{ background: 'linear-gradient(120deg,#0d1117 0%,#16210a 100%)' }}>
            <div className="absolute -top-10 -left-10 w-56 h-56 rounded-full blur-[90px] pointer-events-none" style={{ background: 'rgba(163,230,53,0.14)' }} />
            <div className="relative z-10 flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-lime-400 shrink-0" />
              <p className="text-xs text-white/70 leading-relaxed">
                زانیارییەکانت لێرەدا بنووسە، دواتر چەند دیزاینێکی پیشەیی پێشکەشت دەکرێت — یەکێکیان هەڵبژێرە و داونلۆدی بکە بە PDF.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">{error}</div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-4">
            <current.Icon className="w-3.5 h-3.5" />{current.label}
          </h3>

          {step === 0 && (
            <div className="flex flex-col gap-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className={labelCls}>ناوی تەواو *</label>
                  <input value={personal.fullName} onChange={e => setPersonalField('fullName', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>پیشە / ناونیشانی کار</label>
                  <input value={personal.jobTitle} onChange={e => setPersonalField('jobTitle', e.target.value)} placeholder="نموونە: React Developer" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>ئیمەیڵ</label>
                  <input type="email" value={personal.email} onChange={e => setPersonalField('email', e.target.value)} className={inputCls + ' font-mono'} />
                </div>
                <div>
                  <label className={labelCls}>ژمارەی مۆبایل</label>
                  <input value={personal.phone} onChange={e => setPersonalField('phone', e.target.value)} className={inputCls + ' font-mono'} />
                </div>
                <div>
                  <label className={labelCls}>شار</label>
                  <input value={personal.city} onChange={e => setPersonalField('city', e.target.value)} placeholder="سلێمانی" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>وڵات</label>
                  <input value={personal.country} onChange={e => setPersonalField('country', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>ماڵپەڕ (ئارەزوومەندانە)</label>
                  <input value={personal.website} onChange={e => setPersonalField('website', e.target.value)} placeholder="https://..." dir="ltr" className={inputCls + ' font-mono'} />
                </div>
                <div>
                  <label className={labelCls}>لینکدین (ئارەزوومەندانە)</label>
                  <input value={personal.linkedin} onChange={e => setPersonalField('linkedin', e.target.value)} placeholder="https://linkedin.com/in/..." dir="ltr" className={inputCls + ' font-mono'} />
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
                  placeholder="کورتەیەک دەربارەی ئەزموون و لێهاتووییەکانت بنووسە، یان دوگمەی سەرەوە بۆ نووسینی خۆکار بەکاربێنە..." className={inputCls + ' leading-relaxed'} />
              </div>
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
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
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
            <RepeatableList
              items={skills} setItems={setSkills} factory={emptySkill}
              addLabel="زیادکردنی بەهرەیەک" emptyHint="هێشتا هیچ بەهرەیەکت زیاد نەکردووە."
              renderFields={(item, update) => (
                <div className="flex items-center gap-3">
                  <input value={item.name} onChange={e => update({ name: e.target.value })} placeholder="نموونە: React, فرۆشتن..." className={inputCls + ' flex-1'} />
                  <input type="range" min="1" max="5" value={item.level} onChange={e => update({ level: Number(e.target.value) })} className="w-24" />
                  <span className="text-[11px] font-mono font-bold text-slate-500 w-6 text-center">{item.level}/5</span>
                </div>
              )}
            />
          )}

          {step === 4 && (
            <RepeatableList
              items={languages} setItems={setLanguages} factory={emptyLanguage}
              addLabel="زیادکردنی زمانێک" emptyHint="هێشتا هیچ زمانێکت زیاد نەکردووە."
              renderFields={(item, update) => (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input value={item.name} onChange={e => update({ name: e.target.value })} placeholder="زمان (کوردی، ئینگلیزی...)" className={inputCls} />
                  <select value={item.level} onChange={e => update({ level: e.target.value })} className={inputCls}>
                    {['سەرەتایی', 'مامناوەند', 'باش', 'شارەزا', 'زمانی دایک'].map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              )}
            />
          )}

          {step === 5 && (
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
          )}

          {step === 6 && (
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
          )}

          {step === 7 && (
            <RepeatableList
              items={references} setItems={setReferences} factory={emptyReference}
              addLabel="زیادکردنی کەسێک" emptyHint="هێشتا هیچ کەسێکی متمانەپێکراوت زیاد نەکردووە (ئارەزوومەندانەیە)."
              renderFields={(item, update) => (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input value={item.name} onChange={e => update({ name: e.target.value })} placeholder="ناو" className={inputCls} />
                  <input value={item.relation} onChange={e => update({ relation: e.target.value })} placeholder="پەیوەندی (سەرپەرشتیار...)" className={inputCls} />
                  <input value={item.phone} onChange={e => update({ phone: e.target.value })} placeholder="ژمارەی مۆبایل" className={inputCls + ' font-mono'} />
                  <input value={item.email} onChange={e => update({ email: e.target.value })} placeholder="ئیمەیڵ" className={inputCls + ' font-mono'} />
                </div>
              )}
            />
          )}
        </div>
      </div>

      {/* NAV BAR */}
      <div className="fixed bottom-[84px] sm:bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-xl border-t border-slate-200 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-2.5">
          {step > 0 && (
            <button type="button" onClick={() => { soundService.playTick?.(); setStep(s => s - 1); }}
              className="px-5 py-3.5 rounded-2xl text-sm font-black bg-slate-100 text-slate-700 active:scale-95 transition flex items-center gap-1.5">
              <ChevronRight className="w-4 h-4 rtl:rotate-180" />پێشوو
            </button>
          )}
          {!isLastStep ? (
            <button type="button" onClick={() => { soundService.playTick?.(); setStep(s => s + 1); }}
              className="flex-1 py-3.5 rounded-2xl text-sm font-black active:scale-95 transition flex items-center justify-center gap-1.5"
              style={{ background: 'linear-gradient(135deg,#a3e635,#65a30d)', color: '#0d1117' }}>
              دواتر<ChevronLeft className="w-4 h-4 rtl:rotate-180" />
            </button>
          ) : (
            <button type="button" onClick={handleSubmit} disabled={!canSubmit}
              className="flex-1 py-3.5 rounded-2xl text-sm font-black active:scale-95 transition flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,#a3e635,#65a30d)', color: '#0d1117' }}>
              <CheckCircle2 className="w-4 h-4" />هەڵبژاردنی دیزاین
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
