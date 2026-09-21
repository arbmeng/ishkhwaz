import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { FreelancerProfileModal } from './FreelancerProfileModal';
import { SendInvitationModal } from '../company/SendInvitationModal';
import { monogramColors } from '../ui/Monogram';
import { soundService } from '../../services/soundService';
import { apiService } from '../../services/api';
import { CitySymbol } from '../ui/CitySymbol';
import { useInView } from '../../utils/useInView';
import { getPlanColor } from '../../utils/planPresets';
import { tierInfo, sortByTier } from './FreelancerTierCard';
import {
  Search, Briefcase, Heart, SlidersHorizontal, ChevronDown,
  ArrowUpRight, Clock3, MapPin, UsersRound, Crown, WandSparkles,
  ChevronLeft, ChevronRight, CheckCircle2, Send, Users, BadgeCheck,
  Bell, X, Sparkles, Rocket, MessageCircle, Loader2, Flame, Hash, Star, ShieldCheck, Zap,
  LayoutGrid, Code2, TrendingUp, Palette, HardHat, Stethoscope,
  GraduationCap, Landmark, UtensilsCrossed, Truck, Package
} from 'lucide-react';

// Brand teal â€” matches the logo mark and the rest of the light screens.
const TEAL = '#12796b';
const TEAL_DEEP = '#0d5c50';
const TEAL_SOFT = '#e7f4f1';

const GOV_LABELS = {
  sulaymaniyah: 'Ø³Ù„ÛŽÙ…Ø§Ù†ÛŒ', erbil: 'Ù‡Û•ÙˆÙ„ÛŽØ±', duhok: 'Ø¯Ù‡Û†Ú©',
  kirkuk: 'Ú©Û•Ø±Ú©ÙˆÙˆÚ©', halabja: 'Ù‡Û•ÚµÛ•Ø¨Ø¬Û•',
};

// Real illustrated cover photos per governorate â€” falls back to the SVG
// landmark symbol + color gradient for any governorate without one.
const CITY_PHOTOS = {
  sulaymaniyah: '/cities/sulaymaniyah.png',
  erbil: '/cities/erbil.png',
  duhok: '/cities/duhok.png',
  kirkuk: '/cities/kirkuk.png',
  halabja: '/cities/halabja.png',
};

const JOB_TYPE_LABELS = {
  fullTime: 'Ú©Ø§ØªÛŒ ØªÛ•ÙˆØ§Ùˆ', partTime: 'Ù¾Ø§Ø±Ú†Û•ÛŒÛŒ', contract: 'Ú¯Ø±ÛŽØ¨Û•Ø³Øª',
  internship: 'Ù…Ø§ÙˆÛ•ÛŒ ÙÛŽØ±Ø¨ÙˆÙˆÙ†', remote: 'Ú©Ø§ØªÛŒ Ø¦Ø§Ø²Ø§Ø¯',
};

// A consistent line-icon set (same stroke weight) instead of mixed-platform
// emoji, keyed to the real category ids seeded on the backend â€” unknown
// categories still get a sane fallback so nothing breaks if new ones are added.
const CATEGORY_ICONS = {
  all: LayoutGrid,
  cat_tech: Code2,
  cat_sales: TrendingUp,
  cat_media: Palette,
  cat_construction: HardHat,
  cat_health: Stethoscope,
  cat_education: GraduationCap,
  cat_finance: Landmark,
  cat_food: UtensilsCrossed,
  cat_transport: Truck,
  cat_other: Package,
};

const PRICE_RANGES = [
  { value: 'all', label: 'Ù‡Û•Ù…ÙˆÙˆ Ù†Ø±Ø®Û•Ú©Ø§Ù†' },
  { value: 'lt400', label: 'Ú©Û•Ù…ØªØ± Ù„Û• Ù¤Ù Ù ,Ù Ù Ù ' },
  { value: '400to800', label: 'Ù¤Ù Ù ,Ù Ù Ù  - Ù¨Ù Ù ,Ù Ù Ù ' },
  { value: 'gt800', label: 'Ø²ÛŒØ§ØªØ± Ù„Û• Ù¨Ù Ù ,Ù Ù Ù ' },
];

const parseSkills = (raw) => {
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw || '[]'); } catch { return []; }
};

const isNewJob = (job) => {
  if (!job.created_at) return false;
  return (Date.now() - new Date(job.created_at).getTime()) < 48 * 3600 * 1000;
};

// A simple time-of-day greeting â€” same idea as any native app's "Good
// morning" header, just localized.
const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Ø¨Û•ÛŒØ§Ù†ÛŒØª Ø¨Ø§Ø´';
  if (h < 17) return 'Ù†ÛŒÙˆÛ•Ú•Û†Øª Ø¨Ø§Ø´';
  if (h < 20) return 'Ø¦ÛŽÙˆØ§Ø±Û•Øª Ø¨Ø§Ø´';
  return 'Ø´Û•ÙˆØª Ø¨Ø§Ø´';
};

const PAGE_SIZE = 10;

