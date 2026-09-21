import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { useAuth } from '../../context/AuthContext';
import { SendInvitationModal } from './SendInvitationModal';
import { FreelancerProfileModal } from '../freelancer/FreelancerProfileModal';
import { CompanyProfilePage } from './CompanyProfilePage';
import { PlanBadge } from '../ui/PlanBadge';
import { soundService } from '../../services/soundService';
import { FreelancerTierCard, tierInfo, sortByTier } from '../freelancer/FreelancerTierCard';
import {
  Search, MapPin, Star, ShieldCheck, Sparkles, Send, CheckCircle2,
  BadgeCheck, Building2, Briefcase, PlusCircle, Users, Check,
} from 'lucide-react';

const NK = "'Noto Kufi Arabic', 'Vazirmatn', system-ui, sans-serif";
const TEAL = '#641bd9';

const GOVERNORATES = ['all', 'سلێمانی', 'هەولێر', 'دهۆک', 'کەرکووک', 'هەڵەبجە'];
const SKILLS = ['all', 'React', 'Node.js', 'Figma', 'UI/UX', 'AutoCAD', 'Python', 'Tailwind'];
const CATEGORY_CHIPS = ['all', 'تەکنەلۆژیا', 'بیناسازی', 'پزیشکی', 'فرۆشتن'];

function parseSkills(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw || '[]'); } catch { return []; }
  }
  return [];
}

