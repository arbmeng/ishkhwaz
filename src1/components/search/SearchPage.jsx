import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../../context/StoreContext';
import { soundService } from '../../services/soundService';
import {
  Search, Building2, Briefcase, MapPin, BadgeCheck,
  Users, Crosshair, Loader2, X, FolderSearch,
  Bookmark, BookmarkCheck, SlidersHorizontal, Crown, CheckCircle2,
} from 'lucide-react';
import { CompanyProfilePage } from '../company/CompanyProfilePage';
import { FreelancerProfileModal } from '../freelancer/FreelancerProfileModal';
import { JobDetailModal } from '../freelancer/JobDetailModal';
import { Monogram } from '../ui/Monogram';
import { getPlanColor, getContrastColor } from '../../utils/planPresets';

// Brand teal — matches the logo mark and the rest of the light screens
// (LoginPage, JobFeed, BottomNavbar).
const TEAL = '#12796b';
const TEAL_DEEP = '#0d5c50';
const TEAL_SOFT = '#e7f4f1';

const DEFAULT_ACCENT = '#1c1c1c';

const cardTheme = (tier) => {
  const accent = tier && Number(tier.price) > 0 ? getPlanColor(tier.color).accent : DEFAULT_ACCENT;
  const onAccent = getContrastColor(accent === DEFAULT_ACCENT ? '#101314' : accent);
  return { accent, onAccent };
};

const parseSkillsList = (val) => {
  if (Array.isArray(val)) return val;
  try { const p = JSON.parse(val || '[]'); return Array.isArray(p) ? p : []; } catch { return []; }
};

// The one real governorate slug set — matches job.governorate_id and
// user.governorate exactly as the backend stores them (PostJobPage's GOVS,
// registration, everywhere). Any other id here would silently match nothing.
const GOV_LABELS = {
  sulaymaniyah: 'سلێمانی', erbil: 'هەولێر', duhok: 'دهۆک',
  kirkuk: 'کەرکووک', halabja: 'هەڵەبجە',
};
const GOV_IDS = Object.keys(GOV_LABELS);

// Real governorate-capital coordinates, for genuine GPS-based nearest-match —
// same anchors used on the map page, so "detect my location" here and there
// agree with each other.
const GOV_CENTERS = {
  sulaymaniyah: { lat: 35.5565, lng: 45.4370 },
  erbil:        { lat: 36.1911, lng: 44.0091 },
  duhok:        { lat: 36.8679, lng: 42.9880 },
  kirkuk:       { lat: 35.4681, lng: 44.3922 },
  halabja:      { lat: 35.1778, lng: 45.9861 },
};

const formatSalary = (job) => {
  const min = Number(job.salary_min) || 0;
  const max = Number(job.salary_max) || 0;
  if (!min && !max) return 'وەک گفتوگۆ';
  if (min && max && min !== max) return `${min.toLocaleString()}–${max.toLocaleString()} IQD`;
  return `${(max || min).toLocaleString()} IQD`;
};


