import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { soundService } from '../../services/soundService';
import { EditJobModal } from './EditJobModal';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { HeroControls } from '../layout/HeroControls';
import { StickyProfileBar } from '../layout/StickyProfileBar';
import { positionsInfo } from '../../utils/jobPositions';
import { sectorLabel } from '../../data/jobSectors';
import {
  ArrowRight, MapPin, Briefcase, Wallet, Calendar, Edit, Trash2, Tag, Clock, Building2,
  Share2, Copy, Check, Eye, Users, Home, Layers, PauseCircle,
} from 'lucide-react';

// Shared light theme — same tokens as Dashboard, UserProfilePage, HowItWorksPage.
const NK = "'Noto Kufi Arabic', 'Vazirmatn', system-ui, sans-serif";
const TEAL = '#641bd9';
const TEAL_SOFT = '#ece7f4';
const BG = '#f5f4f7';
const BORDER = '#eae8ee';
const TXT = '#16111d';
const MUTED = '#7b8e88';

const WORKPLACE_LABELS = { onSite: 'لەسەر شوێن', remote: 'کاتی ئازاد', hybrid: 'تێکەڵ' };
const GOV_LABELS = { sulaymaniyah: 'سلێمانی', erbil: 'هەولێر', duhok: 'دهۆک', kirkuk: 'کەرکووک', halabja: 'هەڵەبجە' };
const STATUS = {
  pending: { label: 'چاوەڕوانی پەسەندکردن', cls: 'bg-amber-400/20 text-amber-100 border-amber-300/40' },
  rejected: { label: 'ڕەتکراوە', cls: 'bg-rose-400/20 text-rose-100 border-rose-300/40' },
  closed: { label: 'بەسەرچووە', cls: 'bg-white/10 text-white/80 border-white/25' },
  paused: { label: 'وەستێنراوە', cls: 'bg-white/10 text-white/80 border-white/25' },
  active: { label: 'چالاکە', cls: 'bg-emerald-400/20 text-emerald-100 border-emerald-300/40' },
};

const formatSalary = (job) => {
  let min = Number(job?.salary_min) || 0;
  let max = Number(job?.salary_max) || 0;
  if (min && max && min > max) [min, max] = [max, min];
  if (!min && !max) return 'وەک گفتوگۆ';
  if (min && max && min !== max) return `${min.toLocaleString()} - ${max.toLocaleString()} IQD`;
  return `${(max || min).toLocaleString()} IQD`;
};

