import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { PageHeader } from '../layout/PageHeader';
import { useStore } from '../../context/StoreContext';
import { soundService } from '../../services/soundService';
import { apiService } from '../../services/api';
import { StarRatingDisplay } from '../ui/StarRating';
import { Monogram } from '../ui/Monogram';
import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock3,
  Copy,
  ExternalLink,
  Globe,
  Mail,
  MapPin,
  Phone,
  Search,
  Send,
  Share2,
  Sparkles,
  Star,
  Users,
  X,
} from 'lucide-react';

const TEAL = '#12796b';
const TEAL_DARK = '#0d5c50';
const TEAL_SOFT = '#e7f4f1';
const PAGE_BG = '#f5f8f7';

const JOB_TYPE_LABELS = {
  fullTime: 'کاتی تەواو',
  partTime: 'کاتی بەشی',
  contract: 'پڕۆژەیی',
  internship: 'ماوەی فێربوون',
  remote: 'لە ماڵەوە',
};

const WORKPLACE_LABELS = {
  onSite: 'لە شوێن',
  remote: 'لە ماڵەوە',
  hybrid: 'تێکەڵ',
};

const getCompanyName = (company) =>
  (company?.name || company?.company_name || 'کۆمپانیا').trim();

const formatSalary = (job) => {
  const min = job?.salary_min ?? job?.salaryMin;
  const max = job?.salary_max ?? job?.salaryMax;

  if (!min && !max) return null;

  if (min && max && Number(min) !== Number(max)) {
    return `${Number(min).toLocaleString()} - ${Number(max).toLocaleString()} IQD`;
  }

  return `${Number(min || max).toLocaleString()} IQD`;
};

const postedAgo = (iso) => {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const day = Math.max(0, Math.floor(diffMs / 86400000));

  if (day < 1) return 'ئەمڕۆ';
  if (day === 1) return 'دوێنێ';
  if (day < 30) return `${day} ڕۆژ لەمەوپێش`;

  const month = Math.floor(day / 30);
  return `${month} مانگ لەمەوپێش`;
};

const getJobLocation = (job) =>
  job?.location_detail ||
  job?.governorate ||
  job?.governorateName ||
  job?.governorate_id ||
  'کوردستان';

const getJobType = (job) =>
  JOB_TYPE_LABELS[job?.job_type] || job?.job_type || 'کاتی تەواو';

const getWorkplace = (job) =>
  WORKPLACE_LABELS[job?.workplace_type] || job?.workplace_type || 'لە شوێن';

const isNewJob = (job) => {
  if (!job?.created_at) return false;
  const age = Date.now() - new Date(job.created_at).getTime();
  return age >= 0 && age < 3 * 86400000;
};

const companyInitials = (name = '') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  return (parts.slice(0, 2).map((part) => part[0]).join('') || 'K').toUpperCase();
};

const InfoRow = ({ Icon, label, value, mono = false, href }) => (
  <div className="flex items-center gap-3 py-3.5 border-b border-stone-100 last:border-b-0">
    <span
      className="w-10 h-10 shrink-0 rounded-[14px] flex items-center justify-center"
      style={{ background: TEAL_SOFT }}
    >
      <Icon className="w-4 h-4" style={{ color: TEAL }} />
    </span>

    <div className="min-w-0 flex-1">
      <div className="text-[10px] font-black text-stone-400 mb-0.5">{label}</div>
      {href ? (
        <a
          href={href}
          target={href.startsWith('http') ? '_blank' : undefined}
          rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
          className="text-sm font-black text-stone-900 hover:underline truncate flex items-center gap-1"
          dir={mono ? 'ltr' : undefined}
        >
          <span className="truncate">{value}</span>
          {href.startsWith('http') && <ExternalLink className="w-3 h-3 shrink-0" />}
        </a>
      ) : (
        <div
          className={`text-sm font-black text-stone-900 truncate ${mono ? 'font-mono' : ''}`}
          dir={mono ? 'ltr' : undefined}
        >
          {value}
        </div>
      )}
    </div>
  </div>
);

