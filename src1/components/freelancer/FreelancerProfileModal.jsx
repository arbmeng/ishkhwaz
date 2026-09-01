import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { soundService } from '../../services/soundService';
import { useStore } from '../../context/StoreContext';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api';
import { SendOfferModal } from '../requests/SendOfferModal';
import { getPlanColor } from '../../utils/planPresets';
import { StarRatingDisplay } from '../ui/StarRating';
import {
  ArrowLeft, Send, Share2, Eye, BadgeCheck, Phone, Mail,
  ExternalLink, Sparkles, Rocket, Crown, MapPin, Calendar, CheckCircle2
} from 'lucide-react';

// Brand teal — matches the logo mark and the rest of the light screens.
const TEAL = '#12796b';
const TEAL_DEEP = '#0d5c50';
const TEAL_SOFT = '#e7f4f1';

const STRIPE_BG = 'repeating-linear-gradient(135deg, #e3f2ee, #e3f2ee 10px, #d7e8e4 10px, #d7e8e4 20px)';

const parseJsonArray = (val) => {
  if (Array.isArray(val)) return val;
  try { const p = JSON.parse(val || '[]'); return Array.isArray(p) ? p : []; } catch { return []; }
};

const GOV_LABELS = { sulaymaniyah: 'سلێمانی', erbil: 'هەولێر', duhok: 'دهۆک', kirkuk: 'کەرکووک', halabja: 'هەڵەبجە' };

