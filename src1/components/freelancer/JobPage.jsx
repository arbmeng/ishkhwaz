import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { soundService } from '../../services/soundService';
import { readFileAsDataUri } from '../../utils/file';
import { apiService } from '../../services/api';
import { HeroControls } from '../layout/HeroControls';
import { shareLink } from '../../utils/shareLink';
import { StickyProfileBar } from '../layout/StickyProfileBar';
import { JobDescription } from './JobDescription';
import { sectorLabel } from '../../data/jobSectors';
import { useScrollLock } from '../../utils/useScrollLock';
import {
  ArrowRight, Heart, Bookmark, Share2, BadgeCheck, Check, CheckCircle2,
  Send, Copy, IdCard, Upload, FileText, Loader2, AlertCircle, Zap, Crown,
  Phone, Mail, Calendar, Eye, Users, Briefcase, X, Sparkles, ShieldCheck,
  ChevronRight, Info, CreditCard
} from 'lucide-react';

const NK = "'Noto Kufi Arabic', 'Vazirmatn', system-ui, sans-serif";
const TEAL = '#641bd9';
const TEAL_DARK = '#4b13a5';
const MINT = '#e1d3f8';
const MINT_BG = '#eee8f7';

const JOB_TYPE_LABELS = {
  fullTime: 'کاتی تەواو',
  partTime: 'کاتی بەشی',
  contract: 'پڕۆژەیی',
  internship: 'ماوەی فێربوون',
  remote: 'لە ماڵەوە'
};

const WORKPLACE_LABELS = {
  onSite: 'لە شوێن',
  remote: 'لە ماڵەوە',
  hybrid: 'تێکەڵ'
};

const GOV_LABELS = {
  sulaymaniyah: 'سلێمانی',
  erbil: 'هەولێر',
  duhok: 'دهۆک',
  kirkuk: 'کەرکووک',
  halabja: 'هەڵەبجە'
};

const FASTPAY_NUMBER_FALLBACK = '0770 123 4567';

