import { positionsInfo } from '../../utils/jobPositions';
import { profileCompletion } from '../../utils/profileCompletion';
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

// Brand teal — matches the logo mark and the rest of the light screens.
const TEAL = '#641bd9';
const TEAL_DEEP = '#4b13a5';
const TEAL_SOFT = '#ece7f4';

const GOV_LABELS = {
  sulaymaniyah: 'سلێمانی', erbil: 'هەولێر', duhok: 'دهۆک',
  kirkuk: 'کەرکووک', halabja: 'هەڵەبجە',
};

// Real illustrated cover photos per governorate — falls back to the SVG
// landmark symbol + color gradient for any governorate without one.
const CITY_PHOTOS = {
  sulaymaniyah: '/cities/sulaymaniyah.png',
  erbil: '/cities/erbil.png',
  duhok: '/cities/duhok.png',
  kirkuk: '/cities/kirkuk.png',
  halabja: '/cities/halabja.png',
};

const JOB_TYPE_LABELS = {
  fullTime: 'کاتی تەواو', partTime: 'پارچەیی', contract: 'گرێبەست',
  internship: 'ماوەی فێربوون', remote: 'کاتی ئازاد',
};

// A consistent line-icon set (same stroke weight) instead of mixed-platform
// emoji, keyed to the real category ids seeded on the backend — unknown
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
  { value: 'all', label: 'هەموو نرخەکان' },
  { value: 'lt400', label: 'کەمتر لە ٤٠٠,٠٠٠' },
  { value: '400to800', label: '٤٠٠,٠٠٠ - ٨٠٠,٠٠٠' },
  { value: 'gt800', label: 'زیاتر لە ٨٠٠,٠٠٠' },
];

const parseSkills = (raw) => {
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw || '[]'); } catch { return []; }
};

const isNewJob = (job) => {
  if (!job.created_at) return false;
  return (Date.now() - new Date(job.created_at).getTime()) < 48 * 3600 * 1000;
};

// A simple time-of-day greeting — same idea as any native app's "Good
// morning" header, just localized.
const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'بەیانیت باش';
  if (h < 17) return 'نیوەڕۆت باش';
  if (h < 20) return 'ئێوارەت باش';
  return 'شەوت باش';
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

// Real cover art for a job card when no real photo (company_cover) exists —
// a deterministic color pair + the company's own initial, never a fake stock photo.
const CoverArt = ({ seed, cover, className = '' }) => {
  if (cover) return <img src={cover} alt="" className={`${className} object-cover`} />;
  const [c1, c2] = monogramColors(seed);
  // A single name-initial letter here reads as ambiguous — for names
  // starting with "ئ" (very common in Kurdish) it was mistaken for the
  // app's own logo mark. Spelled-out brand text instead of a lone letter
  // makes it unambiguous that this is just a placeholder, not a real photo.
  return (
    <div className={`${className} flex items-center justify-center`} style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}>
      <span className="text-white/30 font-black text-lg tracking-wide select-none">ئیش خواز</span>
    </div>
  );
};

// A pill that opens a small option list — used for price/city, where the
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