export const FreelancerProfileModal = ({ freelancer, isOpen, onClose }) => {
  const { addToast, categories = [], planTiers = [] } = useStore();
  const { user, openAuthModal } = useAuth();
  const [isSendOfferOpen, setIsSendOfferOpen] = useState(false);
  const [ratingSummary, setRatingSummary] = useState({ average: 0, count: 0 });

  useEffect(() => {
    if (isOpen && freelancer?.id && freelancer.id !== user?.id) {
      apiService.registerFreelancerView(freelancer.id);
    }
  }, [isOpen, freelancer?.id]);

  useEffect(() => {
    if (!isOpen || !freelancer?.id) return;
    apiService.getRatings(freelancer.id).then(r => setRatingSummary({ average: r.average, count: r.count }));
  }, [isOpen, freelancer?.id]);

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prevOverflow; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen || !freelancer) return null;

  const skillsList     = parseJsonArray(freelancer.skills);
  const experienceList = parseJsonArray(freelancer.experience || freelancer.experiences || freelancer.work_history);
  const favCategoryIds = parseJsonArray(freelancer.favorite_categories);
  const favCategories  = categories.filter(c => favCategoryIds.includes(c.id));

  const avatarUrl   = freelancer.avatar || null;
  const coverUrl    = freelancer.cover || null;
  const name        = freelancer.name || freelancer.full_name || 'بەهرەمەند';
  const initial     = name.trim().charAt(0) || 'ئ';
  const gov         = freelancer.governorate_id || freelancer.governorate || freelancer.district || freelancer.location || '';
  const bio         = freelancer.bio || '';
  const phone       = freelancer.phone || '';
  const email       = freelancer.email || '';
  const memberSince = freelancer.created_at ? new Date(freelancer.created_at) : null;
  const isVerified  = Number(freelancer.verified) === 1 || Boolean(freelancer.verified);
  const isBoosted   = Boolean(freelancer.plan_boost_until && new Date(freelancer.plan_boost_until) > new Date());
  const govDisplay  = GOV_LABELS[gov] || gov || 'سلێمانی';
  const profession  = freelancer.profession || freelancer.title || freelancer.role || null;

  const tier = planTiers.find(t => t.id === freelancer.plan);
  const hasPaidPlan = tier && Number(tier.price) > 0;
  const planColor = tier ? getPlanColor(tier.color) : null;

  const avatarRingStyle = hasPaidPlan
    ? { padding: 4, background: planColor.gradient || planColor.accent, boxShadow: `0 0 0 4px #f4f7f6, 0 6px 20px ${planColor.accent}66` }
    : { padding: 3, background: '#e5e9e7' };

  // Premium tint applied to every content card when the freelancer has a
  // paid plan — a faint wash of the plan's own accent color plus a matching
  // border, so the whole page (not just the two badges) reads as premium.
  const premiumCardStyle = hasPaidPlan
    ? { background: `${planColor.accent}08`, borderColor: `${planColor.accent}35` }
    : {};

  const roleLabel = profession || favCategories[0]?.name_ku || 'کارخواز';
  const metaLine = [roleLabel, govDisplay].filter(Boolean).join(' · ');

  const profileUrl = `${window.location.origin}/search/freelancers/${freelancer.id || ''}`;

  const handleShare = () => {
    soundService.playTick?.();
    const shareData = { title: `${name} — ئیش خواز`, text: `${name} | ${metaLine}`, url: profileUrl };
    if (navigator.share) {
      navigator.share(shareData).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(profileUrl);
      addToast?.({ title: 'کۆپیکرا ✓', message: 'لینکی پڕۆفایلی فریلانسەر کۆپیکرا.', type: 'success' });
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

  const hasExtraInfo = !!(bio || skillsList.length > 0 || experienceList.length > 0 || favCategories.length > 0);

  return createPortal((
    <>
      <div dir="rtl" className="fixed inset-0 z-[60] overflow-y-auto select-none animate-fadeIn font-vazirmatn"
        style={{ background: '#f4f7f6', color: '#111', WebkitOverflowScrolling: 'touch' }}
      >
        {hasPaidPlan && (
          <style>{`
            .ishk-shine { background: linear-gradient(115deg, transparent 35%, rgba(255,255,255,.6) 50%, transparent 65%); background-size: 200% 100%; animation: ishkShine 2.6s ease-in-out infinite; }
            @keyframes ishkShine { 0% { background-position: 150% 0; } 100% { background-position: -50% 0; } }
          `}</style>
        )}

        {/* ── BANNER ── */}
        <div className="relative w-full h-44 sm:h-52">
          {coverUrl ? (
            <img src={coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : avatarUrl ? (
            <img src={avatarUrl} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover" style={{ filter: 'blur(18px) brightness(0.92) saturate(1.1)', transform: 'scale(1.15)' }} />
          ) : (
            <div className="absolute inset-0" style={{ background: STRIPE_BG }} />
          )}
          {hasPaidPlan && (
            <div
              className="absolute inset-x-0 bottom-0 h-24 pointer-events-none"
              style={{ background: `linear-gradient(to top, ${planColor.accent}4d, transparent)` }}
              aria-hidden="true"
            />
          )}

          <button onClick={() => { soundService.playTick?.(); onClose(); }} aria-label="گەڕانەوە"
            className="absolute right-4 w-10 h-10 rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.12)] flex items-center justify-center active:scale-95 transition-transform"
            style={{ top: 'max(1rem, calc(env(safe-area-inset-top) + 0.5rem))' }}>
            <ArrowLeft className="w-4.5 h-4.5 rtl:rotate-180 text-stone-700" />
          </button>

          <button onClick={handleShare} aria-label="هاوبەشکردن"
            className="absolute left-4 w-10 h-10 rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.12)] flex items-center justify-center active:scale-95 transition-transform"
            style={{ top: 'max(1rem, calc(env(safe-area-inset-top) + 0.5rem))' }}>
            <Share2 className="w-4 h-4 text-stone-700" />
          </button>
        </div>

        <div className="max-w-2xl mx-auto px-4 sm:px-6" style={{ paddingBottom: 'calc(8rem + env(safe-area-inset-bottom))' }}>
          {/* ── AVATAR (overlapping the banner) ── */}
          <div className="-mt-10 flex items-end justify-between">
            <div className="relative inline-block">
              {hasPaidPlan && (
                <div
                  className="absolute inset-0 -m-3 rounded-full pointer-events-none"
                  style={{ background: planColor.gradient || planColor.accent, opacity: 0.5, filter: 'blur(20px)' }}
                  aria-hidden="true"
                />
              )}
              <div className="relative inline-block rounded-full" style={avatarRingStyle}>
                <div className="relative w-20 h-20 rounded-full bg-white overflow-hidden flex items-center justify-center font-black text-2xl shrink-0" style={{ color: TEAL_DEEP }}>
                  {avatarUrl ? <img src={avatarUrl} alt={name} className="w-full h-full object-cover" /> : initial}
                </div>
              </div>
            </div>

            {/* Badges on Right */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {isBoosted && (
                <span className="px-3.5 py-1.5 rounded-full text-xs font-black text-white shadow-md flex items-center gap-1.5" style={{ background: TEAL }}>
                  <Rocket className="w-3.5 h-3.5" /> بەرزکراوە
                </span>
              )}
              {hasPaidPlan && (
                <span
                  className="relative overflow-hidden px-4 py-1.5 rounded-full text-xs font-black text-white shadow-md flex items-center gap-1.5"
                  style={{ background: planColor.accent, boxShadow: `0 3px 12px ${planColor.accent}80` }}
                >
                  <Crown className="w-3.5 h-3.5" /> {tier.name_ku || tier.name_en || 'VIP'}
                  <span className="absolute inset-0 ishk-shine" aria-hidden="true" />
                </span>
              )}
            </div>
          </div>

          {/* ── NAME / ROLE ── */}
          <div className="mt-3">
            <div className="flex items-center gap-1.5">
              <h1 className="text-xl font-black text-stone-900">{name}</h1>
              {isVerified && (
                <BadgeCheck className="w-[18px] h-[18px] shrink-0" style={{ color: '#3b82f6' }} title="پشتڕاستکراو" />
              )}
            </div>
            {metaLine && <p className="text-xs text-stone-400 font-bold mt-1">{metaLine}</p>}
            {ratingSummary.count > 0 && (
              <div className="mt-1.5">
                <StarRatingDisplay average={ratingSummary.average} count={ratingSummary.count} />
              </div>
            )}
          </div>

          {bio && (
            <p className="text-sm text-stone-600 leading-relaxed mt-3 p-4 rounded-2xl border shadow-2xs" style={{ background: '#fff', ...premiumCardStyle }}>
              {bio}
            </p>
          )}

          {/* ── STATS & DIRECT CONTACT ROW ── */}
          <div className="flex gap-2.5 mt-4">
            {memberSince && (
              <div className="flex-1 rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.05)] p-3 text-center border" style={{ background: '#fff', ...premiumCardStyle }}>
                <div className="text-base font-mono font-black text-stone-900">{memberSince.getFullYear()}</div>
                <div className="text-[10px] text-stone-400 font-bold mt-0.5">ساڵی دەستپێک</div>
              </div>
            )}
            <div className="flex-1 rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.05)] p-3 text-center border" style={{ background: '#fff', ...premiumCardStyle }}>
              <div className="text-base font-mono font-black text-stone-900 flex items-center justify-center gap-1">
                <Eye className="w-3.5 h-3.5 text-stone-400" />{Number(freelancer.profile_views || 0)}
              </div>
              <div className="text-[10px] text-stone-400 font-bold mt-0.5">بینینی پڕۆفایل</div>
            </div>
            {phone && (
              <a
                href={`tel:${phone.replace(/[^0-9+]/g, '')}`}
                className="flex-1 rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.05)] p-3 text-center border flex flex-col items-center justify-center hover:bg-stone-50 transition active:scale-95"
                style={{ background: '#fff', ...premiumCardStyle }}
              >
                <Phone className="w-4 h-4" style={{ color: TEAL }} />
                <div className="text-[10px] text-stone-600 font-bold mt-0.5">پەیوەندی</div>
              </a>
            )}
          </div>

          {/* ── SKILLS ── */}
          {skillsList.length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-black text-stone-900 mb-3">شارەزاییەکان</h2>
              <div className="flex flex-wrap gap-2">
                {skillsList.map((s, i) => (
                  <span key={i} className="px-3.5 py-2 rounded-2xl text-xs font-bold bg-white border border-stone-200 text-stone-800 shadow-2xs">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── WORK HISTORY ── */}
          {experienceList.length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-black text-stone-900 mb-3">مێژووی کار و پڕۆژەکان</h2>
              <div className="rounded-3xl shadow-[0_2px_16px_rgba(0,0,0,0.05)] p-5 border" style={{ background: '#fff', ...premiumCardStyle }}>
                <div className="space-y-5">
                  {experienceList.map((exp, i) => (
                    <div key={exp.id || i} className="relative pr-5">
                      <span className="absolute right-0 top-[5px] w-2 h-2 rounded-full" style={{ background: TEAL }} />
                      {i < experienceList.length - 1 && (
                        <span className="absolute right-[3px] top-[17px] bottom-[-20px] w-px bg-stone-200" />
                      )}
                      <div className="text-sm font-black text-stone-900">{exp.title}</div>
                      {(exp.period || exp.description) && (
                        <div className="text-xs text-stone-400 font-bold mt-1">{exp.period}{exp.period && exp.description ? ' · ' : ''}{exp.description}</div>
                      )}
                      {exp.link && (
                        <a href={exp.link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                          className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-black hover:underline" style={{ color: TEAL }}>
                          بینینی نموونە <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── FAVORITE CATEGORIES ── */}
          {favCategories.length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-black text-stone-900 mb-3">بوارە دڵخوازەکان</h2>
              <div className="rounded-3xl shadow-[0_2px_16px_rgba(0,0,0,0.05)] divide-y divide-stone-100 border overflow-hidden" style={{ background: '#fff', ...premiumCardStyle }}>
                {favCategories.map(c => (
                  <div key={c.id} className="flex items-center gap-2.5 px-4 py-3 text-xs font-bold text-stone-700">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: TEAL }} />
                    {c.name_ku}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!hasExtraInfo && (
            <div className="mt-6 bg-white rounded-3xl shadow-[0_2px_16px_rgba(0,0,0,0.05)] p-8 text-center border border-stone-100">
              <p className="text-sm text-stone-400 font-bold">هێشتا هیچ زانیارییەکی زیاتر زیاد نەکراوە.</p>
            </div>
          )}
        </div>

        {/* ── STICKY BOTTOM ACTION BAR ── */}
        <div className="fixed bottom-0 inset-x-0 z-30 px-4 pt-3" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))', background: 'linear-gradient(to top, #f4f7f6 65%, transparent)' }}>
          <div className="max-w-2xl mx-auto flex items-center gap-2">
            <button onClick={handleSendOffer}
              className="flex-1 py-4 rounded-2xl text-white font-black text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-lg"
              style={{ background: TEAL, boxShadow: `0 8px 20px ${TEAL}40` }}>
              {user ? 'پێشنیاری کار بنێرە' : 'چوونەژوورەوە بۆ ناردنی ئۆفەر'} <Send className="w-4 h-4" />
            </button>
            <button onClick={handleShare} aria-label="هاوبەشکردن"
              className="shrink-0 w-12 h-12 rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.08)] flex items-center justify-center active:scale-95 transition-transform border border-stone-200"
              title="هاوبەشکردنی پڕۆفایل"
            >
              <Share2 className="w-4 h-4 text-stone-600" />
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
    </>
  ), document.body);
};
