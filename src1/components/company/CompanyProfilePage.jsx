import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../../context/StoreContext';
import { soundService } from '../../services/soundService';
import { apiService } from '../../services/api';
import { StarRatingDisplay } from '../ui/StarRating';
import { Monogram } from '../ui/Monogram';
import { JobDetailModal } from '../freelancer/JobDetailModal';
import {
  ArrowLeft, MapPin, Phone, Mail, Globe, Briefcase, CheckCircle2,
  Share2, Send, BadgeCheck, ExternalLink, Sparkles, Copy, Clock3,
  Users, ShieldCheck, ChevronRight, Search, Building2, Star, X
} from 'lucide-react';

// Brand teal — matches the logo mark and the rest of the light screens.
const TEAL = '#12796b';
const TEAL_DEEP = '#0d5c50';
const TEAL_SOFT = '#e7f4f1';

// Brand-tinted fallback for a company with no uploaded cover photo — a soft
// gradient reads as a deliberate empty state, unlike a diagonal-stripe
// pattern which looks like an unfinished dev placeholder.
const NO_COVER_BG = 'radial-gradient(120% 140% at 20% 0%, #cdeae4 0%, #eaf6f3 45%, #f4f7f6 100%)';

const JOB_TYPE_LABELS = { fullTime: 'کاتی تەواو', partTime: 'کاتی بەشی', contract: 'پڕۆژەیی', internship: 'ماوەی فێربوون', remote: 'لە ماڵەوە' };
const WORKPLACE_LABELS = { onSite: 'لەسەر شوێن', remote: 'کاتی ئازاد', hybrid: 'تێکەڵ' };

const formatSalary = (job) => {
  const min = job.salary_min ?? job.salaryMin;
  const max = job.salary_max ?? job.salaryMax;
  if (!min && !max) return null;
  if (min && max && Number(min) !== Number(max)) return `${Number(min).toLocaleString()} - ${Number(max).toLocaleString()} IQD`;
  return `${Number(min || max).toLocaleString()} IQD`;
};

const postedAgo = (iso) => {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const day = Math.floor(diffMs / 86400000);
  if (day < 1) return 'ئەمڕۆ';
  if (day === 1) return 'دوێنێ';
  if (day < 30) return `${day} ڕۆژ لەمەوپێش`;
  const month = Math.floor(day / 30);
  return `${month} مانگ لەمەوپێش`;
};

const getJobLocation = (job) => {
  const gov = job?.governorate || job?.governorateName || job?.governorate_id || '';
  return job?.location_detail || gov || 'کوردستان';
};

const getJobType = (job) => JOB_TYPE_LABELS[job?.job_type] || job?.job_type || 'کاتی تەواو';
const getWorkplace = (job) => WORKPLACE_LABELS[job?.workplace_type] || job?.workplace_type || 'لەسەر شوێن';

const isNewJob = (job) => {
  if (!job?.created_at) return false;
  const age = Date.now() - new Date(job.created_at).getTime();
  return age >= 0 && age < 3 * 86400000;
};

const companyInitials = (name = '') => {
  const parts = String(name).trim().split(/\\s+/).filter(Boolean);
  return (parts.slice(0, 2).map(x => x[0]).join('') || 'K').toUpperCase();
};

const infoRow = (Icon, label, value, mono = false, isLink = false, linkHref = '') => (
  <div key={label} className="flex items-center gap-3 py-3.5 border-b border-stone-100 last:border-b-0">
    <span className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: TEAL_SOFT }}>
      <Icon className="w-4 h-4" style={{ color: TEAL }} />
    </span>
    <span className="flex-1 text-xs text-stone-400 font-bold">{label}</span>
    {isLink ? (
      <a href={linkHref} target="_blank" rel="noopener noreferrer" className="text-sm font-bold truncate hover:underline flex items-center gap-1" style={{ color: TEAL }} dir={mono ? 'ltr' : undefined}>
        {value} <ExternalLink className="w-3 h-3" />
      </a>
    ) : (
      <span className={`text-sm font-bold text-stone-900 truncate ${mono ? 'font-mono' : ''}`} dir={mono ? 'ltr' : undefined}>{value}</span>
    )}
  </div>
);