/* Green page header (same look as every other page): greeting on phones, title, search, live counts */
const FEED_GRAD = 'linear-gradient(155deg,#7229e8 0%,#5513bf 48%,#1d0740 100%)';
const PremiumFeedHero = ({ isEmployer, user, activeJobs, activePeople, newCount, onNavigate, searchTerm, onSearch, unreadMessages = 0, unreadNotifs = 0 }) => {
  const firstName = (user?.name || '').split(' ')[0] || 'بەکارهێنەر';
  const iconBtn = 'relative grid h-11 w-11 place-items-center rounded-2xl border border-white/20 bg-white/12 text-white backdrop-blur active:scale-95 transition';
  return (
    <section
      className="relative overflow-hidden rounded-b-[30px] text-white shadow-[0_14px_34px_rgba(29,7,64,.22)] lg:rounded-b-[36px]"
      style={{ background: FEED_GRAD, marginTop: 'calc(-1 * env(safe-area-inset-top))', paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#9d74e0]/25 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 opacity-[.07]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.9) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.9) 1px,transparent 1px)', backgroundSize: '38px 38px' }} />
      <div className="relative mx-auto max-w-6xl px-4 pb-7 pt-4 sm:px-6 lg:px-8 lg:pb-9 lg:pt-9">
        {/* phones: greeting + shortcuts (the desktop header already has these) */}
        <div className="mb-5 flex items-center justify-between lg:hidden">
          <button type="button" onClick={() => onNavigate?.('profile')} className="flex items-center gap-3 text-right active:scale-95 transition">
            <span className="grid h-11 w-11 place-items-center overflow-hidden rounded-2xl bg-white/15 text-base font-bold ring-1 ring-white/25">
              {user?.avatar ? <img src={user.avatar} alt="" className="h-full w-full object-cover" /> : firstName.charAt(0)}
            </span>
            <span>
              <span className="block text-[11px] font-medium text-white/70">{getGreeting()}</span>
              <span className="block text-[17px] font-bold leading-tight">{firstName}</span>
            </span>
          </button>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => onNavigate?.('messages')} aria-label="پەیامەکان" className={iconBtn}><MessageCircle className="h-[18px] w-[18px]" />{unreadMessages > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-400" />}</button>
            <button type="button" onClick={() => onNavigate?.('notifications')} aria-label="ئاگادارییەکان" className={iconBtn}><Bell className="h-[18px] w-[18px]" />{unreadNotifs > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-400" />}</button>
          </div>
        </div>

        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-bold text-[#ddc8ff]">
              {isEmployer ? <UsersRound className="h-3.5 w-3.5" /> : <WandSparkles className="h-3.5 w-3.5" />}
              {isEmployer ? 'بازاڕی کارخوازان' : 'بازاڕی هەلی کار'}
            </span>
            <h1 className="mt-3 text-[26px] font-bold leading-[1.45] sm:text-[34px] lg:text-[40px]">
              {isEmployer ? 'کارخوازی باش بۆ کارەکەت بدۆزەرەوە' : 'هەلی کاری گونجاو بۆ تۆ لێرەیە'}
            </h1>
            <p className="mt-2 max-w-xl text-[13px] font-medium leading-7 text-white/75">
              {isEmployer ? 'کارخوازانی Pro و VIP بە پیشە و شوێن بگەڕێ و بە خێرایی پەیوەندییان پێوە بکە.' : 'بگەڕێ، هەلی نوێ ببینە و بە یەک کرتە سیڤییەکەت بنێرە.'}
            </p>
          </div>
          {(isEmployer || profileCompletion(user) < 100) && (
          <button type="button" onClick={() => onNavigate?.(isEmployer ? 'post-job' : 'profile')} className="group inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3.5 text-xs font-bold text-[#4b13a5] shadow-[0_12px_28px_rgba(0,0,0,.18)] transition active:scale-95">
            {isEmployer ? 'بڵاوکردنەوەی هەلی کار' : `پڕۆفایلی خۆت تەواو بکە (${profileCompletion(user)}%)`}
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </button>
          )}
        </div>

        {/* search lives inside the card */}
        <div className="relative mt-5 max-w-2xl">
          <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8aa39d]" />
          <input value={searchTerm} onChange={e => onSearch?.(e.target.value)} placeholder={isEmployer ? 'گەڕان بۆ کارخواز، پیشە...' : 'گەڕان بۆ کار، کۆمپانیا...'}
            className="w-full rounded-2xl border border-transparent bg-white py-3.5 pl-4 pr-11 text-sm font-bold text-[#16111d] shadow-[0_10px_28px_rgba(0,0,0,.14)] outline-none placeholder:text-[#9db0ab] focus:ring-4 focus:ring-white/25" />
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
          {[
            { value: activeJobs, label: isEmployer ? 'کارخوازی Pro/VIP' : 'هەلی بەردەست', icon: Briefcase },
            { value: activePeople, label: isEmployer ? 'هەموو کارخواز' : 'کۆمپانیا', icon: isEmployer ? UsersRound : Users },
            { value: newCount, label: 'نوێ', icon: Sparkles },
          ].map(({ value, label, icon: Icon }) => (
            <div key={label} className="rounded-2xl border border-white/15 bg-white/10 px-3 py-3 backdrop-blur sm:px-4">
              <div className="flex items-center gap-2"><Icon className="h-4 w-4 text-[#b48df2]" /><span className="text-xl font-bold leading-none sm:text-2xl">{value}</span></div>
              <p className="mt-1.5 text-[10px] font-medium text-white/70">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const PremiumUpgradeBanner = ({ onNavigate, planName }) => (
  <section className="relative overflow-hidden rounded-[30px] bg-[#100b17] shadow-[0_18px_55px_rgba(18,6,36,0.18)]">
    <div className="absolute inset-0 opacity-70" style={{ background: 'radial-gradient(circle at 85% 15%, rgba(172,138,226,.30), transparent 32%), radial-gradient(circle at 10% 90%, rgba(100,27,217,.22), transparent 34%)' }} />
    <div className="absolute inset-0 opacity-[0.055]" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,.8) 1px, transparent 1px)', backgroundSize: '14px 14px' }} />
    <div className="relative p-5 sm:p-7"><div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
      <div className="max-w-2xl">
        <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 bg-white/10 border border-white/10 text-[10px] font-black text-[#ccb6ef]"><Crown className="w-3.5 h-3.5" />KARNAMA PRO</div>
        <h3 className="mt-4 text-2xl sm:text-3xl font-black tracking-tight text-white">بۆ هەر کارێک، سیڤییەکی تایبەت.</h3>
        <p className="mt-2 text-xs sm:text-sm leading-6 font-bold text-white/55">چەند سیڤییەکی جیاواز دروست بکە و بۆ هەر هەلی کارێک ئەوەی گونجاوترە هەڵبژێرە.{planName ? ` پلانەکەی تۆ: ${planName}` : ''}</p>
        <div className="flex flex-wrap gap-2 mt-5">{[['Pro', 'تا ٣ سیڤی'], ['Pro+', 'تا ٦ سیڤی'], ['Smart', 'ئامادەتر بۆ داواکاری']].map(([title, sub]) => <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2.5"><div className="text-[10px] font-black text-white">{title}</div><div className="text-[9px] font-bold text-white/45 mt-0.5">{sub}</div></div>)}</div>
      </div>
      <button onClick={() => onNavigate?.('plans')} className="group shrink-0 w-full lg:w-auto min-w-[210px] rounded-2xl bg-white px-5 py-4 text-xs font-black text-[#100b17] shadow-[0_12px_28px_rgba(0,0,0,.18)] transition-all hover:-translate-y-0.5 active:scale-[0.98]"><span className="flex items-center justify-center gap-2">بەرزکردنەوەی پلان<ArrowUpRight className="w-4 h-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></span><span className="block text-[9px] text-stone-400 mt-1">سیڤییەکانت بە شێوەیەکی زیرەک بەکاربهێنە</span></button>
    </div></div>
  </section>
);

export const JobFeed = ({ onNavigate }) => {
  const { user, token } = useAuth();
  const { jobs = [], applications = [], savedJobIds = [], categories = [], regions = [], freelancers = [], toggleSaveJob, isInitialLoading, unreadNotifCount = 0, planTiers = [] } = useStore();

  // Company accounts land here too (App.jsx routes their Home tab to this
  // component) — everything below computes both a job-feed and a
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
  // with a real icon in CATEGORY_ICONS above) — the backend's full category
  // list runs past 80 entries once sub-specialties are counted, and dumping
  // all of them into one horizontal row makes it unusable. The job-posting
  // form still offers the complete list; this is browse-time only.
  const CATEGORIES = useMemo(() => [
    { id: 'all', nameKu: 'هەموو' },
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

  // Real personalization — skills/category/city overlap always runs
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

  // Flattened down to real neighborhood/sub-district level (e.g. "تەکیەی
  // کاکەمەند", "بازیان") — not just the district name — since that's the
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

  // Newest openings — real created_at order, independent of any boost, so
  // this rail always reflects what actually just got posted.
  const newestJobs = useMemo(() => {
    return [...(Array.isArray(jobs) ? jobs : [])]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 8);
  }, [jobs]);

  // Real per-governorate job counts — only real, non-empty cities are shown,
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

  /* ══════════════ EMPLOYER BRANCH — freelancers as primary content ══════════════ */

  const GOV_NAME_TO_ID = useMemo(() => Object.fromEntries(Object.entries(GOV_LABELS).map(([id, name]) => [name, id])), []);
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  // Same ownership check Dashboard.jsx uses — which jobs this company actually posted.
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

  // Only used for the "new" counter in the header (the list itself is filteredFreelancers: Pro / VIP only)
  const newestFreelancers = useMemo(() => filteredFreelancers.filter(f => (Date.now() - new Date(f.created_at || 0).getTime()) < 7 * 24 * 3600 * 1000), [filteredFreelancers]);

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
    const displayTitle = f.job_title || f.title || f.specialty || skills[0] || 'کارخواز';
    const years = Number(f.experience_years ?? f.years_experience ?? f.experience ?? 0);
    const tags = skills.slice(0, 5);
    const initials = (f.name || 'ک').trim().charAt(0);
    const avatar = f.avatar || f.profile_image || f.photo;
    const cover = f.cover || f.cover_image || f.banner;
    const location = [f.district || f.sub_district, f.governorate].filter(Boolean).join('، ') || 'کوردستان';

    return (
      <article
        onClick={() => { soundService.playTick?.(); setSelectedFreelancer(f); }}
        className={`relative group h-full overflow-hidden rounded-[30px] cursor-pointer transition-all duration-500 hover:-translate-y-1.5 ${isVip
            ? 'bg-[#130d0c] text-white shadow-[0_18px_55px_rgba(114,39,20,.22)]'
            : 'bg-white text-stone-900 border border-stone-100 shadow-[0_6px_24px_rgba(29,19,46,.06)] hover:shadow-[0_20px_44px_rgba(29,19,46,.13)]'
          }`}
      >
        {isVip && <div className="pointer-events-none absolute inset-[-2px] rounded-[32px] vip-card-border opacity-90" />}
        {isVip && <div className="pointer-events-none absolute -top-20 -right-16 w-52 h-52 rounded-full bg-orange-500/20 blur-3xl vip-fire-pulse" />}
        {isVip && <div className="pointer-events-none absolute -bottom-24 -left-12 w-56 h-56 rounded-full bg-rose-600/15 blur-3xl vip-fire-pulse" style={{ animationDelay: '-1.2s' }} />}

        <div className="relative h-44 sm:h-48 overflow-hidden">
          {cover ? (
            <img src={cover} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
          ) : (
            <div className={`absolute inset-0 ${isVip ? 'bg-[radial-gradient(circle_at_20%_15%,rgba(255,153,66,.45),transparent_30%),linear-gradient(135deg,#35110b,#130d0c_55%,#4a1810)]' : 'bg-[radial-gradient(circle_at_85%_10%,rgba(100,27,217,.20),transparent_32%),linear-gradient(135deg,#f7f5fa,#ede8f4)]'}`}>
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
            {f.governorate || 'کوردستان'}
          </span>

          {isBoosted && (
            <span className={`absolute top-12 left-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[10px] font-black shadow-sm ${isVip ? 'bg-orange-500/90 text-white' : 'text-white'}`} style={!isVip ? { background: TEAL } : {}}>
              <Rocket className="w-3 h-3" /> بەرزکراوە
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
                <h3 className={`text-[15px] font-black truncate ${isVip ? 'text-white' : 'text-stone-950'}`}>{f.name || 'کارخواز'}</h3>
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
              <span className="truncate">{years > 0 ? `${years} ساڵ ئەزموون` : 'ئەزموون لە پڕۆفایل'}</span>
            </div>
          </div>

          {f.bio && <p className={`mt-3 text-[10px] leading-5 line-clamp-2 ${isVip ? 'text-white/50' : 'text-stone-400'}`}>{f.bio}</p>}

          {tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {tags.map((tag, i) => (
                <span key={`${tag}-${i}`} className={`inline-flex items-center gap-1 max-w-full rounded-full px-2 py-1 text-[9px] font-black ${isVip ? 'bg-orange-400/10 text-orange-100 border border-orange-300/10' : 'bg-[#f2eef8] text-[#4b13a5] border border-[#e0d7ef]'}`}>
                  <Hash className="w-2.5 h-2.5 shrink-0" />
                  <span className="truncate">{tag.replace(/^#/, '').replace(/\s+/g, '_')}</span>
                </span>
              ))}
            </div>
          )}

          {matched && <div className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-black ${isVip ? 'bg-emerald-400/10 text-emerald-200 border border-emerald-300/10' : 'bg-[#ece7f4] text-[#4b13a5]'}`}><Zap className="w-3 h-3" /> گونجاو بۆ کاری تۆ</div>}

          <div className="mt-4 flex gap-2">
            <button onClick={e => { e.stopPropagation(); soundService.playTick?.(); setSelectedFreelancer(f); }} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black border transition-all active:scale-95 ${isVip ? 'border-white/10 bg-white/[.06] text-white hover:bg-white/[.10]' : 'border-stone-100 bg-stone-50 text-stone-600 hover:bg-stone-100'}`}>
              پڕۆفایل
            </button>
            <button onClick={e => { e.stopPropagation(); soundService.playTick?.(); setInviteTarget(f); }} className={`flex-[1.35] py-2.5 rounded-xl text-[10px] font-black text-white transition-all active:scale-95 shadow-lg ${isVip ? 'vip-cta' : ''}`} style={!isVip ? { background: `linear-gradient(135deg,${TEAL},${TEAL_DEEP})` } : undefined}>
              <span className="inline-flex items-center justify-center gap-1.5"><Send className="w-3 h-3" /> بانگهێشت</span>
            </button>
          </div>
        </div>
      </article>
    );
  };
  const JobPhotoCard = ({ job }) => {
    const isApplied = applications.some(a => String(a.job_id) === String(job.id));
    const isSaved = savedJobIds.includes(job.id);
    const company = job.company_name || job.companyName || job.company || 'کۆمپانیا';
    const title = job.title_ku || job.title || 'هەلی کار';
    const govBase = GOV_LABELS[job.governorate_id] || job.location || 'کوردستان';
    // Full address only when the employer actually entered one — never a
    // fabricated neighborhood name standing in for real data.
    const gov = job.location_detail ? `${govBase}، ${job.location_detail}` : govBase;
    const salary = job.salary_min ? `${Number(job.salary_min).toLocaleString()} IQD` : 'نرخ گفتوگۆکراو';
    const typeLabel = JOB_TYPE_LABELS[job.job_type] || 'کاتی تەواو';
    const isNew = isNewJob(job);
    const matched = jobMatchesUser(job);
    const isBoosted = job.boosted_until && new Date(job.boosted_until) > new Date();
    const avgResponseH = Number(job.company_avg_response_hours) || 0;

    return (
      <div onClick={() => { soundService.playTick?.(); onNavigate?.('job_detail', { jobId: job.id }); }}
        className="bg-white rounded-[28px] border border-stone-100/90 shadow-[0_4px_20px_rgba(29,19,46,0.055)] hover:shadow-[0_18px_40px_rgba(29,19,46,0.12)] hover:-translate-y-1.5 transition-all duration-300 cursor-pointer overflow-hidden group"
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

          <span className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-black bg-white/90 backdrop-blur shadow-sm" style={{ color: positionsInfo(job).full ? '#b42318' : TEAL_DEEP }}>
            👥 {positionsInfo(job).label}
          </span>

          {isBoosted && (
            <span className="absolute top-12 left-3 px-2.5 py-1 rounded-full text-[10px] font-black text-white shadow-sm" style={{ background: TEAL }}>
              🚀 بەرزکراوە
            </span>
          )}

          {matched && (
            <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-black text-white shadow-sm" style={{ background: TEAL_DEEP }}>
              دیدارکراو
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
            {Number(job.company_verified) === 1 && <BadgeCheck className="w-3 h-3 shrink-0" style={{ color: TEAL }} title="کۆمپانیای پشکنراو" />}
            <span>· {gov}</span>
          </div>
          {avgResponseH > 0 && (
            <div className="text-[10px] text-stone-400 font-bold mt-1">⏱ وەڵامدانەوە لە ~{avgResponseH < 1 ? '1' : Math.round(avgResponseH)} کاژێردا</div>
          )}

          <div className="flex items-center gap-2 mt-3 mb-1">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-stone-400"><Clock3 className="w-3 h-3" />{typeLabel}</span>
            <span className="w-1 h-1 rounded-full bg-stone-200" />
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-stone-400 truncate"><MapPin className="w-3 h-3 shrink-0" />{govBase}</span>
          </div>

          <div className="flex items-center justify-between mt-2">
            <span className="font-mono font-black text-sm text-stone-900">{salary}</span>
            <div className="flex items-center gap-2.5">
              {isNew && <span className="w-1.5 h-1.5 rounded-full" style={{ background: TEAL }} title="نوێ بڵاوکراوەتەوە" />}
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
            {isApplied ? <><CheckCircle2 className="w-3.5 h-3.5" />نێردراوە</> : <><Send className="w-3.5 h-3.5" />ناردنی سیڤی</>}
          </button>
        </div>
      </div>
    );
  };

  const greetingName = (user?.name || '').split(' ')[0];
  const avatarLetter = (user?.name || 'ب').trim().charAt(0);

  // Paid-plan avatar ring — any admin-defined paid tier (vip/pro/whatever
  // it's called) gets its own gradient border straight from that tier's
  // color preset; free/no plan gets a plain neutral ring.
  const userPlanTier = planTiers.find(t => t.id === user?.plan);
  const isPaidPlanUser = !!userPlanTier && Number(userPlanTier.price) > 0;
  const planColor = userPlanTier ? getPlanColor(userPlanTier.color) : null;
  const avatarRingStyle = isPaidPlanUser
    ? { padding: 2, background: planColor.gradient || planColor.accent, boxShadow: `0 4px 14px ${planColor.accent}66` }
    : { padding: 1, background: '#e7e5e9' };

  return (
    <div dir="rtl" className="min-h-screen font-vazirmatn select-none pb-28" style={{ background: 'linear-gradient(180deg, #f8f7fa 0%, #f4f2f6 48%, #f0eef3 100%)' }}>
      <PremiumFeedHero
        isEmployer={isEmployer}
        user={user}
        activeJobs={isEmployer ? filteredFreelancers.length : filteredJobs.length}
        activePeople={isEmployer ? freelancers.length : jobs.length}
        newCount={isEmployer ? newestFreelancers.length : newestJobs.length}
        onNavigate={onNavigate}
        searchTerm={searchTerm}
        onSearch={setSearchTerm}
        unreadMessages={unreadMessageCount}
        unreadNotifs={unreadNotifCount}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-7">


        {!isEmployer && !isPaidPlanUser && (
          <Reveal>
            <PremiumUpgradeBanner onNavigate={onNavigate} planName={userPlanTier?.name_ku || ''} />
          </Reveal>
        )}

        {!isEmployer && (
          <>
            {/* ── Search block ────────────────────────────────────── */}
            <Reveal className="space-y-3">
              {/* Job-type pills — real values against job.job_type */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {[{ value: 'all', label: 'هەموو' }, ...Object.entries(JOB_TYPE_LABELS).map(([value, label]) => ({ value, label }))].map(t => (
                  <button key={t.value}
                    onClick={() => { soundService.playTick?.(); setJobTypeFilter(t.value); }}
                    className={`px-4 py-2 rounded-full text-xs font-bold shrink-0 transition-all active:scale-95 ${jobTypeFilter === t.value ? 'text-white' : 'bg-white text-stone-500 shadow-[0_2px_16px_rgba(0,0,0,0.05)] hover:text-stone-800'
                      }`}
                    style={jobTypeFilter === t.value ? { background: TEAL } : {}}>
                    {t.label}
                  </button>
                ))}

                <span className="w-px h-6 bg-stone-200 shrink-0 mx-1" />

                <DropdownChip label="نرخ" value={priceFilter} options={PRICE_RANGES} onChange={setPriceFilter} />
                <DropdownChip label="شار" value={govFilter}
                  options={[{ value: 'all', label: 'هەموو شارەکان' }, ...Object.entries(GOV_LABELS).map(([value, label]) => ({ value, label }))]}
                  onChange={setGovFilter} />

                {!isEmployer && user && hasActiveFilters && (
                  <button onClick={handleSaveSearch}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold shrink-0 bg-white text-stone-500 shadow-[0_2px_16px_rgba(0,0,0,0.05)] hover:text-stone-800 transition-all">
                    <Bell className="w-3.5 h-3.5" style={{ color: TEAL }} />
                    پاشەکەوتکردنی گەڕان
                  </button>
                )}
              </div>

              {/* Saved searches — real alerts fire server-side whenever a newly
              posted job matches one of these */}
              {savedSearches.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  <Bell className="w-3.5 h-3.5 text-stone-300 shrink-0" />
                  {savedSearches.map(s => (
                    <button key={s.id} onClick={() => applySavedSearch(s)}
                      className="flex items-center gap-1.5 pr-3 pl-1.5 py-1.5 rounded-full text-[11px] font-bold shrink-0 bg-white text-stone-500 shadow-[0_2px_16px_rgba(0,0,0,0.05)] hover:text-stone-800 transition-all">
                      {(s.category !== 'all' ? CATEGORIES.find(c => c.id === s.category)?.nameKu : null) ||
                        (s.governorate_id !== 'all' ? GOV_LABELS[s.governorate_id] : null) ||
                        (s.job_type !== 'all' ? JOB_TYPE_LABELS[s.job_type] : null) || 'گەڕانی پاشەکەوتکراو'}
                      <span onClick={e => handleDeleteSavedSearch(s.id, e)} className="p-1 rounded-full hover:bg-stone-100">
                        <X className="w-3 h-3 text-stone-300" />
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </Reveal>

            {/* ── Recommended for you — real overlap score, plus one real AI
              ranking pass once there's an actual CV/skills to work from.
              While the request is in flight, show a real waiting state
              ("finding suitable work for you") instead of silently showing
              nothing, so a freelancer never wonders if the feature exists. ── */}
            {recommendedLoading ? (
              <Reveal className="space-y-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-black text-stone-900">پێشنیار بۆ تۆ</h2>
                  <Sparkles className="w-4 h-4" style={{ color: TEAL }} />
                </div>
                <div className="flex items-center gap-3 p-5 rounded-3xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
                  <Loader2 className="w-5 h-5 shrink-0 animate-spin" style={{ color: TEAL }} />
                  <p className="text-xs font-bold text-stone-500">چاوەڕێبە، ئێمە کاری گونجاوت بۆ دەدۆزینەوە...</p>
                </div>
              </Reveal>
            ) : recommended.jobs.length > 0 && (
              <Reveal className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-black text-stone-900">پێشنیار بۆ تۆ</h2>
                    <Sparkles className="w-4 h-4" style={{ color: TEAL }} />
                  </div>
                  <span className="text-xs font-bold" style={{ color: TEAL }}>هەموو</span>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none snap-x snap-mandatory">
                  {recommended.jobs.map((job) => {
                    const isSaved = savedJobIds.includes(job.id);
                    const isBoosted = job.boosted_until && new Date(job.boosted_until) > new Date();
                    const company = job.company_name || job.companyName || 'کۆمپانیا';
                    const govBase = GOV_LABELS[job.governorate_id] || job.location || 'کوردستان';
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
                              <Rocket className="w-2.5 h-2.5" />بەرزکراوە
                            </span>
                          ) : <span />}
                          <button onClick={e => { e.stopPropagation(); toggleSaveJob(job.id); }}
                            className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow-sm active:scale-90 transition-transform">
                            <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-[#ff4d67] text-[#ff4d67]' : 'text-stone-400'}`} />
                          </button>
                        </div>
                        <h3 className="text-sm font-black text-stone-900 truncate">{job.title_ku}</h3>
                        <span className="text-[11px] text-stone-500 font-bold block mt-0.5 truncate">{company}، {govBase}</span>
                        <span className="text-[10px] font-black block mt-1 truncate" style={{ color: TEAL_DEEP }}>👥 {positionsInfo(job).label}</span>
                        <div className="h-px my-3" style={{ background: `${TEAL}30` }} />
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-stone-400">مانگانه</span>
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

            {/* ── Explore by city — real illustrated photo cards; click one to
             reveal its real towns (from the same data used at registration)
             below the row, pick one to filter jobs by that place. ────────── */}
            {cityStats.length > 0 && (
              <Reveal className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-black text-stone-900">گەڕان بەپێی شار</h2>
                  <span className="text-xs font-bold" style={{ color: TEAL }}>نەخشە</span>
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
                          <div className="text-white/70 text-[11px] font-bold mt-0.5 font-mono">{c.count} هەلی کار</div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Towns of the selected province — appears below the row, not
                in place of it. */}
                {expandedGovId && (
                  <div key={expandedGovId} className="bg-white rounded-3xl shadow-[0_2px_16px_rgba(0,0,0,0.05)] p-4 animate-morph-in space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black text-stone-900">شارۆچکەکانی {GOV_LABELS[expandedGovId] || ''}</h3>
                      <button onClick={() => { soundService.playTick?.(); setExpandedGovId(null); }}
                        className="flex items-center gap-1 text-xs font-bold text-stone-400 hover:text-stone-800 transition-colors">
                        <ChevronRight className="w-3.5 h-3.5" />
                        داخستن
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => { soundService.playTick?.(); setGovFilter(expandedGovId); setExpandedGovId(null); scrollToResults(); }}
                        className="px-4 py-2.5 rounded-full text-xs font-bold text-white transition-all active:scale-95" style={{ background: TEAL }}>
                        هەموو {GOV_LABELS[expandedGovId]}
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

            {/* ── Newest jobs — real created_at order ─────────────────── */}
            {newestJobs.length > 0 && (
              <Reveal className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-black text-stone-900">نوێترین کارەکان</h2>
                  <span className="text-xs font-bold" style={{ color: TEAL }}>هەموو</span>
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

            {/* ── Category chips ──────────────────────────────────── */}
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

            {/* ── Jobs header ──────────────────────────────────────── */}
            <div ref={jobsSectionRef} className="flex items-center justify-between scroll-mt-24">
              <h2 className="text-sm font-black text-stone-900">هەلی کارە چالاکەکان</h2>
              <span className="text-xs font-mono font-black text-stone-400">{filteredJobs.length} ئەنجام</span>
            </div>

            {/* ── Job grid — remounts (and replays its entrance stagger) every
             time the filtered result set actually changes, so switching
             filters or pages feels like a real transition. ───────────── */}
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
                <h3 className="text-base font-black text-stone-400 mb-1">هیچ هەلی کارێک نەدۆزرایەوە</h3>
                <p className="text-xs text-stone-300">پاڵاوتنەکان بگۆڕە یان وشەیەکی تر بەکاربهێنە</p>
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

                {/* ── Pagination ───────────────────────────────────── */}
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
            {/* ── Search block ────────────────────────────────────── */}
            <Reveal className="space-y-3">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => { soundService.playTick?.(); setVerifiedOnly(v => !v); }}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold shrink-0 transition-all active:scale-95 ${verifiedOnly ? 'text-white' : 'bg-white text-stone-500 shadow-[0_2px_16px_rgba(0,0,0,0.05)] hover:text-stone-800'
                    }`}
                  style={verifiedOnly ? { background: TEAL } : {}}>
                  <BadgeCheck className="w-3.5 h-3.5" style={{ color: verifiedOnly ? '#fff' : '#a8a29e' }} />
                  تەنها پشتڕاستکراوەکان
                </button>

                <span className="w-px h-6 bg-stone-200 shrink-0 mx-1" />

                <DropdownChip label="شار" value={govFilter}
                  options={[{ value: 'all', label: 'هەموو شارەکان' }, ...Object.entries(GOV_LABELS).map(([value, label]) => ({ value, label }))]}
                  onChange={setGovFilter} />
              </div>
            </Reveal>

            {/* ── Explore by city — real per-governorate freelancer counts ── */}
            {freelancerCityStats.length > 0 && (
              <Reveal className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-black text-stone-900">گەڕان بەپێی شار</h2>
                  <span className="text-xs font-bold" style={{ color: TEAL }}>نەخشە</span>
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
                          <div className="text-white/70 text-[11px] font-bold mt-0.5 font-mono">{c.count} کارخواز</div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {expandedGovId && (
                  <div key={expandedGovId} className="bg-white rounded-3xl shadow-[0_2px_16px_rgba(0,0,0,0.05)] p-4 animate-morph-in space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black text-stone-900">شارۆچکەکانی {GOV_LABELS[expandedGovId] || ''}</h3>
                      <button onClick={() => { soundService.playTick?.(); setExpandedGovId(null); }}
                        className="flex items-center gap-1 text-xs font-bold text-stone-400 hover:text-stone-800 transition-colors">
                        <ChevronRight className="w-3.5 h-3.5" />
                        داخستن
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => { soundService.playTick?.(); setGovFilter(expandedGovId); setExpandedGovId(null); scrollToResults(); }}
                        className="px-4 py-2.5 rounded-full text-xs font-bold text-white transition-all active:scale-95" style={{ background: TEAL }}>
                        هەموو {GOV_LABELS[expandedGovId]}
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

            {/* ── Category chips ──────────────────────────────────── */}
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

            {/* ── Freelancers header ──────────────────────────────── */}
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-stone-900">کارخوازەکان</h2>
              <span className="text-xs font-mono font-black text-stone-400">{filteredFreelancers.length} ئەنجام</span>
            </div>

            {/* ── Freelancer grid ─────────────────────────────────── */}
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
                <h3 className="text-base font-black text-stone-400 mb-1">هیچ کارخوازێک نەدۆزرایەوە</h3>
                <p className="text-xs text-stone-300">پاڵاوتنەکان بگۆڕە یان وشەیەکی تر بەکاربهێنە</p>
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

                {/* ── Pagination ─────────────────────────────────── */}
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