export const DirectoryPage = ({ initialMode = 'companies', onSelectJob, onNavigate }) => {
  const { user, openAuthModal } = useAuth();
  const { freelancers = [], jobs = [], categories = [], companies: realCompanies = [], planTiers = [] } = useStore();

  const [mode, setMode] = useState(initialMode);
  useEffect(() => setMode(initialMode), [initialMode]);

  const [searchTerm, setSearchTerm] = useState('');
  const [govFilter, setGovFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [inviteTarget, setInviteTarget] = useState(null);
  const [profileTarget, setProfileTarget] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);

  const switchMode = (next) => {
    if (next === mode) return;
    soundService.playTick?.();
    setSearchTerm('');
    setGovFilter('all');
    setCategoryFilter('all');
    setMode(next);
    onNavigate ? onNavigate(next) : null;
  };

  // ---- Freelancers List ----
  const filteredFreelancers = useMemo(() => {
    const list = Array.isArray(freelancers) ? freelancers : [];
    // Pro / VIP profiles get the premium cards and come first (boosted, then VIP, then Pro).
    return sortByTier(list.filter((f) => {
      if (govFilter !== 'all' && f.governorate !== govFilter) return false;
      if (categoryFilter !== 'all') {
        const skills = parseSkills(f.skills);
        if (!skills.some((s) => s.toLowerCase().includes(categoryFilter.toLowerCase()))) return false;
      }
      if (verifiedOnly && !f.verified) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const hit = (f.name || '').toLowerCase().includes(q)
          || (f.title || f.profession || f.bio || '').toLowerCase().includes(q)
          || (f.governorate || '').toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    }), planTiers);
  }, [freelancers, searchTerm, govFilter, categoryFilter, verifiedOnly, planTiers]);

  // ---- Companies List (real account data from GET /companies, matched by
  // company_id — jobs are only used to group/count, never as the source of
  // truth for the company's own logo/cover/bio/industry anymore) ----
  const companyList = useMemo(() => {
    const map = {};
    (Array.isArray(jobs) ? jobs : []).forEach((job) => {
      const name = job.companyName || job.company_name;
      if (!name) return;
      if (!map[name]) {
        const compId = job.company_id || job.employer_id || job.user_id;
        const real = realCompanies.find(c => String(c.id) === String(compId));
        map[name] = {
          id: compId,
          name,
          logo: real?.company_logo || job.companyLogo || job.company_logo,
          cover: real?.company_cover || job.company_cover || '',
          phone: job.company_phone || '',
          email: job.company_email || '',
          governorate: real?.governorate || job.governorate_id || 'sulaymaniyah',
          governorateName: job.governorateName || job.governorate_name || (job.governorate_id === 'erbil' ? 'هەولێر' : (job.governorate_id === 'duhok' ? 'دهۆک' : (job.governorate_id === 'kirkuk' ? 'کەرکووک' : 'سلێمانی'))),
          // Prefer the real account's own industry; only fall back to
          // resolving the job's category (never the raw id — see git log
          // for the earlier "cat_media_1" leak) when the real record isn't
          // loaded yet or the account never set one.
          industry: real?.industry || categories.find(c => c.id === job.category)?.name_ku || '',
          description: real?.bio || job.company_description || '',
          regNumber: real?.company_reg || '',
          member_since: real?.created_at || null,
          verified: Boolean(real ? Number(real.verified) === 1 : (Number(job.company_verified) === 1 || job.verified)),
          jobs: [],
        };
      }
      map[name].jobs.push(job);
    });
    return Object.values(map);
  }, [jobs]);

  // The open company profile lives in the URL (?company=NAME), like SearchPage's
  // does — so going to a job page and pressing Back lands on the same company
  // profile, and Back from a profile closes it instead of leaving the section.
  const openCompany = (c) => {
    setSelectedCompany(c);
    try { window.history.pushState({ tabId: 'companies', appNav: true, companyView: true }, '', `/companies?company=${encodeURIComponent(c.name)}`); } catch (e) { }
  };
  const closeCompany = () => {
    if (window.history.state?.companyView) { window.history.back(); return; } // the popstate sync below clears it
    setSelectedCompany(null);
    try { window.history.replaceState(window.history.state, '', '/companies'); } catch (e) { }
  };
  useEffect(() => {
    const sync = () => {
      const name = new URLSearchParams(window.location.search).get('company');
      if (!name) { setSelectedCompany(null); return; }
      const found = companyList.find(c => c.name.toLowerCase() === name.toLowerCase());
      if (found) setSelectedCompany(prev => (prev?.name === found.name ? prev : found));
    };
    sync();
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, [companyList]);

  const filteredCompanies = useMemo(() => {
    return companyList.filter((c) => {
      if (govFilter !== 'all' && c.governorateName !== govFilter && c.governorate !== govFilter) return false;
      if (categoryFilter !== 'all' && !c.industry?.includes(categoryFilter)) return false;
      if (verifiedOnly && !c.verified) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const hit = c.name.toLowerCase().includes(q) || c.industry?.toLowerCase().includes(q) || c.governorateName?.toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [companyList, searchTerm, govFilter, categoryFilter, verifiedOnly]);

  const isFreelancers = mode === 'freelancers';
  const resultCount = isFreelancers ? filteredFreelancers.length : filteredCompanies.length;

  if (selectedCompany) {
    return (
      <CompanyProfilePage
        company={{ ...selectedCompany, governorate: selectedCompany.governorateName || 'سلێمانی' }}
        jobs={jobs}
        onNavigate={onNavigate}
        onBack={closeCompany}
      />
    );
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen pb-28 select-none font-vazirmatn"
      style={{ background: '#f5f4f7', fontFamily: NK }}
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 pt-6 space-y-6">

        {/* ── 1. Page Title & Count Header ── */}
        <div className="text-center space-y-1 pt-2">
          <h1 className="text-2xl sm:text-3xl font-black text-[#16111d] tracking-tight">
            {isFreelancers ? 'ڕێنمای کارخوازان' : 'ڕێنمای کۆمپانیاکان'}
          </h1>
          <p className="text-xs text-[#7b8e88] font-bold">
            {resultCount} {isFreelancers ? 'کارخواز لە پێنج پارێزگا' : 'کۆمپانیا لە پێنج پارێزگا'}
          </p>
        </div>

        {/* ── 2. Filter Bar with Toggle & Chips ── */}
        <div className="bg-white rounded-3xl p-3 border border-[#eae8ee] shadow-[0_2px_14px_rgba(0,0,0,0.03)] flex flex-wrap items-center justify-between gap-3">
          
          {/* Right: Search Input */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9faea9] pointer-events-none" />
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={isFreelancers ? 'گەڕان بۆ کارخواز، پیشە...' : 'گەڕان بۆ کۆمپانیا...'}
              className="w-full bg-[#f5f4f7] rounded-2xl pr-10 pl-4 py-2 text-xs font-bold text-[#16111d] placeholder-[#9faea9] outline-none border border-[#eae8ee] focus:bg-white focus:border-[#641bd9] transition-all"
              style={{ fontFamily: NK }}
            />
          </div>

          {/* Center: Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
            {/* All Governorates Pill */}
            <button
              onClick={() => { soundService.playTick?.(); setGovFilter('all'); }}
              className={`px-4 py-2 rounded-2xl text-xs font-black transition-all ${
                govFilter === 'all'
                  ? 'bg-[#16111d] text-white shadow-xs'
                  : 'bg-[#f5f4f7] text-[#5a6b65] hover:text-[#16111d]'
              }`}
            >
              هەموو پارێزگاکان
            </button>

            {/* Category Filter Chips */}
            {['تەکنەلۆژیا', 'بیناسازی', 'پزیشکی'].map(cat => (
              <button
                key={cat}
                onClick={() => {
                  soundService.playTick?.();
                  setCategoryFilter(prev => prev === cat ? 'all' : cat);
                }}
                className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all border ${
                  categoryFilter === cat
                    ? 'bg-[#641bd9] text-white border-[#641bd9]'
                    : 'bg-white border-[#eae8ee] text-[#5a6b65] hover:text-[#16111d]'
                }`}
              >
                {cat}
              </button>
            ))}

            {/* Verified Only Chip */}
            <button
              onClick={() => {
                soundService.playTick?.();
                setVerifiedOnly(v => !v);
              }}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                verifiedOnly
                  ? 'bg-[#e1d3f8] border-[#cfbded] text-[#641bd9] font-black'
                  : 'bg-white border-[#eae8ee] text-[#5a6b65] hover:text-[#16111d]'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${verifiedOnly ? 'bg-[#641bd9]' : 'bg-[#a0afa9]'}`} />
              تەنها پشتڕاستکراوەکان
            </button>
          </div>

          {/* Left: Mode Toggle Pill */}
          <div className="p-1 rounded-2xl bg-[#f5f4f7] border border-[#eae8ee] flex items-center gap-1 shrink-0">
            <button
              onClick={() => switchMode('companies')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                !isFreelancers
                  ? 'bg-white text-[#16111d] shadow-xs'
                  : 'text-[#62736e] hover:text-[#16111d]'
              }`}
            >
              کۆمپانیاکان
            </button>
            <button
              onClick={() => switchMode('freelancers')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                isFreelancers
                  ? 'bg-white text-[#16111d] shadow-xs'
                  : 'text-[#62736e] hover:text-[#16111d]'
              }`}
            >
              کارخوازان
            </button>
          </div>

        </div>

        {/* ── 3. Grid of 4-Column Cards ── */}
        {!isFreelancers ? (
          filteredCompanies.length === 0 ? (
            <div className="bg-white rounded-3xl p-16 text-center space-y-2 border border-[#eae8ee]">
              <Building2 className="w-10 h-10 text-[#a0afa9] mx-auto" />
              <h3 className="text-base font-black text-[#16111d]">هیچ کۆمپانیایەک نەدۆزرایەوە</h3>
              <p className="text-xs text-[#7b8e88] font-medium">پاڵاوتنەکان بگۆڕە یان ناوی تر بنووسە.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredCompanies.map((c, i) => {
                const initial = (c.name || 'ک').trim().charAt(0);
                const isFeatured = i === 0;

                return (
                  <div
                    key={c.name}
                    onClick={() => { soundService.playTick?.(); openCompany(c); }}
                    className={`bg-white rounded-[24px] border overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-lg flex flex-col justify-between cursor-pointer group ${
                      isFeatured
                        ? 'border-[#cfbded] shadow-[0_4px_20px_rgba(100,27,217,0.08)]'
                        : 'border-[#eae8ee] shadow-[0_2px_12px_rgba(0,0,0,0.03)]'
                    }`}
                  >
                    {/* Top Decorative Ribbon */}
                    <div
                      className="h-20 w-full relative flex items-center justify-center"
                      style={{
                        background: isFeatured
                          ? 'linear-gradient(135deg, #d1c1eb 0%, #e8dff6 100%)'
                          : 'linear-gradient(135deg, #f2f0f4 0%, #f8f7fa 100%)',
                      }}
                    >
                      {/* Avatar Centered in Ribbon */}
                      <div className="absolute -bottom-5 w-12 h-12 rounded-2xl bg-white border border-[#eae8ee] shadow-md flex items-center justify-center text-base font-black text-[#16111d] overflow-hidden group-hover:scale-105 transition-transform">
                        {c.logo ? (
                          <img src={c.logo} alt={c.name} className="w-full h-full object-cover" />
                        ) : (
                          <span>{initial}</span>
                        )}
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-4 pt-7 text-center space-y-1.5 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-center gap-1.5">
                          <h3 className="text-sm font-black text-[#16111d] truncate">
                            {c.name}
                          </h3>
                          {c.verified && (
                            <span className="w-3.5 h-3.5 rounded-full bg-[#641bd9] text-white text-[9px] flex items-center justify-center font-bold" title="پشتڕاستکراو">
                              ✓
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#7b8e88] font-bold mt-0.5 truncate">
                          {c.industry} · {c.governorateName}
                        </p>
                      </div>

                      {/* Active Jobs Bottom Row */}
                      <div className="pt-3 border-t border-[#f5f4f7] flex items-center justify-between text-xs">
                        <span className="text-[#62736e] font-bold">کاری چالاک</span>
                        <span className="font-mono font-black text-[#16111d]">
                          {c.jobs.length}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          filteredFreelancers.length === 0 ? (
            <div className="bg-white rounded-3xl p-16 text-center space-y-2 border border-[#eae8ee]">
              <Users className="w-10 h-10 text-[#a0afa9] mx-auto" />
              <h3 className="text-base font-black text-[#16111d]">هیچ کارخوازێک نەدۆزرایەوە</h3>
              <p className="text-xs text-[#7b8e88] font-medium">پاڵاوتنەکان بگۆڕە یان ناوی تر بنووسە.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredFreelancers.map((f, i) => {
                const t = tierInfo(f, planTiers);
                return (
                  <FreelancerTierCard
                    key={f.id || i}
                    f={f}
                    tier={t.tier}
                    isVip={t.isVip}
                    onOpen={(x) => { soundService.playTick?.(); setProfileTarget(x); }}
                    onInvite={(x) => { soundService.playTick?.(); setInviteTarget(x); }}
                  />
                );
              })}
            </div>
          )
        )}

      </div>

      {/* Modals */}
      <SendInvitationModal freelancer={inviteTarget} isOpen={!!inviteTarget} onClose={() => setInviteTarget(null)} />
      <FreelancerProfileModal freelancer={profileTarget} isOpen={!!profileTarget} onClose={() => setProfileTarget(null)} />
    </div>
  );
};
