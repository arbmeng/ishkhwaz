import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { soundService } from '../../services/soundService';
import { EditJobModal } from './EditJobModal';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { HeroControls } from '../layout/HeroControls';
import { sectorLabel } from '../../data/jobSectors';
import {
  ArrowRight, MapPin, Briefcase, Wallet, Calendar, Edit, Trash2, Tag, Clock, Building2,
  Share2, Copy, Check, Eye, Users, Home,
} from 'lucide-react';

// Shared light theme — same tokens as Dashboard, UserProfilePage, HowItWorksPage.
const NK = "'Noto Kufi Arabic', 'Vazirmatn', system-ui, sans-serif";
const TEAL = '#12796b';
const TEAL_SOFT = '#e7f4f1';
const BG = '#f4f7f6';
const BORDER = '#e8eeec';
const TXT = '#111d1a';
const MUTED = '#7b8e88';

const WORKPLACE_LABELS = { onSite: 'لەسەر شوێن', remote: 'کاتی ئازاد', hybrid: 'تێکەڵ' };
const GOV_LABELS = { sulaymaniyah: 'سلێمانی', erbil: 'هەولێر', duhok: 'دهۆک', kirkuk: 'کەرکووک', halabja: 'هەڵەبجە' };
const STATUS = {
  pending: { label: 'چاوەڕوانی پەسەندکردن', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  rejected: { label: 'ڕەتکراوە', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  closed: { label: 'بەسەرچووە', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  paused: { label: 'ناچالاککراوە', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  active: { label: 'چالاکە', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

const formatSalary = (job) => {
  const min = Number(job?.salary_min) || 0;
  const max = Number(job?.salary_max) || 0;
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

// `ltr` for numbers/ranges/dates: inside this RTL page "1,200,000 - 1,800,000" otherwise renders reversed.
const Stat = ({ icon: Icon, label, value, tone, ltr }) => (
  <div className="p-4 rounded-2xl bg-white border text-right" style={{ borderColor: BORDER }}>
    <Icon className="w-4 h-4 mb-2" style={{ color: tone || TEAL }} />
    <div className="text-[10px] font-bold" style={{ color: MUTED }}>{label}</div>
    <div className={`text-xs font-black mt-0.5 break-words ${ltr ? 'text-right' : ''}`} dir={ltr ? 'ltr' : undefined} style={{ color: TXT }}>{value}</div>
  </div>
);

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

  return (
    <div dir="rtl" className="min-h-screen pb-28" style={{ background: BG, color: TXT, fontFamily: NK }}>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 lg:pt-6 space-y-4">

        {/* Hero */}
        <div className="rounded-3xl bg-white border overflow-hidden" style={{ borderColor: BORDER }}>
          <div className="relative h-32 sm:h-44" style={{ background: `linear-gradient(135deg, ${TEAL}, #0d5c50)` }}>
            <HeroControls onBack={back} actions={[{ icon: copied ? Check : Share2, label: 'هاوبەشکردن', onClick: handleShare, active: copied }]} />
            {job.company_cover && (
              <img src={job.company_cover} alt="" className="absolute inset-0 w-full h-full object-cover" />
            )}
          </div>
          <div className="px-5 sm:px-7 pb-6 -mt-9 relative">
            <div className="w-[72px] h-[72px] rounded-2xl bg-white border-4 border-white shadow-md overflow-hidden flex items-center justify-center mr-0" style={{ background: TEAL_SOFT }}>
              {job.company_logo && !logoError
                ? <img src={job.company_logo} alt="" onError={() => setLogoError(true)} className="w-full h-full object-cover" />
                : <Building2 className="w-7 h-7" style={{ color: TEAL }} />}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full border text-[10px] font-black ${status.cls}`}>{status.label}</span>
              {job.created_at && <span className="text-[10px] font-bold" style={{ color: MUTED }}>بڵاوکراوەتەوە: {formatDate(job.created_at)}</span>}
            </div>
            <h1 className="mt-2 text-xl sm:text-2xl font-black leading-snug">{title}</h1>
            <div className="mt-1.5 text-xs font-bold flex items-center gap-1.5" style={{ color: MUTED }}>
              <Building2 className="w-3.5 h-3.5" /> {companyName}
            </div>

            <div className="mt-5 flex flex-wrap gap-2.5">
              <button onClick={() => { soundService.playTick?.(); setEditing(true); }}
                className="flex-1 sm:flex-none sm:min-w-[200px] py-3 px-5 rounded-2xl text-white text-xs font-black flex items-center justify-center gap-2 active:scale-[.98] transition-transform"
                style={{ background: TEAL }}>
                <Edit className="w-4 h-4" /> دەستکاریکردنی ئەم هەلە
              </button>
              <button onClick={handleShare}
                className="hidden lg:flex py-3 px-4 rounded-2xl bg-white border text-xs font-black items-center gap-2 hover:bg-[#f0f7f5]" style={{ borderColor: BORDER }}>
                {copied ? <Check className="w-4 h-4" style={{ color: TEAL }} /> : <Copy className="w-4 h-4" />} {copied ? 'کۆپیکرا' : 'کۆپی / هاوبەشکردن'}
              </button>
              <button onClick={() => { soundService.playTick?.(); setConfirmDelete(true); }}
                className="py-3 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-black flex items-center gap-2 active:scale-95 transition"
                aria-label="سڕینەوە">
                <Trash2 className="w-4 h-4" /> سڕینەوە
              </button>
            </div>
          </div>
        </div>

        {/* Key facts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat icon={Wallet} label="مووچە" value={formatSalary(job)} ltr />
          <Stat icon={Briefcase} label="جۆری کار" value={type} />
          <Stat icon={Building2} label="جۆری کەرت" value={sectorLabel(job.sector) || 'دیارینەکراوە'} />
          <Stat icon={Home} label="شێوازی کار" value={workplace} />
          <Stat icon={Clock} label="کۆتایی وادە" value={job.deadline || 'دیارینەکراوە'} tone="#b45309" ltr={!!job.deadline} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Stat icon={Eye} label="بینین" value={Number(job.views || 0).toLocaleString()} ltr />
          <Stat icon={Users} label="داواکاری" value={Number(job.applications_count || 0).toLocaleString()} ltr />
        </div>

        <div className="p-4 rounded-2xl bg-white border flex items-center gap-2.5 text-xs font-bold" style={{ borderColor: BORDER }}>
          <MapPin className="w-4 h-4 shrink-0" style={{ color: TEAL }} /> <span>{location}</span>
        </div>

        {/* Description */}
        <section className="p-5 sm:p-6 rounded-3xl bg-white border space-y-3" style={{ borderColor: BORDER }}>
          <h2 className="text-sm font-black">وەسفی هەلی کارەکە</h2>
          <p className="text-sm leading-8 whitespace-pre-line" style={{ color: '#4a5b55' }}>
            {job.description || 'هیچ وەسفێک زیاد نەکراوە.'}
          </p>
        </section>

        {skills.length > 0 && (
          <section className="p-5 sm:p-6 rounded-3xl bg-white border space-y-3" style={{ borderColor: BORDER }}>
            <h2 className="text-sm font-black flex items-center gap-2"><Tag className="w-4 h-4" style={{ color: TEAL }} /> بەهرە پێویستەکان</h2>
            <div className="flex flex-wrap gap-2">
              {skills.map((sk, i) => (
                <span key={i} className="px-3.5 py-1.5 rounded-xl text-xs font-bold border" style={{ background: TEAL_SOFT, color: TEAL, borderColor: '#cfe8e2' }}>{sk}</span>
              ))}
            </div>
          </section>
        )}

        {job.created_at && (
          <div className="flex items-center gap-1.5 text-[10px] font-mono" style={{ color: MUTED }}>
            <Calendar className="w-3.5 h-3.5" /> {formatDate(job.created_at)}
          </div>
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
