import React, { useMemo, useState } from 'react';
import { soundService } from '../../services/soundService';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { positionsInfo } from '../../utils/jobPositions';
import { X, Send, Briefcase, PlusCircle, CheckCircle2, Loader2, MapPin, Wallet, Users, Sparkles, Clock } from 'lucide-react';

const TEAL = '#641bd9';
const DEEP = '#4b13a5';
const GRAD = 'linear-gradient(155deg,#7229e8 0%,#5513bf 48%,#1d0740 100%)';
const WORKPLACES = [['onSite', 'لەسەر شوێن'], ['remote', 'دوورکاری'], ['hybrid', 'تێکەڵ']];
const QUICK = ['سڵاو، پڕۆفایلەکەت بە دڵمان بوو و دەمانەوێت پێکەوە کار بکەین.', 'ئەم هەلە بۆ تۆ گونجاوە، دەتوانین ئەمڕۆ قسە بکەین؟', 'چاوەڕێی وەڵامەکەتین، زۆر سوپاس.'];

const salaryText = (j) => {
  let a = Number(j.salary_min) || 0, b = Number(j.salary_max) || 0;
  if (a && b && a > b) [a, b] = [b, a];
  if (!a && !b) return 'وەک گفتوگۆ';
  return a && b && a !== b ? `${a.toLocaleString()} - ${b.toLocaleString()} IQD` : `${(b || a).toLocaleString()} IQD`;
};

const Chip = ({ on, children, onClick }) => (
  <button type="button" onClick={onClick}
    className={`rounded-full border px-3.5 py-2 text-[12px] font-black transition active:scale-95 ${on ? 'border-transparent text-white shadow-[0_6px_16px_rgba(100,27,217,.28)]' : 'border-[#ddd6ec] bg-white text-[#4b4358]'}`}
    style={on ? { background: `linear-gradient(135deg,#7229e8,${DEEP})` } : undefined}>{children}</button>
);

