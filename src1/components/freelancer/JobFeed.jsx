import React, { useState, useMemo, useEffect, useRef } from 'react';
import { HScroll } from '../ui/HScroll';
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
import {
  Search, Briefcase, Heart, SlidersHorizontal, ChevronDown,
  ArrowUpRight, Clock3, MapPin, UsersRound, Crown, WandSparkles,
  ChevronLeft, ChevronRight, CheckCircle2, Send, Users, BadgeCheck,
  Bell, X, Sparkles, Rocket, MessageCircle, Loader2,
  LayoutGrid, Code2, TrendingUp, Palette, HardHat, Stethoscope,
  GraduationCap, Landmark, UtensilsCrossed, Truck, Package
} from 'lucide-react';

// Brand teal — matches the logo mark and the rest of the light screens.
const TEAL = '#12796b';
const TEAL_DEEP = '#0d5c50';
const TEAL_SOFT = '#e7f4f1';

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
  all:              LayoutGrid,
  cat_tech:         Code2,
  cat_sales:        TrendingUp,
  cat_media:        Palette,
  cat_construction: HardHat,
  cat_health:       Stethoscope,
  cat_education:    GraduationCap,
  cat_finance:      Landmark,
  cat_food:         UtensilsCrossed,
  cat_transport:    Truck,
  cat_other:        Package,
};