// Fades a section up into place the first time it actually scrolls into
// view, instead of the whole page appearing at once.
const Reveal = ({ children, className = '' }) => {
  const [ref, inView] = useInView();
  return (
    <div ref={ref} className={`transition-all duration-700 ease-out ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}>
      {children}
    </div>
  );
};

// Real cover art for a job card when no real photo (company_cover) exists â€”
// a deterministic color pair + the company's own initial, never a fake stock photo.
const CoverArt = ({ seed, cover, className = '' }) => {
  if (cover) return <img src={cover} alt="" className={`${className} object-cover`} />;
  const [c1, c2] = monogramColors(seed);
  // A single name-initial letter here reads as ambiguous â€” for names
  // starting with "Ø¦" (very common in Kurdish) it was mistaken for the
  // app's own logo mark. Spelled-out brand text instead of a lone letter
  // makes it unambiguous that this is just a placeholder, not a real photo.
  return (
    <div className={`${className} flex items-center justify-center`} style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}>
      <span className="text-white/30 font-black text-lg tracking-wide select-none">Ø¦ÛŒØ´ Ø®ÙˆØ§Ø²</span>
    </div>
  );
};

// A pill that opens a small option list â€” used for price/city, where the
// option set doesn't fit a plain chip row.
const DropdownChip = ({ label, value, options, onChange }) => {
  const [open, setOpen] = useState(false);
  const current = options.find(o => o.value === value);
  const active = value !== 'all';
  return (
    <div className="relative shrink-0">
      {open && <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />}
      <button
        onClick={() => setOpen(o => !o)}
        className={`relative z-30 flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold border transition-all whitespace-nowrap active:scale-95 ${active ? 'text-white border-transparent' : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
          }`}
        style={active ? { background: TEAL } : {}}>
        {active ? current?.label : label}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="animate-morph-in absolute z-30 mt-2 right-0 w-48 bg-white rounded-2xl shadow-xl border border-stone-100 p-1.5 max-h-72 overflow-y-auto" style={{ transformOrigin: 'top right' }}>
          {options.map(o => (
            <button key={o.value}
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={`w-full text-right px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${value === o.value ? 'bg-stone-100 text-stone-900' : 'text-stone-500 hover:bg-stone-50'
                }`}>
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* Premium marketplace hero */
const PremiumFeedHero = ({ isEmployer, user, activeJobs, activePeople, newCount, onNavigate }) => {
  const firstName = (user?.name || '').split(' ')[0] || 'Ø¨Û•Ú©Ø§Ø±Ù‡ÛŽÙ†Û•Ø±';
  return (
    <section className="relative overflow-hidden rounded-[30px] sm:rounded-[36px] border border-white/70 bg-white shadow-[0_16px_55px_rgba(20,45,40,0.09)]">
      <div className="absolute -top-24 -right-20 h-56 w-56 rounded-full blur-3xl opacity-30" style={{ background: `radial-gradient(circle, ${TEAL} 0%, transparent 68%)` }} />
      <div className="absolute -bottom-28 -left-16 h-56 w-56 rounded-full blur-3xl opacity-20" style={{ background: `radial-gradient(circle, #8ccfc2 0%, transparent 68%)` }} />
      <div className="relative p-5 sm:p-7 lg:p-8">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 bg-[#eef8f5] border border-[#d8eee8] text-[10px] font-black" style={{ color: TEAL_DEEP }}>
              {isEmployer ? <UsersRound className="w-3.5 h-3.5" /> : <WandSparkles className="w-3.5 h-3.5" />}
              {isEmployer ? 'Ø¨Ø§Ø²Ø§Ú•ÛŒ Ú©Ø§Ø±Ø®ÙˆØ§Ø²Ø§Ù†' : 'Ø¨Ø§Ø²Ø§Ú•ÛŒ Ù‡Û•Ù„ÛŒ Ú©Ø§Ø±'}
            </div>
            <h2 className="mt-4 text-[28px] sm:text-[36px] lg:text-[42px] leading-[1.12] font-black tracking-tight text-stone-950">
              {isEmployer ? <>Ú©Ø§Ø±Ø®ÙˆØ§Ø²ÛŽÚ©ÛŒ <span style={{ color: TEAL }}>Ø¨Ø§Ø´ØªØ±</span> Ø¨Û† Ú©Ø§Ø±Û•Ú©Û•Øª Ø¨Ø¯Û†Ø²Û•Ø±Û•ÙˆÛ•.</> : <>Ù‡Û•Ù„ÛŒ Ú©Ø§Ø±ÛŽÚ©ÛŒ <span style={{ color: TEAL }}>Ú¯ÙˆÙ†Ø¬Ø§Ùˆ</span> Ø¨Û† ØªÛ† Ù„ÛŽØ±Û•ÛŒÛ•.</>}
            </h2>
            <p className="mt-3 max-w-xl text-xs sm:text-sm leading-6 font-bold text-stone-400">
              {isEmployer ? `Ø³ÚµØ§Ùˆ ${firstName}ØŒ Ú©Ø§Ø±Ø®ÙˆØ§Ø²Û• Ù¾Ø´Ú©Ù†Ø±Ø§ÙˆÛ•Ú©Ø§Ù† Ø¨Û• Ù¾ÛŒØ´Û• Ùˆ Ø´ÙˆÛŽÙ† Ø¨Ú¯Û•Ú•ÛŽ Ùˆ Ù¾Û•ÛŒÙˆÛ•Ù†Ø¯ÛŒÛŒÛ•Ú©Û•Øª Ø¨Û• Ø®ÛŽØ±Ø§ÛŒÛŒ Ø¯Û•Ø³ØªÙ¾ÛŽØ¨Ú©Û•.` : `Ø³ÚµØ§Ùˆ ${firstName}ØŒ Ø¨Ú¯Û•Ú•ÛŽ Ø¨Û† Ú©Ø§Ø±Û•Ú©Ø§Ù† Ú©Û• Ù„Û•Ú¯Û•Úµ ØªÙˆØ§Ù†Ø§Ú©Ø§Ù† Ùˆ Ø´Ø§Ø±Û•Ú©Û•ØªØ¯Ø§ Ú¯ÙˆÙ†Ø¬Ø§ÙˆÙ† Ùˆ Ø¨Û• ÛŒÛ•Ú© Ú©Ù„ÛŒÚ© Ø³ÛŒÚ¤ÛŒ Ø¨Ù†ÛŽØ±Û•.`}
            </p>
          </div>
          <button onClick={() => onNavigate?.(isEmployer ? 'post-job' : 'profile')} className="group shrink-0 inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-xs font-black text-white shadow-[0_10px_24px_rgba(18,121,107,0.22)] transition-all hover:-translate-y-0.5 active:scale-[0.98]" style={{ background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DEEP})` }}>
            {isEmployer ? 'Ø¨ÚµØ§ÙˆÚ©Ø±Ø¯Ù†Û•ÙˆÛ•ÛŒ Ù‡Û•Ù„ÛŒ Ú©Ø§Ø±' : 'Ù¾Ú•Û†ÙØ§ÛŒÙ„ÛŒ Ø®Û†Øª ØªÛ•ÙˆØ§Ùˆ Ø¨Ú©Û•'}
            <ArrowUpRight className="w-4 h-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-7 pt-5 border-t border-stone-100">
          {[
            { value: activeJobs, label: isEmployer ? 'Ù‡Û•Ù„ÛŒ Ú©Ø§Ø±' : 'Ù‡Û•Ù„ÛŒ Ø¨Û•Ø±Ø¯Û•Ø³Øª', icon: Briefcase },
            { value: activePeople, label: isEmployer ? 'Ú©Ø§Ø±Ø®ÙˆØ§Ø²' : 'Ú©Û†Ù…Ù¾Ø§Ù†ÛŒØ§', icon: isEmployer ? UsersRound : Users },
            { value: newCount, label: 'Ù†ÙˆÛŽ', icon: Sparkles },
          ].map(({ value, label, icon: Icon }) => (
            <div key={label} className="rounded-2xl bg-stone-50/80 border border-stone-100 px-3 py-3 sm:px-4">
              <div className="flex items-center gap-2"><span className="w-7 h-7 rounded-xl bg-white flex items-center justify-center shadow-sm"><Icon className="w-3.5 h-3.5" style={{ color: TEAL }} /></span><span className="text-base sm:text-lg font-black text-stone-900 font-mono">{Number(value || 0).toLocaleString()}</span></div>
              <p className="mt-1 text-[9px] sm:text-[10px] font-black text-stone-400">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const PremiumUpgradeBanner = ({ onNavigate, planName }) => (
  <section className="relative overflow-hidden rounded-[30px] bg-[#0b1714] shadow-[0_18px_55px_rgba(7,35,29,0.18)]">
    <div className="absolute inset-0 opacity-70" style={{ background: 'radial-gradient(circle at 85% 15%, rgba(48,180,157,.30), transparent 32%), radial-gradient(circle at 10% 90%, rgba(18,121,107,.22), transparent 34%)' }} />
    <div className="absolute inset-0 opacity-[0.055]" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,.8) 1px, transparent 1px)', backgroundSize: '14px 14px' }} />
    <div className="relative p-5 sm:p-7"><div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
      <div className="max-w-2xl">
        <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 bg-white/10 border border-white/10 text-[10px] font-black text-[#b7eee3]"><Crown className="w-3.5 h-3.5" />KARNAMA PRO</div>
        <h3 className="mt-4 text-2xl sm:text-3xl font-black tracking-tight text-white">Ø¨Û† Ù‡Û•Ø± Ú©Ø§Ø±ÛŽÚ©ØŒ Ø³ÛŒÚ¤ÛŒÛŒÛ•Ú©ÛŒ ØªØ§ÛŒØ¨Û•Øª.</h3>
        <p className="mt-2 text-xs sm:text-sm leading-6 font-bold text-white/55">Ú†Û•Ù†Ø¯ Ø³ÛŒÚ¤ÛŒÛŒÛ•Ú©ÛŒ Ø¬ÛŒØ§ÙˆØ§Ø² Ø¯Ø±ÙˆØ³Øª Ø¨Ú©Û• Ùˆ Ø¨Û† Ù‡Û•Ø± Ù‡Û•Ù„ÛŒ Ú©Ø§Ø±ÛŽÚ© Ø¦Û•ÙˆÛ•ÛŒ Ú¯ÙˆÙ†Ø¬Ø§ÙˆØªØ±Û• Ù‡Û•ÚµØ¨Ú˜ÛŽØ±Û•.{planName ? ` Ù¾Ù„Ø§Ù†Û•Ú©Û•ÛŒ ØªÛ†: ${planName}` : ''}</p>
        <div className="flex flex-wrap gap-2 mt-5">{[['Pro', 'ØªØ§ Ù£ Ø³ÛŒÚ¤ÛŒ'], ['Pro+', 'ØªØ§ Ù¦ Ø³ÛŒÚ¤ÛŒ'], ['Smart', 'Ø¦Ø§Ù…Ø§Ø¯Û•ØªØ± Ø¨Û† Ø¯Ø§ÙˆØ§Ú©Ø§Ø±ÛŒ']].map(([title, sub]) => <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2.5"><div className="text-[10px] font-black text-white">{title}</div><div className="text-[9px] font-bold text-white/45 mt-0.5">{sub}</div></div>)}</div>
      </div>
      <button onClick={() => onNavigate?.('plans')} className="group shrink-0 w-full lg:w-auto min-w-[210px] rounded-2xl bg-white px-5 py-4 text-xs font-black text-[#0b1714] shadow-[0_12px_28px_rgba(0,0,0,.18)] transition-all hover:-translate-y-0.5 active:scale-[0.98]"><span className="flex items-center justify-center gap-2">Ø¨Û•Ø±Ø²Ú©Ø±Ø¯Ù†Û•ÙˆÛ•ÛŒ Ù¾Ù„Ø§Ù†<ArrowUpRight className="w-4 h-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></span><span className="block text-[9px] text-stone-400 mt-1">Ø³ÛŒÚ¤ÛŒÛŒÛ•Ú©Ø§Ù†Øª Ø¨Û• Ø´ÛŽÙˆÛ•ÛŒÛ•Ú©ÛŒ Ø²ÛŒØ±Û•Ú© Ø¨Û•Ú©Ø§Ø±Ø¨Ù‡ÛŽÙ†Û•</span></button>
    </div></div>
  </section>
);

export const JobFeed = ({ onNavigate }) => {
  const { user, token } = useAuth();
  const { jobs = [], applications = [], savedJobIds = [], categories = [], regions = [], freelancers = [], toggleSaveJob, isInitialLoading, unreadNotifCount = 0, planTiers = [] } = useStore();

  // Company accounts land here too (App.jsx routes their Home tab to this
  // component) â€” everything below computes both a job-feed and a
  // freelancer-feed in parallel, and the final render picks one shell.
  const isEmployer = user?.role === 'employer' || user?.role === 'owner' || user?.role === 'admin';

  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    apiService.getMessageThreads(token).then(threads => {
      if (!cancelled && Array.isArray(threads)) {
        setUnreadMessageCount(threads.reduce((sum, t) => sum + (Number(t.unread_count) || 0), 0));
      }
    });
    return () => { cancelled = true; };
  }, [token]);

  // Quick-filter chips show only the curated primary categories (the ones
  // with a real icon in CATEGORY_ICONS above) â€” the backend's full category
  // list runs past 80 entries once sub-specialties are counted, and dumping
  // all of them into one horizontal row makes it unusable. The job-posting
  // form still offers the complete list; this is browse-time only.
  const CATEGORIES = useMemo(() => [
    { id: 'all', nameKu: 'Ù‡Û•Ù…ÙˆÙˆ' },
    ...categories.filter(c => CATEGORY_ICONS[c.id]).map(c => ({ id: c.id, nameKu: c.name_ku })),
  ], [categories]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [jobTypeFilter, setJobTypeFilter] = useState('all');
  const [govFilter, setGovFilter] = useState('all');
  const [priceFilter, setPriceFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [savedSearches, setSavedSearches] = useState([]);
  const [expandedGovId, setExpandedGovId] = useState(null);
  const [recommended, setRecommended] = useState({ jobs: [], aiPowered: false });
  const [recommendedLoading, setRecommendedLoading] = useState(false);

  // Real personalization â€” skills/category/city overlap always runs
  // server-side; once there's an actual CV or listed skills, the backend
  // adds one real AI ranking pass on top (see GET /jobs/recommended).
  useEffect(() => {
    if (!user || !token || isEmployer) return;
    setRecommendedLoading(true);
    apiService.getRecommendedJobs(token)
      .then(setRecommended)
      .finally(() => setRecommendedLoading(false));
  }, [user, token, isEmployer]);

  const expandedGovData = useMemo(() => regions.find(r => r.id === expandedGovId), [regions, expandedGovId]);

  // Flattened down to real neighborhood/sub-district level (e.g. "ØªÛ•Ú©ÛŒÛ•ÛŒ
  // Ú©Ø§Ú©Û•Ù…Û•Ù†Ø¯", "Ø¨Ø§Ø²ÛŒØ§Ù†") â€” not just the district name â€” since that's the
  // actual granularity people search by.
  const expandedTowns = useMemo(() => {
    if (!expandedGovData) return [];
    return (expandedGovData.districts || []).flatMap(d => d.subDistricts || []);
  }, [expandedGovData]);

  const handleCityClick = (govId) => {
    soundService.playTick?.();
    setExpandedGovId(prev => (prev === govId ? null : govId));
  };

  const jobsSectionRef = useRef(null);
  const scrollToResults = () => {
    // Let the towns panel finish collapsing before measuring the scroll
    // target, so the page doesn't jump to the wrong spot mid-animation.
    setTimeout(() => jobsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  };

  const handleDistrictClick = (govId, districtNameKu) => {
    soundService.playTick?.();
    setGovFilter(govId);
    setSearchTerm(districtNameKu);
    setExpandedGovId(null);
    scrollToResults();
  };

  const hasActiveFilters = selectedCategory !== 'all' || jobTypeFilter !== 'all' || govFilter !== 'all' || priceFilter !== 'all';

  useEffect(() => {
    if (!user || !token || isEmployer) { setSavedSearches([]); return; }
    apiService.getSavedSearches(token).then(setSavedSearches);
  }, [user?.id, token, isEmployer]);

  const handleSaveSearch = async () => {
    if (!user || !token) return;
    soundService.playTick?.();
    const res = await apiService.createSavedSearch(
      { category: selectedCategory, job_type: jobTypeFilter, governorate_id: govFilter, min_salary: priceFilter === 'gt800' ? 800000 : priceFilter === '400to800' ? 400000 : 0 },
      token
    );
    if (res?.success) setSavedSearches(await apiService.getSavedSearches(token));
  };

  const applySavedSearch = (s) => {
    soundService.playTick?.();
    setSelectedCategory(s.category || 'all');
    setJobTypeFilter(s.job_type || 'all');
    setGovFilter(s.governorate_id || 'all');
    setPriceFilter(Number(s.min_salary) > 800000 ? 'gt800' : Number(s.min_salary) === 400000 ? '400to800' : 'all');
  };

  const handleDeleteSavedSearch = async (id, e) => {
    e.stopPropagation();
    setSavedSearches(prev => prev.filter(s => s.id !== id));
    await apiService.deleteSavedSearch(id, token);
  };
  const skillsList = Array.isArray(user?.skills) ? user.skills : [];
  const userSkillsLower = useMemo(() => skillsList.map(s => String(s).toLowerCase()), [skillsList]);

  const jobMatchesUser = (job) => {
    if (userSkillsLower.length === 0) return false;
    const jobSkills = parseSkills(job.required_skills).map(s => String(s).toLowerCase());
    return jobSkills.some(s => userSkillsLower.includes(s));
  };

  const filteredJobs = useMemo(() => {
    const safe = Array.isArray(jobs) ? jobs : [];
    return safe.filter(job => {
      if (selectedCategory !== 'all' && job.category !== selectedCategory) return false;
      if (jobTypeFilter !== 'all' && job.job_type !== jobTypeFilter) return false;
      if (govFilter !== 'all' && job.governorate_id !== govFilter) return false;
      if (priceFilter !== 'all') {
        const min = Number(job.salary_min) || 0;
        if (priceFilter === 'lt400' && !(min < 400000)) return false;
        if (priceFilter === '400to800' && !(min >= 400000 && min <= 800000)) return false;
        if (priceFilter === 'gt800' && !(min > 800000)) return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          (job.title_ku || job.title || '').toLowerCase().includes(q) ||
          (job.company_name || job.companyName || '').toLowerCase().includes(q) ||
          (job.governorate_id || job.location || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [jobs, selectedCategory, jobTypeFilter, govFilter, priceFilter, searchTerm]);

  // Pagination always resets to page 1 whenever the result set changes shape.
  useEffect(() => { setPage(1); }, [selectedCategory, jobTypeFilter, govFilter, priceFilter, searchTerm]);
  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / PAGE_SIZE));
  const pagedJobs = filteredJobs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Newest openings â€” real created_at order, independent of any boost, so
  // this rail always reflects what actually just got posted.
  const newestJobs = useMemo(() => {
    return [...(Array.isArray(jobs) ? jobs : [])]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 8);
  }, [jobs]);

  // Real per-governorate job counts â€” only real, non-empty cities are shown,
  // never a padded list of every governorate regardless of activity.
  const cityStats = useMemo(() => {
    const counts = {};
    (Array.isArray(jobs) ? jobs : []).forEach(j => {
      const gov = j.governorate_id || 'sulaymaniyah';
      counts[gov] = (counts[gov] || 0) + 1;
    });
    return Object.entries(GOV_LABELS)
      .map(([id, label]) => ({ id, label, count: counts[id] || 0 }))
      .filter(c => c.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [jobs]);

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â• EMPLOYER BRANCH â€” freelancers as primary content â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

  const GOV_NAME_TO_ID = useMemo(() => Object.fromEntries(Object.entries(GOV_LABELS).map(([id, name]) => [name, id])), []);
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  // Same ownership check Dashboard.jsx uses â€” which jobs this company actually posted.
  const myPostedJobs = useMemo(() => {
    const safeJobs = Array.isArray(jobs) ? jobs : [];
    if (!user) return [];
    const uId = String(user.id || '').trim();
    return safeJobs.filter(j =>
      String(j.company_id || j.companyId || j.user_id || '').trim() === uId ||
      (user.company_name && (j.company_name === user.company_name || j.companyName === user.company_name))
    );
  }, [jobs, user]);

  const myRequiredSkillsLower = useMemo(() => {
    const set = new Set();
    myPostedJobs.forEach(j => parseSkills(j.required_skills).forEach(s => set.add(String(s).toLowerCase())));
    return set;
  }, [myPostedJobs]);

  const freelancerMatchesCompany = (f) => {
    if (myRequiredSkillsLower.size === 0) return false;
    return parseSkills(f.skills).some(s => myRequiredSkillsLower.has(String(s).toLowerCase()));
  };

  const filteredFreelancers = useMemo(() => {
    const safe = Array.isArray(freelancers) ? freelancers : [];
    return sortByTier(safe.filter(f => {
      // Employer discovery is a paid showcase: free profiles are not surfaced
      // in the premium freelancer marketplace.
      if (!tierInfo(f, planTiers).isPaid) return false;
      if (govFilter !== 'all' && f.governorate !== GOV_LABELS[govFilter]) return false;
      if (selectedCategory !== 'all') {
        const catLabel = (CATEGORIES.find(c => c.id === selectedCategory)?.nameKu || '').toLowerCase();
        const skills = parseSkills(f.skills).map(s => String(s).toLowerCase());
        if (!catLabel || !skills.some(s => s.includes(catLabel))) return false;
      }
      if (verifiedOnly && !f.verified) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          (f.name || '').toLowerCase().includes(q) ||
          (f.bio || '').toLowerCase().includes(q) ||
          (f.governorate || '').toLowerCase().includes(q) ||
          (f.district || '').toLowerCase().includes(q) ||
          (f.sub_district || '').toLowerCase().includes(q)
        );
      }
      return true;
    }), planTiers);
  }, [freelancers, searchTerm, govFilter, selectedCategory, verifiedOnly, CATEGORIES, planTiers]);

  useEffect(() => { setPage(1); }, [selectedCategory, govFilter, verifiedOnly, searchTerm]);
  const totalFreelancerPages = Math.max(1, Math.ceil(filteredFreelancers.length / PAGE_SIZE));
  const pagedFreelancers = filteredFreelancers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const newestFreelancers = useMemo(() => {
    return [...(Array.isArray(freelancers) ? freelancers : [])]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 8);
  }, [freelancers]);

  const freelancerCityStats = useMemo(() => {
    const counts = {};
    (Array.isArray(freelancers) ? freelancers : []).forEach(f => {
      const gov = f.governorate;
      if (!gov) return;
      counts[gov] = (counts[gov] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ id: GOV_NAME_TO_ID[name] || null, label: name, count }))
      .sort((a, b) => b.count - a.count);
  }, [freelancers, GOV_NAME_TO_ID]);

  const [selectedFreelancer, setSelectedFreelancer] = useState(null);
  const [inviteTarget, setInviteTarget] = useState(null);

  const FreelancerPhotoCard = ({ f }) => {
    const skills = parseSkills(f.skills).map(s => String(s).trim()).filter(Boolean);
    const tierMeta = tierInfo(f, planTiers);
    const tier = tierMeta?.tier || {};
    const isVip = !!tierMeta?.isVip;
    const isPaid = !!tierMeta?.isPaid;
    const isBoosted = f.plan_boost_until && new Date(f.plan_boost_until) > new Date();
    const matched = freelancerMatchesCompany(f);
    const verified = Number(f.verified) === 1 || f.verified === true;
    const displayTitle = f.job_title || f.title || f.specialty || skills[0] || 'Ú©Ø§Ø±Ø®ÙˆØ§Ø²';
    const years = Number(f.experience_years ?? f.years_experience ?? f.experience ?? 0);
    const tags = skills.slice(0, 5);
    const initials = (f.name || 'Ú©').trim().charAt(0);
    const avatar = f.avatar || f.profile_image || f.photo;
    const cover = f.cover || f.cover_image || f.banner;
    const location = [f.district || f.sub_district, f.governorate].filter(Boolean).join('ØŒ ') || 'Ú©ÙˆØ±Ø¯Ø³ØªØ§Ù†';

    return (
      <article
        onClick={() => { soundService.playTick?.(); setSelectedFreelancer(f); }}
        className={`relative group h-full overflow-hidden rounded-[30px] cursor-pointer transition-all duration-500 hover:-translate-y-1.5 ${isVip
            ? 'bg-[#130d0c] text-white shadow-[0_18px_55px_rgba(114,39,20,.22)]'
            : 'bg-white text-stone-900 border border-stone-100 shadow-[0_6px_24px_rgba(20,45,40,.06)] hover:shadow-[0_20px_44px_rgba(20,45,40,.13)]'
          }`}
      >
        {isVip && <div className="pointer-events-none absolute inset-[-2px] rounded-[32px] vip-card-border opacity-90" />}
        {isVip && <div className="pointer-events-none absolute -top-20 -right-16 w-52 h-52 rounded-full bg-orange-500/20 blur-3xl vip-fire-pulse" />}
        {isVip && <div className="pointer-events-none absolute -bottom-24 -left-12 w-56 h-56 rounded-full bg-rose-600/15 blur-3xl vip-fire-pulse" style={{ animationDelay: '-1.2s' }} />}

        <div className="relative h-44 sm:h-48 overflow-hidden">
          {cover ? (
            <img src={cover} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
          ) : (
            <div className={`absolute inset-0 ${isVip ? 'bg-[radial-gradient(circle_at_20%_15%,rgba(255,153,66,.45),transparent_30%),linear-gradient(135deg,#35110b,#130d0c_55%,#4a1810)]' : 'bg-[radial-gradient(circle_at_85%_10%,rgba(18,121,107,.20),transparent_32%),linear-gradient(135deg,#f5faf8,#e8f4f1)]'}`}>
              <div className={`absolute inset-0 ${isVip ? 'opacity-30' : 'opacity-20'}`} style={{ backgroundImage: 'radial-gradient(currentColor 1px,transparent 1px)', backgroundSize: '16px 16px' }} />
            </div>
          )}
          <div className={`absolute inset-0 ${isVip ? 'bg-gradient-to-t from-[#130d0c] via-[#130d0c]/15 to-black/5' : 'bg-gradient-to-t from-black/55 via-black/5 to-transparent'}`} />

          {isVip && <div className="absolute inset-x-0 top-0 h-1.5 vip-fire-bar" />}

          <div className="absolute top-3 right-3 flex items-center gap-2">
            {isVip ? (
              <span className="vip-badge inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-black text-white shadow-lg">
                <Flame className="w-3.5 h-3.5" fill="currentColor" /> VIP
              </span>
            ) : isPaid ? (
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 bg-white/95 text-[10px] font-black text-stone-800 shadow-md">
                <Crown className="w-3.5 h-3.5" style={{ color: TEAL }} /> {tier.name_ku || tier.name || 'PRO'}
              </span>
            ) : null}
            {verified && <span className="w-8 h-8 rounded-full bg-white/95 flex items-center justify-center shadow-md"><BadgeCheck className="w-4 h-4" style={{ color: TEAL }} /></span>}
          </div>

          <span className={`absolute top-3 left-3 rounded-full px-2.5 py-1.5 text-[10px] font-black backdrop-blur-md shadow-sm ${isVip ? 'bg-black/35 text-white border border-white/15' : 'bg-white/90 text-stone-700'}`}>
            {f.governorate || 'Ú©ÙˆØ±Ø¯Ø³ØªØ§Ù†'}
          </span>

          {isBoosted && (
            <span className={`absolute top-12 left-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[10px] font-black shadow-sm ${isVip ? 'bg-orange-500/90 text-white' : 'text-white'}`} style={!isVip ? { background: TEAL } : {}}>
              <Rocket className="w-3 h-3" /> Ø¨Û•Ø±Ø²Ú©Ø±Ø§ÙˆÛ•
            </span>
          )}

          <div className="absolute bottom-3 right-4 flex items-end gap-3">
            <div className={`relative w-14 h-14 rounded-2xl p-[2px] shadow-xl ${isVip ? 'vip-avatar-ring' : 'bg-white'}`}>
              <div className={`w-full h-full rounded-[14px] overflow-hidden flex items-center justify-center font-black ${isVip ? 'bg-[#25130f] text-orange-100' : 'bg-stone-100'}`}>
                {avatar ? <img src={avatar} alt={f.name || ''} className="w-full h-full object-cover" /> : initials}
              </div>
            </div>
          </div>
        </div>

        <div className={`relative p-4 pt-5 ${isVip ? 'bg-[#130d0c]' : 'bg-white'}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className={`text-[15px] font-black truncate ${isVip ? 'text-white' : 'text-stone-950'}`}>{f.name || 'Ú©Ø§Ø±Ø®ÙˆØ§Ø²'}</h3>
                {verified && <ShieldCheck className="w-4 h-4 shrink-0" style={{ color: isVip ? '#ffb36b' : TEAL }} />}
              </div>
              <p className={`mt-1 text-[10px] font-bold truncate ${isVip ? 'text-orange-100/60' : 'text-stone-400'}`}>{displayTitle}</p>
            </div>
            {isVip && <div className="shrink-0 text-right"><div className="text-[9px] font-black text-orange-200/55">ELITE</div><div className="text-xs font-black text-orange-300">VIP</div></div>}
          </div>

          <div className={`mt-3 grid grid-cols-2 gap-2 text-[10px] font-bold ${isVip ? 'text-white/65' : 'text-stone-500'}`}>
            <div className={`rounded-xl px-2.5 py-2 flex items-center gap-1.5 ${isVip ? 'bg-white/[.06] border border-white/[.08]' : 'bg-stone-50 border border-stone-100'}`}>
              <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: isVip ? '#ff9d4d' : TEAL }} />
              <span className="truncate">{location}</span>
            </div>
            <div className={`rounded-xl px-2.5 py-2 flex items-center gap-1.5 ${isVip ? 'bg-white/[.06] border border-white/[.08]' : 'bg-stone-50 border border-stone-100'}`}>
              <Briefcase className="w-3.5 h-3.5 shrink-0" style={{ color: isVip ? '#ff9d4d' : TEAL }} />
              <span className="truncate">{years > 0 ? `${years} Ø³Ø§Úµ Ø¦Û•Ø²Ù…ÙˆÙˆÙ†` : 'Ø¦Û•Ø²Ù…ÙˆÙˆÙ† Ù„Û• Ù¾Ú•Û†ÙØ§ÛŒÙ„'}</span>
            </div>
          </div>

          {f.bio && <p className={`mt-3 text-[10px] leading-5 line-clamp-2 ${isVip ? 'text-white/50' : 'text-stone-400'}`}>{f.bio}</p>}

          {tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {tags.map((tag, i) => (
                <span key={`${tag}-${i}`} className={`inline-flex items-center gap-1 max-w-full rounded-full px-2 py-1 text-[9px] font-black ${isVip ? 'bg-orange-400/10 text-orange-100 border border-orange-300/10' : 'bg-[#eef8f5] text-[#0d5c50] border border-[#d8eee8]'}`}>
                  <Hash className="w-2.5 h-2.5 shrink-0" />
                  <span className="truncate">{tag.replace(/^#/, '').replace(/\s+/g, '_')}</span>
                </span>
              ))}
            </div>
          )}

          {matched && <div className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-black ${isVip ? 'bg-emerald-400/10 text-emerald-200 border border-emerald-300/10' : 'bg-[#e7f4f1] text-[#0d5c50]'}`}><Zap className="w-3 h-3" /> Ú¯ÙˆÙ†Ø¬Ø§Ùˆ Ø¨Û† Ú©Ø§Ø±ÛŒ ØªÛ†</div>}

          <div className="mt-4 flex gap-2">
            <button onClick={e => { e.stopPropagation(); soundService.playTick?.(); setSelectedFreelancer(f); }} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black border transition-all active:scale-95 ${isVip ? 'border-white/10 bg-white/[.06] text-white hover:bg-white/[.10]' : 'border-stone-100 bg-stone-50 text-stone-600 hover:bg-stone-100'}`}>
              Ù¾Ú•Û†ÙØ§ÛŒÙ„
            </button>
            <button onClick={e => { e.stopPropagation(); soundService.playTick?.(); setInviteTarget(f); }} className={`flex-[1.35] py-2.5 rounded-xl text-[10px] font-black text-white transition-all active:scale-95 shadow-lg ${isVip ? 'vip-cta' : ''}`} style={!isVip ? { background: `linear-gradient(135deg,${TEAL},${TEAL_DEEP})` } : undefined}>
              <span className="inline-flex items-center justify-center gap-1.5"><Send className="w-3 h-3" /> Ø¨Ø§Ù†Ú¯Ù‡ÛŽØ´Øª</span>
            </button>
          </div>
        </div>
      </article>
    );
  };
  const JobPhotoCard = ({ job }) => {
    const isApplied = applications.some(a => String(a.job_id) === String(job.id));
    const isSaved = savedJobIds.includes(job.id);
    const company = job.company_name || job.companyName || job.company || 'Ú©Û†Ù…Ù¾Ø§Ù†ÛŒØ§';
    const title = job.title_ku || job.title || 'Ù‡Û•Ù„ÛŒ Ú©Ø§Ø±';
    const govBase = GOV_LABELS[job.governorate_id] || job.location || 'Ú©ÙˆØ±Ø¯Ø³ØªØ§Ù†';
    // Full address only when the employer actually entered one â€” never a
    // fabricated neighborhood name standing in for real data.
    const gov = job.location_detail ? `${govBase}ØŒ ${job.location_detail}` : govBase;
    const salary = job.salary_min ? `${Number(job.salary_min).toLocaleString()} IQD` : 'Ù†Ø±Ø® Ú¯ÙØªÙˆÚ¯Û†Ú©Ø±Ø§Ùˆ';
    const typeLabel = JOB_TYPE_LABELS[job.job_type] || 'Ú©Ø§ØªÛŒ ØªÛ•ÙˆØ§Ùˆ';
    const isNew = isNewJob(job);
    const matched = jobMatchesUser(job);
    const isBoosted = job.boosted_until && new Date(job.boosted_until) > new Date();
    const avgResponseH = Number(job.company_avg_response_hours) || 0;

    return (
      <div onClick={() => { soundService.playTick?.(); onNavigate?.('job_detail', { jobId: job.id }); }}
        className="bg-white rounded-[28px] border border-stone-100/90 shadow-[0_4px_20px_rgba(20,45,40,0.055)] hover:shadow-[0_18px_40px_rgba(20,45,40,0.12)] hover:-translate-y-1.5 transition-all duration-300 cursor-pointer overflow-hidden group"
        style={isBoosted ? { boxShadow: `0 0 0 2px ${TEAL}, 0 2px 16px rgba(0,0,0,0.05)` } : {}}>
        <div className="relative h-40 sm:h-44">
          <CoverArt seed={job.category || company} cover={job.company_cover} className="w-full h-full" />

          <button onClick={e => { e.stopPropagation(); toggleSaveJob(job.id); }}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-md active:scale-90 transition-transform">
            <Heart className={`w-4 h-4 transition-all duration-300 ${isSaved ? 'fill-[#ff4d67] text-[#ff4d67] scale-110' : 'text-stone-400'}`} />
          </button>

          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-black bg-white/90 backdrop-blur text-stone-700 shadow-sm">
            {typeLabel}
          </span>

          {isBoosted && (
            <span className="absolute top-12 left-3 px-2.5 py-1 rounded-full text-[10px] font-black text-white shadow-sm" style={{ background: TEAL }}>
              ðŸš€ Ø¨Û•Ø±Ø²Ú©Ø±Ø§ÙˆÛ•
            </span>
          )}

          {matched && (
            <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-black text-white shadow-sm" style={{ background: TEAL_DEEP }}>
              Ø¯ÛŒØ¯Ø§Ø±Ú©Ø±Ø§Ùˆ
            </span>
          )}

          {job.company_logo && (
            <img src={job.company_logo} alt={company}
              className="absolute -bottom-4 right-4 w-10 h-10 rounded-xl object-cover border-2 border-white shadow-md" />
          )}
        </div>

        <div className="p-4 pt-6">
          <h3 className="text-sm font-black text-stone-900 truncate group-hover:text-stone-600 transition-colors">{title}</h3>
          <div className="flex items-center gap-1 text-[11px] text-stone-400 font-bold mt-1 truncate">
            <span className="truncate">{company}</span>
            {Number(job.company_verified) === 1 && <BadgeCheck className="w-3 h-3 shrink-0" style={{ color: TEAL }} title="Ú©Û†Ù…Ù¾Ø§Ù†ÛŒØ§ÛŒ Ù¾Ø´Ú©Ù†Ø±Ø§Ùˆ" />}
            <span>Â· {gov}</span>
          </div>
          {avgResponseH > 0 && (
            <div className="text-[10px] text-stone-400 font-bold mt-1">â± ÙˆÛ•ÚµØ§Ù…Ø¯Ø§Ù†Û•ÙˆÛ• Ù„Û• ~{avgResponseH < 1 ? '1' : Math.round(avgResponseH)} Ú©Ø§Ú˜ÛŽØ±Ø¯Ø§</div>
          )}

          <div className="flex items-center gap-2 mt-3 mb-1">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-stone-400"><Clock3 className="w-3 h-3" />{typeLabel}</span>
            <span className="w-1 h-1 rounded-full bg-stone-200" />
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-stone-400 truncate"><MapPin className="w-3 h-3 shrink-0" />{govBase}</span>
          </div>

          <div className="flex items-center justify-between mt-2">
            <span className="font-mono font-black text-sm text-stone-900">{salary}</span>
            <div className="flex items-center gap-2.5">
              {isNew && <span className="w-1.5 h-1.5 rounded-full" style={{ background: TEAL }} title="Ù†ÙˆÛŽ Ø¨ÚµØ§ÙˆÚ©Ø±Ø§ÙˆÛ•ØªÛ•ÙˆÛ•" />}
              {Number(job.applications_count) > 0 && (
                <span className="flex items-center gap-1 text-[10px] text-stone-400 font-bold font-mono">
                  <Users className="w-3 h-3" />{job.applications_count}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={e => { e.stopPropagation(); soundService.playTick?.(); onNavigate?.('job_detail', { jobId: job.id }); }}
            disabled={isApplied}
            className={`mt-3 w-full py-2.5 rounded-xl text-[11px] font-black transition-all active:scale-95 flex items-center justify-center gap-1.5 ${isApplied ? 'bg-emerald-50 text-emerald-700' : 'text-white'
              }`}
            style={!isApplied ? { background: TEAL } : {}}>
            {isApplied ? <><CheckCircle2 className="w-3.5 h-3.5" />Ù†ÛŽØ±Ø¯Ø±Ø§ÙˆÛ•</> : <><Send className="w-3.5 h-3.5" />Ù†Ø§Ø±Ø¯Ù†ÛŒ Ø³ÛŒÚ¤ÛŒ</>}
          </button>
        </div>
      </div>
    );
  };

  const greetingName = (user?.name || '').split(' ')[0];
  const avatarLetter = (user?.name || 'Ø¨').trim().charAt(0);

  // Paid-plan avatar ring â€” any admin-defined paid tier (vip/pro/whatever
  // it's called) gets its own gradient border straight from that tier's
  // color preset; free/no plan gets a plain neutral ring.
  const userPlanTier = planTiers.find(t => t.id === user?.plan);
  const isPaidPlanUser = !!userPlanTier && Number(userPlanTier.price) > 0;
  const planColor = userPlanTier ? getPlanColor(userPlanTier.color) : null;
  const avatarRingStyle = isPaidPlanUser
    ? { padding: 2, background: planColor.gradient || planColor.accent, boxShadow: `0 4px 14px ${planColor.accent}66` }
    : { padding: 1, background: '#e5e9e7' };

  return (
    <div dir="rtl" className="min-h-screen font-vazirmatn select-none pb-28" style={{ background: 'linear-gradient(180deg, #f7faf9 0%, #f2f6f4 48%, #eef3f1 100%)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 space-y-7">

        {/* â”€â”€ Greeting header â€” avatar grouped with the name on the right
              (reading-start in RTL), notification bell alone on the left.
              Mobile-only: DesktopHeaderNav (App.jsx) already shows the same
              avatar/chat/bell on lg+ screens, so this must stay hidden there
              or both render stacked on top of each other. â”€â”€ */}
        <Reveal>
          <div className="flex items-center justify-between mb-3 lg:hidden">
            <div className="flex items-center gap-3">
              <button
                onClick={() => onNavigate?.('profile')}
                className="rounded-2xl active:scale-95 transition-transform shrink-0"
                style={avatarRingStyle}
                title={isPaidPlanUser ? (userPlanTier.name_ku || userPlanTier.name_en) : undefined}
              >
                <div
                  className="w-10 h-10 rounded-[14px] bg-white shadow-[0_2px_16px_rgba(0,0,0,0.06)] overflow-hidden flex items-center justify-center font-black text-sm"
                  style={{ color: TEAL_DEEP }}
                >
                  {user?.avatar ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" /> : avatarLetter}
                </div>
              </button>
              <div className="text-right">
                <p className="text-xs text-stone-400 font-bold">{getGreeting()}</p>
                <h1 className="text-2xl font-black text-stone-900 leading-tight">{greetingName || 'Ø¨Û•Ú©Ø§Ø±Ù‡ÛŽÙ†Û•Ø±'}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => onNavigate?.('messages')}
                className="relative w-11 h-11 rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.06)] flex items-center justify-center text-stone-500 active:scale-95 transition-transform"
              >
                <MessageCircle className="w-4 h-4" />
                {unreadMessageCount > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500" />
                )}
              </button>
              <button
                onClick={() => onNavigate?.('notifications')}
                className="relative w-11 h-11 rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.06)] flex items-center justify-center text-stone-500 active:scale-95 transition-transform"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifCount > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500" />
                )}
              </button>
            </div>
          </div>
        </Reveal>

        <PremiumFeedHero
          isEmployer={isEmployer}
          user={user}
          activeJobs={isEmployer ? filteredFreelancers.length : filteredJobs.length}
          activePeople={isEmployer ? freelancers.length : jobs.length}
          newCount={isEmployer ? newestFreelancers.length : newestJobs.length}
          onNavigate={onNavigate}
        />

        {!isEmployer && !isPaidPlanUser && (
          <Reveal>
            <PremiumUpgradeBanner onNavigate={onNavigate} planName={userPlanTier?.name_ku || ''} />
          </Reveal>
        )}

        {!isEmployer && (
          <>
            {/* â”€â”€ Search block â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <Reveal className="space-y-3">
              <div className="flex gap-2 p-1.5 rounded-[22px] bg-white border border-stone-100 shadow-[0_8px_28px_rgba(0,0,0,0.05)]">
                <div className="relative flex-1">
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300" />
                  <input
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Ú¯Û•Ú•Ø§Ù† Ø¨Û† Ú©Ø§Ø±ØŒ Ú©Û†Ù…Ù¾Ø§Ù†ÛŒØ§..."
                    className="w-full bg-stone-50/70 rounded-[17px] pr-11 pl-4 py-3.5 text-sm text-stone-900 font-bold placeholder-stone-300 outline-none focus:bg-white focus:ring-2 focus:ring-[#12796b]/10 transition-all"
                  />
                </div>
                <div className="w-12 h-12 rounded-[17px] bg-stone-50 border border-stone-100 flex items-center justify-center shrink-0 active:scale-95 transition-all cursor-pointer hover:bg-stone-100">
                  <SlidersHorizontal className="w-4 h-4 text-stone-400" />
                </div>
              </div>

              {/* Job-type pills â€” real values against job.job_type */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {[{ value: 'all', label: 'Ù‡Û•Ù…ÙˆÙˆ' }, ...Object.entries(JOB_TYPE_LABELS).map(([value, label]) => ({ value, label }))].map(t => (
                  <button key={t.value}
                    onClick={() => { soundService.playTick?.(); setJobTypeFilter(t.value); }}
                    className={`px-4 py-2 rounded-full text-xs font-bold shrink-0 transition-all active:scale-95 ${jobTypeFilter === t.value ? 'text-white' : 'bg-white text-stone-500 shadow-[0_2px_16px_rgba(0,0,0,0.05)] hover:text-stone-800'
                      }`}
                    style={jobTypeFilter === t.value ? { background: TEAL } : {}}>
                    {t.label}
                  </button>
                ))}

                <span className="w-px h-6 bg-stone-200 shrink-0 mx-1" />

                <DropdownChip label="Ù†Ø±Ø®" value={priceFilter} options={PRICE_RANGES} onChange={setPriceFilter} />
                <DropdownChip label="Ø´Ø§Ø±" value={govFilter}
                  options={[{ value: 'all', label: 'Ù‡Û•Ù…ÙˆÙˆ Ø´Ø§Ø±Û•Ú©Ø§Ù†' }, ...Object.entries(GOV_LABELS).map(([value, label]) => ({ value, label }))]}
                  onChange={setGovFilter} />

                {!isEmployer && user && hasActiveFilters && (
                  <button onClick={handleSaveSearch}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold shrink-0 bg-white text-stone-500 shadow-[0_2px_16px_rgba(0,0,0,0.05)] hover:text-stone-800 transition-all">
                    <Bell className="w-3.5 h-3.5" style={{ color: TEAL }} />
                    Ù¾Ø§Ø´Û•Ú©Û•ÙˆØªÚ©Ø±Ø¯Ù†ÛŒ Ú¯Û•Ú•Ø§Ù†
                  </button>
                )}
              </div>

              {/* Saved searches â€” real alerts fire server-side whenever a newly
              posted job matches one of these */}
              {savedSearches.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  <Bell className="w-3.5 h-3.5 text-stone-300 shrink-0" />
                  {savedSearches.map(s => (
                    <button key={s.id} onClick={() => applySavedSearch(s)}
                      className="flex items-center gap-1.5 pr-3 pl-1.5 py-1.5 rounded-full text-[11px] font-bold shrink-0 bg-white text-stone-500 shadow-[0_2px_16px_rgba(0,0,0,0.05)] hover:text-stone-800 transition-all">
                      {(s.category !== 'all' ? CATEGORIES.find(c => c.id === s.category)?.nameKu : null) ||
                        (s.governorate_id !== 'all' ? GOV_LABELS[s.governorate_id] : null) ||
                        (s.job_type !== 'all' ? JOB_TYPE_LABELS[s.job_type] : null) || 'Ú¯Û•Ú•Ø§Ù†ÛŒ Ù¾Ø§Ø´Û•Ú©Û•ÙˆØªÚ©Ø±Ø§Ùˆ'}
                      <span onClick={e => handleDeleteSavedSearch(s.id, e)} className="p-1 rounded-full hover:bg-stone-100">
                        <X className="w-3 h-3 text-stone-300" />
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </Reveal>

            {/* â”€â”€ Recommended for you â€” real overlap score, plus one real AI
              ranking pass once there's an actual CV/skills to work from.
              While the request is in flight, show a real waiting state
              ("finding suitable work for you") instead of silently showing
              nothing, so a freelancer never wonders if the feature exists. â”€â”€ */}
            {recommendedLoading ? (
              <Reveal className="space-y-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-black text-stone-900">Ù¾ÛŽØ´Ù†ÛŒØ§Ø± Ø¨Û† ØªÛ†</h2>
                  <Sparkles className="w-4 h-4" style={{ color: TEAL }} />
                </div>
                <div className="flex items-center gap-3 p-5 rounded-3xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
                  <Loader2 className="w-5 h-5 shrink-0 animate-spin" style={{ color: TEAL }} />
                  <p className="text-xs font-bold text-stone-500">Ú†Ø§ÙˆÛ•Ú•ÛŽØ¨Û•ØŒ Ø¦ÛŽÙ…Û• Ú©Ø§Ø±ÛŒ Ú¯ÙˆÙ†Ø¬Ø§ÙˆØª Ø¨Û† Ø¯Û•Ø¯Û†Ø²ÛŒÙ†Û•ÙˆÛ•...</p>
                </div>
              </Reveal>
            ) : recommended.jobs.length > 0 && (
              <Reveal className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-black text-stone-900">Ù¾ÛŽØ´Ù†ÛŒØ§Ø± Ø¨Û† ØªÛ†</h2>
                    <Sparkles className="w-4 h-4" style={{ color: TEAL }} />
                  </div>
                  <span className="text-xs font-bold" style={{ color: TEAL }}>Ù‡Û•Ù…ÙˆÙˆ</span>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none snap-x snap-mandatory">
                  {recommended.jobs.map((job) => {
                    const isSaved = savedJobIds.includes(job.id);
                    const isBoosted = job.boosted_until && new Date(job.boosted_until) > new Date();
                    const company = job.company_name || job.companyName || 'Ú©Û†Ù…Ù¾Ø§Ù†ÛŒØ§';
                    const govBase = GOV_LABELS[job.governorate_id] || job.location || 'Ú©ÙˆØ±Ø¯Ø³ØªØ§Ù†';
                    return (
                      <div
                        key={job.id}
                        onClick={() => onNavigate?.('job_detail', { jobId: job.id })}
                        className="shrink-0 w-64 p-4 rounded-3xl border cursor-pointer transition-all snap-start active:scale-[0.98]"
                        style={{ background: TEAL_SOFT, borderColor: `${TEAL}40` }}
                      >
                        <div className="flex items-center justify-between mb-3">
                          {isBoosted ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black text-white flex items-center gap-1" style={{ background: TEAL }}>
                              <Rocket className="w-2.5 h-2.5" />Ø¨Û•Ø±Ø²Ú©Ø±Ø§ÙˆÛ•
                            </span>
                          ) : <span />}
                          <button onClick={e => { e.stopPropagation(); toggleSaveJob(job.id); }}
                            className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow-sm active:scale-90 transition-transform">
                            <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-[#ff4d67] text-[#ff4d67]' : 'text-stone-400'}`} />
                          </button>
                        </div>
                        <h3 className="text-sm font-black text-stone-900 truncate">{job.title_ku}</h3>
                        <span className="text-[11px] text-stone-500 font-bold block mt-0.5 truncate">{company}ØŒ {govBase}</span>
                        <div className="h-px my-3" style={{ background: `${TEAL}30` }} />
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-stone-400">Ù…Ø§Ù†Ú¯Ø§Ù†Ù‡</span>
                          <span dir="ltr" className="text-sm font-mono font-black" style={{ color: TEAL_DEEP }}>
                            {(job.salary_min || 0).toLocaleString()} IQD
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Reveal>
            )}

            {/* â”€â”€ Explore by city â€” real illustrated photo cards; click one to
             reveal its real towns (from the same data used at registration)
             below the row, pick one to filter jobs by that place. â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {cityStats.length > 0 && (
              <Reveal className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-black text-stone-900">Ú¯Û•Ú•Ø§Ù† Ø¨Û•Ù¾ÛŽÛŒ Ø´Ø§Ø±</h2>
                  <span className="text-xs font-bold" style={{ color: TEAL }}>Ù†Û•Ø®Ø´Û•</span>
                </div>

                <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none snap-x snap-mandatory">
                  {cityStats.map(c => {
                    const [c1, c2] = monogramColors(c.id);
                    const photo = CITY_PHOTOS[c.id];
                    return (
                      <button key={c.id} onClick={() => handleCityClick(c.id)}
                        className="relative shrink-0 w-36 h-44 rounded-3xl overflow-hidden shadow-[0_2px_16px_rgba(0,0,0,0.08)] snap-start transition-all active:scale-95 hover:-translate-y-1 hover:shadow-[0_10px_28px_rgba(0,0,0,0.15)]"
                        style={{ outline: (expandedGovId === c.id || govFilter === c.id) ? `2.5px solid ${TEAL}` : 'none', outlineOffset: '2px' }}>
                        {photo ? (
                          <img src={photo} alt={c.label} className="absolute inset-0 w-full h-full object-cover" />
                        ) : (
                          <>
                            <div className="absolute inset-0" style={{ background: `linear-gradient(160deg, ${c1}, ${c2})` }} />
                            <CitySymbol id={c.id} className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-28 h-28 text-white/25" />
                          </>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                        <div className="absolute bottom-4 right-4 left-4 text-right">
                          <div className="text-white font-black text-base">{c.label}</div>
                          <div className="text-white/70 text-[11px] font-bold mt-0.5 font-mono">{c.count} Ù‡Û•Ù„ÛŒ Ú©Ø§Ø±</div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Towns of the selected province â€” appears below the row, not
                in place of it. */}
                {expandedGovId && (
                  <div key={expandedGovId} className="bg-white rounded-3xl shadow-[0_2px_16px_rgba(0,0,0,0.05)] p-4 animate-morph-in space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black text-stone-900">Ø´Ø§Ø±Û†Ú†Ú©Û•Ú©Ø§Ù†ÛŒ {GOV_LABELS[expandedGovId] || ''}</h3>
                      <button onClick={() => { soundService.playTick?.(); setExpandedGovId(null); }}
                        className="flex items-center gap-1 text-xs font-bold text-stone-400 hover:text-stone-800 transition-colors">
                        <ChevronRight className="w-3.5 h-3.5" />
                        Ø¯Ø§Ø®Ø³ØªÙ†
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => { soundService.playTick?.(); setGovFilter(expandedGovId); setExpandedGovId(null); scrollToResults(); }}
                        className="px-4 py-2.5 rounded-full text-xs font-bold text-white transition-all active:scale-95" style={{ background: TEAL }}>
                        Ù‡Û•Ù…ÙˆÙˆ {GOV_LABELS[expandedGovId]}
                      </button>
                      {expandedTowns.map((t, i) => (
                        <button key={t.id} onClick={() => handleDistrictClick(expandedGovId, t.name_ku)}
                          style={{ animationDelay: `${Math.min(i, 16) * 25}ms` }}
                          className="animate-fadeIn px-4 py-2.5 rounded-full text-xs font-bold bg-stone-50 text-stone-600 hover:bg-stone-100 hover:text-stone-900 hover:-translate-y-0.5 transition-all active:scale-95">
                          {t.name_ku}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </Reveal>
            )}

            {/* â”€â”€ Newest jobs â€” real created_at order â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {newestJobs.length > 0 && (
              <Reveal className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-black text-stone-900">Ù†ÙˆÛŽØªØ±ÛŒÙ† Ú©Ø§Ø±Û•Ú©Ø§Ù†</h2>
                  <span className="text-xs font-bold" style={{ color: TEAL }}>Ù‡Û•Ù…ÙˆÙˆ</span>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none snap-x snap-mandatory">
                  {newestJobs.map((job, i) => (
                    <div key={job.id} style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }} className="animate-fadeIn w-60 shrink-0 snap-start">
                      <JobPhotoCard job={job} />
                    </div>
                  ))}
                </div>
              </Reveal>
            )}

            {/* â”€â”€ Category chips â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <Reveal className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {CATEGORIES.map(cat => {
                const Icon = CATEGORY_ICONS[cat.id] || Briefcase;
                const active = selectedCategory === cat.id;
                return (
                  <button key={cat.id}
                    onClick={() => { soundService.playTick?.(); setSelectedCategory(cat.id); }}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold shrink-0 transition-all active:scale-95 ${active ? 'text-white' : 'bg-white text-stone-500 shadow-[0_2px_16px_rgba(0,0,0,0.05)] hover:text-stone-800'
                      }`}
                    style={active ? { background: TEAL } : {}}>
                    <Icon className="w-3.5 h-3.5" style={{ color: active ? '#fff' : '#a8a29e' }} strokeWidth={2.25} />
                    {cat.nameKu}
                  </button>
                );
              })}
            </Reveal>

            {/* â”€â”€ Jobs header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <div ref={jobsSectionRef} className="flex items-center justify-between scroll-mt-24">
              <h2 className="text-sm font-black text-stone-900">Ù‡Û•Ù„ÛŒ Ú©Ø§Ø±Û• Ú†Ø§Ù„Ø§Ú©Û•Ú©Ø§Ù†</h2>
              <span className="text-xs font-mono font-black text-stone-400">{filteredJobs.length} Ø¦Û•Ù†Ø¬Ø§Ù…</span>
            </div>

            {/* â”€â”€ Job grid â€” remounts (and replays its entrance stagger) every
             time the filtered result set actually changes, so switching
             filters or pages feels like a real transition. â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {isInitialLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-3xl shadow-[0_2px_16px_rgba(0,0,0,0.05)] overflow-hidden">
                    <div className="h-40 bg-stone-100 animate-pulse" />
                    <div className="p-4 space-y-2.5">
                      <div className="h-3.5 rounded-full bg-stone-100 animate-pulse w-3/4" />
                      <div className="h-2.5 rounded-full bg-stone-100 animate-pulse w-1/2" />
                      <div className="h-9 rounded-xl bg-stone-100 animate-pulse mt-3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-3xl shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
                <Briefcase className="w-12 h-12 text-stone-200 mb-3" />
                <h3 className="text-base font-black text-stone-400 mb-1">Ù‡ÛŒÚ† Ù‡Û•Ù„ÛŒ Ú©Ø§Ø±ÛŽÚ© Ù†Û•Ø¯Û†Ø²Ø±Ø§ÛŒÛ•ÙˆÛ•</h3>
                <p className="text-xs text-stone-300">Ù¾Ø§ÚµØ§ÙˆØªÙ†Û•Ú©Ø§Ù† Ø¨Ú¯Û†Ú•Û• ÛŒØ§Ù† ÙˆØ´Û•ÛŒÛ•Ú©ÛŒ ØªØ± Ø¨Û•Ú©Ø§Ø±Ø¨Ù‡ÛŽÙ†Û•</p>
              </div>
            ) : (
              <>
                <div key={`${page}-${selectedCategory}-${jobTypeFilter}-${govFilter}-${priceFilter}-${searchTerm}`}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {pagedJobs.map((job, i) => (
                    <div key={job.id} style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }} className="animate-fadeIn">
                      <JobPhotoCard job={job} />
                    </div>
                  ))}
                </div>

                {/* â”€â”€ Pagination â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                      className="w-9 h-9 rounded-full bg-white shadow-[0_2px_16px_rgba(0,0,0,0.05)] flex items-center justify-center disabled:opacity-30 transition-opacity">
                      <ChevronRight className="w-4 h-4 text-stone-500" />
                    </button>
                    <span className="text-xs font-bold text-stone-400 font-mono">
                      {page} / {totalPages}
                    </span>
                    <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                      className="w-9 h-9 rounded-full bg-white shadow-[0_2px_16px_rgba(0,0,0,0.05)] flex items-center justify-center disabled:opacity-30 transition-opacity">
                      <ChevronLeft className="w-4 h-4 text-stone-500" />
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {isEmployer && (
        <>
            {/* â”€â”€ Search block â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <Reveal className="space-y-3">
              <div className="flex gap-2 p-1.5 rounded-[22px] bg-white border border-stone-100 shadow-[0_8px_28px_rgba(0,0,0,0.05)]">
                <div className="relative flex-1">
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300" />
                  <input
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Ú¯Û•Ú•Ø§Ù† Ø¨Û† Ú©Ø§Ø±Ø®ÙˆØ§Ø²ØŒ Ù¾ÛŒØ´Û•..."
                    className="w-full bg-stone-50/70 rounded-[17px] pr-11 pl-4 py-3.5 text-sm text-stone-900 font-bold placeholder-stone-300 outline-none focus:bg-white focus:ring-2 focus:ring-[#12796b]/10 transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => { soundService.playTick?.(); setVerifiedOnly(v => !v); }}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold shrink-0 transition-all active:scale-95 ${verifiedOnly ? 'text-white' : 'bg-white text-stone-500 shadow-[0_2px_16px_rgba(0,0,0,0.05)] hover:text-stone-800'
                    }`}
                  style={verifiedOnly ? { background: TEAL } : {}}>
                  <BadgeCheck className="w-3.5 h-3.5" style={{ color: verifiedOnly ? '#fff' : '#a8a29e' }} />
                  ØªÛ•Ù†Ù‡Ø§ Ù¾Ø´ØªÚ•Ø§Ø³ØªÚ©Ø±Ø§ÙˆÛ•Ú©Ø§Ù†
                </button>

                <span className="w-px h-6 bg-stone-200 shrink-0 mx-1" />

                <DropdownChip label="Ø´Ø§Ø±" value={govFilter}
                  options={[{ value: 'all', label: 'Ù‡Û•Ù…ÙˆÙˆ Ø´Ø§Ø±Û•Ú©Ø§Ù†' }, ...Object.entries(GOV_LABELS).map(([value, label]) => ({ value, label }))]}
                  onChange={setGovFilter} />
              </div>
            </Reveal>

            {/* â”€â”€ Explore by city â€” real per-governorate freelancer counts â”€â”€ */}
            {freelancerCityStats.length > 0 && (
              <Reveal className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-black text-stone-900">Ú¯Û•Ú•Ø§Ù† Ø¨Û•Ù¾ÛŽÛŒ Ø´Ø§Ø±</h2>
                  <span className="text-xs font-bold" style={{ color: TEAL }}>Ù†Û•Ø®Ø´Û•</span>
                </div>

                <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none snap-x snap-mandatory">
                  {freelancerCityStats.map(c => {
                    const [c1, c2] = monogramColors(c.id || c.label);
                    const photo = c.id ? CITY_PHOTOS[c.id] : null;
                    return (
                      <button key={c.label} onClick={() => c.id && handleCityClick(c.id)}
                        className="relative shrink-0 w-36 h-44 rounded-3xl overflow-hidden shadow-[0_2px_16px_rgba(0,0,0,0.08)] snap-start transition-all active:scale-95 hover:-translate-y-1 hover:shadow-[0_10px_28px_rgba(0,0,0,0.15)]"
                        style={{ outline: (expandedGovId === c.id || (c.id && govFilter === c.id)) ? `2.5px solid ${TEAL}` : 'none', outlineOffset: '2px' }}>
                        {photo ? (
                          <img src={photo} alt={c.label} className="absolute inset-0 w-full h-full object-cover" />
                        ) : (
                          <>
                            <div className="absolute inset-0" style={{ background: `linear-gradient(160deg, ${c1}, ${c2})` }} />
                            {c.id && <CitySymbol id={c.id} className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-28 h-28 text-white/25" />}
                          </>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                        <div className="absolute bottom-4 right-4 left-4 text-right">
                          <div className="text-white font-black text-base">{c.label}</div>
                          <div className="text-white/70 text-[11px] font-bold mt-0.5 font-mono">{c.count} Ú©Ø§Ø±Ø®ÙˆØ§Ø²</div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {expandedGovId && (
                  <div key={expandedGovId} className="bg-white rounded-3xl shadow-[0_2px_16px_rgba(0,0,0,0.05)] p-4 animate-morph-in space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black text-stone-900">Ø´Ø§Ø±Û†Ú†Ú©Û•Ú©Ø§Ù†ÛŒ {GOV_LABELS[expandedGovId] || ''}</h3>
                      <button onClick={() => { soundService.playTick?.(); setExpandedGovId(null); }}
                        className="flex items-center gap-1 text-xs font-bold text-stone-400 hover:text-stone-800 transition-colors">
                        <ChevronRight className="w-3.5 h-3.5" />
                        Ø¯Ø§Ø®Ø³ØªÙ†
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => { soundService.playTick?.(); setGovFilter(expandedGovId); setExpandedGovId(null); scrollToResults(); }}
                        className="px-4 py-2.5 rounded-full text-xs font-bold text-white transition-all active:scale-95" style={{ background: TEAL }}>
                        Ù‡Û•Ù…ÙˆÙˆ {GOV_LABELS[expandedGovId]}
                      </button>
                      {expandedTowns.map((t, i) => (
                        <button key={t.id} onClick={() => handleDistrictClick(expandedGovId, t.name_ku)}
                          style={{ animationDelay: `${Math.min(i, 16) * 25}ms` }}
                          className="animate-fadeIn px-4 py-2.5 rounded-full text-xs font-bold bg-stone-50 text-stone-600 hover:bg-stone-100 hover:text-stone-900 hover:-translate-y-0.5 transition-all active:scale-95">
                          {t.name_ku}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </Reveal>
            )}

            {/* â”€â”€ Newest freelancers â€” real created_at order â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {newestFreelancers.length > 0 && (
              <Reveal className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-black text-stone-900">Ù†ÙˆÛŽØªØ±ÛŒÙ† Ú©Ø§Ø±Ø®ÙˆØ§Ø²Ø§Ù†</h2>
                  <span className="text-xs font-bold" style={{ color: TEAL }}>Ù‡Û•Ù…ÙˆÙˆ</span>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none snap-x snap-mandatory">
                  {newestFreelancers.map((f, i) => (
                    <div key={f.id} style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }} className="animate-fadeIn w-60 shrink-0 snap-start">
                      <FreelancerPhotoCard f={f} />
                    </div>
                  ))}
                </div>
              </Reveal>
            )}

            {/* â”€â”€ Category chips â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <Reveal className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {CATEGORIES.map(cat => {
                const Icon = CATEGORY_ICONS[cat.id] || Briefcase;
                const active = selectedCategory === cat.id;
                return (
                  <button key={cat.id}
                    onClick={() => { soundService.playTick?.(); setSelectedCategory(cat.id); }}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold shrink-0 transition-all active:scale-95 ${active ? 'text-white' : 'bg-white text-stone-500 shadow-[0_2px_16px_rgba(0,0,0,0.05)] hover:text-stone-800'}`}
                    style={active ? { background: TEAL } : {}}>
                    <Icon className="w-3.5 h-3.5" style={{ color: active ? '#fff' : '#a8a29e' }} strokeWidth={2.25} />
                    {cat.nameKu}
                  </button>
                );
              })}
            </Reveal>

            {/* â”€â”€ Freelancers header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-stone-900">Ú©Ø§Ø±Ø®ÙˆØ§Ø²Û•Ú©Ø§Ù†</h2>
              <span className="text-xs font-mono font-black text-stone-400">{filteredFreelancers.length} Ø¦Û•Ù†Ø¬Ø§Ù…</span>
            </div>

            {/* â”€â”€ Freelancer grid â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {isInitialLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-3xl shadow-[0_2px_16px_rgba(0,0,0,0.05)] overflow-hidden">
                    <div className="h-40 bg-stone-100 animate-pulse" />
                    <div className="p-4 space-y-2.5">
                      <div className="h-3.5 rounded-full bg-stone-100 animate-pulse w-3/4" />
                      <div className="h-2.5 rounded-full bg-stone-100 animate-pulse w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredFreelancers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-3xl shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
                <Users className="w-12 h-12 text-stone-200 mb-3" />
                <h3 className="text-base font-black text-stone-400 mb-1">Ù‡ÛŒÚ† Ú©Ø§Ø±Ø®ÙˆØ§Ø²ÛŽÚ© Ù†Û•Ø¯Û†Ø²Ø±Ø§ÛŒÛ•ÙˆÛ•</h3>
                <p className="text-xs text-stone-300">Ù¾Ø§ÚµØ§ÙˆØªÙ†Û•Ú©Ø§Ù† Ø¨Ú¯Û†Ú•Û• ÛŒØ§Ù† ÙˆØ´Û•ÛŒÛ•Ú©ÛŒ ØªØ± Ø¨Û•Ú©Ø§Ø±Ø¨Ù‡ÛŽÙ†Û•</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {pagedFreelancers.map((f, i) => (
                    <div key={f.id} style={{ animationDelay: `${Math.min(i, 10) * 35}ms` }} className="animate-fadeIn">
                      <FreelancerPhotoCard f={f} />
                    </div>
                  ))}
                </div>

                {/* â”€â”€ Pagination â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                {totalFreelancerPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                      className="w-9 h-9 rounded-full bg-white shadow-[0_2px_16px_rgba(0,0,0,0.05)] flex items-center justify-center disabled:opacity-30 transition-opacity">
                      <ChevronRight className="w-4 h-4 text-stone-500" />
                    </button>
                    <span className="text-xs font-bold text-stone-400 font-mono">
                      {page} / {totalFreelancerPages}
                    </span>
                    <button disabled={page === totalFreelancerPages} onClick={() => setPage(p => p + 1)}
                      className="w-9 h-9 rounded-full bg-white shadow-[0_2px_16px_rgba(0,0,0,0.05)] flex items-center justify-center disabled:opacity-30 transition-opacity">
                      <ChevronLeft className="w-4 h-4 text-stone-500" />
                    </button>
                  </div>
                )}
              </>
            )}

            <FreelancerProfileModal freelancer={selectedFreelancer} isOpen={!!selectedFreelancer} onClose={() => setSelectedFreelancer(null)} />
            <SendInvitationModal freelancer={inviteTarget} isOpen={!!inviteTarget} onClose={() => setInviteTarget(null)} />
          </>
        )}

      </div>
    </div>
  );
};