// A real routed page (/jobs/:id) — this used to be JobDetailModal, an overlay
// opened from JobFeed, SearchPage and CompanyProfilePage. The job comes from
// the store by id, so refresh, browser Back and shared links all work.
export const JobPage = ({ jobId, onBack, onNavigate }) => {
  const { user, token, openAuthModal } = useAuth();
  const {
    jobs = [],
    applications = [],
    submitCVApplication,
    savedJobIds = [],
    toggleSaveJob,
    settings = {},
    categories = [],
    addToast,
  } = useStore();
  const job = jobs.find(j => String(j.id) === String(jobId));
  const isOpen = true;
  const onClose = onBack;
  // A cold deep link renders before the store's job list has loaded; only
  // call it "not found" once that's had a fair chance to arrive.
  const [waited, setWaited] = useState(false);
  useEffect(() => { const t = setTimeout(() => setWaited(true), 6000); return () => clearTimeout(t); }, []);

  const FASTPAY_NUMBER = settings.fastpay_number || FASTPAY_NUMBER_FALLBACK;
  // Real fee, not a hardcoded string — this job's own fee_amount if the
  // employer set one when posting, otherwise the admin-configured global
  // cv_fee_amount setting (see AdminPage's Settings tab). Matches exactly
  // what the backend actually records as fee_paid when this CV is submitted.
  const CV_FEE = Number(job?.fee_amount || settings.cv_fee_amount || 2500);
  const CV_FEE_DISPLAY = `${CV_FEE.toLocaleString()} IQD`;

  const hasAlreadyApplied = Boolean(
    user && applications.some(a => String(a.job_id) === String(job?.id))
  );

  // Steps: 'detail' (1) | 'cv_mode' (2) | 'fastpay' (3) | 'success' (4)
  const [step, setStep] = useState('detail');
  const [cvMode, setCvMode] = useState('profile'); // 'profile' | 'upload' | 'resume'
  const [cvFile, setCvFile] = useState(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [paymentTxId, setPaymentTxId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generatedTxId, setGeneratedTxId] = useState('');
  const [resumes, setResumes] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setStep('detail');
      setCvMode('profile');
      setCvFile(null);
      setCoverLetter('');
      setPaymentTxId('');
      setGeneratedTxId('');
      setSelectedResumeId(null);
      if (job?.id) apiService.registerJobView(job.id);
    }
  }, [isOpen, job?.id]);

  // Freelancer's saved multi-CV resumes (Karnama-built), so they can pick
  // the most relevant one for this specific job instead of always sending
  // the same generic profile-CV. Only fetched while the modal is open.
  useEffect(() => {
    if (!isOpen || !user || !token) return;
    let cancelled = false;
    apiService.getResumes(token).then(res => {
      if (cancelled || !res?.success) return;
      const list = res.resumes || [];
      setResumes(list);
      if (list.length) setSelectedResumeId(prev => prev || list[0].id);
    });
    return () => { cancelled = true; };
  }, [isOpen, user, token]);

  // Opening a job starts at the top — the list you came from leaves its scroll offset behind otherwise.
  useEffect(() => { window.scrollTo(0, 0); }, [job?.id]);
  // While any apply dialog is open the page behind it is frozen.
  useScrollLock(step !== 'detail');

  if (!job) {
    return (
      <div dir="rtl" className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center" style={{ background: '#f5f4f7', fontFamily: NK }}>
        {waited ? (
          <>
            <div className="text-sm font-black text-[#16111d]">ئەم هەلە کارە نەدۆزرایەوە یان چیتر چالاک نییە</div>
            <button onClick={onBack} className="px-5 py-3 rounded-2xl text-white text-xs font-black" style={{ background: TEAL }}>گەڕانەوە</button>
          </>
        ) : (
          <>
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: TEAL }} />
            <div className="text-xs font-bold text-[#7b8e88]">کەمێک چاوەڕوان بە...</div>
          </>
        )}
      </div>
    );
  }

  const isSaved = savedJobIds.includes(job.id);
  const companyName = job.company_name || job.companyName || 'کۆمپانیا';
  const companyLogo = job.company_logo || job.companyLogo || '';
  const initial = companyName.trim().charAt(0) || 'ت';
  const title = job.title_ku || job.title || 'هەلی کار';
  const gov = GOV_LABELS[job.governorate_id] || job.governorate || 'سلێمانی';
  const district = job.location_detail || job.location_name || '';
  const salaryText = job.salary_min
    ? `${Number(job.salary_min).toLocaleString()} IQD`
    : (job.salary ? `${Number(job.salary).toLocaleString()} IQD` : 'وەک گفتوگۆ');
  const workplace = WORKPLACE_LABELS[job.workplace_type] || 'لە شوێن';
  const jobType = JOB_TYPE_LABELS[job.job_type] || 'کاتی تەواو';
  const categoryName = categories.find(c => c.id === job.category)?.name_ku || job.category || 'تەکنەلۆژیا';
  const viewCount = Number(job.views || 0);
  const isBoosted = Boolean(job.boosted_until && new Date(job.boosted_until) > new Date());
  const isNew = Boolean(job.created_at && (Date.now() - new Date(job.created_at).getTime()) < 3 * 86400000);

  const rawSkills = job.required_skills;
  const skills = Array.isArray(rawSkills)
    ? rawSkills
    : (() => {
        try {
          const parsed = JSON.parse(rawSkills || '[]');
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      })();

  // Real remaining credit count, not a "VIP" label — the backend gates the
  // free-apply path on this same plan_credits value regardless of plan id,
  // and the free plan itself starts everyone with a few starter credits, so
  // claiming "VIP" here was misleading (every free-tier user saw it, then
  // got confused when a later application suddenly demanded real payment).
  const freeCreditsLeft = Number(user?.plan_credits) || 0;
  // Pro / VIP / free-with-credits (and admin/owner) apply with a credit — no payment step at all.
  const hasCredit = freeCreditsLeft > 0 || user?.role === 'admin' || user?.role === 'owner';

  const handleCopyFastpay = () => {
    soundService.playTick?.();
    navigator.clipboard?.writeText(FASTPAY_NUMBER.replace(/\s/g, ''));
    setCopied(true);
    addToast?.({ title: 'کۆپیکرا ✓', message: 'ژمارەی FastPay کۆپیکرا', type: 'success' });
    setTimeout(() => setCopied(false), 2500);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      addToast?.({ title: 'قەبارەی گەورە', message: 'قەبارەی فایلەکە لە ٥ مێگابایت زیاترە.', type: 'warning' });
      return;
    }
    try {
      const dataUri = await readFileAsDataUri(file, 5000000);
      setCvFile({ name: file.name, dataUri });
      soundService.playTick?.();
      addToast?.({ title: 'فایل هەڵبژێردرا ✓', message: file.name, type: 'success' });
    } catch {
      addToast?.({ title: 'هەڵە', message: 'فایلەکە بارنەکرا.', type: 'error' });
    }
  };

  const handleStartApply = () => {
    soundService.playTick?.();
    if (!user) {
      openAuthModal?.('freelancer', 'login');
      return;
    }
    setStep('cv_mode');
  };

  const handleContinueToPayment = () => {
    soundService.playTick?.();
    if (cvMode === 'upload' && !cvFile) {
      fileInputRef.current?.click();
      return;
    }
    if (cvMode === 'resume' && !selectedResumeId) {
      addToast?.({ title: 'سیڤیەک هەڵبژێرە', message: 'تکایە یەکێک لە سیڤییەکانت هەڵبژێرە.', type: 'warning' });
      return;
    }
    // A credit pays for it: send straight away. Only people without one see the payment step.
    if (hasCredit) { handleFinalSubmit(true); return; }
    setStep('fastpay');
  };

  const handleFinalSubmit = async (isFreeVip = false) => {
    if (hasAlreadyApplied || isSubmitting) return;
    soundService.playTick?.();

    const txCode = isFreeVip
      ? `VIP-FREE-${Math.floor(100000 + Math.random() * 900000)}`
      : (paymentTxId.trim() || `FP-${Math.floor(10000000 + Math.random() * 90000000)}`);

    setGeneratedTxId(txCode);
    setIsSubmitting(true);

    const ok = await submitCVApplication({
      job_id: job.id,
      job_title: title,
      company_name: companyName,
      cover_letter: coverLetter.trim(),
      cv_url: cvMode === 'upload' && cvFile ? cvFile.dataUri : (user?.cv_url || undefined),
      cv_mode: cvMode,
      resume_id: cvMode === 'resume' ? selectedResumeId : undefined,
      payment_method: isFreeVip ? 'VIP Credit' : 'FastPay',
      payment_tx_id: txCode,
    });

    setIsSubmitting(false);

    if (ok) {
      soundService.playSuccess?.();
      setStep('success');
    }
  };


  // No credit: pay this application's fee with ZeraPay (hosted payment page), then the
  // server credits the application when Zera Payment confirms it.
  const handleZeraPay = async () => {
    if (hasAlreadyApplied || isSubmitting) return;
    soundService.playTick?.();
    setIsSubmitting(true);
    const res = await apiService.applyWithZeraPay({
      job_id: job.id,
      cover_letter: coverLetter.trim(),
      cv_url: cvMode === 'upload' && cvFile ? cvFile.dataUri : (user?.cv_url || undefined),
      resume_id: cvMode === 'resume' ? selectedResumeId : undefined,
    }, token);
    if (res?.success && res.paymentUrl) {
      window.location.href = res.paymentUrl;
      return;
    }
    setIsSubmitting(false);
    addToast?.({ title: 'پارەدان دەستپێنەکرا', message: res?.message || 'تکایە دووبارە هەوڵبدەرەوە.', type: 'warning' });
  };

  const handleOpenPlans = () => {
    soundService.playTick?.();
    onNavigate?.('plans');
  };

  const currentPlanName = String(
    user?.plan_name || user?.plan || user?.subscription_plan || 'free'
  ).toLowerCase();

  const isProPlan = currentPlanName.includes('pro');
  const isProPlusPlan =
    currentPlanName.includes('pro+') ||
    currentPlanName.includes('pro plus') ||
    currentPlanName.includes('premium');

  // Crawler-aware link (real per-job title/image in WhatsApp/Telegram) — see GET /share/job/{id}.
  const handleShare = () => {
    soundService.playTick?.();
    shareLink(`${window.location.origin}/share/job/${job.id}`, addToast, 'لینکی کارەکە کۆپیکرا.');
  };
  const detailStats = [
    ['مووچە', salaryText, 'text-[#641bd9]'],
    ['جۆری کار', jobType, 'text-[#16111d]'],
    ['شێوازی کار', workplace, 'text-[#16111d]'],
    ['بینین', viewCount.toLocaleString(), 'text-[#16111d]'],
  ];

  return (
    <div
      dir="rtl"
      className="min-h-[100dvh] w-full bg-[#f4f3f6] text-[#16111d]"
      style={{ fontFamily: NK }}
    >
      {/* Premium page shell */}
      <div className="min-h-[100dvh]">
        <StickyProfileBar title={title} subtitle={companyName} avatar={companyLogo} onBack={() => { soundService.playTick?.(); onClose(); }} onShare={handleShare} />

        {/* Hero */}
        <section className="relative overflow-hidden bg-[#14101b] text-white" style={{ marginTop: 'calc(-1 * env(safe-area-inset-top))' }}>
          <HeroControls onBack={() => { soundService.playTick?.(); onClose(); }} actions={[{ icon: Bookmark, label: 'پاشەکەوتکردن', onClick: () => { soundService.playTick?.(); toggleSaveJob(job.id); }, active: isSaved }, { icon: Share2, label: 'هاوبەشکردن', onClick: handleShare }]} />
          <div className="pointer-events-none absolute -right-28 -top-32 h-96 w-96 rounded-full bg-[#641bd9]/25 blur-3xl" />
          <div className="pointer-events-none absolute -left-28 -bottom-44 h-[430px] w-[430px] rounded-full bg-[#a37fdd]/10 blur-3xl" />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.045]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.8) 1px, transparent 1px)',
              backgroundSize: '36px 36px',
            }}
          />

          <div className="relative mx-auto w-full max-w-[1480px] px-4 pb-8 sm:px-6 sm:pb-10 lg:px-10 lg:pb-14" style={{ paddingTop: 'calc(88px + env(safe-area-inset-top))' }}>
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <div className="mb-5 flex items-center gap-4">
                  <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-white/10 shadow-xl sm:h-20 sm:w-20">
                    {companyLogo ? (
                      <img
                        src={companyLogo}
                        alt={companyName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-black">{initial}</span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-black">{companyName}</span>
                      <BadgeCheck className="h-4 w-4 shrink-0 text-[#9b70e1]" />
                    </div>
                    <div className="mt-1 text-xs font-bold text-white/50">
                      {district ? `${gov} • ${district}` : gov}
                    </div>
                  </div>
                </div>

                <div className="mb-4 flex flex-wrap gap-2">
                  {isBoosted && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#641bd9] px-3 py-1.5 text-[10px] font-black">
                      <Sparkles className="h-3 w-3" />
                      بەرزکراوە
                    </span>
                  )}
                  {isNew && (
                    <span className="rounded-full bg-[#e1d3f8] px-3 py-1.5 text-[10px] font-black text-[#5b1cc0]">
                      نوێ
                    </span>
                  )}
                  <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[10px] font-black text-white/80">
                    {categoryName}
                  </span>
                </div>

                <h1 className="max-w-4xl text-3xl font-black leading-[1.15] tracking-[-0.035em] sm:text-4xl lg:text-5xl">
                  {title}
                </h1>

                <div className="mt-5 flex flex-wrap gap-2">
                  {[gov, workplace, jobType, sectorLabel(job.sector)].filter(Boolean).map((item) => (
                    <span
                      key={item}
                      className="rounded-xl border border-white/10 bg-white/[0.07] px-3 py-2 text-[10px] font-bold text-white/70"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid shrink-0 grid-cols-2 gap-2 sm:min-w-[330px]">
                <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur-sm">
                  <div className="text-[10px] font-bold text-white/40">مووچە</div>
                  <div className="mt-1 text-lg font-black text-white">{salaryText}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur-sm">
                  <div className="text-[10px] font-bold text-white/40">بینین</div>
                  <div className="mt-1 flex items-center gap-2 text-lg font-black text-white">
                    <Eye className="h-4 w-4 text-[#9b70e1]" />
                    {viewCount.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Main content */}
        <main className="mx-auto w-full max-w-[1480px] px-3 py-4 pb-28 sm:px-6 sm:py-6 lg:px-10 lg:py-8 lg:pb-12">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_390px]">
            {/* Left */}
            <div className="min-w-0 space-y-5">
              <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {detailStats.map(([label, value, valueClass]) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-[#e5e2ea] bg-white p-4 shadow-[0_8px_25px_rgba(22,17,29,.035)]"
                  >
                    <div className="mb-1.5 text-[10px] font-bold text-[#87948f]">{label}</div>
                    <div className={`truncate text-sm font-black ${valueClass}`}>{value}</div>
                  </div>
                ))}
              </section>

              <section className="rounded-3xl border border-[#e5e2ea] bg-white p-5 shadow-[0_8px_30px_rgba(22,17,29,.04)] sm:p-7">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <div className="mb-1 text-[10px] font-black text-[#641bd9]">JOB DETAILS</div>
                    <h2 className="text-xl font-black">دەربارەی هەلی کار</h2>
                  </div>
                  <div className="hidden rounded-xl bg-[#f1edf8] px-3 py-2 text-[10px] font-black text-[#641bd9] sm:block">
                    {categoryName}
                  </div>
                </div>

                <JobDescription
                  text={job.description ||
                    job.description_ku ||
                    job.details ||
                    'زانیارییەکانی ئەم هەلی کارە لەلایەن دامەزرێنەرەوە دیاری نەکراون.'}
                />
              </section>

              <section className="rounded-3xl border border-[#e5e2ea] bg-white p-5 shadow-[0_8px_30px_rgba(22,17,29,.04)] sm:p-7">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="text-xl font-black">تواناکانی پێویست</h2>
                  <span className="text-[10px] font-bold text-[#87948f]">{skills.length} تواناکە</span>
                </div>

                {skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2.5">
                    {skills.map((skill, index) => (
                      <span
                        key={`${String(skill)}-${index}`}
                        className="rounded-xl border border-[#ddd3ed] bg-[#f3eff9] px-3.5 py-2.5 text-xs font-black text-[#5f1fc6]"
                      >
                        {String(skill)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl bg-[#f8f7f9] p-5 text-sm font-bold text-[#7d8b86]">
                    تواناکانی تایبەت بۆ ئەم کارە دیاری نەکراون.
                  </div>
                )}
              </section>

              <section className="rounded-3xl border border-[#e5e2ea] bg-white p-5 shadow-[0_8px_30px_rgba(22,17,29,.04)] sm:p-7">
                <div className="mb-6">
                  <div className="mb-1 text-[10px] font-black text-[#641bd9]">HOW IT WORKS</div>
                  <h2 className="text-xl font-black">چۆن داواکاری بکەیت؟</h2>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    ['١', 'CV هەڵبژێرە', 'CV ـی پرۆفایل، CV ـی دروستکراو یان فایلێکی نوێ هەڵبژێرە.'],
                    ['٢', 'پێداچوونەوە', 'زانیارییەکانت پشکنینەوە بکە و ئەگەر پێویست بوو نامە زیاد بکە.'],
                    ['٣', 'داواکاری بنێرە', 'داواکارییەکەت بنێرە و دۆخی داواکارییەکە بەدواداچوون بکە.'],
                  ].map(([num, heading, body]) => (
                    <div key={num} className="rounded-2xl bg-[#f8f7fa] p-4">
                      <div className="mb-4 grid h-9 w-9 place-items-center rounded-xl bg-[#e7def6] text-xs font-black text-[#641bd9]">
                        {num}
                      </div>
                      <div className="text-sm font-black">{heading}</div>
                      <div className="mt-1.5 text-xs font-medium leading-6 text-[#7b8984]">{body}</div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Desktop application card */}
            <aside className="hidden lg:block">
              <div className="sticky top-24 space-y-4">
                <section className="overflow-hidden rounded-3xl border border-[#e5e2ea] bg-white shadow-[0_14px_40px_rgba(22,17,29,.07)]">
                  <div className="bg-[#14101b] p-6 text-white">
                    <div className="mb-2 inline-flex rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[9px] font-black text-white/60">
                      KARNAMA
                    </div>
                    <h2 className="text-xl font-black">ئامادەی داواکارییت؟</h2>
                    <p className="mt-2 text-xs font-medium leading-6 text-white/50">
                      بە چەند هەنگاوێکی سادە CV ـەکەت هەڵبژێرە و داواکارییەکەت بنێرە.
                    </p>
                  </div>

                  <div className="p-5">
                    {hasAlreadyApplied ? (
                      <div className="rounded-2xl border border-[#d6c8ed] bg-[#f3effa] p-4">
                        <div className="flex items-center gap-2 text-sm font-black text-[#5b1cc0]">
                          <CheckCircle2 className="h-5 w-5" />
                          داواکاری نێردراوە
                        </div>
                        <p className="mt-2 text-xs font-bold leading-6 text-[#66817a]">
                          پێشتر بۆ ئەم هەلی کارە داواکاری ناردوویت.
                        </p>
                        <button
                          type="button"
                          onClick={() => onNavigate?.('my_applications')}
                          className="mt-4 w-full rounded-xl bg-[#16111d] py-3 text-xs font-black text-white"
                        >
                          داواکارییەکانم ببینە
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={handleStartApply}
                          className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-[#641bd9] px-5 py-4 text-sm font-black text-white shadow-[0_10px_25px_rgba(100,27,217,.2)] transition hover:bg-[#4b13a5] active:scale-[.99]"
                        >
                          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                          <Send className="relative h-4 w-4" />
                          <span className="relative">ئێستا داواکاری بکە</span>
                        </button>

                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <div className="rounded-xl bg-[#f7f6f9] p-3">
                            <div className="text-[9px] font-bold text-[#87948f]">کرێ</div>
                            <div className="mt-1 text-sm font-black text-[#16111d]">{CV_FEE_DISPLAY}</div>
                          </div>
                          <div className="rounded-xl bg-[#f7f6f9] p-3">
                            <div className="text-[9px] font-bold text-[#87948f]">کریدیتی بەخۆڕایی</div>
                            <div className="mt-1 text-sm font-black text-[#641bd9]">
                              {freeCreditsLeft.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        soundService.playTick?.();
                        toggleSaveJob(job.id);
                      }}
                      className={`mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border py-3.5 text-xs font-black transition ${
                        isSaved
                          ? 'border-[#cab7e9] bg-[#f3effa] text-[#641bd9]'
                          : 'border-[#e5e2ea] bg-white text-[#5b6964] hover:bg-[#f8f7fa]'
                      }`}
                    >
                      <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
                      {isSaved ? 'پاشەکەوتکراوە' : 'پاشەکەوتکردن'}
                    </button>

                    <div className="mt-5 flex items-start gap-2 border-t border-[#efedf1] pt-5 text-[10px] font-bold leading-5 text-[#84918c]">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#641bd9]" />
                      زانیارییەکانی داواکارییەکەت بە شێوەی پارێزراو بەڕێوەدەبرێن.
                    </div>
                  </div>
                </section>

                {!hasAlreadyApplied && (
                  <section className="overflow-hidden rounded-3xl bg-[#14101b] p-5 text-white shadow-[0_14px_40px_rgba(22,17,29,.08)]">
                    <div className="flex items-center gap-2 text-[#a881e7]">
                      <Sparkles className="h-4 w-4" />
                      <span className="text-[10px] font-black">KARNAMA PRO</span>
                    </div>
                    <h3 className="mt-2 text-base font-black">CV ـەکانت بۆ هەر کارێک ڕێکبخە</h3>
                    <p className="mt-1 text-[10px] font-medium leading-5 text-white/45">
                      بۆ هەر هەلی کارێک CV ـی گونجاو هەڵبژێرە و پڕۆفایلی پیشەیی‌تر دروست بکە.
                    </p>
                    <button
                      type="button"
                      onClick={handleOpenPlans}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 text-[10px] font-black text-[#16111d]"
                    >
                      <Crown className="h-4 w-4 text-[#641bd9]" />
                      {isProPlusPlan ? 'پلانەکەت بەڕێوەبەرە' : isProPlan ? 'بەرزکردنەوە بۆ Pro+' : 'بینینی پلانەکان'}
                      <ChevronRight className="h-4 w-4 text-[#641bd9]" />
                    </button>
                  </section>
                )}
              </div>
            </aside>
          </div>
        </main>

        {/* Mobile bottom CTA */}
        {step === 'detail' && !hasAlreadyApplied && (
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e2dfe8] bg-white/95 p-3 backdrop-blur-xl lg:hidden" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
            <button
              type="button"
              onClick={handleStartApply}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#641bd9] py-4 text-sm font-black text-white shadow-[0_8px_25px_rgba(100,27,217,.22)] active:scale-[.99]"
            >
              <Send className="h-4 w-4" />
              ئێستا داواکاری بکە
            </button>
          </div>
        )}

        {/* Step 1 — CV selection */}
        {step === 'cv_mode' && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-5">
            <div className="max-h-[94dvh] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-t-[30px] bg-white p-5 shadow-2xl sm:rounded-[30px] sm:p-7">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <div className="mb-2 text-[10px] font-black text-[#641bd9]">STEP 1 OF 3</div>
                  <h2 className="text-2xl font-black">CV ـەکەت هەڵبژێرە</h2>
                  <p className="mt-1 text-xs font-medium leading-6 text-[#7b8984]">
                    ئەو CV ـە هەڵبژێرە کە زۆرترین گونجاوی بۆ ئەم کارە هەیە.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep('detail')}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f5f4f7] text-[#65736e]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mb-6 flex gap-1.5">
                <div className="h-1.5 flex-1 rounded-full bg-[#641bd9]" />
                <div className="h-1.5 flex-1 rounded-full bg-[#e4e1e9]" />
                <div className="h-1.5 flex-1 rounded-full bg-[#e4e1e9]" />
              </div>

              <div className="grid gap-3">
                {[
                  ['profile', IdCard, 'CV ـی پرۆفایل', 'زانیارییەکانی پرۆفایلی Karnama بەکاربهێنە.'],
                  ['upload', Upload, 'بارکردنی CV', 'PDF یان Word تا ٥MB.'],
                  ...(resumes.length
                    ? [['resume', FileText, 'CV ـی دروستکراو', `${resumes.length} CV ـت بەردەستە.`]]
                    : []),
                ].map(([mode, Icon, heading, body]) => (
                  <div
                    key={mode}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      soundService.playTick?.();
                      setCvMode(mode);
                    }}
                    className={`relative cursor-pointer rounded-2xl border-2 p-4 transition ${
                      cvMode === mode
                        ? 'border-[#641bd9] bg-[#efeaf8]'
                        : 'border-[#e8e5ec] bg-white hover:border-[#c9bcde]'
                    }`}
                  >
                    {cvMode === mode && (
                      <div className="absolute left-4 top-4 grid h-5 w-5 place-items-center rounded-full bg-[#641bd9] text-white">
                        <Check className="h-3 w-3" />
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#e7def6] text-[#641bd9]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-black">{heading}</div>
                        <div className="mt-1 text-xs font-medium text-[#7b8984]">{body}</div>
                      </div>
                    </div>

                    {mode === 'upload' && cvMode === 'upload' && (
                      <div className="mt-4">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            fileInputRef.current?.click();
                          }}
                          className="w-full rounded-xl border border-dashed border-[#af9bd0] bg-white px-4 py-3 text-xs font-black text-[#641bd9]"
                        >
                          {cvFile ? cvFile.name : 'هەڵبژاردنی فایل'}
                        </button>
                      </div>
                    )}

                    {mode === 'resume' && cvMode === 'resume' && (
                      <div className="mt-4 grid gap-2">
                        {resumes.map((resume) => (
                          <button
                            key={resume.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedResumeId(resume.id);
                            }}
                            className={`w-full rounded-xl border p-3 text-right ${
                              selectedResumeId === resume.id
                                ? 'border-[#af9bd0] bg-white'
                                : 'border-[#e8e5ec] bg-[#f9f8fa]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-black">
                                {resume.title || resume.name || `CV ${resume.id}`}
                              </span>
                              {selectedResumeId === resume.id && (
                                <CheckCircle2 className="h-4 w-4 text-[#641bd9]" />
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between text-[10px] font-black text-[#687872]">
                  <label>پەیامی تەواوکەر <span className="font-medium">(ئارەزوومەندانە)</span></label>
                  <span>{coverLetter.length}/300</span>
                </div>
                <textarea
                  rows={4}
                  maxLength={300}
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  placeholder="کورتەیەک دەربارەی ئەزموون و بەردەستبوونت بنووسە..."
                  className="w-full resize-none rounded-2xl border border-[#e6e3ea] bg-[#fbfafc] p-4 text-sm font-medium leading-7 outline-none transition focus:border-[#a58ad1]"
                />
              </div>

              <button
                type="button"
                onClick={handleContinueToPayment}
                disabled={isSubmitting}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#16111d] py-4 text-sm font-black text-white transition hover:bg-black active:scale-[.99] disabled:opacity-60"
              >
                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : hasCredit ? <Send className="h-4 w-4" /> : null}
                {isSubmitting ? 'لە ناردندایە...' : hasCredit ? 'ناردنی سیڤی · ١ کریدیت بەکاردێت' : 'بەردەوامبوون بۆ پارەدان'}
                {!hasCredit && !isSubmitting && <ChevronRight className="h-4 w-4 rtl:rotate-180" />}
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — only for people with no credit: pay the fee with ZeraPay */}
        {step === 'fastpay' && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-5">
            <div className="max-h-[94dvh] w-full max-w-xl overflow-y-auto overscroll-contain rounded-t-[30px] bg-white p-5 shadow-2xl sm:rounded-[30px] sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="mb-2 text-[10px] font-black text-[#641bd9]">STEP 2 OF 2</div>
                  <h2 className="text-2xl font-black">پارەدان</h2>
                  <p className="mt-1 text-xs font-medium text-[#7b8984]">کریدیتت نەماوە — کرێی داواکارییەکە بە ZeraPay بدە.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep('cv_mode')}
                  className="grid h-10 w-10 place-items-center rounded-xl bg-[#f5f4f7] text-[#65736e]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-6 flex gap-1.5">
                <div className="h-1.5 flex-1 rounded-full bg-[#641bd9]" />
                <div className="h-1.5 flex-1 rounded-full bg-[#641bd9]" />
              </div>

              <div className="mt-5 rounded-3xl bg-[#14101b] p-5 text-white">
                <div className="text-[10px] font-bold text-white/45">کرێی ئەم داواکارییە</div>
                <div className="mt-1 text-3xl font-black">{CV_FEE_DISPLAY}</div>
                <div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-white/50">
                  <ShieldCheck className="h-4 w-4 text-[#9b70e1]" />
                  پارەدان لەسەر پەڕەی پارێزراوی ZeraPay ئەنجام دەدرێت.
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-[#e6e3ea] bg-[#faf9fb] p-4 text-xs font-medium leading-6 text-[#5f6f69]">
                دوای پارەدان و پشتڕاستکردنەوە، سیڤییەکەت ڕاستەوخۆ دەگاتە کۆمپانیا. دەتوانیت داواکارییەکەت لە بەشی «داواکارییەکانم» بەدوادا بچیت.
              </div>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleZeraPay}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#641bd9] py-4 text-sm font-black text-white shadow-[0_8px_24px_rgba(100,27,217,.2)] disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                {isSubmitting ? 'کرانەوەی ZeraPay...' : `پارەدان بە ZeraPay · ${CV_FEE_DISPLAY}`}
              </button>

              <button
                type="button"
                onClick={handleOpenPlans}
                className="mt-2 w-full rounded-2xl py-3 text-xs font-black text-[#641bd9] transition hover:bg-[#f1edf8]"
              >
                یان پلانێک بکڕە بۆ کریدیتی زیاتر
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Success */}
        {step === 'success' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#14101b]/75 p-4 backdrop-blur-md">
            <div className="w-full max-w-lg rounded-[30px] bg-white p-6 text-center shadow-2xl sm:p-8">
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-[24px] bg-[#ece4f8] text-[#641bd9]">
                <Check className="h-10 w-10 stroke-[3]" />
              </div>

              <div className="mt-5 text-[10px] font-black text-[#641bd9]">STEP 3 OF 3 • COMPLETED</div>
              <h2 className="mt-2 text-2xl font-black">داواکارییەکەت نێردرا!</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm font-medium leading-7 text-[#71807a]">
                داواکارییەکەت بە سەرکەوتوویی تۆمارکرا. دەتوانیت لە بەشی داواکارییەکان دۆخەکەی بەدواداچوون بکەیت.
              </p>

              <div className="mt-6 divide-y divide-[#efedf1] rounded-2xl bg-[#f8f7fa] px-4 text-right">
                <div className="flex items-center justify-between gap-3 py-3 text-xs">
                  <span className="max-w-[65%] truncate font-black">{title}</span>
                  <span className="font-bold text-[#87948f]">هەلی کار</span>
                </div>
                <div className="flex items-center justify-between gap-3 py-3 text-xs">
                  <span dir="ltr" className="font-mono font-black">{generatedTxId || paymentTxId}</span>
                  <span className="font-bold text-[#87948f]">کۆدی مامەڵە</span>
                </div>
                <div className="flex items-center justify-between gap-3 py-3 text-xs">
                  <span className="rounded-full bg-[#e7def6] px-2.5 py-1 font-black text-[#641bd9]">نێردراوە</span>
                  <span className="font-bold text-[#87948f]">دۆخ</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  soundService.playTick?.();
                  onNavigate?.('my_applications');
                }}
                className="mt-5 w-full rounded-2xl bg-[#16111d] py-4 text-sm font-black text-white"
              >
                داواکارییەکانم ببینە
              </button>

              <button
                type="button"
                onClick={() => {
                  soundService.playTick?.();
                  onClose();
                }}
                className="mt-2 w-full rounded-2xl border border-[#e6e3ea] bg-white py-3.5 text-xs font-black text-[#5b6964]"
              >
                گەڕان بۆ کاری تر
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