const PRICE_RANGES = [
  { value: 'all',   label: 'هەموو نرخەکان' },
  { value: 'lt400',  label: 'کەمتر لە ٤٠٠,٠٠٠' },
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
        className={`relative z-30 flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold border transition-all whitespace-nowrap active:scale-95 ${
          active ? 'text-white border-transparent' : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
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
              className={`w-full text-right px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                value === o.value ? 'bg-stone-100 text-stone-900' : 'text-stone-500 hover:bg-stone-50'
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
  const firstName = (user?.name || '').split(' ')[0] || 'بەکارهێنەر';
  return (
    <section className="relative overflow-hidden rounded-[30px] sm:rounded-[36px] border border-white/70 bg-white shadow-[0_16px_55px_rgba(20,45,40,0.09)]">
      <div className="absolute -top-24 -right-20 h-56 w-56 rounded-full blur-3xl opacity-30" style={{ background: `radial-gradient(circle, ${TEAL} 0%, transparent 68%)` }} />
      <div className="absolute -bottom-28 -left-16 h-56 w-56 rounded-full blur-3xl opacity-20" style={{ background: `radial-gradient(circle, #8ccfc2 0%, transparent 68%)` }} />
      <div className="relative p-5 sm:p-7 lg:p-8">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 bg-[#eef8f5] border border-[#d8eee8] text-[10px] font-black" style={{ color: TEAL_DEEP }}>
              {isEmployer ? <UsersRound className="w-3.5 h-3.5" /> : <WandSparkles className="w-3.5 h-3.5" />}
              {isEmployer ? 'بازاڕی کارخوازان' : 'بازاڕی هەلی کار'}
            </div>
            <h2 className="mt-4 text-[28px] sm:text-[36px] lg:text-[42px] leading-[1.12] font-black tracking-tight text-stone-950">
              {isEmployer ? <>کارخوازێکی <span style={{ color: TEAL }}>باشتر</span> بۆ کارەکەت بدۆزەرەوە.</> : <>هەلی کارێکی <span style={{ color: TEAL }}>گونجاو</span> بۆ تۆ لێرەیە.</>}
            </h2>
            <p className="mt-3 max-w-xl text-xs sm:text-sm leading-6 font-bold text-stone-400">
              {isEmployer ? `سڵاو ${firstName}، کارخوازە پشکنراوەکان بە پیشە و شوێن بگەڕێ و پەیوەندییەکەت بە خێرایی دەستپێبکە.` : `سڵاو ${firstName}، بگەڕێ بۆ کارەکان کە لەگەڵ تواناکان و شارەکەتدا گونجاون و بە یەک کلیک سیڤی بنێرە.`}
            </p>
          </div>
          <button onClick={() => onNavigate?.(isEmployer ? 'post-job' : 'profile')} className="group shrink-0 inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-xs font-black text-white shadow-[0_10px_24px_rgba(18,121,107,0.22)] transition-all hover:-translate-y-0.5 active:scale-[0.98]" style={{ background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DEEP})` }}>
            {isEmployer ? 'بڵاوکردنەوەی هەلی کار' : 'پڕۆفایلی خۆت تەواو بکە'}
            <ArrowUpRight className="w-4 h-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-7 pt-5 border-t border-stone-100">
          {[
            { value: activeJobs, label: isEmployer ? 'هەلی کار' : 'هەلی بەردەست', icon: Briefcase },
            { value: activePeople, label: isEmployer ? 'کارخواز' : 'کۆمپانیا', icon: isEmployer ? UsersRound : Users },
            { value: newCount, label: 'نوێ', icon: Sparkles },
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
    <div className="relative p-5"><div className="flex flex-col gap-5">
      <div className="min-w-0">
        <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 bg-white/10 border border-white/10 text-[10px] font-black text-[#b7eee3]"><Crown className="w-3.5 h-3.5" />KARNAMA PRO</div>
        <h3 className="mt-4 text-xl font-black leading-snug tracking-tight text-white">بۆ هەر کارێک، سیڤییەکی تایبەت.</h3>
        <p className="mt-2 text-xs leading-6 font-bold text-white/55">چەند سیڤییەکی جیاواز دروست بکە و بۆ هەر هەلی کارێک ئەوەی گونجاوترە هەڵبژێرە.{planName ? ` پلانەکەی تۆ: ${planName}` : ''}</p>
        <div className="grid grid-cols-3 gap-1.5 mt-4">{[['Pro','تا ٣ سیڤی'],['Pro+','تا ٦ سیڤی'],['Smart','ئامادەتر بۆ داواکاری']].map(([title,sub]) => <div key={title} className="min-w-0 rounded-xl border border-white/10 bg-white/[0.06] px-2 py-2 text-center"><div className="text-[10px] font-black text-white">{title}</div><div className="text-[9px] leading-4 font-bold text-white/45 mt-0.5">{sub}</div></div>)}</div>
      </div>
      <button onClick={() => onNavigate?.('plans')} className="group w-full rounded-2xl bg-white px-4 py-3.5 text-xs font-black text-[#0b1714] shadow-[0_12px_28px_rgba(0,0,0,.18)] transition-all hover:-translate-y-0.5 active:scale-[0.98]"><span className="flex items-center justify-center gap-2">بەرزکردنەوەی پلان<ArrowUpRight className="w-4 h-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></span><span className="block text-[9px] text-stone-400 mt-1">سیڤییەکانت بە شێوەیەکی زیرەک بەکاربهێنە</span></button>
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

  const [searchTerm,       setSearchTerm]       = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [jobTypeFilter,    setJobTypeFilter]    = useState('all');
  const [govFilter,        setGovFilter]        = useState('all');
  const [priceFilter,      setPriceFilter]      = useState('all');
  const [page,             setPage]             = useState(1);
  const [savedSearches,    setSavedSearches]    = useState([]);
  const [expandedGovId,    setExpandedGovId]    = useState(null);
  const [recommended,      setRecommended]      = useState({ jobs: [], aiPowered: false });
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
    return safe.filter(f => {
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
    });
  }, [freelancers, searchTerm, govFilter, selectedCategory, verifiedOnly, CATEGORIES]);

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
    const skills = parseSkills(f.skills);
    const isBoosted = f.plan_boost_until && new Date(f.plan_boost_until) > new Date();
    const matched = freelancerMatchesCompany(f);

    return (
      <div onClick={() => { soundService.playTick?.(); setSelectedFreelancer(f); }}
        className="bg-white rounded-[28px] border border-stone-100/90 shadow-[0_4px_20px_rgba(20,45,40,0.055)] hover:shadow-[0_18px_40px_rgba(20,45,40,0.12)] hover:-translate-y-1.5 transition-all duration-300 cursor-pointer overflow-hidden group"
        style={isBoosted ? { boxShadow: `0 0 0 2px ${TEAL}, 0 2px 16px rgba(0,0,0,0.05)` } : {}}>
        <div className="relative h-40 sm:h-44">
          <CoverArt seed={f.name} cover={f.cover} className="w-full h-full" />

          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-black bg-white/90 backdrop-blur text-stone-700 shadow-sm">
            {f.governorate || 'کوردستان'}
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

          {f.avatar && (
            <img src={f.avatar} alt={f.name}
              className="absolute -bottom-4 right-4 w-10 h-10 rounded-full object-cover border-2 border-white shadow-md" />
          )}
        </div>

        <div className="p-4 pt-6">
          <h3 className="text-sm font-black text-stone-900 truncate group-hover:text-stone-600 transition-colors">{f.name || 'کارخواز'}</h3>
          <div className="flex items-center gap-1 text-[11px] text-stone-400 font-bold mt-1 truncate">
            <span className="truncate">{skills.slice(0, 2).join('، ') || 'کارخواز'}</span>
            {Number(f.verified) === 1 && <BadgeCheck className="w-3 h-3 shrink-0" style={{ color: TEAL }} title="پشتڕاستکراو" />}
          </div>

          <div className="flex items-center justify-between mt-3">
            <span className="text-[11px] font-bold text-stone-400 truncate">{f.district || f.governorate || ''}</span>
          </div>

          <button
            onClick={e => { e.stopPropagation(); soundService.playTick?.(); setInviteTarget(f); }}
            className="mt-3 w-full py-3 rounded-[14px] text-[11px] font-black transition-all active:scale-95 flex items-center justify-center gap-1.5 text-white shadow-[0_7px_18px_rgba(18,121,107,0.16)] hover:brightness-105"
            style={{ background: TEAL }}>
            <Send className="w-3.5 h-3.5" />ناردنی داواکاری
          </button>
        </div>
      </div>
    );
  };

  const JobPhotoCard = ({ job, wide = false }) => {
    const isApplied = applications.some(a => String(a.job_id) === String(job.id));
    const isSaved   = savedJobIds.includes(job.id);
    const company   = job.company_name || job.companyName || job.company || 'کۆمپانیا';
    const title     = job.title_ku || job.title || 'هەلی کار';
    const govBase   = GOV_LABELS[job.governorate_id] || job.location || 'کوردستان';
    // Full address only when the employer actually entered one — never a
    // fabricated neighborhood name standing in for real data.
    const gov       = job.location_detail ? `${govBase}، ${job.location_detail}` : govBase;
    const salary    = job.salary_min ? `${Number(job.salary_min).toLocaleString()} IQD` : 'نرخ گفتوگۆکراو';
    const typeLabel = JOB_TYPE_LABELS[job.job_type] || 'کاتی تەواو';
    const isNew     = isNewJob(job);
    const matched   = jobMatchesUser(job);
    const isBoosted = job.boosted_until && new Date(job.boosted_until) > new Date();
    const avgResponseH = Number(job.company_avg_response_hours) || 0;

    return (
      <div onClick={() => { soundService.playTick?.(); onNavigate?.('job_detail', { jobId: job.id }); }}
        className="flex flex-col h-full bg-white rounded-[28px] border border-stone-100/90 shadow-[0_4px_20px_rgba(20,45,40,0.055)] hover:shadow-[0_18px_40px_rgba(20,45,40,0.12)] hover:-translate-y-1.5 transition-all duration-300 cursor-pointer overflow-hidden group"
        style={isBoosted ? { boxShadow: `0 0 0 2px ${TEAL}, 0 2px 16px rgba(0,0,0,0.05)` } : {}}>
        <div className={`relative shrink-0 ${wide ? 'h-40 sm:h-52' : 'h-32 sm:h-36'}`}>
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

        <div className="p-4 pt-6 flex-1 flex flex-col">
          <h3 className="text-sm font-black leading-6 text-stone-900 line-clamp-2 group-hover:text-stone-600 transition-colors">{title}</h3>
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

          <div className="flex items-center justify-between mt-2 mb-3">
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
            className={`mt-auto w-full py-2.5 rounded-xl text-[11px] font-black transition-all active:scale-95 flex items-center justify-center gap-1.5 ${
              isApplied ? 'bg-emerald-50 text-emerald-700' : 'text-white'
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
    : { padding: 1, background: '#e5e9e7' };

  return (
    <div dir="rtl" className="min-h-screen bg-[#f6f8f7] text-stone-900 font-vazirmatn pb-24 lg:pb-10">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-0">
        <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full blur-3xl opacity-[0.12]" style={{background: TEAL}} />
        <div className="absolute top-[42%] -left-40 w-96 h-96 rounded-full blur-3xl opacity-[0.07]" style={{background: '#76bdb1'}} />
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-3 sm:px-5 lg:px-8">
        {/* Mobile / compact app header */}
        <div className="lg:hidden sticky top-0 z-40 -mx-3 sm:-mx-5 px-3 sm:px-5 py-1.5 bg-white/95 backdrop-blur-xl border-b border-[#e8eeec]"
          style={{ paddingTop: 'calc(0.375rem + env(safe-area-inset-top))', marginTop: 'calc(-1 * env(safe-area-inset-top))' }}>
          <div className="flex items-center gap-3">
            <button onClick={() => onNavigate?.('profile')}
              className="w-11 h-11 rounded-2xl bg-white border border-stone-100 shadow-sm shrink-0 overflow-hidden active:scale-95 transition-transform"
              style={isPaidPlanUser ? {boxShadow: `0 0 0 2px ${planColor?.accent || TEAL}`} : {}}>
              {user?.avatar ? <img src={user.avatar} alt="" className="w-full h-full object-cover" /> :
                <span className="w-full h-full flex items-center justify-center font-black" style={{color: TEAL_DEEP}}>{avatarLetter}</span>}
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold text-stone-400">{getGreeting()}</p>
              <h1 className="text-sm sm:text-base font-black truncate">{greetingName || 'بەکارهێنەر'}</h1>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => onNavigate?.('messages')} className="relative w-10 h-10 rounded-2xl bg-white border border-stone-100 shadow-sm flex items-center justify-center active:scale-95">
                <MessageCircle className="w-[17px] h-[17px] text-stone-500" />
                {unreadMessageCount > 0 && <i className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500" />}
              </button>
              <button onClick={() => onNavigate?.('notifications')} className="relative w-10 h-10 rounded-2xl bg-white border border-stone-100 shadow-sm flex items-center justify-center active:scale-95">
                <Bell className="w-[17px] h-[17px] text-stone-500" />
                {unreadNotifCount > 0 && <i className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500" />}
              </button>
            </div>
          </div>
        </div>

        {/* Hero — deliberately compact, like a consumer app rather than a dashboard */}
        <Reveal>
          <section className="mt-2 relative overflow-hidden rounded-[28px] sm:rounded-[34px] bg-[#0d1c19] shadow-[0_18px_50px_rgba(13,28,25,.14)]">
            <div className="absolute inset-0 opacity-80"
              style={{background: 'radial-gradient(circle at 15% 10%, rgba(67,190,164,.28), transparent 32%), radial-gradient(circle at 90% 100%, rgba(18,121,107,.28), transparent 38%)'}} />
            <div className="absolute inset-0 opacity-[.04]" style={{backgroundImage:'linear-gradient(rgba(255,255,255,.7) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.7) 1px,transparent 1px)',backgroundSize:'28px 28px'}} />
            <div className="relative p-5 sm:p-7 lg:p-9">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-[10px] font-black text-[#b8eee4]">
                  {isEmployer ? <UsersRound className="w-3.5 h-3.5"/> : <Briefcase className="w-3.5 h-3.5"/>}
                  {isEmployer ? 'کارخوازەکان' : 'Job Feed'}
                </div>
                <h2 className="mt-4 text-[29px] sm:text-[38px] lg:text-[46px] leading-[1.12] font-black text-white tracking-tight">
                  {isEmployer ? <>کەسێکی <span style={{color:'#6ee1cc'}}>باش</span> بۆ کارەکەت بدۆزەرەوە.</> :
                    <>کاری <span style={{color:'#6ee1cc'}}>گونجاو</span> بۆ تۆ بدۆزەرەوە.</>}
                </h2>
                <p className="mt-3 text-xs sm:text-sm leading-6 text-white/50 font-bold max-w-xl">
                  {isEmployer ? 'پڕۆفایلی کارخوازەکان بپشکنە، تواناکانیان ببینە و بە خێرایی بانگهێشتیان بکە.' :
                    'گەڕان بکە، هەلی نوێ ببینە و بە خێرایی سیڤییەکەت بنێرە.'}
                </p>
              </div>
              <div className="mt-6 grid grid-cols-3 gap-2 max-w-2xl">
                {[
                  [isEmployer ? filteredFreelancers.length : filteredJobs.length, isEmployer ? 'کارخواز' : 'هەلی کار'],
                  [isEmployer ? freelancers.length : jobs.length, isEmployer ? 'کارخواز هەیە' : 'کۆی کارەکان'],
                  [isEmployer ? newestFreelancers.length : newestJobs.length, 'نوێ'],
                ].map(([value,label]) => (
                  <div key={label} className="rounded-2xl bg-white/[.07] border border-white/10 px-3 py-3">
                    <div className="text-lg sm:text-xl font-black text-white font-mono">{Number(value||0).toLocaleString()}</div>
                    <div className="mt-0.5 text-[9px] sm:text-[10px] text-white/40 font-bold">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </Reveal>

        {/* Main content */}
        {!isEmployer ? (
          <div className="mt-5 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-5 lg:gap-7">
            <div className="min-w-0 space-y-5">
              {/* Search */}
              <Reveal>
                <div className="rounded-[24px] bg-white border border-stone-100 p-2 shadow-[0_8px_30px_rgba(20,45,40,.055)]">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300"/>
                      <input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}
                        placeholder="گەڕان بۆ ناوی کار، کۆمپانیا..."
                        className="w-full h-12 bg-stone-50 rounded-[18px] pr-11 pl-4 outline-none text-sm font-bold placeholder:text-stone-300 focus:bg-white focus:ring-2 focus:ring-[#12796b]/10"/>
                    </div>
                    {hasActiveFilters && <button onClick={()=>{setSelectedCategory('all');setJobTypeFilter('all');setGovFilter('all');setPriceFilter('all');setSearchTerm('');}}
                      className="w-12 h-12 rounded-[18px] bg-stone-100 flex items-center justify-center text-stone-500 active:scale-95">
                      <X className="w-4 h-4"/>
                    </button>}
                  </div>
                </div>
              </Reveal>

              {/* Category rail */}
              <Reveal>
                <HScroll bar={false} className="flex gap-2 -mx-1 px-1 pb-1">
                  {CATEGORIES.map(cat=>{
                    const Icon=CATEGORY_ICONS[cat.id]||Briefcase;
                    const active=selectedCategory===cat.id;
                    return <button key={cat.id} onClick={()=>{soundService.playTick?.();setSelectedCategory(cat.id);}}
                      className={`shrink-0 h-10 px-4 rounded-full flex items-center gap-2 text-xs font-black transition-all active:scale-95 ${active?'text-white shadow-[0_8px_18px_rgba(18,121,107,.18)]':'bg-white border border-stone-100 text-stone-500'}`}
                      style={active?{background:TEAL}: {}}>
                      <Icon className="w-3.5 h-3.5"/>{cat.nameKu}
                    </button>
                  })}
                </HScroll>
              </Reveal>

              {/* Filters */}
              <Reveal>
                <HScroll bar={false} className="flex gap-2 pb-1">
                  {[{value:'all',label:'هەموو' },...Object.entries(JOB_TYPE_LABELS).map(([value,label])=>({value,label}))].map(t=>
                    <button key={t.value} onClick={()=>setJobTypeFilter(t.value)}
                      className={`shrink-0 px-4 py-2.5 rounded-full text-[11px] font-black ${jobTypeFilter===t.value?'text-white':'bg-white border border-stone-100 text-stone-500'}`}
                      style={jobTypeFilter===t.value?{background:TEAL}: {}}>{t.label}</button>
                  )}
                  <DropdownChip label="نرخ" value={priceFilter} options={PRICE_RANGES} onChange={setPriceFilter}/>
                  <DropdownChip label="شار" value={govFilter}
                    options={[{value:'all',label:'هەموو شارەکان'},...Object.entries(GOV_LABELS).map(([value,label])=>({value,label}))]}
                    onChange={setGovFilter}/>
                </HScroll>
              </Reveal>

              {/* Personalized rail */}
              {recommendedLoading ? (
                <div className="rounded-[24px] bg-white p-5 flex items-center gap-3 border border-stone-100">
                  <Loader2 className="w-5 h-5 animate-spin" style={{color:TEAL}}/>
                  <span className="text-xs font-bold text-stone-500">بۆ تۆ دەگەڕێین...</span>
                </div>
              ) : recommended.jobs.length > 0 && (
                <Reveal>
                  <section>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2"><Sparkles className="w-4 h-4" style={{color:TEAL}}/><h2 className="text-sm font-black">پێشنیاری تایبەت بۆ تۆ</h2></div>
                    </div>
                    <HScroll className="flex gap-3 -mx-3 px-3 sm:mx-0 sm:px-0 pb-1">
                      {recommended.jobs.slice(0,6).map(job=>{
                        const company=job.company_name||job.companyName||'کۆمپانیا';
                        const saved=savedJobIds.includes(job.id);
                        return <article key={job.id} onClick={()=>onNavigate?.('job_detail',{jobId:job.id})}
                          className="w-[270px] shrink-0 rounded-[24px] bg-white border border-stone-100 p-4 shadow-[0_5px_22px_rgba(20,45,40,.06)] cursor-pointer active:scale-[.985]">
                          <div className="flex items-start justify-between gap-3">
                            <div className="w-11 h-11 rounded-2xl overflow-hidden bg-stone-100 shrink-0">
                              {job.company_logo?<img src={job.company_logo} alt="" className="w-full h-full object-cover"/>:<div className="w-full h-full flex items-center justify-center font-black text-sm" style={{color:TEAL}}>{company.charAt(0)}</div>}
                            </div>
                            <button onClick={e=>{e.stopPropagation();toggleSaveJob(job.id)}} className="w-9 h-9 rounded-xl bg-stone-50 flex items-center justify-center">
                              <Heart className={`w-4 h-4 ${saved?'fill-rose-500 text-rose-500':'text-stone-300'}`}/>
                            </button>
                          </div>
                          <h3 className="mt-4 font-black text-sm truncate">{job.title_ku||job.title||'هەلی کار'}</h3>
                          <p className="mt-1 text-[11px] text-stone-400 font-bold truncate">{company}</p>
                          <div className="mt-4 flex items-center justify-between">
                            <span className="text-[11px] font-bold text-stone-400">{GOV_LABELS[job.governorate_id]||job.location||'کوردستان'}</span>
                            <span className="font-mono text-xs font-black" style={{color:TEAL_DEEP}}>{Number(job.salary_min||0).toLocaleString()} IQD</span>
                          </div>
                        </article>
                      })}
                    </HScroll>
                  </section>
                </Reveal>
              )}

              {/* Feed */}
              <Reveal>
                <div className="flex items-center justify-between pt-1">
                  <div><h2 className="text-base font-black">هەلی کارەکان</h2><p className="text-[10px] text-stone-400 font-bold mt-1">{filteredJobs.length} هەلی بەردەست</p></div>
                  {user && hasActiveFilters && <button onClick={handleSaveSearch} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-stone-100 text-[10px] font-black text-stone-500"><Bell className="w-3.5 h-3.5" style={{color:TEAL}}/>ئاگادارکردنەوە</button>}
                </div>
              </Reveal>

              {isInitialLoading ? (
                <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(250px,1fr))]">{Array.from({length:6}).map((_,i)=><div key={i} className="h-72 rounded-[24px] bg-white border border-stone-100 animate-pulse"/>)}</div>
              ) : pagedJobs.length===0 ? (
                <div className="rounded-[28px] bg-white border border-stone-100 py-20 text-center">
                  <Briefcase className="w-12 h-12 mx-auto text-stone-200 mb-3"/>
                  <h3 className="font-black text-stone-500">هیچ هەلی کارێک نەدۆزرایەوە</h3>
                  <p className="mt-1 text-xs font-bold text-stone-300">پاڵاوتنەکان بگۆڕە و دووبارە هەوڵ بدەوە</p>
                </div>
              ) : (
                <div className="grid gap-4 grid-flow-dense [grid-template-columns:repeat(auto-fill,minmax(250px,1fr))]">
                  {pagedJobs.map((job,i)=>{
                    const wide = !!(job.boosted_until && new Date(job.boosted_until) > new Date());
                    return (
                      <div key={job.id} style={{animationDelay:`${Math.min(i,8)*35}ms`}} className={`animate-fadeIn min-w-0 ${wide ? 'sm:col-span-2' : ''}`}><JobPhotoCard job={job} wide={wide}/></div>
                    );
                  })}
                </div>
              )}

              {totalPages>1 && <div className="flex justify-center items-center gap-3 pt-2">
                <button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="w-10 h-10 rounded-full bg-white border border-stone-100 disabled:opacity-30"><ChevronRight className="w-4 h-4 mx-auto"/></button>
                <span className="text-xs font-black text-stone-400 font-mono">{page} / {totalPages}</span>
                <button disabled={page===totalPages} onClick={()=>setPage(p=>p+1)} className="w-10 h-10 rounded-full bg-white border border-stone-100 disabled:opacity-30"><ChevronLeft className="w-4 h-4 mx-auto"/></button>
              </div>}
            </div>

            {/* Desktop discovery sidebar */}
            <aside className="hidden lg:block space-y-4">
              <div className="sticky top-24 space-y-4">
                <div className="rounded-[26px] bg-white border border-stone-100 p-5 shadow-[0_8px_30px_rgba(20,45,40,.05)]">
                  <div className="flex items-center gap-2 mb-4"><MapPin className="w-4 h-4" style={{color:TEAL}}/><h3 className="text-sm font-black">گەڕان بەپێی شار</h3></div>
                  <div className="space-y-1.5">
                    {cityStats.slice(0,6).map(c=><button key={c.id} onClick={()=>{setGovFilter(c.id);scrollToResults()}}
                      className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-xs font-bold transition-colors ${govFilter===c.id?'bg-[#e7f4f1]':'hover:bg-stone-50 text-stone-500'}`}>
                      <span>{c.label}</span><span className="font-mono text-[10px] text-stone-400">{c.count}</span>
                    </button>)}
                  </div>
                </div>
                {!isPaidPlanUser && !isEmployer && <PremiumUpgradeBanner onNavigate={onNavigate} planName={userPlanTier?.name_ku||''}/>}
              </div>
            </aside>
          </div>
        ) : (
          /* Employer feed */
          <div className="mt-5 space-y-5">
            <Reveal>
              <div className="rounded-[24px] bg-white border border-stone-100 p-2 shadow-[0_8px_30px_rgba(20,45,40,.05)]">
                <div className="relative">
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300"/>
                  <input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="گەڕان بۆ کارخواز، تواناکان، شار..."
                    className="w-full h-12 bg-stone-50 rounded-[18px] pr-11 pl-4 outline-none text-sm font-bold placeholder:text-stone-300 focus:bg-white"/>
                </div>
              </div>
            </Reveal>

            <Reveal>
              <HScroll bar={false} className="flex gap-2 pb-1">
                {CATEGORIES.map(cat=>{const Icon=CATEGORY_ICONS[cat.id]||Briefcase;const active=selectedCategory===cat.id;return <button key={cat.id} onClick={()=>setSelectedCategory(cat.id)}
                  className={`shrink-0 px-4 py-2.5 rounded-full flex items-center gap-2 text-xs font-black ${active?'text-white':'bg-white border border-stone-100 text-stone-500'}`} style={active?{background:TEAL}:{}}><Icon className="w-3.5 h-3.5"/>{cat.nameKu}</button>})}
                <button onClick={()=>setVerifiedOnly(v=>!v)} className={`shrink-0 px-4 py-2.5 rounded-full text-xs font-black border ${verifiedOnly?'text-white border-transparent':'bg-white border-stone-100 text-stone-500'}`} style={verifiedOnly?{background:TEAL}:{}}><BadgeCheck className="inline w-3.5 h-3.5 ml-1"/>پشتڕاستکراو</button>
              </HScroll>
            </Reveal>

            <Reveal>
              <div className="flex items-end justify-between">
                <div><h2 className="text-base font-black">کارخوازەکان</h2><p className="text-[10px] text-stone-400 font-bold mt-1">{filteredFreelancers.length} پڕۆفایل</p></div>
                <button onClick={()=>onNavigate?.('post-job')} className="px-4 py-2.5 rounded-xl text-[11px] font-black text-white" style={{background:TEAL}}><Briefcase className="inline w-3.5 h-3.5 ml-1"/>بڵاوکردنەوەی کار</button>
              </div>
            </Reveal>

            {filteredFreelancers.length===0 ? (
              <div className="rounded-[28px] bg-white border border-stone-100 py-20 text-center"><Users className="w-12 h-12 mx-auto text-stone-200 mb-3"/><h3 className="font-black text-stone-500">هیچ کارخوازێک نەدۆزرایەوە</h3><p className="text-xs text-stone-300 mt-1">گەڕان یان پاڵاوتنەکان بگۆڕە</p></div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {pagedFreelancers.map((f,i)=><div key={f.id} style={{animationDelay:`${Math.min(i,10)*35}ms`}} className="animate-fadeIn"><FreelancerPhotoCard f={f}/></div>)}
              </div>
            )}
            {totalFreelancerPages>1 && <div className="flex justify-center items-center gap-3 pt-1">
              <button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="w-10 h-10 rounded-full bg-white border border-stone-100 disabled:opacity-30"><ChevronRight className="w-4 h-4 mx-auto"/></button>
              <span className="text-xs font-black text-stone-400 font-mono">{page} / {totalFreelancerPages}</span>
              <button disabled={page===totalFreelancerPages} onClick={()=>setPage(p=>p+1)} className="w-10 h-10 rounded-full bg-white border border-stone-100 disabled:opacity-30"><ChevronLeft className="w-4 h-4 mx-auto"/></button>
            </div>}
          </div>
        )}
      </main>

      {isEmployer && <>
        <FreelancerProfileModal freelancer={selectedFreelancer} isOpen={!!selectedFreelancer} onClose={()=>setSelectedFreelancer(null)} />
        <SendInvitationModal freelancer={inviteTarget} isOpen={!!inviteTarget} onClose={()=>setInviteTarget(null)} />
      </>}
    </div>
  );
};
