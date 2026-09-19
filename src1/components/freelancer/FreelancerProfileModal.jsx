import React, { useEffect, useRef, useState, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { soundService } from '../../services/soundService';
import { useStore } from '../../context/StoreContext';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api';
import { SendOfferModal } from '../requests/SendOfferModal';
import { StarRatingDisplay } from '../ui/StarRating';
import { exportNodeToPdf, safeFilename } from '../../services/karnamaPdf';
import { getTemplate } from '../../cvTemplates/registry';
import {
  ArrowLeft, Send, Share2, BadgeCheck, Phone, Mail, ExternalLink,
  Rocket, Crown, MapPin, BriefcaseBusiness, Star, FileText, Loader2,
  Sparkles, ChevronLeft, CheckCircle2, Award, UserRound, X
} from 'lucide-react';

const TEAL = '#12796b';
const TEAL_DEEP = '#0d5c50';
const TEAL_SOFT = '#e8f3f1';
const PAGE = '#f7f8f7';

const NO_COVER_BG =
  'linear-gradient(135deg, #edf7f5 0%, #f5f8f7 48%, #eef3f1 100%)';

const parseJsonArray = (val) => {
  if (Array.isArray(val)) return val;
  try {
    const parsed = JSON.parse(val || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

// Company-visible CV access.
// The backend can expose `public_resumes` as an array on the freelancer.
// Plan limits are intentionally kept here as a presentation fallback:
// Pro = 3 CVs, Pro+ / Premium = 6 CVs. If the backend sends an explicit
// `cv_visibility_limit`, that value takes precedence.
const getCvVisibilityLimit = (freelancer, tier) => {
  const explicit = Number(
    freelancer?.cv_visibility_limit ??
    freelancer?.public_cv_limit ??
    tier?.cv_visibility_limit
  );

  if (Number.isFinite(explicit) && explicit >= 0) return explicit;

  const planName = String(
    tier?.name_en || tier?.name_ku || freelancer?.plan_name || freelancer?.plan || ''
  ).toLowerCase();

  if (planName.includes('pro+') || planName.includes('pro plus') || planName.includes('premium')) {
    return 6;
  }

  if (planName.includes('pro')) return 3;

  return 0;
};

const normalizePublicCvs = (freelancer) => {
  const raw =
    freelancer?.public_resumes ??
    freelancer?.public_cvs ??
    freelancer?.company_visible_cvs ??
    [];

  if (Array.isArray(raw)) return raw.filter(Boolean);

  // Backward compatibility with the existing single-CV structure.
  if (freelancer?.public_resume_id) {
    return [{
      id: freelancer.public_resume_id,
      title: freelancer.public_resume_title || 'CV',
      template_id: freelancer.public_resume_template_id,
      resume_data: freelancer.public_resume_data
    }];
  }

  return [];
};

const GOV_LABELS = {
  sulaymaniyah: 'سلێمانی',
  erbil: 'هەولێر',
  duhok: 'دهۆک',
  kirkuk: 'کەرکووک',
  halabja: 'هەڵەبجە'
};

const HiddenResumeExportNode = ({ resume, innerRef }) => {
  const template = getTemplate(resume.template_id);
  const Comp = template.component;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: -9999,
        pointerEvents: 'none'
      }}
      aria-hidden="true"
    >
      <div ref={innerRef}>
        <Suspense fallback={null}>
          <Comp
            resume={{
              ...resume.resume_data,
              accentColor: template.accentColorDefault
            }}
          />
        </Suspense>
      </div>
    </div>
  );
};

const Section = ({ eyebrow, title, icon: Icon, children, className = '' }) => (
  <section className={`mt-7 ${className}`}>
    <div className="flex items-end justify-between gap-3 mb-3.5">
      <div className="min-w-0">
        {eyebrow && (
          <div className="text-[10px] uppercase tracking-[0.16em] text-stone-400 font-black mb-1">
            {eyebrow}
          </div>
        )}
        <h2 className="text-[15px] sm:text-base font-black text-stone-900">
          {title}
        </h2>
      </div>
      {Icon && (
        <div className="w-9 h-9 rounded-xl bg-white border border-stone-200 flex items-center justify-center shadow-sm shrink-0">
          <Icon className="w-4 h-4" style={{ color: TEAL }} />
        </div>
      )}
    </div>
    {children}
  </section>
);

const InfoCard = ({ icon: Icon, label, value, href, accent = TEAL }) => {
  const content = (
    <>
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${accent}12`, color: accent }}
      >
        <Icon className="w-[17px] h-[17px]" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-bold text-stone-400 mb-0.5">{label}</div>
        <div className="text-xs sm:text-[13px] font-black text-stone-800 truncate">{value}</div>
      </div>
    </>
  );

  const className =
    'flex items-center gap-2.5 rounded-2xl bg-white border border-stone-200/80 px-3 py-3 shadow-[0_3px_14px_rgba(20,30,25,.035)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_22px_rgba(20,30,25,.07)] active:scale-[.99]';

  return href ? (
    <a href={href} className={className}>{content}</a>
  ) : (
    <div className={className}>{content}</div>
  );
};

export const FreelancerProfileModal = ({ freelancer, isOpen, onClose }) => {
  const { addToast, categories = [], planTiers = [] } = useStore();
  const { user, openAuthModal } = useAuth();

  const [isSendOfferOpen, setIsSendOfferOpen] = useState(false);
  const [ratingSummary, setRatingSummary] = useState({ average: 0, count: 0 });
  const [publicResume, setPublicResume] = useState(null);
  const [isExportingCv, setIsExportingCv] = useState(false);
  const [selectedCv, setSelectedCv] = useState(null);
  const cvExportRef = useRef(null);

  const handleViewCv = async (cv = null) => {
    soundService.playTick?.();
    setIsExportingCv(true);

    try {
      let resume = cv || selectedCv || publicResume;

      // New API shape: getPublicResume can return a selected resume,
      // while the profile can also provide public_resumes directly.
      if (!resume) {
        const resumeId = cv?.id || freelancer.public_resume_id;
        const res = await apiService.getPublicResume(
          freelancer.id,
          resumeId ? { resumeId } : undefined
        );

        if (!res?.success) {
          addToast?.({
            title: 'CV نییە',
            message: 'ئەم کارخوازە CV ی گشتی دانەناوە.',
            type: 'info'
          });
          return;
        }

        resume = res.resume;
        setPublicResume(resume);
      }

      setSelectedCv(resume);

      await new Promise((resolve) => setTimeout(resolve, 80));

      if (!cvExportRef.current) throw new Error('no node');

      await exportNodeToPdf(
        cvExportRef.current,
        `${safeFilename(resume.title || `${name}-CV`)}.pdf`
      );
    } catch {
      addToast?.({
        title: 'سەرنەکەوت',
        message: 'کردنەوەی CV سەرکەوتوو نەبوو، دووبارە هەوڵبدەرەوە.',
        type: 'error'
      });
    } finally {
      setIsExportingCv(false);
    }
  };

  useEffect(() => {
    if (isOpen && freelancer?.id && freelancer.id !== user?.id) {
      apiService.registerFreelancerView(freelancer.id);
    }
  }, [isOpen, freelancer?.id, user?.id]);

  useEffect(() => {
    if (!isOpen || !freelancer?.id) return;

    apiService
      .getRatings(freelancer.id)
      .then((r) =>
        setRatingSummary({
          average: r.average,
          count: r.count
        })
      );
  }, [isOpen, freelancer?.id]);

  useEffect(() => {
    if (!isOpen) return;

    const previous = document.body.style.overscrollBehavior;
    document.body.style.overscrollBehavior = 'contain';

    return () => {
      document.body.style.overscrollBehavior = previous;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen || !freelancer) return null;

  const skillsList = parseJsonArray(freelancer.skills);
  const experienceList = parseJsonArray(
    freelancer.experience ||
      freelancer.experiences ||
      freelancer.work_history
  );
  const favCategoryIds = parseJsonArray(freelancer.favorite_categories);
  const favCategories = categories.filter((c) =>
    favCategoryIds.includes(c.id)
  );

  const avatarUrl = freelancer.avatar || null;
  const coverUrl = freelancer.cover || null;
  const name = freelancer.name || freelancer.full_name || 'بەهرەمەند';
  const initial = name.trim().charAt(0) || 'ئ';
  const gov =
    freelancer.governorate_id ||
    freelancer.governorate ||
    freelancer.district ||
    freelancer.location ||
    '';
  const bio = freelancer.bio || '';
  const phone = freelancer.phone || '';
  const email = freelancer.email || '';
  const isVerified =
    Number(freelancer.verified) === 1 || Boolean(freelancer.verified);
  const isBoosted = Boolean(
    freelancer.plan_boost_until &&
      new Date(freelancer.plan_boost_until) > new Date()
  );
  const govDisplay = GOV_LABELS[gov] || gov || 'سلێمانی';
  const profession = freelancer.profession || freelancer.title || null;

  const tier = planTiers.find((t) => t.id === freelancer.plan);
  const hasPaidPlan = Boolean(tier && Number(tier.price) > 0);

  const cvVisibilityLimit = getCvVisibilityLimit(freelancer, tier);
  const allPublicCvs = normalizePublicCvs(freelancer);
  const visibleCvs = allPublicCvs.slice(0, cvVisibilityLimit);
  const hasCompanyVisibleCvs = visibleCvs.length > 0;

  const roleLabel =
    profession || favCategories[0]?.name_ku || 'کارخواز';

  const profileUrl = `${window.location.origin}/search/freelancers/${freelancer.id || ''}`;

  const handleShare = () => {
    soundService.playTick?.();

    const shareData = {
      title: `${name} — ئیش خواز`,
      text: `${name} | ${roleLabel} · ${govDisplay}`,
      url: profileUrl
    };

    if (navigator.share) {
      navigator.share(shareData).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(profileUrl);
      addToast?.({
        title: 'کۆپیکرا ✓',
        message: 'لینکی پڕۆفایلی فریلانسەر کۆپیکرا.',
        type: 'success'
      });
    }
  };

  const handleSendOffer = () => {
    soundService.playTick?.();

    if (user) {
      setIsSendOfferOpen(true);
    } else {
      openAuthModal?.('employer', 'login');
    }
  };

  const hasExtraInfo =
    !!(
      bio ||
      skillsList.length ||
      experienceList.length ||
      favCategories.length ||
      hasCompanyVisibleCvs
    );

  return createPortal(
    <>
      <div
        dir="rtl"
        className="fixed inset-0 z-[60] overflow-y-auto overflow-x-hidden font-vazirmatn"
        style={{
          background: PAGE,
          color: '#171a18',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain'
        }}
      >
        <style>{`
          @keyframes profileFadeUp {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
          }

          @keyframes profileFloat {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-3px); }
          }

          @keyframes profileShine {
            0% { transform: translateX(120%); }
            100% { transform: translateX(-120%); }
          }

          .profile-enter {
            animation: profileFadeUp .42s cubic-bezier(.2,.8,.2,1) both;
          }

          .profile-float {
            animation: profileFloat 4s ease-in-out infinite;
          }

          .profile-no-scrollbar::-webkit-scrollbar { display: none; }
          .profile-no-scrollbar { scrollbar-width: none; }
        `}</style>

        {/* Premium top accent */}
        <div
          className="fixed top-0 inset-x-0 h-1 z-[80]"
          style={{
            background: `linear-gradient(90deg, #0f766e, #159a89, #8bd5ca)`
          }}
        />

        {/* HERO */}
        <header className="relative">
          <div className="relative h-[250px] sm:h-[310px] lg:h-[350px] overflow-hidden">
            {coverUrl ? (
              <img
                src={coverUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover"
                style={{
                  filter: 'blur(24px) brightness(.82) saturate(1.08)',
                  transform: 'scale(1.12)'
                }}
              />
            ) : (
              <div
                className="absolute inset-0"
                style={{ background: NO_COVER_BG }}
              />
            )}

            {/* Professional overlay */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(180deg, rgba(7,24,21,.10) 0%, rgba(7,24,21,.05) 30%, rgba(7,24,21,.66) 100%)'
              }}
            />

            <div
              className="absolute inset-0 opacity-[.16]"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 1px 1px, rgba(255,255,255,.8) 1px, transparent 0)',
                backgroundSize: '26px 26px'
              }}
            />

            

            {/* Header controls */}
            <div
              className="absolute inset-x-0 top-0 flex items-center justify-between px-4 sm:px-7 lg:px-10 pt-[max(1rem,env(safe-area-inset-top))]"
            >
              <button
                onClick={() => {
                  soundService.playTick?.();
                  onClose();
                }}
                aria-label="گەڕانەوە"
                className="w-11 h-11 rounded-2xl bg-white/95 backdrop-blur-xl border border-white/50 shadow-[0_8px_30px_rgba(0,0,0,.16)] flex items-center justify-center active:scale-95 transition-transform"
              >
                <ArrowLeft className="w-[18px] h-[18px] rtl:rotate-180 text-stone-800" />
              </button>

              <div className="flex items-center gap-2">
                {hasPaidPlan && (
                  <div
                    className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[11px] font-black text-white shadow-lg backdrop-blur"
                    style={{ background: 'rgba(15,118,110,.92)' }}
                  >
                    <Crown className="w-3.5 h-3.5" />
                    {tier.name_ku || tier.name_en || 'VIP'}
                  </div>
                )}

                <button
                  onClick={handleShare}
                  aria-label="هاوبەشکردن"
                  className="w-11 h-11 rounded-2xl bg-white/95 backdrop-blur-xl border border-white/50 shadow-[0_8px_30px_rgba(0,0,0,.16)] flex items-center justify-center active:scale-95 transition-transform"
                >
                  <Share2 className="w-[17px] h-[17px] text-stone-800" />
                </button>
              </div>
            </div>

            {/* Hero identity */}
            <div className="absolute inset-x-0 bottom-0">
              <div className="max-w-6xl mx-auto px-5 sm:px-8 lg:px-10 pb-7 sm:pb-9">
                <div className="flex items-end gap-4 sm:gap-6">
                  <div className="relative shrink-0">
                    {hasPaidPlan && (
                      <div
                        className="absolute -inset-3 rounded-[30px] blur-xl opacity-70"
                        style={{ background: 'linear-gradient(135deg,#0f766e,#7ccfc3)' }}
                      />
                    )}

                    <div
                      className="relative p-1.5 rounded-[28px] shadow-[0_18px_45px_rgba(0,0,0,.28)]"
                      style={{
                        background: 'rgba(255,255,255,.96)'
                      }}
                    >
                      <div className="w-[82px] h-[82px] sm:w-[104px] sm:h-[104px] rounded-[22px] overflow-hidden bg-white flex items-center justify-center text-2xl sm:text-3xl font-black" style={{ color: TEAL_DEEP }}>
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          initial
                        )}
                      </div>
                    </div>

                    {isVerified && (
                      <div
                        className="absolute -bottom-1 -left-1 w-7 h-7 rounded-full bg-white shadow-lg flex items-center justify-center"
                        title="پشتڕاستکراو"
                      >
                        <BadgeCheck className="w-[19px] h-[19px]" style={{ color: '#3b82f6' }} />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 pb-1 text-white">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      {isBoosted && (
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-white/15 border border-white/20 backdrop-blur-md"
                        >
                          <Rocket className="w-3 h-3" />
                          بەرزکراوە
                        </span>
                      )}
                      {hasPaidPlan && (
                        <span
                          className="sm:hidden inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black text-white"
                          style={{ background: '#0f766e' }}
                        >
                          <Crown className="w-3 h-3" />
                          {tier.name_ku || tier.name_en || 'VIP'}
                        </span>
                      )}
                    </div>

                    <h1 className="text-[22px] sm:text-[30px] lg:text-[34px] leading-tight font-black tracking-tight truncate max-w-[72vw] sm:max-w-none">
                      {name}
                    </h1>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-1.5 text-[11px] sm:text-xs font-bold text-white/75">
                      <span className="inline-flex items-center gap-1.5">
                        <BriefcaseBusiness className="w-3.5 h-3.5" />
                        {roleLabel}
                      </span>
                      <span className="hidden sm:block w-1 h-1 rounded-full bg-white/40" />
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" />
                        {govDisplay}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* MAIN CONTENT */}
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_330px] gap-5 lg:gap-7 -mt-1 pb-[150px] lg:pb-20">

            {/* PRIMARY COLUMN */}
            <div className="min-w-0 profile-enter">
              {/* Quick summary strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 -mt-4 relative z-10">
                {ratingSummary.count > 0 && (
                  <div className="rounded-2xl bg-white border border-stone-200/80 p-3.5 shadow-[0_8px_28px_rgba(20,30,25,.06)]">
                    <div className="flex items-center gap-1.5 text-base font-black">
                      <Star className="w-4 h-4" style={{ color: '#f5a524', fill: '#f5a524' }} />
                      {ratingSummary.average.toFixed(1)}
                    </div>
                    <div className="text-[10px] text-stone-400 font-bold mt-1">
                      هەڵسەنگاندن · {ratingSummary.count}
                    </div>
                  </div>
                )}

                {skillsList.length > 0 && (
                  <div className="rounded-2xl bg-white border border-stone-200/80 p-3.5 shadow-[0_8px_28px_rgba(20,30,25,.06)]">
                    <div className="text-base font-black">{skillsList.length}</div>
                    <div className="text-[10px] text-stone-400 font-bold mt-1">شارەزایی</div>
                  </div>
                )}

                {experienceList.length > 0 && (
                  <div className="rounded-2xl bg-white border border-stone-200/80 p-3.5 shadow-[0_8px_28px_rgba(20,30,25,.06)]">
                    <div className="text-base font-black">{experienceList.length}</div>
                    <div className="text-[10px] text-stone-400 font-bold mt-1">ئەزموون</div>
                  </div>
                )}

                <div className="rounded-2xl bg-white border border-stone-200/80 p-3.5 shadow-[0_8px_28px_rgba(20,30,25,.06)]">
                  <div className="text-base font-black flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" style={{ color: TEAL }} />
                    {isVerified ? 'پشتڕاستکراو' : 'پڕۆفایل'}
                  </div>
                  <div className="text-[10px] text-stone-400 font-bold mt-1">
                    دۆخی ئەکاونت
                  </div>
                </div>
              </div>

              {/* Bio */}
              {bio && (
                <section
                  className="mt-5 rounded-[24px] bg-white border border-stone-200/80 p-5 sm:p-6 shadow-[0_8px_32px_rgba(20,30,25,.045)]"
                  style={hasPaidPlan ? { borderColor: '#b9dcd6' } : undefined}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-2xl shrink-0 flex items-center justify-center"
                      style={{ background: TEAL_SOFT, color: TEAL }}
                    >
                      <UserRound className="w-[18px] h-[18px]" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-black text-stone-400 mb-1">دەربارەی کارخواز</div>
                      <p className="text-sm sm:text-[15px] text-stone-600 leading-7 font-medium">
                        {bio}
                      </p>
                    </div>
                  </div>
                </section>
              )}

              {/* Skills */}
              {skillsList.length > 0 && (
                <Section eyebrow="SKILLS" title="شارەزاییەکان" icon={Sparkles}>
                  <div className="rounded-[24px] bg-white border border-stone-200/80 p-4 sm:p-5 shadow-[0_8px_30px_rgba(20,30,25,.04)]">
                    <div className="flex flex-wrap gap-2">
                      {skillsList.map((skill, index) => (
                        <span
                          key={index}
                          className="px-3.5 py-2.5 rounded-xl text-xs sm:text-[13px] font-black border transition-all hover:-translate-y-0.5"
                          style={{
                            color: TEAL_DEEP,
                            background: `${TEAL}08`,
                            borderColor: `${TEAL}22`
                          }}
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </Section>
              )}

              {/* Experience */}
              {experienceList.length > 0 && (
                <Section eyebrow="EXPERIENCE" title="مێژووی کار و پڕۆژەکان" icon={BriefcaseBusiness}>
                  <div className="rounded-[24px] bg-white border border-stone-200/80 p-5 sm:p-6 shadow-[0_8px_30px_rgba(20,30,25,.04)]">
                    <div className="space-y-7">
                      {experienceList.map((exp, index) => (
                        <div
                          key={exp.id || index}
                          className="relative pr-7"
                        >
                          <span
                            className="absolute right-0 top-1.5 w-3 h-3 rounded-full ring-4"
                            style={{
                              background: TEAL,
                              boxShadow: `0 0 0 4px ${TEAL_SOFT}`
                            }}
                          />

                          {index < experienceList.length - 1 && (
                            <span
                              className="absolute right-[5px] top-5 bottom-[-28px] w-px"
                              style={{ background: '#dce7e3' }}
                            />
                          )}

                          <div className="text-sm sm:text-[15px] font-black text-stone-900">
                            {exp.title}
                          </div>

                          {(exp.period || exp.description) && (
                            <div className="text-xs sm:text-[13px] text-stone-500 leading-6 font-medium mt-1.5">
                              {exp.period}
                              {exp.period && exp.description ? ' · ' : ''}
                              {exp.description}
                            </div>
                          )}

                          {exp.link && (
                            <a
                              href={exp.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1.5 mt-2.5 text-[11px] font-black hover:underline"
                              style={{ color: TEAL }}
                            >
                              بینینی نموونە
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </Section>
              )}

              {/* COMPANY-VISIBLE CVS */}
              {hasCompanyVisibleCvs && (
                <Section
                  eyebrow="PORTFOLIO / CV"
                  title="CV ـە گشتییەکان"
                  icon={FileText}
                >
                  <div className="rounded-[24px] bg-white border border-stone-200/80 p-4 sm:p-5 shadow-[0_8px_30px_rgba(20,30,25,.04)]">
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div className="text-xs sm:text-[13px] text-stone-500 font-medium leading-6">
                        کۆمپانیاکان دەتوانن ئەم CV ـانە ببینن و هەڵیبژێرن.
                      </div>
                      {cvVisibilityLimit > 0 && (
                        <span
                          className="shrink-0 px-2.5 py-1.5 rounded-full text-[10px] font-black"
                          style={{
                            color: TEAL_DEEP,
                            background: TEAL_SOFT
                          }}
                        >
                          {visibleCvs.length}/{cvVisibilityLimit}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {visibleCvs.map((cv, index) => {
                        const isSelected = selectedCv?.id === cv.id;

                        return (
                          <button
                            key={cv.id || index}
                            onClick={() => setSelectedCv(cv)}
                            className="text-right rounded-2xl border p-3.5 transition-all hover:-translate-y-0.5 active:scale-[.99]"
                            style={{
                              background: isSelected ? `${TEAL}08` : '#fff',
                              borderColor: isSelected ? `${TEAL}45` : '#e7e9e8'
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                style={{
                                  background: isSelected ? TEAL : TEAL_SOFT,
                                  color: isSelected ? '#fff' : TEAL
                                }}
                              >
                                <FileText className="w-[17px] h-[17px]" />
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="text-xs sm:text-[13px] font-black text-stone-900 truncate">
                                  {cv.title || `CV ${index + 1}`}
                                </div>
                                <div className="text-[10px] text-stone-400 font-bold mt-1">
                                  {isSelected ? 'هەڵبژێردراوە' : `CV ـی ${index + 1}`}
                                </div>
                              </div>

                              <ChevronLeft
                                className="w-4 h-4 shrink-0"
                                style={{ color: isSelected ? TEAL : '#a8afac' }}
                              />
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {selectedCv && (
                      <button
                        onClick={() => handleViewCv(selectedCv)}
                        disabled={isExportingCv}
                        className="w-full mt-3.5 py-3.5 rounded-2xl text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 active:scale-[.98] transition-transform disabled:opacity-60"
                        style={{
                          background: `linear-gradient(135deg, ${TEAL_DEEP}, ${TEAL})`,
                          boxShadow: `0 8px 20px ${TEAL}28`
                        }}
                      >
                        {isExportingCv ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <FileText className="w-4 h-4" />
                        )}
                        بینینی {selectedCv.title || 'CV'}
                      </button>
                    )}
                  </div>
                </Section>
              )}

              {/* Categories */}
              {favCategories.length > 0 && (
                <Section eyebrow="INTERESTS" title="بوارە دڵخوازەکان" icon={Award}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {favCategories.map((category) => (
                      <div
                        key={category.id}
                        className="flex items-center gap-3 rounded-2xl bg-white border border-stone-200/80 px-4 py-3.5 shadow-[0_5px_18px_rgba(20,30,25,.035)]"
                      >
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ background: TEAL }}
                        />
                        <span className="text-xs sm:text-[13px] font-black text-stone-700">
                          {category.name_ku}
                        </span>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {!hasExtraInfo && (
                <div className="mt-7 rounded-[24px] bg-white border border-stone-200 p-10 text-center">
                  <div
                    className="mx-auto w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                    style={{ background: TEAL_SOFT, color: TEAL }}
                  >
                    <UserRound className="w-5 h-5" />
                  </div>
                  <p className="text-sm text-stone-400 font-bold">
                    هێشتا هیچ زانیارییەکی زیاتر زیاد نەکراوە.
                  </p>
                </div>
              )}
            </div>

            {/* DESKTOP SIDEBAR */}
            <aside className="hidden lg:block">
              <div className="sticky top-7 space-y-3">
                <div
                  className="rounded-[28px] bg-white border p-5 shadow-[0_12px_45px_rgba(20,30,25,.07)]"
                  style={{
                    borderColor: hasPaidPlan ? '#cfe4e0' : '#e4e8e6'
                  }}
                >
                  <div className="text-[10px] font-black text-stone-400 mb-1">
                    پەیوەندی و کار
                  </div>
                  <h3 className="text-lg font-black text-stone-900 mb-4">
                    ئامادەی دەستپێکردنی کارە؟
                  </h3>

                  <button
                    onClick={handleSendOffer}
                    className="w-full py-3.5 rounded-2xl text-white font-black text-sm flex items-center justify-center gap-2 active:scale-[.98] transition-transform shadow-lg"
                    style={{
                      background: `linear-gradient(135deg, ${TEAL_DEEP}, ${TEAL})`,
                      boxShadow: `0 10px 25px ${TEAL}35`
                    }}
                  >
                    {user ? 'پێشنیاری کار بنێرە' : 'چوونەژوورەوە و ناردنی ئۆفەر'}
                    <Send className="w-4 h-4" />
                  </button>

                  {hasCompanyVisibleCvs && (
                    <button
                      onClick={() => handleViewCv(selectedCv || visibleCvs[0])}
                      disabled={isExportingCv}
                      className="w-full mt-2.5 py-3.5 rounded-2xl bg-stone-50 border border-stone-200 text-stone-800 font-black text-sm flex items-center justify-center gap-2 hover:bg-stone-100 active:scale-[.98] transition-all disabled:opacity-60"
                    >
                      {isExportingCv ? (
                        <Loader2 className="w-4 h-4 animate-spin" style={{ color: TEAL }} />
                      ) : (
                        <FileText className="w-4 h-4" style={{ color: TEAL }} />
                      )}
                      بینینی CV
                    </button>
                  )}

                </div>

                <div className="rounded-[24px] bg-white border border-stone-200/80 p-4 shadow-[0_8px_28px_rgba(20,30,25,.04)]">
                  <div className="text-[10px] font-black text-stone-400 mb-3">
                    زانیارییەکانی پەیوەندی
                  </div>

                  <div className="space-y-2.5">
                    {phone && (
                      <InfoCard
                        icon={Phone}
                        label="تەلەفۆن"
                        value={phone}
                        href={`tel:${phone.replace(/[^0-9+]/g, '')}`}
                      />
                    )}

                    {email && (
                      <InfoCard
                        icon={Mail}
                        label="ئیمەیل"
                        value={email}
                        href={`mailto:${email}`}
                      />
                    )}

                    <InfoCard
                      icon={MapPin}
                      label="شوێن"
                      value={govDisplay}
                    />
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </main>

        {/* MOBILE ACTION BAR */}
        <div
          className="lg:hidden fixed bottom-0 inset-x-0 z-50 px-3 sm:px-5 pt-3"
          style={{
            paddingBottom: 'max(.75rem, env(safe-area-inset-bottom))',
            background:
              'linear-gradient(to top, rgba(245,247,246,1) 62%, rgba(245,247,246,.0) 100%)'
          }}
        >
          <div className="max-w-2xl mx-auto flex items-center gap-2.5">
            {hasCompanyVisibleCvs && (
              <button
                onClick={() => handleViewCv(selectedCv || visibleCvs[0])}
                disabled={isExportingCv}
                aria-label="بینینی CV"
                className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-2xl bg-white border border-stone-200 shadow-[0_7px_25px_rgba(0,0,0,.09)] flex items-center justify-center active:scale-95 transition-transform disabled:opacity-60"
              >
                {isExportingCv ? (
                  <Loader2 className="w-5 h-5 animate-spin" style={{ color: TEAL }} />
                ) : (
                  <FileText className="w-5 h-5" style={{ color: TEAL }} />
                )}
              </button>
            )}

            <button
              onClick={handleSendOffer}
              className="flex-1 min-w-0 h-12 sm:h-14 rounded-2xl text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 active:scale-[.985] transition-transform shadow-xl"
              style={{
                background: `linear-gradient(135deg, ${TEAL_DEEP}, ${TEAL})`,
                boxShadow: `0 10px 28px ${TEAL}42`
              }}
            >
              <span className="truncate">
                {user ? 'پێشنیاری کار بنێرە' : 'چوونەژوورەوە بۆ ناردنی ئۆفەر'}
              </span>
              <Send className="w-4 h-4 shrink-0" />
            </button>

          </div>
        </div>
      </div>

      {isSendOfferOpen && (
        <SendOfferModal
          freelancer={freelancer}
          isOpen={isSendOfferOpen}
          onClose={() => setIsSendOfferOpen(false)}
        />
      )}

      {(selectedCv || publicResume) && (
        <HiddenResumeExportNode
          resume={selectedCv || publicResume}
          innerRef={cvExportRef}
        />
      )}
    </>,
    document.body
  );
};