export const SearchPage = ({ initialTab = 'companies' }) => {
  const { jobs = [], freelancers = [], categories: liveCategories = [], planTiers = [], addToast, savedJobIds = [], toggleSaveJob } = useStore();
  const safeJobs = Array.isArray(jobs) ? jobs : [];
  const liveFreelancersList = Array.isArray(freelancers) ? freelancers : [];

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedGovernorate, setSelectedGovernorate] = useState('all');
  const [activeTab, setActiveTab] = useState(initialTab); // 'companies', 'jobs', 'freelancers'
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [initialJobId, setInitialJobId] = useState(null);
  const [viewingFreelancerProfile, setViewingFreelancerProfile] = useState(null);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  // Keep the URL in sync with the active tab (/search/company, /search/jobs,
  // /search/freelancers) so each tab is a real, shareable, bookmarkable,
  // back-button-aware link — without going through App.jsx's top-level
  // tab router, since we're staying on the same page underneath.
  useEffect(() => {
    const slug = activeTab === 'companies' ? 'company' : activeTab;
    const path = `/search/${slug}`;
    if (window.location.pathname !== path) {
      try { window.history.pushState({ tabId: 'search', sub: slug }, '', path); } catch (e) { }
    }
  }, [activeTab]);

  // Back/forward between the three tabs — App.jsx's own popstate handler
  // only knows about top-level tabs, so within /search this page reads the
  // new sub-path itself and switches without a full remount. Also handles
  // a 4th segment (a freelancer id) so the browser back button correctly
  // closes a deep-linked freelancer profile instead of leaving the app.
  useEffect(() => {
    const handlePopState = () => {
      const parts = window.location.pathname.split('/');
      const sub = parts[2] || '';
      const freelancerId = parts[3] || null;
      if (sub === 'jobs') setActiveTab('jobs');
      else if (sub === 'freelancers') setActiveTab('freelancers');
      else if (sub === 'company') setActiveTab('companies');

      openedProfileViaPushRef.current = false;
      if (sub === 'freelancers' && freelancerId) {
        const f = liveFreelancersList.find(x => String(x.id) === freelancerId);
        if (f) setViewingFreelancerProfile(f);
      } else {
        setViewingFreelancerProfile(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [liveFreelancersList]);

  // A freelancer profile opened from a direct/shared link
  // (/search/freelancers/:id) rather than an in-app click — resolved once
  // the freelancers list has actually loaded (it's fetched async).
  const [pendingFreelancerId, setPendingFreelancerId] = useState(() => {
    const parts = window.location.pathname.split('/');
    return parts[2] === 'freelancers' && parts[3] ? parts[3] : null;
  });
  useEffect(() => {
    if (!pendingFreelancerId) return;
    const f = liveFreelancersList.find(x => String(x.id) === pendingFreelancerId);
    if (f) {
      setViewingFreelancerProfile(f);
      setPendingFreelancerId(null);
    }
  }, [pendingFreelancerId, liveFreelancersList]);

  // A bad/dead shared link shouldn't spin forever — fall through to the
  // normal search page if nothing resolves in a reasonable time.
  useEffect(() => {
    if (!pendingFreelancerId) return;
    const timer = setTimeout(() => setPendingFreelancerId(null), 8000);
    return () => clearTimeout(timer);
  }, [pendingFreelancerId]);

  // True while the currently-open profile was pushed by an in-app click (so
  // closing it should go back to whatever was on screen before), false when
  // it was the very first thing loaded (a shared link) — closing then should
  // just replace the URL rather than navigating away from the app entirely.
  const openedProfileViaPushRef = useRef(false);

  const handleOpenFreelancerProfile = (free) => {
    soundService.playTick();
    setViewingFreelancerProfile(free);
    openedProfileViaPushRef.current = true;
    const path = `/search/freelancers/${free.id}`;
    if (window.location.pathname !== path) {
      try { window.history.pushState({ tabId: 'search', sub: 'freelancers', freelancerId: free.id }, '', path); } catch (e) { }
    }
  };

  const handleCloseFreelancerProfile = () => {
    setViewingFreelancerProfile(null);
    if (openedProfileViaPushRef.current) {
      openedProfileViaPushRef.current = false;
      try { window.history.back(); } catch (e) { }
    } else {
      const slug = activeTab === 'companies' ? 'company' : activeTab;
      const path = `/search/${slug}`;
      try { window.history.pushState({ tabId: 'search', sub: slug }, '', path); } catch (e) { }
    }
  };

  const categories = [
    { id: 'all', name: 'گشت (All)' },
    ...liveCategories.map(c => ({ id: c.id, name: `${c.icon || ''} ${c.name_ku}`.trim() })),
  ];

  // Real GPS → nearest real governorate. No hardcoded destination, no ignored
  // geocode result — whatever governorate you're actually closest to wins.
  const handleLiveDetectLocation = () => {
    soundService.playTick();
    if (!('geolocation' in navigator)) {
      addToast?.({ title: 'GPS بەردەست نییە', message: 'وێبگەڕەکەت داواکاری شوێن پشتگیری ناکات.', type: 'error' });
      return;
    }
    setIsDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        let nearestId = GOV_IDS[0], minDist = Infinity;
        for (const id of GOV_IDS) {
          const c = GOV_CENTERS[id];
          const d = Math.hypot(latitude - c.lat, longitude - c.lng);
          if (d < minDist) { minDist = d; nearestId = id; }
        }
        setSelectedGovernorate(nearestId);
        setIsDetectingLocation(false);
        soundService.playSuccess?.();
        addToast?.({ title: '📍 شوێنەکەت دۆزرایەوە', message: `فلتەرکرا بۆ: ${GOV_LABELS[nearestId]}`, type: 'success' });
      },
      () => {
        setIsDetectingLocation(false);
        addToast?.({ title: 'نەدۆزرایەوە', message: 'ڕێگە بدە بە دەستگاتیشتنی GPS و دووبارە هەوڵبدەرەوە.', type: 'warning' });
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  // Group active jobs by company — real governorate id, no fabricated stock photos.
  const activeCompaniesMap = {};
  safeJobs.forEach(job => {
    if (!job) return;
    const compName = job.company_name || job.companyName || job.company;
    if (!compName) return;

    if (!activeCompaniesMap[compName]) {
      activeCompaniesMap[compName] = {
        name: compName,
        logo: job.company_logo || job.companyLogo || '',
        cover: job.company_cover || '',
        governorateId: job.governorate_id || 'sulaymaniyah',
        industry: job.company_industry || job.category || '',
        phone: job.company_phone || '',
        email: job.company_email || '',
        regNumber: job.company_reg || '',
        jobs: []
      };
    }
    activeCompaniesMap[compName].jobs.push(job);
  });

  const allCompanies = Object.values(activeCompaniesMap);

  // READ URL SEARCH PARAMS ON MOUNT (e.g. /search?company=NAME&job=JOB_ID)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const companyQuery = params.get('company');
      const jobQuery = params.get('job');

      if (companyQuery) {
        const targetComp = allCompanies.find(c => c.name.toLowerCase() === companyQuery.toLowerCase()) || {
          name: companyQuery,
          logo: '',
          cover: '',
          governorateId: 'sulaymaniyah',
          industry: 'کۆمپانیا و بازرگانی'
        };
        setSelectedCompany(targetComp);
        window.scrollTo({ top: 0 });

        if (jobQuery) {
          setInitialJobId(jobQuery);
        }
      }
    }
  }, []);

  const handleSelectCompany = (comp) => {
    soundService.playTick();
    setSelectedCompany(comp);
    window.scrollTo({ top: 0 });
    setInitialJobId(null);

    if (typeof window !== 'undefined') {
      const compUrl = `/search?company=${encodeURIComponent(comp.name)}`;
      window.history.pushState({ company: comp.name }, '', compUrl);
    }
  };

  const handleBackToSearch = () => {
    soundService.playTick();
    setSelectedCompany(null);
    setInitialJobId(null);

    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/search');
    }
  };

  const clearAllFilters = () => {
    soundService.playTick();
    setSearchTerm('');
    setSelectedCategory('all');
    setSelectedGovernorate('all');
  };

  const hasActiveFilters = !!searchTerm || selectedCategory !== 'all' || selectedGovernorate !== 'all';

  // Filter Companies — governorate compared as the real slug, not a display name
  const filteredCompanies = allCompanies.filter(comp => {
    const q = searchTerm.trim().toLowerCase();
    const govLabel = GOV_LABELS[comp.governorateId] || '';
    const matchesSearch = !q || comp.name.toLowerCase().includes(q) || govLabel.includes(searchTerm.trim());
    const matchesCat = selectedCategory === 'all' || comp.jobs.some(j => j.category === selectedCategory);
    const matchesGov = selectedGovernorate === 'all' || comp.governorateId === selectedGovernorate;
    return matchesSearch && matchesCat && matchesGov;
  });

  // Filter Jobs — real fields only (governorate_id, location_detail/location_name)
  const filteredJobs = safeJobs.filter(job => {
    if (!job) return false;
    const q = searchTerm.trim().toLowerCase();
    const title = job.title_ku || job.title || '';
    const comp = job.company_name || job.companyName || '';
    const govLabel = GOV_LABELS[job.governorate_id] || '';
    const locText = job.location_detail || job.location_name || '';
    const matchesSearch = !q ||
      title.toLowerCase().includes(q) || comp.toLowerCase().includes(q) ||
      govLabel.includes(searchTerm.trim()) || locText.toLowerCase().includes(q);
    const matchesCat = selectedCategory === 'all' || job.category === selectedCategory;
    const matchesGov = selectedGovernorate === 'all' || job.governorate_id === selectedGovernorate;
    return matchesSearch && matchesCat && matchesGov;
  });

  // Filter Freelancers — real fields only (name, bio, governorate). The
  // job-seekers tab is a paid-plan showcase: only Pro/VIP profiles (any tier
  // with a real price) are listed here — free-plan users still exist and
  // work normally everywhere else in the app, they just aren't surfaced in
  // this directory.
  const isBoostedNow = (f) => !!(f.plan_boost_until && new Date(f.plan_boost_until) > new Date());
  const tierPriceOf = (f) => Number(planTiers.find(t => t.id === f.plan)?.price) || 0;

  const filteredFreelancers = liveFreelancersList.filter(f => {
    const tier = planTiers.find(t => t.id === f.plan);
    if (!tier || Number(tier.price) <= 0) return false;
    const q = searchTerm.trim().toLowerCase();
    const name = f.name || '';
    const bio = f.bio || '';
    const govLabel = GOV_LABELS[f.governorate] || '';
    const matchesSearch = !q ||
      name.toLowerCase().includes(q) || bio.toLowerCase().includes(q) || govLabel.includes(searchTerm.trim());
    const matchesGov = selectedGovernorate === 'all' || f.governorate === selectedGovernorate;
    return matchesSearch && matchesGov;
  }).sort((a, b) => {
    // Boosted profiles first — that's the whole point of paying to boost.
    // Within the same boosted-ness, higher-tier (VIP over Pro) still wins,
    // so a boosted VIP always outranks a boosted Pro, and an unboosted VIP
    // still outranks an unboosted Pro.
    const boostDiff = (isBoostedNow(b) ? 1 : 0) - (isBoostedNow(a) ? 1 : 0);
    if (boostDiff !== 0) return boostDiff;
    return tierPriceOf(b) - tierPriceOf(a);
  });

  // Whichever paid tier costs the most is treated as "VIP" for the special
  // fire card treatment below — derived from real price data instead of a
  // hardcoded tier id, so it stays correct if the admin ever renames/re-adds
  // plans in the Zera console.
  const paidTiers = planTiers.filter(t => Number(t.price) > 0);
  const vipTierId = paidTiers.length
    ? paidTiers.reduce((top, t) => (Number(t.price) > Number(top.price) ? t : top)).id
    : null;

  // If a company card is clicked or loaded via URL, render the FULL COMPANY PROFILE PAGE
  if (selectedCompany) {
    return (
      <CompanyProfilePage
        company={{ ...selectedCompany, cover: selectedCompany.cover || '', governorate: GOV_LABELS[selectedCompany.governorateId] || 'سلێمانی' }}
        jobs={safeJobs}
        initialJobId={initialJobId}
        onBack={handleBackToSearch}
      />
    );
  }

  // A shared freelancer link should feel full-screen from the very first
  // paint — show a plain loading state instead of flashing the search page
  // (and its bottom nav) underneath while the freelancers list is still
  // being fetched.
  if (pendingFreelancerId && !viewingFreelancerProfile) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ background: '#f4f7f6' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: TEAL }} />
      </div>
    );
  }

  const tabs = [
    { id: 'companies', label: 'کۆمپانیاکان', Icon: Building2, count: filteredCompanies.length },
    { id: 'jobs',       label: 'کارەکان',     Icon: Briefcase, count: filteredJobs.length },
    { id: 'freelancers',label: 'کارخوازان',   Icon: Users,     count: filteredFreelancers.length },
  ];

  const govChips = [{ id: 'all', label: 'هەموو' }, ...GOV_IDS.map(id => ({ id, label: GOV_LABELS[id] }))];
  const resultCount = activeTab === 'companies' ? filteredCompanies.length : activeTab === 'jobs' ? filteredJobs.length : filteredFreelancers.length;

  const filtersActive = selectedGovernorate !== 'all' || selectedCategory !== 'all';

  return (
    <div dir="rtl" className="min-h-screen font-vazirmatn select-none pb-8" style={{ background: '#f4f7f6' }}>
      <style>{`
        .ishk-sheet-backdrop { animation: ishkFade .2s ease both; }
        .ishk-sheet { animation: ishkSheetUp .28s cubic-bezier(.22,1,.36,1) both; }
        @keyframes ishkFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes ishkSheetUp { from { opacity: 0; transform: translateY(36px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 space-y-4">

        {/* ── Search input + filter button ─────────────────────── */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300 pointer-events-none" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="گەڕان بەپێی ناوی کۆمپانیا، ناوی کار، فریلانسەر..."
              className="w-full bg-white rounded-2xl pr-11 pl-9 py-3.5 text-sm text-stone-900 font-bold placeholder-stone-300 outline-none border border-transparent shadow-[0_2px_16px_rgba(0,0,0,0.05)] focus:border-[#12796b] focus:ring-4 focus:ring-[#12796b]/10 focus:shadow-[0_2px_16px_rgba(0,0,0,0.08)] transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-stone-100 flex items-center justify-center active:scale-90 transition-transform"
                aria-label="سڕینەوەی گەڕان"
              >
                <X className="w-3 h-3 text-stone-500" />
              </button>
            )}
          </div>

          <button
            onClick={() => { soundService.playTick(); setFilterOpen(true); }}
            className="relative w-12 h-12 rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.05)] flex items-center justify-center shrink-0 active:scale-95 transition-transform"
            aria-label="فلتەرەکان"
          >
            <SlidersHorizontal className="w-4 h-4 text-stone-400" />
            {filtersActive && (
              <span className="absolute top-1.5 left-1.5 w-2.5 h-2.5 rounded-full border-2 border-[#f4f7f6]" style={{ background: TEAL }} />
            )}
          </button>
        </div>

        {/* ── Segmented pill tabs — Companies / Jobs / Freelancers ── */}
        <div className="flex items-center gap-1 bg-stone-100 rounded-full p-1">
          {tabs.map(t => {
            const on = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => { soundService.playTick(); setActiveTab(t.id); }}
                className={`flex-1 text-center px-3 py-2.5 rounded-full text-xs font-black whitespace-nowrap transition-all ${
                  on ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* ── My-location quick action + result count ─────────────── */}
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-stone-400 font-bold font-mono">
            {resultCount} ئەنجام{selectedGovernorate !== 'all' ? ` · ${GOV_LABELS[selectedGovernorate]}` : ''}
          </span>
          <button
            onClick={handleLiveDetectLocation}
            disabled={isDetectingLocation}
            className="flex items-center gap-1.5 text-xs font-bold active:scale-95 transition-transform disabled:opacity-60"
            style={{ color: TEAL }}
          >
            {isDetectingLocation ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Crosshair className="w-3.5 h-3.5" />}
            شوێنی من
          </button>
        </div>

        {/* ── Results ──────────────────────────────────────────── */}
        <div key={activeTab} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 pt-1">

          {/* TAB 1: COMPANIES */}
          {activeTab === 'companies' && (
            filteredCompanies.length === 0 ? (
              <EmptyState hasActiveFilters={hasActiveFilters} onClear={clearAllFilters} tab={0} />
            ) : filteredCompanies.map((comp, i) => {
              const jobCategories = [...new Set(comp.jobs.map(j => j.category).filter(Boolean))].slice(0, 3);
              const catLabels = jobCategories.map(id => categories.find(c => c.id === id)?.name || id);
              return (
                <ResultRow
                  key={comp.name}
                  delay={i}
                  photoSrc={comp.logo}
                  photoSeed={comp.name}
                  name={comp.name}
                  badges={[]}
                  verified
                  location={GOV_LABELS[comp.governorateId] || 'کوردستان'}
                  description={`${comp.jobs.length} هەلی کار بەردەستە`}
                  tags={catLabels}
                  onClick={() => handleSelectCompany(comp)}
                />
              );
            })
          )}

          {/* TAB 2: JOBS */}
          {activeTab === 'jobs' && (
            filteredJobs.length === 0 ? (
              <EmptyState hasActiveFilters={hasActiveFilters} onClear={clearAllFilters} tab={1} />
            ) : filteredJobs.map((job, i) => {
              const compName = job.company_name || job.companyName || 'کۆمپانیا';
              const compLogo = allCompanies.find(c => c.name.toLowerCase() === compName.toLowerCase())?.logo || '';
              const jobSkills = (Array.isArray(job.requiredSkills) ? job.requiredSkills : parseSkillsList(job.required_skills)).slice(0, 4);
              const saved = savedJobIds.includes(job.id);
              return (
                <ResultRow
                  key={job.id}
                  delay={i}
                  photoSrc={compLogo}
                  photoSeed={compName}
                  name={job.title_ku || job.title}
                  badges={[]}
                  location={GOV_LABELS[job.governorate_id] || 'کوردستان'}
                  description={`${compName} · ${formatSalary(job)}`}
                  tags={jobSkills}
                  secondaryLabel={saved ? 'خەزنکراوە' : 'پاشەکەوت'}
                  secondaryIcon={saved ? BookmarkCheck : Bookmark}
                  secondaryActive={saved}
                  onSecondary={() => { soundService.playTick(); toggleSaveJob?.(job.id); }}
                  onClick={() => { soundService.playTick(); setSelectedJob(job); }}
                />
              );
            })
          )}

          {/* TAB 3: FREELANCERS */}
          {activeTab === 'freelancers' && (
            filteredFreelancers.length === 0 ? (
              <EmptyState hasActiveFilters={hasActiveFilters} onClear={clearAllFilters} tab={2} />
            ) : filteredFreelancers.map((free, i) => {
              const skillsList = parseSkillsList(free.skills).slice(0, 4);
              const isBoosted = free.plan_boost_until && new Date(free.plan_boost_until) > new Date();
              const isVerified = Number(free.verified) === 1;
              const tier = planTiers.find(t => t.id === free.plan);
              const isVip = !!tier && tier.id === vipTierId;
              const theme = cardTheme(tier);
              const badges = [];
              // VIP already gets its own crown badge below — a second
              // plain plan-name badge would just repeat it.
              if (tier && !isVip) badges.push({ label: `پلانی ${tier.name_ku}`, bg: '#101314', fg: '#fff' });
              if (isBoosted) badges.push({ label: 'بەرزکراوە', bg: '#eafae0', fg: '#2e7a11' });
              return (
                <ResultRow
                  key={free.id}
                  accent={theme.accent}
                  fire={isVip}
                  delay={i}
                  photoSrc={free.avatar}
                  photoSeed={free.name}
                  name={free.name}
                  verified={isVerified}
                  badges={badges}
                  location={GOV_LABELS[free.governorate] || free.governorate || 'کوردستان'}
                  description={free.title || free.bio || ''}
                  tags={skillsList}
                  onClick={() => handleOpenFreelancerProfile(free)}
                />
              );
            })
          )}
        </div>
      </div>

      {/* ── Filter bottom sheet — portaled to document.body so it's fixed
          to the viewport, not to any transformed/animated ancestor. ────── */}
      {filterOpen && createPortal(
        <div className="ishk-sheet-backdrop fixed inset-0 z-50 flex items-end justify-center" onClick={() => setFilterOpen(false)}>
          <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="ishk-sheet relative w-full max-w-xl bg-white rounded-t-[28px] flex flex-col gap-5 p-5 max-h-[92vh] overflow-y-auto"
            style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
          >
            <div className="w-10 h-1.5 rounded-full bg-stone-200 mx-auto -mt-1 shrink-0" />

            <div className="flex items-center justify-between">
              <span className="text-base font-black text-stone-900">فلتەرەکان</span>
              {hasActiveFilters ? (
                <button onClick={clearAllFilters} className="text-xs font-bold active:opacity-70" style={{ color: TEAL }}>
                  سڕینەوه
                </button>
              ) : <span />}
            </div>

            {/* بوار (category) */}
            <div className="flex flex-col gap-2 min-w-0">
              <span className="text-xs font-bold text-stone-400">بوار</span>
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => {
                  const on = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => { soundService.playTick(); setSelectedCategory(cat.id); }}
                      className={`px-4 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all active:scale-95 ${
                        on ? 'text-white' : 'bg-stone-50 text-stone-500 hover:bg-stone-100'
                      }`}
                      style={on ? { background: TEAL } : {}}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* شوێن (governorate + locate-me) */}
            <div className="flex flex-col gap-2 min-w-0">
              <span className="text-xs font-bold text-stone-400">شوێن</span>

              <button
                onClick={handleLiveDetectLocation}
                disabled={isDetectingLocation}
                className="flex items-center gap-3 p-3 rounded-2xl bg-stone-50 text-right active:scale-[0.99] transition-transform disabled:opacity-70"
              >
                <span className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-white" style={{ background: TEAL }}>
                  {isDetectingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                </span>
                <span className="flex-1 min-w-0 flex flex-col">
                  <span className="text-sm font-black text-stone-900">شوێنی من</span>
                  <span className="text-[11px] font-bold text-stone-400 truncate">
                    {isDetectingLocation
                      ? 'پشکنینی GPS...'
                      : selectedGovernorate !== 'all'
                        ? `${GOV_LABELS[selectedGovernorate]} — دیاریکراوە`
                        : 'کرتە بکە بۆ دۆزینەوەی نزیکترین پارێزگا'}
                  </span>
                </span>
                <Crosshair className="w-4 h-4 text-stone-300 shrink-0" />
              </button>

              <div className="flex flex-wrap gap-2">
                {govChips.map(g => {
                  const on = selectedGovernorate === g.id;
                  return (
                    <button
                      key={g.id}
                      onClick={() => { soundService.playTick(); setSelectedGovernorate(g.id); }}
                      className={`px-4 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all active:scale-95 ${
                        on ? 'text-white' : 'bg-stone-50 text-stone-500 hover:bg-stone-100'
                      }`}
                      style={on ? { background: TEAL } : {}}
                    >
                      {g.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => setFilterOpen(false)}
              className="w-full py-3.5 rounded-2xl text-white font-black text-sm active:scale-[0.98] transition-transform"
              style={{ background: TEAL }}
            >
              نیشاندانی {resultCount} ئەنجام
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* FREELANCER PUBLIC PROFILE & WORK REQUEST MODAL */}
      <FreelancerProfileModal
        freelancer={viewingFreelancerProfile}
        isOpen={!!viewingFreelancerProfile}
        onClose={handleCloseFreelancerProfile}
      />

      {selectedJob && (
        <JobDetailModal job={selectedJob} isOpen={!!selectedJob} onClose={() => setSelectedJob(null)} />
      )}
    </div>
  );
};

// One result row — same shape for companies, jobs and freelancers: a white
// (or, for a VIP freelancer, soft-mint) rounded card with the name/badges on
// the reading-start side, a role/location meta line, skill-tag pills, and a
// circular avatar sitting at the card's far edge.
const ResultRow = ({
  photoSrc, photoSeed, name, verified, badges = [],
  location, description, tags = [], fire = false,
  secondaryLabel, secondaryIcon: SecondaryIcon, secondaryActive, onSecondary,
  onClick, delay = 0,
}) => {
  const badge = badges[0];
  const metaParts = [description, location].filter(Boolean);
  return (
    <div
      onClick={onClick}
      style={{
        animationDelay: `${Math.min(delay, 8) * 40}ms`,
        ...(fire ? { background: TEAL_SOFT, border: `1px solid ${TEAL}55` } : {}),
      }}
      className={`animate-fadeIn flex gap-3 p-4 rounded-3xl cursor-pointer transition-all duration-300 hover:-translate-y-0.5 ${
        fire ? '' : 'bg-white shadow-[0_2px_16px_rgba(0,0,0,0.05)] hover:shadow-[0_10px_28px_rgba(0,0,0,0.1)]'
      }`}
    >
      <div className="w-12 h-12 shrink-0 rounded-full overflow-hidden" style={{ boxShadow: fire ? `0 0 0 2px ${TEAL}` : '0 0 0 1px #eeeeee' }}>
        {photoSrc ? <img src={photoSrc} alt="" className="w-full h-full object-cover" /> : <Monogram name={photoSeed} className="w-full h-full" />}
      </div>

      <div className="min-w-0 flex-1 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex flex-wrap items-center gap-1.5">
            {fire && (
              <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black text-white" style={{ background: TEAL }}>
                <Crown className="w-3 h-3" />VIP
              </span>
            )}
            <span className="text-[15px] font-black text-stone-900 truncate">{name}</span>
            {verified && <BadgeCheck className="w-3.5 h-3.5 shrink-0" style={{ color: TEAL }} />}
            {badge && (
              <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-500">{badge.label}</span>
            )}
          </div>

          {secondaryLabel && (
            <button
              onClick={(e) => { e.stopPropagation(); onSecondary?.(); }}
              className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
              style={secondaryActive ? { background: TEAL_SOFT } : { background: '#fafaf9' }}
              aria-label={secondaryLabel}
            >
              {SecondaryIcon && <SecondaryIcon className="w-3.5 h-3.5" style={{ color: secondaryActive ? TEAL_DEEP : '#a8a29e' }} />}
            </button>
          )}
        </div>

        {metaParts.length > 0 && (
          <p className="text-xs text-stone-400 font-bold truncate m-0">{metaParts.join(' · ')}</p>
        )}

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {tags.slice(0, 4).map((t, i) => (
              <span key={i} className="px-3 py-1 rounded-full text-[11px] font-bold text-stone-500 bg-white border border-stone-200">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const EMPTY_TEXT = [
  'هیچ کۆمپانیایەک بەم گەڕان و فلتەرانە نەدۆزرایەوە.',
  'هیچ ئەنجامێک بەم گەڕان و فلتەرانە نەدۆزرایەوە.',
  'هیچ ئەنجامێک بەم گەڕان و فلتەرانە نەدۆزرایەوە.',
];

const EmptyState = ({ hasActiveFilters, onClear, tab = 1 }) => (
  <div className="col-span-full flex flex-col items-center justify-center gap-3 text-center bg-white rounded-3xl shadow-[0_2px_16px_rgba(0,0,0,0.05)] py-16 px-6">
    <div className="w-12 h-12 rounded-2xl bg-stone-50 flex items-center justify-center">
      <FolderSearch className="w-5 h-5 text-stone-300" />
    </div>
    <p className="text-sm font-black text-stone-900 max-w-[34ch] m-0">{EMPTY_TEXT[tab]}</p>
    <p className="text-xs text-stone-400 m-0">فلتەرەکان کەم بکەرەوە یان پارێزگایەکی تر تاقی بکەرەوە.</p>
    {hasActiveFilters && (
      <button
        onClick={onClear}
        className="mt-1 px-5 py-2.5 rounded-2xl bg-stone-50 text-stone-900 text-xs font-bold active:scale-95 transition-transform"
      >
        سڕینەوەی فلتەرەکان
      </button>
    )}
  </div>
);