export const CompanyProfilePage = ({ company, jobs = [], onBack, initialJobId }) => {
  const { applications = [], addToast } = useStore();
  const [activeJobDetailModal, setActiveJobDetailModal] = useState(null);
  const [activeTab, setActiveTab] = useState('about');
  const [jobQuery, setJobQuery] = useState('');
  const [copied, setCopied] = useState(false);

  const compName = (company.name || company.company_name || '').trim().toLowerCase();
  const compId = company.id ? String(company.id) : null;

  const [ratingSummary, setRatingSummary] = useState({ average: 0, count: 0 });
  useEffect(() => {
    if (!compId) return;
    apiService.getRatings(compId).then(r => setRatingSummary({ average: r.average, count: r.count }));
  }, [compId]);

  // Real view tracking — company analytics (trend view) depends on this
  // actually being logged; before this it only ever happened for freelancers.
  useEffect(() => {
    if (compId) apiService.registerFreelancerView(compId);
  }, [compId]);

  const companyJobs = (Array.isArray(jobs) ? jobs : []).filter(j => {
    if (!j) return false;
    const jName = (j.company_name || j.companyName || j.company || '').trim().toLowerCase();
    const matchName = jName && compName && jName === compName;
    const matchId = compId && (String(j.company_id) === compId || String(j.employer_id) === compId || String(j.user_id) === compId);
    return matchName || matchId;
  });

  const memberSinceYear = companyJobs.reduce((earliest, j) => {
    if (!j.created_at) return earliest;
    const y = new Date(j.created_at).getFullYear();
    return (!earliest || y < earliest) ? y : earliest;
  }, company.member_since ? new Date(company.member_since).getFullYear() : null);

  useEffect(() => {
    if (initialJobId) {
      const targetJob = companyJobs.find(j => String(j.id) === String(initialJobId));
      if (targetJob) {
        setActiveJobDetailModal(targetJob);
        setActiveTab('jobs');
      }
    }
  }, [initialJobId]);

  // Same lock technique as KarnamaAiChatModal/MessageThreadModal — pinning
  // body via position:fixed instead of merely toggling overflow:hidden.
  // The overflow-only approach (this file's previous fix) has a known
  // WebKit quirk: toggling overflow on html/body *after* first paint can
  // leave an already-mounted position:fixed descendant using a stale,
  // miscalculated viewport rect until the next reflow — a real, if
  // intermittent, cause of a transient horizontal misalignment on real iOS
  // Safari (not reproducible in desktop Chromium). Setting body itself to
  // position:fixed removes it from the flow entirely, sidestepping the
  // quirk rather than racing it.
  useEffect(() => {
    const scrollY = window.scrollY;
    const { style } = document.body;
    const prev = { position: style.position, top: style.top, width: style.width, overflow: style.overflow };
    style.position = 'fixed'; style.top = `-${scrollY}px`; style.width = '100%'; style.overflow = 'hidden';
    return () => { Object.assign(style, prev); window.scrollTo(0, scrollY); };
  }, []);

  const handleOpenJobDetail = (job) => {
    soundService.playTick?.();
    setActiveJobDetailModal(job);
    if (typeof window !== 'undefined') {
      const shareUrl = `/search?company=${encodeURIComponent(company.name || '')}&job=${encodeURIComponent(job.id)}`;
      try { window.history.pushState({ company: company.name, job: job.id }, '', shareUrl); } catch (e) { }
    }
  };

  const handleCloseJobDetail = () => {
    soundService.playTick?.();
    setActiveJobDetailModal(null);
    if (typeof window !== 'undefined') {
      const compUrl = `/search?company=${encodeURIComponent(company.name || '')}`;
      try { window.history.pushState({ company: company.name }, '', compUrl); } catch (e) { }
    }
  };

  const handleShareJob = (job, e) => {
    if (e) e.stopPropagation();
    soundService.playTick?.();
    // Routed through the API's crawler-aware share preview (real per-job OG
    // tags for WhatsApp/Telegram/etc.), not the bare SPA URL directly — see
    // GET /share/job/{id} in public/api/index.php.
    const shareUrl = `${window.location.origin}/share/job/${encodeURIComponent(job.id)}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      addToast?.({ title: 'کۆپیکرا ✓', message: 'لینکی هەلی کارەکە کۆپیکرا.', type: 'success' });
    }
  };

  const handleShare = () => {
    soundService.playTick?.();
    const companyUrl = `${window.location.origin}/share/company/${encodeURIComponent(company.id || '')}`;
    if (navigator.share) {
      navigator.share({ title: `${company.name || 'کۆمپانیا'} — ئیش خواز`, url: companyUrl }).catch(() => { });
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(companyUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
      addToast?.({ title: 'کۆپیکرا ✓', message: 'لینکی پڕۆفایلی کۆمپانیا کۆپیکرا.', type: 'success' });
    }
  };

  const filteredJobs = companyJobs.filter(job => {
    const q = jobQuery.trim().toLowerCase();
    if (!q) return true;
    return [job.title_ku, job.title, job.description, job.location_detail, getJobType(job), getWorkplace(job)]
      .filter(Boolean).join(' ').toLowerCase().includes(q);
  });

  const hasAboutInfo = !!(company.description || company.phone || company.company_phone || company.email || company.company_email || company.regNumber || company.company_reg || company.industry);
  const cleanPhone = (company.phone || company.company_phone || '').replace(/[^0-9+]/g, '');
  const displayPhone = company.phone || company.company_phone || '';
  const displayEmail = company.email || company.company_email || '';
  const displayReg = company.regNumber || company.company_reg || '';
  const displayIndustry = company.industry || company.company_industry || 'کۆمپانیا و بازرگانی';
  const displayGov = company.governorate || company.governorateName || 'کوردستان';


  const premiumStyles = `
    .company-profile-shell { position: relative; }
    .company-profile-shell::before {
      content: "";
      position: fixed;
      inset: 0;
      pointer-events: none;
      background:
        radial-gradient(700px 300px at 50% -80px, rgba(18,121,107,.10), transparent 70%),
        radial-gradient(500px 260px at 100% 45%, rgba(18,121,107,.045), transparent 70%);
      z-index: -1;
    }
    @media (min-width: 1024px) {
      .company-profile-shell { padding-bottom: 72px; }
      .company-profile-shell .company-desktop-card {
        border: 1px solid rgba(231,229,228,.9);
        box-shadow: 0 18px 60px rgba(15,23,42,.055);
      }
      .company-profile-shell .company-job-card {
        min-height: 250px;
        display: flex;
        flex-direction: column;
      }
      .company-profile-shell .company-job-card > button:last-child {
        margin-top: auto;
      }
    }
    @media (min-width: 1440px) {
      .company-profile-shell { padding-left: 40px; padding-right: 40px; }
    }
    @media (max-width: 639px) {
      .company-profile-shell { overflow-x: hidden; }
    }
  `;
  return createPortal((
    <>
      <style>{premiumStyles}</style>
      <div dir="rtl" className="fixed inset-0 z-[60] overflow-y-auto select-none animate-fadeIn font-vazirmatn"
        style={{ background: 'linear-gradient(180deg,#f8faf9 0%,#f4f7f6 38%,#eef3f1 100%)', color: '#111', WebkitOverflowScrolling: 'touch' }}
      >
        {/* ── BANNER ── */}
        <div className="relative w-full h-48 sm:h-56 lg:h-72 xl:h-80 bg-[#0d1a17] overflow-hidden">
          {company.cover || company.company_cover ? (
            <>
              {/* Blurred fill so letterboxing (when the uploaded image's
                  aspect ratio doesn't match the banner) doesn't show flat
                  empty bars — same idea as Spotify/Apple Music album art. */}
              <img
                src={company.cover || company.company_cover}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-50"
              />
              {/* Full image, never cropped — object-contain instead of
                  object-cover so text/logos near the edges (like a shop's
                  phone number printed along the bottom) never get cut off. */}
              <img
                src={company.cover || company.company_cover}
                alt=""
                className="absolute inset-0 w-full h-full object-contain"
              />
            </>
          ) : (
            <div className="absolute inset-0" style={{ background: NO_COVER_BG }} />
          )}

          <button
            onClick={() => { soundService.playTick?.(); if (onBack) onBack(); }}
            aria-label="گەڕانەوە"
            className="absolute right-4 sm:right-6 lg:right-8 w-10 h-10 rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.12)] flex items-center justify-center active:scale-95 transition-transform"
            style={{ top: 'max(1rem, calc(env(safe-area-inset-top) + 0.5rem))' }}
          >
            <ArrowLeft className="w-4.5 h-4.5 rtl:rotate-180 text-stone-700" />
          </button>
          <button
            onClick={handleShare}
            aria-label="بەشداریکردن"
            className="absolute left-4 sm:left-6 lg:left-8 w-10 h-10 rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.12)] flex items-center justify-center active:scale-95 transition-transform"
            style={{ top: 'max(1rem, calc(env(safe-area-inset-top) + 0.5rem))' }}
          >
            <Share2 className="w-4 h-4 text-stone-700" />
          </button>
        </div>

        <div className="company-profile-shell w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 xl:px-10" style={{ paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom))' }}>
          {/* ── IDENTITY ── */}
          <div className="mt-4 lg:-mt-10 relative z-10 flex items-end justify-between">
            {company.logo || company.company_logo ? (
              <img src={company.logo || company.company_logo} alt={company.name} className="w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 rounded-3xl object-cover border-4 border-white shadow-md bg-white" />
            ) : (
              <Monogram name={company.name || 'کۆمپانیا'} textClassName="text-2xl lg:text-3xl" className="w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 rounded-3xl border-4 border-white shadow-md" />
            )}

            {companyJobs.length > 0 && (
              <span className="px-3 py-1.5 rounded-full text-xs font-black bg-white shadow-sm border border-stone-200" style={{ color: TEAL }}>
                {companyJobs.length} هەلی کاری چالاک
              </span>
            )}
          </div>

          <div className="mt-3 lg:mt-4">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-stone-900 tracking-tight">{company.name}</h1>
              {company.verified && (
                <BadgeCheck className="w-[18px] h-[18px]" style={{ color: '#3b82f6' }} title="کۆمپانیای پشکنراو" />
              )}
            </div>
            <p className="text-xs sm:text-sm text-stone-400 font-bold mt-1">
              {[displayIndustry, displayGov].filter(Boolean).join('، ')}
            </p>
            {ratingSummary.count > 0 && (
              <div className="mt-1.5">
                <StarRatingDisplay average={ratingSummary.average} count={ratingSummary.count} />
              </div>
            )}
          </div>

          {/* ── TRUST / STATS ── */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:gap-4 mt-4 lg:mt-5">
            <div className="rounded-2xl bg-white border border-stone-100 shadow-[0_4px_20px_rgba(0,0,0,0.035)] p-3 text-center">
              <div className="text-lg font-black text-stone-900">{companyJobs.length}</div>
              <div className="text-[10px] text-stone-400 font-bold mt-0.5">هەلی کار</div>
            </div>
            <div className="rounded-2xl bg-white border border-stone-100 shadow-[0_4px_20px_rgba(0,0,0,0.035)] p-3 text-center">
              <div className="text-lg font-black text-stone-900">{ratingSummary.count ? ratingSummary.average.toFixed(1) : '—'}</div>
              <div className="text-[10px] text-stone-400 font-bold mt-0.5">هەڵسەنگاندن</div>
            </div>
            <div className="rounded-2xl bg-white border border-stone-100 shadow-[0_4px_20px_rgba(0,0,0,0.035)] p-3 text-center">
              <div className="text-lg font-black text-stone-900">{memberSinceYear || '—'}</div>
              <div className="text-[10px] text-stone-400 font-bold mt-0.5">ساڵی چالاکی</div>
            </div>
          </div>

          {/* ── ACTION ROW ── */}
          <div className="flex items-center gap-2 sm:gap-3 mt-4 lg:mt-5">
            <button
              onClick={handleShare}
              className="shrink-0 w-12 h-12 rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.06)] flex items-center justify-center active:scale-95 transition-transform"
              title="هاوبەشکردنی پڕۆفایل"
            >
              {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4 text-stone-500" />}
            </button>
            {cleanPhone && (
              <a
                href={`tel:${cleanPhone}`}
                className="shrink-0 w-12 h-12 rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.06)] flex items-center justify-center active:scale-95 transition-transform"
                title="پەیوەندی تەلەفۆنی"
              >
                <Phone className="w-4 h-4 text-stone-500" />
              </a>
            )}
            <button
              onClick={() => { soundService.playTick?.(); setActiveTab('jobs'); }}
              className="flex-1 py-3.5 rounded-2xl text-white font-black text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-md"
              style={{ background: TEAL }}
            >
              بینینی هەلی کارەکان ({companyJobs.length}) <Briefcase className="w-4 h-4" />
            </button>
          </div>

          {/* ── TABS ── */}
          <div className="flex items-center gap-5 sm:gap-8 lg:gap-10 mt-6 border-b border-stone-200">
            <button
              onClick={() => { soundService.playTick?.(); setActiveTab('about'); }}
              className="pb-3 text-sm font-black -mb-px border-b-2 transition-colors"
              style={activeTab === 'about' ? { color: '#111', borderColor: TEAL } : { color: '#a8a29e', borderColor: 'transparent' }}
            >
              دەربارە
            </button>
            <button
              onClick={() => { soundService.playTick?.(); setActiveTab('jobs'); }}
              className="pb-3 text-sm font-black -mb-px border-b-2 transition-colors"
              style={activeTab === 'jobs' ? { color: '#111', borderColor: TEAL } : { color: '#a8a29e', borderColor: 'transparent' }}
            >
              هەلی کارەکان ({companyJobs.length})
            </button>
          </div>

          {/* ── TAB CONTENT ── */}
          <div className="mt-4 lg:mt-6">
            {activeTab === 'about' && (
              <div className="company-desktop-card bg-white rounded-3xl lg:rounded-[2rem] shadow-[0_8px_35px_rgba(0,0,0,0.055)] border border-stone-100 p-5 sm:p-6 lg:p-7">
                {(company.description || company.bio) && (
                  <p className="text-sm text-stone-600 leading-relaxed pb-3.5 mb-0.5 border-b border-stone-100">{company.description || company.bio}</p>
                )}
                {displayPhone && infoRow(Phone, 'ژمارەی پەیوەندی', displayPhone, true, true, `tel:${cleanPhone}`)}
                {displayIndustry && infoRow(Briefcase, 'بواری کار', displayIndustry)}
                {infoRow(MapPin, 'شوێن', `${displayGov}، کوردستان`)}
                {displayEmail && infoRow(Mail, 'ئیمەیلی فەرمی', displayEmail, true, true, `mailto:${displayEmail}`)}
                {displayReg && infoRow(Globe, 'ژمارەی تۆمارکردنی بازرگانی', displayReg, true)}
                {memberSinceYear && infoRow(CheckCircle2, 'چالاکە لە ساڵی', String(memberSinceYear))}
                {!hasAboutInfo && (
                  <p className="text-sm text-stone-400 text-center py-6 font-bold">هێشتا هیچ زانیارییەکی زیاتر زیاد نەکراوە.</p>
                )}
              </div>
            )}

            {activeTab === 'jobs' && (
              <>
                {companyJobs.length > 0 && (
                  <div className="space-y-3 mb-4">
                    <div className="relative">
                      <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                      <input
                        value={jobQuery}
                        onChange={(e) => setJobQuery(e.target.value)}
                        placeholder="گەڕان لە هەلی کارەکان..."
                        className="w-full h-12 pr-10 pl-4 rounded-2xl bg-white border border-stone-200 outline-none text-sm font-bold text-stone-800 placeholder:text-stone-400 focus:border-[#12796b] focus:ring-4 focus:ring-[#12796b]/10 transition"
                      />
                      {jobQuery && (
                        <button onClick={() => setJobQuery('')} className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center">
                          <X className="w-3.5 h-3.5 text-stone-500" />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs text-stone-400 font-bold">{filteredJobs.length} هەلی کار</span>
                      {filteredJobs.some(isNewJob) && (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
                          <Sparkles className="w-3 h-3" /> نوێ
                        </span>
                      )}
                    </div>
                  </div>
                )}
                {filteredJobs.length === 0 ? (
                  <div className="bg-white rounded-3xl shadow-[0_2px_16px_rgba(0,0,0,0.05)] py-16 text-center">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-stone-50 flex items-center justify-center mb-3">
                      <Briefcase className="w-6 h-6 text-stone-300" />
                    </div>
                    <p className="text-sm text-stone-400 font-bold">{jobQuery ? 'هیچ هەلی کارێک بۆ ئەم گەڕانە نەدۆزرایەوە.' : 'لە ئێستادا هیچ هەلی کاری نوێ بڵاونەکراوەتەوە.'}</p>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredJobs.map(job => {
                      const isApplied = applications.some(a => String(a.job_id) === String(job.id));
                      return (
                        <div
                          key={job.id}
                          onClick={() => handleOpenJobDetail(job)}
                          className="company-job-card relative bg-white rounded-[1.75rem] border border-stone-100 shadow-[0_4px_24px_rgba(0,0,0,0.045)] hover:shadow-[0_16px_40px_rgba(0,0,0,0.10)] hover:-translate-y-0.5 transition-all duration-300 p-4 cursor-pointer group"
                        >
                          <button
                            onClick={(e) => handleShareJob(job, e)}
                            className="absolute top-4 left-4 w-8 h-8 rounded-full bg-stone-50 flex items-center justify-center active:scale-90 transition-transform hover:bg-stone-100"
                          >
                            <Share2 className="w-3.5 h-3.5 text-stone-400" />
                          </button>

                          <div className="flex items-start gap-3 pr-1">
                            <div className="w-11 h-11 shrink-0 rounded-2xl bg-stone-50 border border-stone-100 flex items-center justify-center overflow-hidden">
                              {company.logo || company.company_logo ? (
                                <img src={company.logo || company.company_logo} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-xs font-black" style={{ color: TEAL }}>{companyInitials(company.name)}</span>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="text-sm font-black text-stone-900 truncate">{job.title_ku || job.title}</h3>
                                {isNewJob(job) && <span className="shrink-0 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[9px] font-black">نوێ</span>}
                              </div>
                              <p className="text-xs text-stone-400 font-bold mt-1 truncate">
                                {[getJobType(job), getWorkplace(job)].filter(Boolean).join(' · ')}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 mt-3">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-stone-50 text-[10px] text-stone-500 font-bold">
                              <MapPin className="w-3 h-3" /> {getJobLocation(job)}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-stone-50 text-[10px] text-stone-500 font-bold">
                              <Clock3 className="w-3 h-3" /> {postedAgo(job.created_at) || 'نوێ'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-stone-100">
                            <span className="text-[11px] text-stone-400 font-bold">{postedAgo(job.created_at)}</span>
                            {formatSalary(job) && (
                              <span className="font-mono font-black text-sm text-stone-900" dir="ltr">{formatSalary(job)}</span>
                            )}
                          </div>

                          <button
                            disabled={isApplied}
                            onClick={(e) => { e.stopPropagation(); handleOpenJobDetail(job); }}
                            className={`mt-3 w-full py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all active:scale-95 ${isApplied ? 'bg-emerald-50 text-emerald-700' : 'text-white'
                              }`}
                            style={!isApplied ? { background: TEAL } : {}}
                          >
                            {isApplied ? <><CheckCircle2 className="w-3.5 h-3.5" />نێردراوە</> : <><Send className="w-3.5 h-3.5" />ناردنی سیڤی</>}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {activeJobDetailModal && (
        <JobDetailModal
          job={activeJobDetailModal}
          isOpen
          onClose={handleCloseJobDetail}
        />
      )}
    </>
  ), document.body);
};
