import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { JobDetailModal } from './JobDetailModal';
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
  const letter = String(seed || '؟').trim().charAt(0);
  return (
    <div className={`${className} flex items-center justify-center`} style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}>
      <span className="text-white/25 font-black text-5xl select-none">{letter}</span>
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
  const [selectedJob,      setSelectedJob]      = useState(null);
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
        className="bg-white rounded-3xl shadow-[0_2px_16px_rgba(0,0,0,0.05)] hover:shadow-[0_10px_30px_rgba(0,0,0,0.12)] hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden group"
        style={isBoosted ? { boxShadow: `0 0 0 2px ${TEAL}, 0 2px 16px rgba(0,0,0,0.05)` } : {}}>
        <div className="relative h-36 sm:h-40">
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
            className="mt-3 w-full py-2.5 rounded-xl text-[11px] font-black transition-all active:scale-95 flex items-center justify-center gap-1.5 text-white"
            style={{ background: TEAL }}>
            <Send className="w-3.5 h-3.5" />ناردنی داواکاری
          </button>
        </div>
      </div>
    );
  };

  const JobPhotoCard = ({ job }) => {
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
      <div onClick={() => { soundService.playTick?.(); setSelectedJob(job); }}
        className="bg-white rounded-3xl shadow-[0_2px_16px_rgba(0,0,0,0.05)] hover:shadow-[0_10px_30px_rgba(0,0,0,0.12)] hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden group"
        style={isBoosted ? { boxShadow: `0 0 0 2px ${TEAL}, 0 2px 16px rgba(0,0,0,0.05)` } : {}}>
        <div className="relative h-36 sm:h-40">
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

          <div className="flex items-center justify-between mt-3">
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
            onClick={e => { e.stopPropagation(); soundService.playTick?.(); setSelectedJob(job); }}
            disabled={isApplied}
            className={`mt-3 w-full py-2.5 rounded-xl text-[11px] font-black transition-all active:scale-95 flex items-center justify-center gap-1.5 ${
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
    <div dir="rtl" className="min-h-screen font-vazirmatn select-none pb-28" style={{ background: '#f4f7f6' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 space-y-7">

        {/* ── Greeting header — avatar grouped with the name on the right
              (reading-start in RTL), notification bell alone on the left ── */}
        <Reveal>
          <div className="flex items-center justify-between mb-3">
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
                <h1 className="text-2xl font-black text-stone-900 leading-tight">{greetingName || 'بەکارهێنەر'}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => onNavigate?.('messages')}
                className="relative w-11 h-11 rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.06)] flex items-center justify-center text-stone-500 active:scale-95 transition-transform"
              >
                <MessageCircle className="w-4.5 h-4.5" />
                {unreadMessageCount > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500" />
                )}
              </button>
              <button
                onClick={() => onNavigate?.('notifications')}
                className="relative w-11 h-11 rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.06)] flex items-center justify-center text-stone-500 active:scale-95 transition-transform"
              >
                <Bell className="w-4.5 h-4.5" />
                {unreadNotifCount > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500" />
                )}
              </button>
            </div>
          </div>
        </Reveal>

        {!isEmployer && (
        <>
        {/* ── Search block ────────────────────────────────────── */}
        <Reveal className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300" />
              <input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="گەڕان بۆ کار، کۆمپانیا..."
                className="w-full bg-white rounded-2xl pr-11 pl-4 py-3.5 text-sm text-stone-900 font-bold placeholder-stone-300 outline-none shadow-[0_2px_16px_rgba(0,0,0,0.05)] focus:shadow-[0_2px_16px_rgba(0,0,0,0.1)] transition-shadow"
              />
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.05)] flex items-center justify-center shrink-0 active:scale-95 transition-transform cursor-pointer">
              <SlidersHorizontal className="w-4 h-4 text-stone-400" />
            </div>
          </div>

          {/* Job-type pills — real values against job.job_type */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {[{ value: 'all', label: 'هەموو' }, ...Object.entries(JOB_TYPE_LABELS).map(([value, label]) => ({ value, label }))].map(t => (
              <button key={t.value}
                onClick={() => { soundService.playTick?.(); setJobTypeFilter(t.value); }}
                className={`px-4 py-2 rounded-full text-xs font-bold shrink-0 transition-all active:scale-95 ${
                  jobTypeFilter === t.value ? 'text-white' : 'bg-white text-stone-500 shadow-[0_2px_16px_rgba(0,0,0,0.05)] hover:text-stone-800'
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
                    onClick={() => setSelectedJob(job)}
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
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold shrink-0 transition-all active:scale-95 ${
                  active ? 'text-white' : 'bg-white text-stone-500 shadow-[0_2px_16px_rgba(0,0,0,0.05)] hover:text-stone-800'
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
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300" />
              <input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="گەڕان بۆ کارخواز، پیشە..."
                className="w-full bg-white rounded-2xl pr-11 pl-4 py-3.5 text-sm text-stone-900 font-bold placeholder-stone-300 outline-none shadow-[0_2px_16px_rgba(0,0,0,0.05)] focus:shadow-[0_2px_16px_rgba(0,0,0,0.1)] transition-shadow"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => { soundService.playTick?.(); setVerifiedOnly(v => !v); }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold shrink-0 transition-all active:scale-95 ${
                verifiedOnly ? 'text-white' : 'bg-white text-stone-500 shadow-[0_2px_16px_rgba(0,0,0,0.05)] hover:text-stone-800'
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

        {/* ── Newest freelancers — real created_at order ─────────────────── */}
        {newestFreelancers.length > 0 && (
          <Reveal className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-stone-900">نوێترین کارخوازان</h2>
              <span className="text-xs font-bold" style={{ color: TEAL }}>هەموو</span>
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

        {/* ── Category chips ──────────────────────────────────── */}
        <Reveal className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map(cat => {
            const Icon = CATEGORY_ICONS[cat.id] || Briefcase;
            const active = selectedCategory === cat.id;
            return (
              <button key={cat.id}
                onClick={() => { soundService.playTick?.(); setSelectedCategory(cat.id); }}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold shrink-0 transition-all active:scale-95 ${
                  active ? 'text-white' : 'bg-white text-stone-500 shadow-[0_2px_16px_rgba(0,0,0,0.05)] hover:text-stone-800'
                }`}
                style={active ? { background: TEAL } : {}}>
                <Icon className="w-3.5 h-3.5" style={{ color: active ? '#fff' : '#a8a29e' }} strokeWidth={2.25} />
                {cat.nameKu}
              </button>
            );
          })}
        </Reveal>

        {/* ── Freelancers header ──────────────────────────────────────── */}
        <div ref={jobsSectionRef} className="flex items-center justify-between scroll-mt-24">
          <h2 className="text-sm font-black text-stone-900">کارخوازە چالاکەکان</h2>
          <span className="text-xs font-mono font-black text-stone-400">{filteredFreelancers.length} ئەنجام</span>
        </div>

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
        ) : filteredFreelancers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-3xl shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
            <Users className="w-12 h-12 text-stone-200 mb-3" />
            <h3 className="text-base font-black text-stone-400 mb-1">هیچ کارخوازێک نەدۆزرایەوە</h3>
            <p className="text-xs text-stone-300">پاڵاوتنەکان بگۆڕە یان وشەیەکی تر بەکاربهێنە</p>
          </div>
        ) : (
          <>
            <div key={`${page}-${selectedCategory}-${govFilter}-${verifiedOnly}-${searchTerm}`}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {pagedFreelancers.map((f, i) => (
                <div key={f.id} style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }} className="animate-fadeIn">
                  <FreelancerPhotoCard f={f} />
                </div>
              ))}
            </div>

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
        </>
        )}

      </div>

      {/* ── Detail modals ─────────────────────────────────── */}
      {!isEmployer && selectedJob && (
        <JobDetailModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onNavigate={onNavigate}
        />
      )}
      {isEmployer && (
        <>
          <FreelancerProfileModal freelancer={selectedFreelancer} isOpen={!!selectedFreelancer} onClose={() => setSelectedFreelancer(null)} />
          <SendInvitationModal freelancer={inviteTarget} isOpen={!!inviteTarget} onClose={() => setInviteTarget(null)} />
        </>
      )}
    </div>
  );
};