const formatDate = (value) => {
  if (!value) return '';
  try { return new Date(value).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch { return value; }
};

const parseSkills = (raw) => {
  if (Array.isArray(raw)) return raw;
  try { const v = JSON.parse(raw || '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
};

// One row of the "key facts" card. `ltr` keeps numbers/ranges/dates from rendering reversed inside this RTL page.
const Fact = ({ icon: Icon, label, value, ltr, tone }) => (
  <div className="flex items-center gap-3 rounded-2xl bg-[#f8f6fc] px-3.5 py-3">
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white shadow-sm" style={{ color: tone || TEAL }}><Icon className="h-[18px] w-[18px]" /></span>
    <div className="min-w-0 flex-1">
      <div className="text-[10px] font-bold" style={{ color: MUTED }}>{label}</div>
      <div className="mt-0.5 break-words text-[13px] font-black" dir={ltr ? 'ltr' : undefined} style={{ color: TXT, textAlign: 'right' }}>{value}</div>
    </div>
  </div>
);

// The post form stores the description as "Title:\n• item\n• item" blocks; show them as real sections.
const parseDescription = (text) => String(text || '').split(/\n{2,}/).map(b => b.trim()).filter(Boolean).map(b => {
  const lines = b.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length > 1 && /:\s*$/.test(lines[0])) return { head: lines[0].replace(/:\s*$/, ''), lines: lines.slice(1) };
  return { head: null, lines };
});

// A real routed page (/dashboard/jobs/:id) — replaces the old JobDetailViewModal.
// The job comes from the store by id, so a refresh or a shared/bookmarked link works.
export const JobDetailPage = ({ jobId, onBack }) => {
  const { user } = useAuth();
  const { jobs = [], workTypes = [], deleteJob } = useStore();
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const isAdmin = user?.role === 'admin' || user?.role === 'owner';
  const job = useMemo(() => {
    const found = jobs.find(j => String(j.id) === String(jobId));
    if (!found) return null;
    // Server enforces ownership on edit/delete; this only stops the page showing someone else's job.
    return isAdmin || String(found.company_id) === String(user?.id) ? found : null;
  }, [jobs, jobId, user, isAdmin]);

  // Arriving from the dashboard list keeps its scroll offset otherwise, so the page opens mid-way down.
  useEffect(() => { window.scrollTo(0, 0); }, [jobId]);

  const back = () => { soundService.playTick?.(); onBack?.(); };

  if (!job) {
    return (
      <div dir="rtl" className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center" style={{ background: BG, fontFamily: NK }}>
        <div className="text-sm font-black" style={{ color: TXT }}>{jobs.length === 0 ? 'کەمێک چاوەڕوان بە...' : 'ئەم هەلە کارە نەدۆزرایەوە'}</div>
        <button onClick={back} className="px-5 py-3 rounded-2xl text-white text-xs font-black" style={{ background: TEAL }}>گەڕانەوە بۆ داشبۆرد</button>
      </div>
    );
  }

  const skills = parseSkills(job.required_skills);
  const title = job.title_ku || job.title || 'هەلی کار';
  const companyName = job.company_name || user?.company_name || 'کۆمپانیا';
  const location = [GOV_LABELS[job.governorate_id], job.location_detail].filter(Boolean).join('، ') || 'کوردستان';
  const type = workTypes.find(t => t.id === job.job_type)?.name_ku || '—';
  const workplace = WORKPLACE_LABELS[job.workplace_type] || 'لەسەر شوێن';
  const status = STATUS[job.status] || STATUS.active;

  const handleShare = async () => {
    const text = `${title} — ${companyName}\n${location}`;
    try {
      if (navigator.share) { await navigator.share({ title, text }); return; }
      await navigator.clipboard?.writeText(text);
      setCopied(true);
      soundService.playTick?.();
      setTimeout(() => setCopied(false), 1600);
    } catch { /* user dismissed the share sheet */ }
  };

  const pos = positionsInfo(job);
  const pct = Math.min(100, Math.round((pos.hired / pos.positions) * 100));
  const blocks = parseDescription(job.description);
  const GRAD = 'linear-gradient(155deg,#7229e8 0%,#5513bf 48%,#1d0740 100%)';

  return (
    <div dir="rtl" className="min-h-screen pb-28" style={{ background: BG, color: TXT, fontFamily: NK }}>
      <StickyProfileBar title={title} subtitle={`${companyName} · ${status.label}`} avatar={job.company_logo} onBack={back} onShare={handleShare} />

      {/* Hero */}
      <section className="relative overflow-hidden rounded-b-[34px] text-white shadow-[0_18px_44px_rgba(29,7,64,.25)]" style={{ background: GRAD, marginTop: 'calc(-1 * env(safe-area-inset-top))' }}>
        {job.company_cover && <img src={job.company_cover} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20" />}
        <div className="pointer-events-none absolute inset-0 opacity-[.07]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.9) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.9) 1px,transparent 1px)', backgroundSize: '36px 36px' }} />
        <HeroControls onBack={back} actions={[{ icon: copied ? Check : Share2, label: 'هاوبەشکردن', onClick: handleShare, active: copied }]} />

        <div className="relative mx-auto max-w-4xl px-4 pb-8 sm:px-6" style={{ paddingTop: 'calc(88px + env(safe-area-inset-top))' }}>
          <div className="flex items-start gap-4">
            <div className="grid h-[68px] w-[68px] shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/25 bg-white/15 shadow-lg">
              {job.company_logo && !logoError
                ? <img src={job.company_logo} alt="" onError={() => setLogoError(true)} className="h-full w-full object-cover" />
                : <Building2 className="h-7 w-7" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${status.cls}`}>{status.label}</span>
                {job.created_at && <span className="text-[10px] font-bold text-white/60">بڵاوکراوەتەوە: {formatDate(job.created_at)}</span>}
              </div>
              <h1 className="mt-2 text-[22px] font-black leading-snug sm:text-3xl">{title}</h1>
              <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-white/70"><Building2 className="h-3.5 w-3.5" /> {companyName}</div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-2.5">
            {[[Eye, 'بینین', Number(job.views || 0).toLocaleString()], [Users, 'داواکاری', Number(job.applications_count || 0).toLocaleString()], [Layers, 'کارخواز پێویستە', pos.positions.toLocaleString()]].map(([Ic, l, v]) => (
              <div key={l} className="rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur">
                <Ic className="mb-1.5 h-4 w-4 text-white/70" />
                <div className="text-lg font-black leading-none" dir="ltr" style={{ textAlign: 'right' }}>{v}</div>
                <div className="mt-1 text-[10px] font-bold text-white/60">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="relative z-10 mx-auto max-w-4xl space-y-4 px-4 pt-4 sm:px-6">

        {/* Hiring progress */}
        <section className="rounded-3xl border bg-white p-5 shadow-[0_10px_30px_rgba(29,7,64,.06)]" style={{ borderColor: BORDER }}>
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-black">پێشکەوتنی وەرگرتن</div>
            <div className="text-sm font-black" dir="ltr" style={{ color: pos.full ? '#b42318' : TEAL }}>{pos.hired} / {pos.positions}</div>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#ece7f4]">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: pos.full ? 'linear-gradient(90deg,#f97066,#b42318)' : 'linear-gradient(90deg,#9d74e0,#641bd9)' }} />
          </div>
          <p className="mt-2.5 flex items-center gap-1.5 text-[11px] font-medium" style={{ color: MUTED }}>
            {pos.full ? <><PauseCircle className="h-3.5 w-3.5" /> ژمارەی پێویست تەواو بوو — کارەکە خۆکارانە وەستێنرا.</> : `کاتێک ${pos.positions} کارخواز وەردەگیرێت، کارەکە خۆکارانە دەوەستێت.`}
          </p>

          <div className="mt-4 flex flex-wrap gap-2.5">
            <button onClick={() => { soundService.playTick?.(); setEditing(true); }}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-xs font-black text-white shadow-[0_10px_24px_rgba(100,27,217,.3)] transition-transform active:scale-[.98] sm:flex-none sm:min-w-[200px]"
              style={{ background: 'linear-gradient(135deg,#7229e8,#4b13a5)' }}>
              <Edit className="h-4 w-4" /> دەستکاریکردنی ئەم هەلە
            </button>
            <button onClick={handleShare}
              className="hidden items-center gap-2 rounded-2xl border bg-white px-4 py-3.5 text-xs font-black hover:bg-[#f3f0f7] lg:flex" style={{ borderColor: BORDER }}>
              {copied ? <Check className="h-4 w-4" style={{ color: TEAL }} /> : <Copy className="h-4 w-4" />} {copied ? 'کۆپیکرا' : 'کۆپی / هاوبەشکردن'}
            </button>
            <button onClick={() => { soundService.playTick?.(); setConfirmDelete(true); }}
              className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-xs font-black text-rose-700 transition hover:bg-rose-100 active:scale-95"
              aria-label="سڕینەوە">
              <Trash2 className="h-4 w-4" /> سڕینەوە
            </button>
          </div>
        </section>

        {/* Key facts */}
        <section className="rounded-3xl border bg-white p-4 sm:p-5" style={{ borderColor: BORDER }}>
          <h2 className="mb-3 px-1 text-sm font-black">زانیاری سەرەکی</h2>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <Fact icon={Wallet} label="مووچە" value={formatSalary(job)} ltr />
            <Fact icon={Briefcase} label="جۆری کار" value={type} />
            <Fact icon={Building2} label="جۆری کەرت" value={sectorLabel(job.sector) || 'دیارینەکراوە'} />
            <Fact icon={Home} label="شێوازی کار" value={workplace} />
            <Fact icon={MapPin} label="شوێن" value={location} />
            <Fact icon={Clock} label="کۆتایی وادە" value={job.deadline || 'دیارینەکراوە'} tone="#b45309" ltr={!!job.deadline} />
          </div>
        </section>

        {/* Description */}
        <section className="rounded-3xl border bg-white p-5 sm:p-6" style={{ borderColor: BORDER }}>
          <h2 className="mb-4 text-sm font-black">وەسفی هەلی کارەکە</h2>
          {blocks.length === 0 ? (
            <p className="text-sm" style={{ color: MUTED }}>هیچ وەسفێک زیاد نەکراوە.</p>
          ) : (
            <div className="space-y-5">
              {blocks.map((b, i) => (
                <div key={i}>
                  {b.head && <h3 className="mb-2 flex items-center gap-2 text-[13px] font-black" style={{ color: '#4b13a5' }}><span className="h-2 w-2 rounded-full" style={{ background: TEAL }} />{b.head}</h3>}
                  <div className="space-y-1.5">
                    {b.lines.map((l, k) => /^[•\-–·*]\s*/.test(l)
                      ? <div key={k} className="flex items-start gap-2 text-[13px] leading-7" style={{ color: '#4a4358' }}><span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-[#b9a3e8]" />{l.replace(/^[•\-–·*]\s*/, '')}</div>
                      : <p key={k} className="text-[13px] leading-7" style={{ color: '#4a4358' }}>{l}</p>)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {skills.length > 0 && (
          <section className="rounded-3xl border bg-white p-5 sm:p-6" style={{ borderColor: BORDER }}>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-black"><Tag className="h-4 w-4" style={{ color: TEAL }} /> بەهرە پێویستەکان</h2>
            <div className="flex flex-wrap gap-2">
              {skills.map((sk, i) => (
                <span key={i} className="rounded-xl border px-3.5 py-1.5 text-xs font-bold" style={{ background: TEAL_SOFT, color: '#4b13a5', borderColor: '#d8cee9' }}>{sk}</span>
              ))}
            </div>
          </section>
        )}
      </div>

      {editing && <EditJobModal job={job} isOpen={editing} onClose={() => setEditing(false)} />}

      <ConfirmationModal
        isOpen={confirmDelete}
        isDangerous
        title="سڕینەوەی هەلی کار"
        message={`ئایا دڵنیایت دەتەوێت "${title}" بسڕیتەوە؟`}
        confirmText="سڕینەوە"
        onConfirm={async () => { setConfirmDelete(false); await deleteJob?.(job.id); onBack?.(); }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
};
