import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { soundService } from '../../services/soundService';
import { readFileAsDataUri } from '../../utils/file';
import { apiService, API_BASE_URL } from '../../services/api';
import {
  ArrowRight, Heart, Bookmark, Share2, BadgeCheck, Check, CheckCircle2,
  Send, Copy, IdCard, Upload, FileText, Loader2, AlertCircle, Zap, Crown,
  Phone, Mail, Calendar, Eye, Users, Briefcase, X, Sparkles, ShieldCheck,
  ChevronRight, Info
} from 'lucide-react';

const NK = "'Noto Kufi Arabic', 'Vazirmatn', system-ui, sans-serif";
const TEAL = '#12796b';
const TEAL_DARK = '#0d5c50';
const MINT = '#d4f7ee';
const MINT_BG = '#e8f7f4';

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

export const JobDetailModal = ({ job, isOpen = true, onClose, onApply }) => {
  const { user, openAuthModal } = useAuth();
  const {
    applications = [],
    submitCVApplication,
    savedJobIds = [],
    toggleSaveJob,
    settings = {},
    categories = [],
    addToast,
    onNavigate
  } = useStore();

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
  const [cvMode, setCvMode] = useState('profile'); // 'profile' | 'upload'
  const [cvFile, setCvFile] = useState(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [paymentTxId, setPaymentTxId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generatedTxId, setGeneratedTxId] = useState('');

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setStep('detail');
      setCvMode('profile');
      setCvFile(null);
      setCoverLetter('');
      setPaymentTxId('');
      setGeneratedTxId('');
      if (job?.id) apiService.registerJobView(job.id);
    }
  }, [isOpen, job?.id]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  if (!job || isOpen === false) return null;

  const isSaved = savedJobIds.includes(job.id);
  const companyName = job.company_name || job.companyName || 'کۆمپانیا';
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
      payment_method: isFreeVip ? 'VIP Credit' : 'FastPay',
      payment_tx_id: txCode,
    });

    setIsSubmitting(false);

    if (ok) {
      soundService.playSuccess?.();
      setStep('success');
      onApply?.();
    }
  };

  const handleShare = () => {
    soundService.playTick?.();
    // Crawler-aware share preview (real per-job title/image for
    // WhatsApp/Telegram/etc.) — see GET /share/job/{id} in public/api/index.php.
    const url = `${API_BASE_URL}/share/job/${job.id}`;
    if (navigator.share) {
      navigator.share({ title: `${title} — ${companyName}`, url }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(url);
      addToast?.({ title: 'کۆپیکرا ✓', message: 'لینکی کارەکە کۆپیکرا.', type: 'success' });
    }
  };

  return createPortal(
    <div
      dir="rtl"
      className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-0 lg:p-6 font-vazirmatn animate-fadeIn select-none"
      style={{ fontFamily: NK }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Modal Container */}
      <div className="bg-[#f4f7f6] w-full min-h-screen lg:min-h-0 lg:max-w-xl lg:rounded-[32px] shadow-2xl border border-[#e8eeec] overflow-hidden flex flex-col justify-between">

        {/* ══════════════════════════════════════════════════════════════
            SCREEN 1: JOB DETAIL
        ══════════════════════════════════════════════════════════════ */}
        {step === 'detail' && (
          <div className="flex-1 flex flex-col justify-between">
            {/* Top Bar */}
            <div
              className="bg-white px-5 sm:px-6 border-b border-[#e8eeec] flex items-center justify-between shrink-0"
              style={{
                paddingTop: 'max(16px, calc(env(safe-area-inset-top) + 12px))',
                paddingBottom: '14px',
              }}
            >
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    soundService.playTick?.();
                    toggleSaveJob(job.id);
                  }}
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center border transition active:scale-95 ${
                    isSaved ? 'bg-[#d4f7ee] border-[#b4eedf] text-[#12796b]' : 'bg-[#f4f7f6] border-[#e8eeed] text-[#5a6b65]'
                  }`}
                  aria-label="پاشەکەوتکردن"
                >
                  <Bookmark className={`w-4.5 h-4.5 ${isSaved ? 'fill-[#12796b]' : ''}`} />
                </button>

                <button
                  onClick={handleShare}
                  className="w-10 h-10 rounded-2xl bg-[#f4f7f6] border border-[#e8eeed] flex items-center justify-center text-[#5a6b65] transition active:scale-95"
                  aria-label="هاوبەشکردن"
                >
                  <Share2 className="w-4.5 h-4.5" />
                </button>
              </div>

              <button
                onClick={onClose}
                className="w-10 h-10 rounded-2xl bg-[#f4f7f6] hover:bg-[#eaf5f2] border border-[#e8eeed] flex items-center justify-center text-[#111d1a] transition active:scale-95"
                aria-label="داخستن"
              >
                <ArrowRight className="w-5 h-5 rtl:rotate-0" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-5 sm:p-6 space-y-5 flex-1 overflow-y-auto">
              {/* Company & Title Header */}
              <div className="text-right space-y-3">
                <div className="flex items-center justify-end gap-3">
                  <div>
                    <div className="flex items-center justify-end gap-1.5 font-bold text-xs text-[#111d1a]">
                      <BadgeCheck className="w-4 h-4 text-[#12796b]" />
                      <span>{companyName}</span>
                    </div>
                    <div className="text-[11px] text-[#7b8e88] font-bold mt-0.5">
                      {district ? `${gov}، ${district}` : gov}
                    </div>
                  </div>

                  <div className="w-13 h-13 rounded-2xl bg-[#d4f7ee] border border-[#beece2] flex items-center justify-center text-[#12796b] font-black text-xl shadow-xs shrink-0">
                    {initial}
                  </div>
                </div>

                <h1 className="text-xl sm:text-2xl font-black text-[#111d1a] tracking-tight leading-snug">
                  {title}
                </h1>

                {/* Badges */}
                <div className="flex items-center gap-2 justify-end flex-wrap pt-1">
                  {isBoosted && (
                    <span className="px-3 py-1 rounded-full bg-[#12796b] text-white text-xs font-black inline-flex items-center gap-1 shadow-2xs">
                      <Sparkles className="w-3 h-3" /> بەرزکراوە
                    </span>
                  )}
                  {isNew && (
                    <span className="px-3 py-1 rounded-full bg-[#d4f7ee] text-[#12796b] text-xs font-black">
                      نوێ
                    </span>
                  )}
                  <span className="px-3 py-1 rounded-full bg-white text-[#5a6b65] text-xs font-bold border border-[#e8eeed]">
                    {jobType}
                  </span>
                </div>
              </div>

              {/* 2x2 Key Info Grid */}
              <div className="grid grid-cols-2 gap-3 text-right">
                <div className="bg-white rounded-2xl p-4 border border-[#e8eeec] shadow-2xs space-y-1">
                  <span className="text-[11px] font-bold text-[#7b8e88] block">جۆری کار</span>
                  <span className="text-sm font-black text-[#111d1a] block">{workplace}</span>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-[#e8eeec] shadow-2xs space-y-1">
                  <span className="text-[11px] font-bold text-[#7b8e88] block">مووچەی مانگانە</span>
                  <span className="text-sm font-mono font-black text-[#12796b] block">{salaryText}</span>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-[#e8eeec] shadow-2xs space-y-1">
                  <span className="text-[11px] font-bold text-[#7b8e88] block">بینین</span>
                  <span className="text-sm font-mono font-black text-[#111d1a] block">{viewCount}</span>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-[#e8eeec] shadow-2xs space-y-1">
                  <span className="text-[11px] font-bold text-[#7b8e88] block">سێکتۆر</span>
                  <span className="text-sm font-black text-[#111d1a] block">{categoryName}</span>
                </div>
              </div>

              {/* About Job */}
              {(job.description || skills.length > 0) && (
                <div className="bg-white rounded-2xl p-5 border border-[#e8eeec] shadow-2xs text-right space-y-2.5">
                  <h3 className="text-xs font-black text-[#111d1a]">دەربارەی کار</h3>
                  {job.description && (
                    <p className="text-xs leading-relaxed text-[#5a6b65] font-medium whitespace-pre-line">
                      {job.description}
                    </p>
                  )}

                  {/* Skills pills */}
                  {skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 justify-end pt-2">
                      {skills.map((s, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 rounded-xl bg-[#f4f7f6] text-[#4a5854] text-[11px] font-bold border border-[#e8eeed]"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Action Bar */}
            <div
              className="p-4 bg-white border-t border-[#e8eeec] flex items-center gap-3 shrink-0"
              style={{
                paddingBottom: 'max(16px, calc(env(safe-area-inset-bottom) + 14px))',
              }}
            >
              <button
                onClick={() => {
                  soundService.playTick?.();
                  toggleSaveJob(job.id);
                }}
                className={`w-13 h-13 rounded-2xl border flex items-center justify-center transition active:scale-95 shrink-0 ${
                  isSaved ? 'bg-[#d4f7ee] border-[#b4eedf] text-[#12796b]' : 'bg-[#f4f7f6] border-[#e8eeed] text-[#5a6b65]'
                }`}
                aria-label="پاشەکەوتکردن"
              >
                <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-[#12796b]' : ''}`} />
              </button>

              <button
                onClick={handleStartApply}
                disabled={hasAlreadyApplied}
                className="flex-1 py-4 rounded-2xl bg-[#12796b] hover:bg-[#0d5c50] text-white text-xs sm:text-sm font-black shadow-[0_4px_14px_rgba(18,121,107,0.3)] active:scale-95 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {hasAlreadyApplied ? 'پێشتر داواکارییت ناردووە' : `داواکاری بنێرە · ${CV_FEE_DISPLAY}`}
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            SCREEN 2: APPLY 1/3 · CV MODE
        ══════════════════════════════════════════════════════════════ */}
        {step === 'cv_mode' && (
          <div className="flex-1 flex flex-col justify-between">
            {/* Top Bar with Step Progress */}
            <div
              className="bg-white px-5 sm:px-6 border-b border-[#e8eeec] space-y-3 shrink-0"
              style={{
                paddingTop: 'max(16px, calc(env(safe-area-inset-top) + 12px))',
                paddingBottom: '14px',
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-black text-[#12796b]">1/3</span>
                <button
                  onClick={() => setStep('detail')}
                  className="w-9 h-9 rounded-2xl bg-[#f4f7f6] hover:bg-[#eaf5f2] border border-[#e8eeed] flex items-center justify-center text-[#111d1a] transition active:scale-95"
                  aria-label="گەڕانەوە"
                >
                  <ArrowRight className="w-4.5 h-4.5 rtl:rotate-0" />
                </button>
              </div>

              {/* 3-segment progress indicator */}
              <div className="flex gap-1.5">
                <div className="h-1.5 flex-1 rounded-full bg-[#12796b]" />
                <div className="h-1.5 flex-1 rounded-full bg-[#e0eae6]" />
                <div className="h-1.5 flex-1 rounded-full bg-[#e0eae6]" />
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="p-5 sm:p-6 space-y-5 flex-1 overflow-y-auto text-right">
              <div className="space-y-1">
                <h2 className="text-xl font-black text-[#111d1a]">CV چۆن بنێریت؟</h2>
                <p className="text-xs text-[#7b8e88] font-bold">
                  پڕۆفایلەکەت وەک CV بنێرە، یان فایلێکی دەرەکی باربکە.
                </p>
              </div>

              {/* Option 1: Profile as CV */}
              <div
                onClick={() => {
                  soundService.playTick?.();
                  setCvMode('profile');
                }}
                className={`p-4 sm:p-5 rounded-2xl border-2 transition-all cursor-pointer relative shadow-2xs ${
                  cvMode === 'profile'
                    ? 'bg-[#e8f7f4] border-[#12796b]'
                    : 'bg-white border-[#e8eeec] hover:border-[#12796b]/40'
                }`}
              >
                {cvMode === 'profile' && (
                  <div className="absolute top-4 left-4 w-5 h-5 rounded-full bg-[#12796b] text-white flex items-center justify-center shadow-xs">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                )}

                <div className="flex items-start justify-end gap-3.5 pr-1">
                  <div>
                    <h4 className="text-sm font-black text-[#111d1a]">پڕۆفایلم وەک CV</h4>
                    <p className="text-[11px] text-[#5a6b65] font-medium mt-1 leading-relaxed">
                      ئەزموون، شارەزایی و زانیاری پەیوەندی ئێستا لە پڕۆفایلەکەتدا.
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-[#12796b] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <IdCard className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Option 2: Upload a file */}
              <div
                onClick={() => {
                  soundService.playTick?.();
                  setCvMode('upload');
                  fileInputRef.current?.click();
                }}
                className={`p-4 sm:p-5 rounded-2xl border-2 transition-all cursor-pointer relative shadow-2xs ${
                  cvMode === 'upload'
                    ? 'bg-[#e8f7f4] border-[#12796b]'
                    : 'bg-white border-[#e8eeec] hover:border-[#12796b]/40'
                }`}
              >
                {cvMode === 'upload' && (
                  <div className="absolute top-4 left-4 w-5 h-5 rounded-full bg-[#12796b] text-white flex items-center justify-center shadow-xs">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                )}

                <div className="flex items-start justify-end gap-3.5 pr-1">
                  <div>
                    <h4 className="text-sm font-black text-[#111d1a]">
                      {cvFile ? cvFile.name : 'فایلێک باربکە'}
                    </h4>
                    <p className="text-[11px] text-[#5a6b65] font-medium mt-1">
                      {cvFile ? 'فایل بە سەرکەوتوویی دیاریکرا' : 'PDF یان Word تا ٥ مێگابایت.'}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-[#f4f7f6] text-[#4a5854] border border-[#e8eeed] flex items-center justify-center shrink-0">
                    <Upload className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Optional Cover Letter */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs font-bold text-[#7b8e88]">
                  <span className="font-mono">({coverLetter.length}/300)</span>
                  <label className="text-[#111d1a] font-black">پەیامی تەواوکەر (ئارەزوومەندانە)</label>
                </div>
                <textarea
                  rows={4}
                  maxLength={300}
                  value={coverLetter}
                  onChange={e => setCoverLetter(e.target.value)}
                  placeholder="سڵاو، من سێ ساڵ ئەزموونم لە پەرەپێدانی وێب، بە تایبەت لە React و Node.js هەیە. دەتوانم لە ماوەی دوو هەفتەدا دەست بە کار بکەم."
                  className="w-full bg-white border border-[#e8eeec] rounded-2xl p-4 text-xs font-medium leading-relaxed text-[#111d1a] outline-none focus:border-[#12796b] resize-none shadow-2xs"
                />
              </div>
            </div>

            {/* Bottom Action Bar */}
            <div
              className="p-4 bg-white border-t border-[#e8eeec] shrink-0"
              style={{
                paddingBottom: 'max(16px, calc(env(safe-area-inset-bottom) + 14px))',
              }}
            >
              <button
                onClick={handleContinueToPayment}
                className="w-full py-4 rounded-2xl bg-[#12796b] hover:bg-[#0d5c50] text-white text-xs sm:text-sm font-black shadow-[0_4px_14px_rgba(18,121,107,0.3)] active:scale-95 transition flex items-center justify-center gap-2"
              >
                بەردەوام بە بۆ پارەدان
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            SCREEN 3: APPLY 2/3 · FASTPAY
        ══════════════════════════════════════════════════════════════ */}
        {step === 'fastpay' && (
          <div className="flex-1 flex flex-col justify-between">
            {/* Top Bar with Step Progress */}
            <div
              className="bg-white px-5 sm:px-6 border-b border-[#e8eeec] space-y-3 shrink-0"
              style={{
                paddingTop: 'max(16px, calc(env(safe-area-inset-top) + 12px))',
                paddingBottom: '14px',
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-black text-[#12796b]">2/3</span>
                <button
                  onClick={() => setStep('cv_mode')}
                  className="w-9 h-9 rounded-2xl bg-[#f4f7f6] hover:bg-[#eaf5f2] border border-[#e8eeed] flex items-center justify-center text-[#111d1a] transition active:scale-95"
                  aria-label="گەڕانەوە"
                >
                  <ArrowRight className="w-4.5 h-4.5 rtl:rotate-0" />
                </button>
              </div>

              {/* 3-segment progress indicator */}
              <div className="flex gap-1.5">
                <div className="h-1.5 flex-1 rounded-full bg-[#12796b]" />
                <div className="h-1.5 flex-1 rounded-full bg-[#12796b]" />
                <div className="h-1.5 flex-1 rounded-full bg-[#e0eae6]" />
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="p-5 sm:p-6 space-y-4 flex-1 overflow-y-auto text-right">
              <h2 className="text-xl font-black text-[#111d1a]">کرێی داواکاری</h2>

              {/* Fee Amount Card */}
              <div className="bg-[#d4f7ee] border border-[#beece2] rounded-2xl p-5 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-mono font-black text-[#12796b]">{CV_FEE_DISPLAY}</span>
                  <span className="text-xs font-bold text-[#15463e]">کرێی پارە</span>
                </div>
                <div className="flex items-start justify-end gap-1.5 text-[11px] font-bold text-[#2a6d63] leading-relaxed pt-1">
                  <span>پارەدان بە مسۆگەری، پارە دەگەڕێندرێتەوە ئەگەر داواکاریت ڕەت کرایەوە.</span>
                  <ShieldCheck className="w-4 h-4 text-[#12796b] shrink-0 mt-0.5" />
                </div>
              </div>

              {/* Free-credit benefit card, if the user's plan has any left */}
              {freeCreditsLeft > 0 ? (
                <div className="bg-white border border-[#beece2] rounded-2xl p-4 flex items-center justify-between shadow-2xs">
                  <button
                    onClick={() => handleFinalSubmit(true)}
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-xl bg-[#12796b] text-white text-xs font-black shadow-xs active:scale-95 transition"
                  >
                    بەکارهێنان
                  </button>
                  <div className="text-right">
                    <div className="text-xs font-black text-[#111d1a] flex items-center justify-end gap-1">
                      <Crown className="w-3.5 h-3.5 text-amber-500" />
                      <span>داواکاری بێبەرامبەر بە کرێدیت</span>
                    </div>
                    <div className="text-[11px] text-[#7b8e88] font-bold mt-0.5">
                      {freeCreditsLeft} کرێدیتی ماوە لە پلانەکەت — ئەم داواکارییە بەخۆڕاییە
                    </div>
                  </div>
                </div>
              ) : null}

              {/* FastPay Transfer Instructions Card */}
              <div className="bg-white rounded-2xl p-5 border border-[#e8eeec] shadow-2xs space-y-4">
                <h4 className="text-xs font-black text-[#111d1a]">گواستنەوەی دەستی</h4>

                {/* FastPay Number & Recipient */}
                <div className="p-3.5 rounded-xl bg-[#f8faf9] border border-[#e8eeed] flex items-center justify-between">
                  <button
                    onClick={handleCopyFastpay}
                    className="px-3 py-1.5 rounded-lg bg-white border border-[#e0eae6] text-[11px] font-bold text-[#12796b] hover:bg-[#f0faf7] active:scale-95 transition flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copied ? 'کۆپیکرا' : 'کۆپیکردن'}</span>
                  </button>

                  <div className="text-right">
                    <div className="text-[11px] text-[#7b8e88] font-bold">ژمارەی FastPay</div>
                    <div dir="ltr" className="text-sm font-mono font-black text-[#111d1a]">
                      {FASTPAY_NUMBER}
                    </div>
                    <div className="text-[10px] text-[#12796b] font-bold mt-0.5">
                      ناوی وەرگر: زێرا گرووپ
                    </div>
                  </div>
                </div>

                {/* Transaction ID Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-[#111d1a]">ژمارەی مامەڵە</label>
                  <input
                    dir="ltr"
                    value={paymentTxId}
                    onChange={e => setPaymentTxId(e.target.value)}
                    placeholder="FP-89241905"
                    className="w-full bg-[#f8faf9] border border-[#e8eeed] rounded-xl px-4 py-3 text-sm font-mono font-black text-center text-[#111d1a] outline-none focus:border-[#12796b]"
                  />
                  <div className="flex items-center justify-end gap-1 text-[10px] text-[#7b8e88] font-medium pt-1">
                    <span>ژمارەی مامەڵە لە بەرنامەی فاست‌پەی وەردەگریت.</span>
                    <Info className="w-3 h-3 text-[#7b8e88]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Action Bar */}
            <div
              className="p-4 bg-white border-t border-[#e8eeec] shrink-0"
              style={{
                paddingBottom: 'max(16px, calc(env(safe-area-inset-bottom) + 14px))',
              }}
            >
              <button
                onClick={() => handleFinalSubmit(false)}
                disabled={isSubmitting}
                className="w-full py-4 rounded-2xl bg-[#12796b] hover:bg-[#0d5c50] text-white text-xs sm:text-sm font-black shadow-[0_4px_14px_rgba(18,121,107,0.3)] active:scale-95 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span>پشتڕاستکردنی پارەدان</span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            SCREEN 4: APPLY 3/3 · SUBMITTED / SUCCESS
        ══════════════════════════════════════════════════════════════ */}
        {step === 'success' && (
          <div className="flex-1 flex flex-col justify-between">
            {/* Top Bar Spacer */}
            <div
              className="px-5 shrink-0"
              style={{
                paddingTop: 'max(16px, calc(env(safe-area-inset-top) + 16px))',
              }}
            />

            {/* Success Content */}
            <div className="p-6 space-y-6 flex-1 flex flex-col justify-center items-center text-center">
              {/* Checkmark Box */}
              <div className="w-20 h-20 rounded-3xl bg-[#d4f7ee] border-2 border-[#beece2] flex items-center justify-center text-[#12796b] shadow-lg animate-bounce">
                <Check className="w-10 h-10 stroke-[3]" />
              </div>

              <div className="space-y-2 max-w-sm">
                <h2 className="text-2xl font-black text-[#111d1a]">داواکاریت نێردرا!</h2>
                <p className="text-xs text-[#5a6b65] font-medium leading-relaxed">
                  پەیوەندیت پێوە دەکرێت لە ڕێگەی تەلەفۆن، پەیوەندیکردنی کۆمپانیا لە ماوەی ٤٨ کاتژمێردا وەڵامت دەدەنەوە.
                </p>
              </div>

              {/* Receipt Summary Card */}
              <div className="w-full bg-white rounded-2xl p-5 border border-[#e8eeec] shadow-2xs divide-y divide-[#f0f4f2] text-xs">
                <div className="py-2.5 flex items-center justify-between">
                  <span className="font-black text-[#111d1a] truncate max-w-[200px]">{title}</span>
                  <span className="text-[#7b8e88] font-bold">کار</span>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <span dir="ltr" className="font-mono font-bold text-[#111d1a]">
                    {generatedTxId || paymentTxId || 'FP-89241905'}
                  </span>
                  <span className="text-[#7b8e88] font-bold">ژمارەی مامەڵە</span>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#d4f7ee] text-[#12796b] font-black text-[10px]">
                    داواکاری پێشکەشکراوە
                  </span>
                  <span className="text-[#7b8e88] font-bold">دۆخ</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div
              className="p-5 space-y-3 bg-white border-t border-[#e8eeec] shrink-0"
              style={{
                paddingBottom: 'max(16px, calc(env(safe-area-inset-bottom) + 16px))',
              }}
            >
              <button
                onClick={() => {
                  soundService.playTick?.();
                  onClose();
                  if (onNavigate) onNavigate('my_applications');
                }}
                className="w-full py-4 rounded-2xl bg-[#111d1a] hover:bg-black text-white text-xs sm:text-sm font-black shadow-md active:scale-95 transition"
              >
                داواکارییەکانم ببینە
              </button>

              <button
                onClick={() => {
                  soundService.playTick?.();
                  onClose();
                }}
                className="w-full py-3.5 rounded-2xl bg-white hover:bg-[#f8faf9] border border-[#e8eeed] text-[#4a5854] text-xs font-bold active:scale-95 transition"
              >
                گەڕان بۆ کاری تر
              </button>
            </div>
          </div>
        )}

      </div>
    </div>,
    document.body
  );
};