const JobCard = ({ job, company, applied, onOpen, onShare }) => {
  const salary = formatSalary(job);

  return (
    <article
      onClick={() => onOpen(job)}
      className="group relative bg-white rounded-[26px] border border-stone-100 p-4 sm:p-5 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_55px_rgba(16,70,60,.11)] shadow-[0_5px_24px_rgba(16,40,35,.045)]"
    >
      <button
        type="button"
        aria-label="هاوبەشکردنی هەلی کار"
        onClick={(event) => onShare(job, event)}
        className="absolute top-4 left-4 z-10 w-9 h-9 rounded-xl bg-stone-50 border border-stone-100 flex items-center justify-center hover:bg-stone-100 active:scale-90 transition-all"
      >
        <Share2 className="w-3.5 h-3.5 text-stone-400" />
      </button>

      <div className="flex items-start gap-3.5 pl-10">
        <div className="w-12 h-12 shrink-0 rounded-2xl overflow-hidden bg-stone-50 border border-stone-100 flex items-center justify-center">
          {company?.logo || company?.company_logo ? (
            <img
              src={company.logo || company.company_logo}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-sm font-black" style={{ color: TEAL }}>
              {companyInitials(getCompanyName(company))}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <h3 className="text-sm sm:text-[15px] font-black text-stone-900 leading-6 truncate">
              {job.title_ku || job.title || 'هەلی کار'}
            </h3>

            {isNewJob(job) && (
              <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-[8px] font-black">
                <Sparkles className="w-2.5 h-2.5" />
                نوێ
              </span>
            )}
          </div>

          <p className="text-[11px] text-stone-400 font-bold mt-1 truncate">
            {getCompanyName(company)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-4">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-stone-50 text-[10px] text-stone-500 font-black">
          <MapPin className="w-3 h-3" />
          {getJobLocation(job)}
        </span>

        <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-stone-50 text-[10px] text-stone-500 font-black">
          <Briefcase className="w-3 h-3" />
          {getJobType(job)}
        </span>

        <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-stone-50 text-[10px] text-stone-500 font-black">
          <Clock3 className="w-3 h-3" />
          {getWorkplace(job)}
        </span>
      </div>

      {job.description && (
        <p className="mt-3 text-[11px] leading-5 text-stone-400 font-bold line-clamp-2">
          {job.description}
        </p>
      )}

      <div className="mt-4 pt-3.5 border-t border-stone-100 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[9px] text-stone-400 font-bold">{postedAgo(job.created_at) || 'نوێ'}</div>
          {salary ? (
            <div className="mt-0.5 text-xs font-black text-stone-900" dir="ltr">
              {salary}
            </div>
          ) : (
            <div className="mt-0.5 text-xs font-black text-stone-500">نرخی دیارینەکراو</div>
          )}
        </div>

        <button
          type="button"
          disabled={applied}
          onClick={(event) => {
            event.stopPropagation();
            onOpen(job);
          }}
          className={`shrink-0 px-4 py-2.5 rounded-xl text-[10px] font-black flex items-center gap-1.5 active:scale-95 transition-all ${applied ? 'bg-emerald-50 text-emerald-700' : 'text-white'
            }`}
          style={!applied ? { background: TEAL } : undefined}
        >
          {applied ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              نێردراوە
            </>
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              بینینی کار
            </>
          )}
        </button>
      </div>
    </article>
  );
};

export const CompanyProfilePage = ({
  company = {},
  jobs = [],
  onBack,
  initialJobId,
  onNavigate,
}) => {
  const { applications = [], addToast } = useStore();

  const [activeTab, setActiveTab] = useState(initialJobId ? 'jobs' : 'about');
  const [jobQuery, setJobQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [ratingSummary, setRatingSummary] = useState({ average: 0, count: 0 });

  const compName = getCompanyName(company).toLowerCase();
  const compId = company.id ? String(company.id) : null;

  useEffect(() => {
    if (!compId) return;

    apiService
      .getRatings(compId)
      .then((result) => {
        setRatingSummary({
          average: Number(result?.average) || 0,
          count: Number(result?.count) || 0,
        });
      })
      .catch(() => { });
  }, [compId]);

  useEffect(() => {
    if (compId) {
      apiService.registerFreelancerView(compId).catch(() => { });
    }
  }, [compId]);

  useEffect(() => {
    if (initialJobId) {
      setActiveTab('jobs');
    }
  }, [initialJobId]);

  const companyJobs = useMemo(() => {
    const source = Array.isArray(jobs) ? jobs : [];

    return source.filter((job) => {
      if (!job) return false;

      const jobCompanyName = (
        job.company_name ||
        job.companyName ||
        job.company ||
        ''
      )
        .trim()
        .toLowerCase();

      const matchName = Boolean(jobCompanyName && compName && jobCompanyName === compName);

      const matchId =
        Boolean(compId) &&
        [
          job.company_id,
          job.employer_id,
          job.user_id,
        ].some((value) => value != null && String(value) === compId);

      return matchName || matchId;
    });
  }, [jobs, compId, compName]);

  const filteredJobs = useMemo(() => {
    const query = jobQuery.trim().toLowerCase();
    if (!query) return companyJobs;

    return companyJobs.filter((job) =>
      [
        job.title_ku,
        job.title,
        job.description,
        job.location_detail,
        getJobType(job),
        getWorkplace(job),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }, [companyJobs, jobQuery]);

  const memberSinceYear = useMemo(() => {
    const fromCompany = company.member_since
      ? new Date(company.member_since).getFullYear()
      : null;

    return companyJobs.reduce((earliest, job) => {
      if (!job.created_at) return earliest;
      const year = new Date(job.created_at).getFullYear();
      return !earliest || year < earliest ? year : earliest;
    }, fromCompany);
  }, [companyJobs, company.member_since]);

  const displayPhone = company.phone || company.company_phone || '';
  const cleanPhone = displayPhone.replace(/[^0-9+]/g, '');
  const displayEmail = company.email || company.company_email || '';
  const displayReg = company.regNumber || company.company_reg || '';
  const displayIndustry =
    company.industry || company.company_industry || 'کۆمپانیا و بازرگانی';
  const displayGov =
    company.governorate || company.governorateName || 'کوردستان';
  const description = company.description || company.bio || '';

  const handleOpenJobDetail = (job) => {
    soundService.playTick?.();

    if (onNavigate) {
      onNavigate('job_detail', { jobId: job.id });
    }
  };

  const handleShareJob = (job, event) => {
    event?.stopPropagation();
    soundService.playTick?.();

    const shareUrl = `${window.location.origin}/share/job/${encodeURIComponent(job.id)}`;

    if (navigator.share) {
      navigator
        .share({
          title: `${job.title_ku || job.title || 'هەلی کار'} — ${getCompanyName(company)}`,
          url: shareUrl,
        })
        .catch(() => { });
      return;
    }

    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        addToast?.({
          title: 'کۆپیکرا ✓',
          message: 'لینکی هەلی کارەکە کۆپیکرا.',
          type: 'success',
        });
      });
    }
  };

  const handleShareCompany = () => {
    soundService.playTick?.();

    const companyUrl = `${window.location.origin}/share/company/${encodeURIComponent(
      company.id || ''
    )}`;

    if (navigator.share) {
      navigator
        .share({
          title: `${getCompanyName(company)} — ئیش خواز`,
          url: companyUrl,
        })
        .catch(() => { });
      return;
    }

    if (navigator.clipboard) {
      navigator.clipboard.writeText(companyUrl).then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);

        addToast?.({
          title: 'کۆپیکرا ✓',
          message: 'لینکی پڕۆفایلی کۆمپانیا کۆپیکرا.',
          type: 'success',
        });
      });
    }
  };

  const goBack = () => {
    soundService.playTick?.();
    onBack?.();
  };


  const styles = `
    .company-page {
      --teal: ${TEAL};
      --teal-dark: ${TEAL_DARK};
      min-height: 100%;
      background:
        radial-gradient(800px 360px at 50% -120px, rgba(18,121,107,.12), transparent 70%),
        linear-gradient(180deg, #f9fbfa 0%, ${PAGE_BG} 42%, #eef3f1 100%);
    }

    .company-page-scroll {
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
    }

    .company-page-scroll::-webkit-scrollbar {
      display: none;
    }

    .company-hero {
      background:
        radial-gradient(500px 240px at 10% 0%, rgba(92,211,190,.22), transparent 70%),
        radial-gradient(500px 280px at 90% 100%, rgba(18,121,107,.18), transparent 70%),
        linear-gradient(135deg, #0b211d 0%, #0d3029 48%, #0a1714 100%);
    }

    .company-glass {
      background: rgba(255,255,255,.78);
      border: 1px solid rgba(255,255,255,.78);
      box-shadow: 0 18px 55px rgba(16,55,48,.08);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
    }

    .company-noise {
      background-image:
        linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px);
      background-size: 30px 30px;
    }

    @media (min-width: 1024px) {
      .company-page-shell {
        max-width: 1440px;
        margin: 0 auto;
      }
    }
  `;

  return createPortal(
    <>
      <style>{styles}</style>

      <div
        dir="rtl"
        className="company-page company-page-scroll fixed inset-0 z-[60] overflow-y-auto font-vazirmatn text-stone-900"
      >
        {/* Top navigation — the shared page header (same as every other page) */}
        <PageHeader
          desktop
          insideMain={false}
          title={getCompanyName(company)}
          onBack={goBack}
          actions={[{ icon: copied ? CheckCircle2 : Share2, label: 'هاوبەشکردن', onClick: handleShareCompany, active: copied }]}
        />

        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="company-hero company-noise relative min-h-[310px] sm:min-h-[370px] lg:min-h-[440px]">
            {company.cover || company.company_cover ? (
              <>
                <img
                  src={company.cover || company.company_cover}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full object-cover scale-110 blur-3xl opacity-25"
                />
                <img
                  src={company.cover || company.company_cover}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover opacity-35"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-[#06110f]/45 via-[#081a16]/60 to-[#08110f]" />
              </>
            ) : (
              <div className="absolute inset-0 opacity-90">
                <div className="absolute -top-24 -right-20 w-72 h-72 rounded-full bg-[#43bea4]/20 blur-3xl" />
                <div className="absolute -bottom-32 -left-10 w-96 h-96 rounded-full bg-[#12796b]/25 blur-3xl" />
              </div>
            )}

            <div className="relative company-page-shell min-h-[310px] sm:min-h-[370px] lg:min-h-[440px] px-4 sm:px-8 lg:px-10 pt-10 pb-10 flex items-end">
              <div className="w-full">
                <div className="flex flex-col sm:flex-row sm:items-end gap-5 lg:gap-7">
                  <div className="shrink-0">
                    {company.logo || company.company_logo ? (
                      <img
                        src={company.logo || company.company_logo}
                        alt={getCompanyName(company)}
                        className="w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 rounded-[30px] object-cover bg-white border-4 border-white/90 shadow-[0_18px_55px_rgba(0,0,0,.25)]"
                      />
                    ) : (
                      <Monogram
                        name={getCompanyName(company)}
                        textClassName="text-3xl lg:text-4xl"
                        className="w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 rounded-[30px] border-4 border-white/90 shadow-[0_18px_55px_rgba(0,0,0,.25)]"
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1 pb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white truncate">
                        {getCompanyName(company)}
                      </h1>

                      {company.verified && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-[#a7eee0] text-[9px] font-black">
                          <BadgeCheck className="w-3.5 h-3.5" />
                          پشتڕاستکراو
                        </span>
                      )}
                    </div>

                    <p className="mt-2 text-xs sm:text-sm text-white/55 font-bold">
                      {[displayIndustry, displayGov].filter(Boolean).join('، ')}
                    </p>

                    {ratingSummary.count > 0 && (
                      <div className="mt-2">
                        <StarRatingDisplay
                          average={ratingSummary.average}
                          count={ratingSummary.count}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-7 grid grid-cols-3 gap-2 sm:max-w-xl">
                  <div className="rounded-2xl bg-white/8 border border-white/10 backdrop-blur-xl p-3">
                    <div className="text-lg font-black text-white">{companyJobs.length}</div>
                    <div className="text-[9px] text-white/40 font-black mt-0.5">هەلی کار</div>
                  </div>

                  <div className="rounded-2xl bg-white/8 border border-white/10 backdrop-blur-xl p-3">
                    <div className="text-lg font-black text-white">
                      {ratingSummary.count ? ratingSummary.average.toFixed(1) : '—'}
                    </div>
                    <div className="text-[9px] text-white/40 font-black mt-0.5">هەڵسەنگاندن</div>
                  </div>

                  <div className="rounded-2xl bg-white/8 border border-white/10 backdrop-blur-xl p-3">
                    <div className="text-lg font-black text-white">
                      {memberSinceYear || '—'}
                    </div>
                    <div className="text-[9px] text-white/40 font-black mt-0.5">ساڵی چالاکی</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <main className="company-page-shell px-3 sm:px-6 lg:px-8 xl:px-10 pb-12">
          {/* Call action (sharing lives in the header, jobs live in the tab below) */}
          {cleanPhone && (
            <section className="relative z-10 -mt-5 sm:-mt-6">
              <div className="company-glass rounded-[24px] p-2 sm:p-2.5">
                <a
                  href={`tel:${cleanPhone}`}
                  className="h-12 rounded-[18px] text-white flex items-center justify-center gap-2 font-black text-xs active:scale-[.98] transition-transform"
                  style={{ background: TEAL }}
                >
                  <Phone className="w-4 h-4" />
                  پەیوەندی
                </a>
              </div>
            </section>
          )}

          {/* Tabs */}
          <nav className="sticky top-0 z-50 mt-5 py-2 bg-[#f5f8f7]/90 backdrop-blur-xl">
            <div className="flex items-center gap-1 p-1 rounded-2xl bg-white border border-stone-100 shadow-[0_5px_25px_rgba(16,40,35,.045)]">
              <button
                type="button"
                onClick={() => setActiveTab('about')}
                className={`flex-1 h-11 rounded-xl text-xs font-black transition-all ${activeTab === 'about'
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'text-stone-400 hover:text-stone-700'
                  }`}
              >
                دەربارەی کۆمپانیا
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('jobs')}
                className={`flex-1 h-11 rounded-xl text-xs font-black transition-all ${activeTab === 'jobs'
                  ? 'text-white shadow-sm'
                  : 'text-stone-400 hover:text-stone-700'
                  }`}
                style={activeTab === 'jobs' ? { background: TEAL } : undefined}
              >
                هەلی کارەکان
                <span className="mr-1 opacity-60">({companyJobs.length})</span>
              </button>
            </div>
          </nav>

          {activeTab === 'about' && (
            <section className="mt-3 grid lg:grid-cols-[1.35fr_.65fr] gap-4 lg:gap-5">
              <div className="bg-white rounded-[28px] border border-stone-100 shadow-[0_8px_35px_rgba(16,40,35,.05)] p-5 sm:p-7">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: TEAL_SOFT }}>
                    <Briefcase className="w-5 h-5" style={{ color: TEAL }} />
                  </div>
                  <div>
                    <h2 className="text-base font-black">دەربارەی کۆمپانیا</h2>
                    <p className="text-[10px] text-stone-400 font-bold mt-0.5">
                      زانیاری و ناسنامەی کۆمپانیا
                    </p>
                  </div>
                </div>

                {description ? (
                  <p className="text-sm text-stone-600 font-bold leading-7 pb-5 border-b border-stone-100">
                    {description}
                  </p>
                ) : (
                  <div className="rounded-2xl bg-stone-50 p-5 text-center mb-4">
                    <p className="text-xs text-stone-400 font-bold">
                      هێشتا زانیارییەکی درێژ لەبارەی کۆمپانیا زیاد نەکراوە.
                    </p>
                  </div>
                )}

                <div className="mt-1">
                  {displayPhone && (
                    <InfoRow
                      Icon={Phone}
                      label="ژمارەی پەیوەندی"
                      value={displayPhone}
                      mono
                      href={`tel:${cleanPhone}`}
                    />
                  )}

                  <InfoRow Icon={Briefcase} label="بواری کار" value={displayIndustry} />

                  <InfoRow
                    Icon={MapPin}
                    label="شوێن"
                    value={`${displayGov}، کوردستان`}
                  />

                  {displayEmail && (
                    <InfoRow
                      Icon={Mail}
                      label="ئیمەیلی فەرمی"
                      value={displayEmail}
                      mono
                      href={`mailto:${displayEmail}`}
                    />
                  )}

                  {displayReg && (
                    <InfoRow
                      Icon={Globe}
                      label="ژمارەی تۆمارکردنی بازرگانی"
                      value={displayReg}
                      mono
                    />
                  )}

                  {memberSinceYear && (
                    <InfoRow
                      Icon={Calendar}
                      label="چالاکە لە ساڵی"
                      value={String(memberSinceYear)}
                    />
                  )}
                </div>
              </div>

              <aside className="space-y-4">
                <div className="bg-[#0c211d] rounded-[28px] p-5 sm:p-6 text-white overflow-hidden relative">
                  <div className="absolute -right-16 -top-16 w-44 h-44 rounded-full bg-[#43bea4]/15 blur-3xl" />
                  <div className="relative">
                    <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center">
                      <BadgeCheck className="w-5 h-5 text-[#8de8d7]" />
                    </div>
                    <h3 className="mt-5 text-base font-black">پڕۆفایلی کۆمپانیا</h3>
                    <p className="mt-2 text-[11px] text-white/45 leading-6 font-bold">
                      زانیارییە سەرەکییەکان، هەلی کارەکان و ڕێگای پەیوەندیکردن لە یەک شوێن.
                    </p>

                  </div>
                </div>

                <div className="bg-white rounded-[28px] border border-stone-100 shadow-[0_8px_35px_rgba(16,40,35,.05)] p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center">
                      <Star className="w-4 h-4 text-amber-500" />
                    </div>
                    <div>
                      <div className="text-xs font-black">هەڵسەنگاندن</div>
                      <div className="text-[10px] text-stone-400 font-bold">
                        {ratingSummary.count
                          ? `${ratingSummary.count} هەڵسەنگاندن`
                          : 'هێشتا هەڵسەنگاندن نییە'}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex items-end gap-2">
                    <span className="text-4xl font-black">
                      {ratingSummary.count ? ratingSummary.average.toFixed(1) : '—'}
                    </span>
                    <span className="text-xs text-stone-400 font-bold mb-1.5">لە ٥</span>
                  </div>
                </div>
              </aside>
            </section>
          )}

          {activeTab === 'jobs' && (
            <section id="company-jobs-section" className="mt-3 scroll-mt-24">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black">هەلی کارەکان</h2>
                    <span className="px-2 py-1 rounded-full bg-[#e7f4f1] text-[#0d5c50] text-[9px] font-black">
                      {companyJobs.length}
                    </span>
                  </div>
                  <p className="text-[10px] text-stone-400 font-bold mt-1">
                    هەموو هەلی کاری بڵاوکراوە لەلایەن {getCompanyName(company)}
                  </p>
                </div>

                {companyJobs.some(isNewJob) && (
                  <span className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-[10px] font-black text-emerald-700">
                    <Sparkles className="w-3 h-3" />
                    هەلی نوێ هەیە
                  </span>
                )}
              </div>

              {companyJobs.length > 0 && (
                <div className="relative mb-5">
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300" />
                  <input
                    value={jobQuery}
                    onChange={(event) => setJobQuery(event.target.value)}
                    placeholder="گەڕان لە هەلی کارەکان..."
                    className="w-full h-13 py-3.5 pr-11 pl-11 rounded-2xl bg-white border border-stone-100 shadow-[0_5px_22px_rgba(16,40,35,.04)] outline-none text-sm font-bold placeholder:text-stone-300 focus:border-[#12796b] focus:ring-4 focus:ring-[#12796b]/10 transition-all"
                  />
                  {jobQuery && (
                    <button
                      type="button"
                      onClick={() => setJobQuery('')}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center"
                    >
                      <X className="w-3.5 h-3.5 text-stone-500" />
                    </button>
                  )}
                </div>
              )}

              {filteredJobs.length === 0 ? (
                <div className="bg-white rounded-[30px] border border-stone-100 shadow-[0_8px_35px_rgba(16,40,35,.05)] py-20 px-5 text-center">
                  <div
                    className="w-16 h-16 mx-auto rounded-[22px] flex items-center justify-center"
                    style={{ background: TEAL_SOFT }}
                  >
                    <Briefcase className="w-7 h-7" style={{ color: TEAL }} />
                  </div>

                  <h3 className="mt-5 text-base font-black">
                    {jobQuery
                      ? 'هیچ هەلی کارێک نەدۆزرایەوە'
                      : 'لە ئێستادا هەلی کاری بڵاونەکراوەتەوە'}
                  </h3>

                  <p className="mt-2 text-xs text-stone-400 font-bold">
                    {jobQuery
                      ? 'وشەیەکی تری گەڕان تاقی بکەرەوە.'
                      : 'کاتێک کۆمپانیا کارێک بڵاودەکاتەوە، لێرە دەردەکەوێت.'}
                  </p>

                  {jobQuery && (
                    <button
                      type="button"
                      onClick={() => setJobQuery('')}
                      className="mt-5 px-5 py-2.5 rounded-xl text-xs font-black text-white"
                      style={{ background: TEAL }}
                    >
                      سڕینەوەی گەڕان
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredJobs.map((job) => (
                      <JobCard
                        key={job.id}
                        job={job}
                        company={company}
                        applied={applications.some(
                          (application) =>
                            String(application.job_id) === String(job.id)
                        )}
                        onOpen={handleOpenJobDetail}
                        onShare={handleShareJob}
                      />
                    ))}
                  </div>

                  <div className="mt-5 flex items-center justify-between text-[10px] text-stone-400 font-bold px-1">
                    <span>{filteredJobs.length} هەلی کار</span>
                    {jobQuery && (
                      <button
                        type="button"
                        onClick={() => setJobQuery('')}
                        className="text-[#12796b] font-black"
                      >
                        سڕینەوەی گەڕان
                      </button>
                    )}
                  </div>
                </>
              )}
            </section>
          )}
        </main>

      </div>
    </>,
    document.body
  );
};

export default CompanyProfilePage;