export const SendOfferModal = ({ freelancer, isOpen, onClose, onSendOffer }) => {
  const { user } = useAuth();
  const { jobs = [], invitations = [], workTypes = [], sendInvitation, fetchInvitations, addToast } = useStore();

  // Only this company's own jobs that are still open (not paused / not already full).
  const openJobs = useMemo(() => jobs.filter(j => String(j.company_id) === String(user?.id) && j.status === 'active' && !positionsInfo(j).full), [jobs, user]);
  const alreadyOffered = useMemo(() => new Set(invitations.filter(i => String(i.freelancer_id) === String(freelancer?.id) && ['pending', 'accepted'].includes(i.status) && i.job_id).map(i => i.job_id)), [invitations, freelancer]);

  const [mode, setMode] = useState(null); // 'job' | 'new'
  const [jobId, setJobId] = useState('');
  const [title, setTitle] = useState('');
  const [salary, setSalary] = useState('');
  const [jobType, setJobType] = useState('');
  const [workplace, setWorkplace] = useState('onSite');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [desc, setDesc] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!isOpen || !freelancer) return null;

  const activeMode = mode || (openJobs.length ? 'job' : 'new');
  const name = freelancer.name || freelancer.full_name || 'کارخواز';
  const initial = name.trim().charAt(0) || 'ئ';
  const chosen = openJobs.find(j => j.id === jobId);
  const canSend = activeMode === 'job' ? !!chosen : title.trim().length > 1;

  const submit = async () => {
    if (!canSend) {
      addToast?.({ title: activeMode === 'job' ? 'کارێک هەڵبژێرە' : 'ناونیشانی کار بنووسە', message: activeMode === 'job' ? 'یەکێک لە کارە بەردەستەکانت هەڵبژێرە.' : 'تکایە ناونیشانی کارەکە بنووسە.', type: 'warning' });
      return;
    }
    setSending(true);
    const payload = activeMode === 'job'
      ? { freelancer_id: freelancer.id, job_id: chosen.id, message: note.trim() }
      : { freelancer_id: freelancer.id, job_title: title.trim(), salary_offer: salary.trim(), message: note.trim(), details: { job_type: workTypes.find(t => t.id === jobType)?.name_ku || '', workplace_type: workplace, location: location.trim(), start_date: startDate, description: desc.trim() } };
    const ok = await sendInvitation(payload);
    setSending(false);
    if (ok) {
      soundService.playSuccess?.();
      fetchInvitations?.();
      onSendOffer?.({ freelancerId: freelancer.id, title: chosen?.title_ku || title });
      setSent(true);
    }
  };

  const field = 'w-full rounded-2xl border border-[#ddd6ec] bg-white px-4 py-3 text-[13px] font-bold text-[#16111d] outline-none transition placeholder:font-medium placeholder:text-[#a59fb3] focus:border-[#641bd9] focus:ring-4 focus:ring-[#641bd9]/10';
  const label = 'mb-1.5 block text-[11px] font-black text-[#5b5470]';

  return (
    <div dir="rtl" className="fixed inset-0 z-[9999] flex items-end justify-center bg-[#0b0711]/60 font-vazirmatn backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-[30px] bg-[#f7f5fb] shadow-2xl sm:max-w-lg sm:rounded-[30px]">

        {/* Header */}
        <div className="relative shrink-0 overflow-hidden px-5 pb-5 pt-5 text-white" style={{ background: GRAD }}>
          <div className="pointer-events-none absolute inset-0 opacity-[.07]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.9) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.9) 1px,transparent 1px)', backgroundSize: '32px 32px' }} />
          <button onClick={() => { soundService.playTick?.(); onClose(); }} aria-label="داخستن" className="absolute left-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-2xl bg-white/15 transition hover:bg-white/25 active:scale-95"><X className="h-5 w-5" /></button>
          <div className="relative flex items-center gap-3.5 pl-12">
            <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/30 bg-white/15 text-xl font-black">
              {freelancer.avatar ? <img src={freelancer.avatar} alt="" className="h-full w-full object-cover" /> : initial}
            </div>
            <div className="min-w-0">
              <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-bold"><Sparkles className="h-3 w-3" /> ناردنی ئۆفەری کار</div>
              <div className="truncate text-lg font-black leading-tight">{name}</div>
              <div className="truncate text-[11px] font-medium text-white/70">{freelancer.profession || freelancer.title || 'کارخواز'}{freelancer.governorate ? ` · ${freelancer.governorate}` : ''}</div>
            </div>
          </div>
        </div>

        {sent ? (
          <div className="flex flex-1 flex-col items-center px-6 py-10 text-center">
            <div className="grid h-20 w-20 place-items-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 className="h-10 w-10" /></div>
            <h3 className="mt-4 text-lg font-black text-[#16111d]">ئۆفەرەکە نێردرا</h3>
            <p className="mt-2 max-w-xs text-[13px] font-medium leading-7 text-[#6b647d]">
              ئۆفەرەکەت بۆ {name} گەیشت. کاتێک قبووڵی بکات یان ڕەتی بکاتەوە ئاگادارت دەکەینەوە، و لە داشبۆرد، بەشی «ئۆفەرەکان» دەتوانیت ببینیت.
            </p>
            <button onClick={onClose} className="mt-6 w-full rounded-2xl py-3.5 text-[13px] font-black text-white shadow-[0_10px_24px_rgba(100,27,217,.3)] active:scale-[.98]" style={{ background: `linear-gradient(135deg,#7229e8,${DEEP})` }}>باشە</button>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-5 overflow-y-auto p-5">

              {/* Existing job or a new one */}
              <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-[#ece7f4] p-1.5">
                {[['job', 'کارێکی بەردەست', Briefcase], ['new', 'کاری نوێ', PlusCircle]].map(([id, text, Icon]) => (
                  <button key={id} type="button" onClick={() => { soundService.playTick?.(); setMode(id); }}
                    className={`flex items-center justify-center gap-2 rounded-xl py-3 text-[12px] font-black transition ${activeMode === id ? 'bg-white text-[#4b13a5] shadow-sm' : 'text-[#7b7390]'}`}>
                    <Icon className="h-4 w-4" />{text}{id === 'job' && <span className="rounded-full bg-[#641bd9]/10 px-1.5 text-[10px]">{openJobs.length}</span>}
                  </button>
                ))}
              </div>

              {activeMode === 'job' ? (
                openJobs.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#cfc5e6] bg-white p-6 text-center text-[12px] font-bold text-[#7b7390]">هیچ کارێکی بەردەستت نییە. بە «کاری نوێ» ئۆفەر بنێرە.</div>
                ) : (
                  <div className="space-y-2.5">
                    {openJobs.map(j => {
                      const done = alreadyOffered.has(j.id);
                      const on = jobId === j.id;
                      const info = positionsInfo(j);
                      return (
                        <button key={j.id} type="button" disabled={done} onClick={() => { soundService.playTick?.(); setJobId(j.id); }}
                          className={`relative w-full rounded-2xl border p-3.5 text-right transition active:scale-[.99] ${done ? 'cursor-not-allowed border-[#e6e0f1] bg-[#f1eef7] opacity-60' : on ? 'border-[#641bd9] bg-white shadow-[0_8px_22px_rgba(100,27,217,.16)] ring-2 ring-[#641bd9]/20' : 'border-[#e6e0f1] bg-white'}`}>
                          <div className="flex items-start gap-3">
                            <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${on ? 'border-[#641bd9] bg-[#641bd9]' : 'border-[#cfc5e6]'}`}>{on && <span className="h-1.5 w-1.5 rounded-full bg-white" />}</span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <div className="truncate text-[14px] font-black text-[#16111d]">{j.title_ku || j.title}</div>
                                {done && <span className="shrink-0 rounded-full bg-[#ece7f4] px-2 py-0.5 text-[10px] font-black text-[#4b13a5]">نێردراوە</span>}
                              </div>
                              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold text-[#7b7390]">
                                <span className="inline-flex items-center gap-1" dir="ltr"><Wallet className="h-3.5 w-3.5 text-[#641bd9]" />{salaryText(j)}</span>
                                <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5 text-[#641bd9]" />{info.label}</span>
                                {j.deadline && <span className="inline-flex items-center gap-1" dir="ltr"><Clock className="h-3.5 w-3.5 text-amber-600" />{j.deadline}</span>}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )
              ) : (
                <div className="space-y-4 rounded-2xl border border-[#e6e0f1] bg-white p-4">
                  <div>
                    <label className={label}>ناونیشانی کار *</label>
                    <input value={title} onChange={e => setTitle(e.target.value)} placeholder="نموونە: دیزاینەری گرافیک" className={field} />
                  </div>
                  <div>
                    <label className={label}>مووچە (IQD)</label>
                    <input value={salary} onChange={e => setSalary(e.target.value)} inputMode="numeric" dir="ltr" placeholder="1,000,000" className={field + ' text-right'} />
                  </div>
                  {workTypes.length > 0 && (
                    <div>
                      <label className={label}>جۆری کار</label>
                      <div className="flex flex-wrap gap-2">{workTypes.map(t => <Chip key={t.id} on={jobType === t.id} onClick={() => setJobType(jobType === t.id ? '' : t.id)}>{t.name_ku}</Chip>)}</div>
                    </div>
                  )}
                  <div>
                    <label className={label}>شێوازی کار</label>
                    <div className="flex flex-wrap gap-2">{WORKPLACES.map(([id, text]) => <Chip key={id} on={workplace === id} onClick={() => setWorkplace(id)}>{text}</Chip>)}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={label}><MapPin className="ml-1 inline h-3 w-3" />شوێن</label>
                      <input value={location} onChange={e => setLocation(e.target.value)} placeholder="سلێمانی" className={field} />
                    </div>
                    <div>
                      <label className={label}>دەستپێکردن</label>
                      <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} min={new Date().toISOString().slice(0, 10)} className={field} />
                    </div>
                  </div>
                  <div>
                    <label className={label}>وردەکاری کار</label>
                    <textarea value={desc} onChange={e => setDesc(e.target.value.slice(0, 1500))} rows={3} placeholder="ئەرکەکان، مەرجەکان..." className={field + ' resize-none leading-7'} />
                  </div>
                </div>
              )}

              {/* Personal note */}
              <div>
                <label className={label}>نامەی تایبەت (ئارەزوومەندانە)</label>
                <textarea value={note} onChange={e => setNote(e.target.value.slice(0, 1000))} rows={3} placeholder="کورتە نامەیەک بۆ کارخوازەکە..." className={field + ' resize-none leading-7'} />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {QUICK.map(q => <button key={q} type="button" onClick={() => setNote(q)} className="rounded-full border border-[#ddd6ec] bg-white px-3 py-1.5 text-[10.5px] font-bold text-[#5b5470] active:scale-95">{q.length > 26 ? q.slice(0, 26) + '…' : q}</button>)}
                </div>
              </div>
            </div>

            <div className="shrink-0 border-t border-[#e6e0f1] bg-white/95 p-4 backdrop-blur" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
              {(chosen || (activeMode === 'new' && title.trim())) && (
                <div className="mb-3 truncate text-center text-[11px] font-bold text-[#7b7390]">ئۆفەر بۆ: <span className="text-[#4b13a5]">{chosen?.title_ku || title}</span></div>
              )}
              <button onClick={submit} disabled={sending || !canSend}
                className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[13px] font-black text-white shadow-[0_12px_28px_rgba(100,27,217,.32)] transition active:scale-[.98] disabled:opacity-50 disabled:shadow-none"
                style={{ background: `linear-gradient(135deg,#7229e8,${DEEP})` }}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {sending ? 'دەنێردرێت...' : 'ناردنی ئۆفەر'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
