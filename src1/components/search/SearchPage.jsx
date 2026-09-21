import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../../context/StoreContext';
import { getAppPath } from '../../utils/appPath';
import { soundService } from '../../services/soundService';
import { Search, Building2, Briefcase, MapPin, BadgeCheck, Users, Crosshair, Loader2, X, FolderSearch, Bookmark, BookmarkCheck, SlidersHorizontal, Crown, CheckCircle2, ArrowUpRight, Sparkles, RotateCcw, ChevronDown } from 'lucide-react';
import { CompanyProfilePage } from '../company/CompanyProfilePage';
import { FreelancerProfileModal } from '../freelancer/FreelancerProfileModal';
import { Monogram } from '../ui/Monogram';
import { getPlanColor, getContrastColor } from '../../utils/planPresets';
import { useAuth } from '../../context/AuthContext';

const TEAL = '#12796b';
const TEAL_DEEP = '#0d5c50';
const TEAL_SOFT = '#e7f4f1';
const DEFAULT_ACCENT = '#1c1c1c';

const GOV_LABELS = { sulaymaniyah: 'سلێمانی', erbil: 'هەولێر', duhok: 'دهۆک', kirkuk: 'کەرکووک', halabja: 'هەڵەبجە' };
const GOV_IDS = Object.keys(GOV_LABELS);
const GOV_CENTERS = {
  sulaymaniyah: { lat: 35.5565, lng: 45.4370 }, erbil: { lat: 36.1911, lng: 44.0091 }, duhok: { lat: 36.8679, lng: 42.9880 },
  kirkuk: { lat: 35.4681, lng: 44.3922 }, halabja: { lat: 35.1778, lng: 45.9861 }
};

const parseSkillsList = (v) => {
  if (Array.isArray(v)) return v;
  try { const x = JSON.parse(v || '[]'); return Array.isArray(x) ? x : []; } catch { return []; }
};
const formatSalary = (job) => {
  const min = Number(job.salary_min) || 0, max = Number(job.salary_max) || 0;
  if (!min && !max) return 'وەک گفتوگۆ';
  if (min && max && min !== max) return `${min.toLocaleString()}–${max.toLocaleString()} IQD`;
  return `${(max || min).toLocaleString()} IQD`;
};
const cardTheme = (tier) => {
  const accent = tier && Number(tier.price) > 0 ? getPlanColor(tier.color).accent : DEFAULT_ACCENT;
  return { accent, onAccent: getContrastColor(accent === DEFAULT_ACCENT ? '#101314' : accent) };
};

export const SearchPage = ({ initialTab = 'companies', onNavigate }) => {
  const { jobs = [], freelancers = [], categories: liveCategories = [], companies = [], planTiers = [], addToast, savedJobIds = [], toggleSaveJob } = useStore();
  const { user } = useAuth();
  const isEmployer = user?.role === 'employer';
  const safeJobs = Array.isArray(jobs) ? jobs : [];
  const liveFreelancers = Array.isArray(freelancers) ? freelancers : [];
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedGovernorate, setSelectedGovernorate] = useState('all');
  const [activeTab, setActiveTab] = useState(() => isEmployer ? 'freelancers' : initialTab);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [initialJobId, setInitialJobId] = useState(null);
  const [viewingFreelancerProfile, setViewingFreelancerProfile] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [mobileTabOpen, setMobileTabOpen] = useState(false);
  const openedProfileViaPushRef = useRef(false);
  const [initialSearchParams] = useState(() => typeof window !== 'undefined' ? window.location.search : '');

  const categories = useMemo(() => [{ id: 'all', name: 'هەموو بوارەکان' }, ...liveCategories.map(c => ({ id: c.id, name: `${c.icon || ''} ${c.name_ku}`.trim() }))], [liveCategories]);
  const allCompanies = useMemo(() => {
    const map = {};
    safeJobs.forEach(job => {
      if (!job) return;
      const name = job.company_name || job.companyName || job.company; if (!name) return;
      if (!map[name]) {
        const id = job.company_id || job.employer_id || job.user_id;
        const real = companies.find(c => String(c.id) === String(id));
        map[name] = { id, name, logo: real?.company_logo || job.company_logo || job.companyLogo || '', cover: real?.company_cover || job.company_cover || '', social_links: real?.social_links || null, governorateId: real?.governorate || job.governorate_id || 'sulaymaniyah', industry: real?.industry || liveCategories.find(c => c.id === job.category)?.name_ku || '', description: real?.bio || '', phone: job.company_phone || '', email: job.company_email || '', regNumber: real?.company_reg || job.company_reg || '', member_since: real?.created_at || null, verified: Boolean(real ? Number(real.verified) === 1 : job.company_verified), jobs: [] };
      }
      map[name].jobs.push(job);
    });
    return Object.values(map);
  }, [safeJobs, companies, liveCategories]);

  useEffect(() => { if (isEmployer && activeTab !== 'freelancers') setActiveTab('freelancers'); }, [isEmployer, activeTab]);
  useEffect(() => { const slug = activeTab === 'companies' ? 'company' : activeTab; const path = `/search/${slug}`; if (getAppPath() !== path) { try { window.history.pushState({ tabId: 'search', sub: slug }, '', path) } catch { } } }, [activeTab]);
  useEffect(() => {
    const params = new URLSearchParams(initialSearchParams), cq = params.get('company'), jq = params.get('job');
    if (cq) { setSelectedCompany(allCompanies.find(c => c.name.toLowerCase() === cq.toLowerCase()) || { name: cq, logo: '', cover: '', governorateId: 'sulaymaniyah', industry: 'کۆمپانیا و بازرگانی' }); if (jq) setInitialJobId(jq); }
  }, [initialSearchParams, allCompanies]);
  useEffect(() => {
    const onPop = () => {
      const parts = getAppPath().split('/'), sub = parts[2] || '', fid = parts[3] || null;
      if (sub === 'jobs') setActiveTab('jobs'); else if (sub === 'freelancers') setActiveTab('freelancers'); else setActiveTab('companies');
      if (sub === 'freelancers' && fid) { const f = liveFreelancers.find(x => String(x.id) === fid); if (f) setViewingFreelancerProfile(f) } else setViewingFreelancerProfile(null);
      const cq = new URLSearchParams(window.location.search).get('company');
      if (cq) setSelectedCompany(allCompanies.find(c => c.name.toLowerCase() === cq.toLowerCase()) || { name: cq, logo: '', cover: '', governorateId: 'sulaymaniyah' }); else setSelectedCompany(null);
    };
    window.addEventListener('popstate', onPop); return () => window.removeEventListener('popstate', onPop);
  }, [liveFreelancers, allCompanies]);

  const handleLocation = () => {
    soundService.playTick();
    if (!navigator.geolocation) { addToast?.({ title: 'GPS بەردەست نییە', message: 'وێبگەڕەکەت پشتگیری ناکات.', type: 'error' }); return; }
    setIsDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(pos => {
      let nearest = GOV_IDS[0], min = Infinity; GOV_IDS.forEach(id => { const c = GOV_CENTERS[id], d = Math.hypot(pos.coords.latitude - c.lat, pos.coords.longitude - c.lng); if (d < min) { min = d; nearest = id } });
      setSelectedGovernorate(nearest); setIsDetectingLocation(false); soundService.playSuccess?.(); addToast?.({ title: '📍 شوێنەکەت دۆزرایەوە', message: `فلتەرکرا بۆ: ${GOV_LABELS[nearest]}`, type: 'success' });
    }, () => { setIsDetectingLocation(false); addToast?.({ title: 'نەدۆزرایەوە', message: 'ڕێگە بدە بە GPS و دووبارە هەوڵ بدەرەوە.', type: 'warning' }) }, { enableHighAccuracy: true, timeout: 15000 });
  };
  const q = searchTerm.trim().toLowerCase();
  const filteredCompanies = allCompanies.filter(c => (!q || c.name.toLowerCase().includes(q) || (GOV_LABELS[c.governorateId] || '').includes(searchTerm.trim())) && (selectedCategory === 'all' || c.jobs.some(j => j.category === selectedCategory)) && (selectedGovernorate === 'all' || c.governorateId === selectedGovernorate));
  const filteredJobs = safeJobs.filter(j => { if (!j) return false; const title = j.title_ku || j.title || '', comp = j.company_name || j.companyName || '', gov = GOV_LABELS[j.governorate_id] || '', loc = j.location_detail || j.location_name || ''; return (!q || title.toLowerCase().includes(q) || comp.toLowerCase().includes(q) || gov.includes(searchTerm.trim()) || loc.toLowerCase().includes(q)) && (selectedCategory === 'all' || j.category === selectedCategory) && (selectedGovernorate === 'all' || j.governorate_id === selectedGovernorate) });
  const isBoosted = f => !!(f.plan_boost_until && new Date(f.plan_boost_until) > new Date());
  const tierPrice = f => Number(planTiers.find(t => t.id === f.plan)?.price) || 0;
  const paidTiers = planTiers.filter(t => Number(t.price) > 0), vipTierId = paidTiers.length ? paidTiers.reduce((a, b) => Number(b.price) > Number(a.price) ? b : a).id : null;
  const filteredFreelancers = liveFreelancers.filter(f => { const tier = planTiers.find(t => t.id === f.plan); if (!tier || Number(tier.price) <= 0) return false; const name = f.name || '', bio = f.bio || '', gov = GOV_LABELS[f.governorate] || ''; return (!q || name.toLowerCase().includes(q) || bio.toLowerCase().includes(q) || gov.includes(searchTerm.trim())) && (selectedGovernorate === 'all' || f.governorate === selectedGovernorate) }).sort((a, b) => { const bd = (isBoosted(b) ? 1 : 0) - (isBoosted(a) ? 1 : 0); return bd || tierPrice(b) - tierPrice(a) });
  const resultCount = activeTab === 'companies' ? filteredCompanies.length : activeTab === 'jobs' ? filteredJobs.length : filteredFreelancers.length;
  const filtersActive = selectedGovernorate !== 'all' || selectedCategory !== 'all';
  const clearFilters = () => { soundService.playTick(); setSearchTerm(''); setSelectedCategory('all'); setSelectedGovernorate('all') };
  const openFreelancer = f => { soundService.playTick(); setViewingFreelancerProfile(f); openedProfileViaPushRef.current = true; try { window.history.pushState({ tabId: 'search', sub: 'freelancers', freelancerId: f.id }, '', `/search/freelancers/${f.id}`) } catch { } };
  const closeFreelancer = () => { setViewingFreelancerProfile(null); if (openedProfileViaPushRef.current) { openedProfileViaPushRef.current = false; try { window.history.back() } catch { } } else { try { window.history.pushState({}, '', `/search/${activeTab === 'companies' ? 'company' : activeTab}`) } catch { } } };
  const openCompany = c => { soundService.playTick(); setSelectedCompany(c); setInitialJobId(null); try { window.history.pushState({ company: c.name }, '', `/search?company=${encodeURIComponent(c.name)}`) } catch { } window.scrollTo({ top: 0 }) };
  const tabs = [{ id: 'companies', label: 'کۆمپانیاکان', Icon: Building2, count: filteredCompanies.length }, { id: 'jobs', label: 'هەلی کار', Icon: Briefcase, count: filteredJobs.length }, { id: 'freelancers', label: 'کارخوازان', Icon: Users, count: filteredFreelancers.length }];
  if (selectedCompany) return <CompanyProfilePage company={{ ...selectedCompany, cover: selectedCompany.cover || '', governorate: GOV_LABELS[selectedCompany.governorateId] || 'سلێمانی' }} jobs={safeJobs} initialJobId={initialJobId} onNavigate={onNavigate} onBack={() => { setSelectedCompany(null); try { window.history.pushState({}, '', `/search/${activeTab === 'companies' ? 'company' : activeTab}`) } catch { } }} />;

  return <div dir="rtl" className="ksp-page font-vazirmatn min-h-screen select-none" style={{ background: '#f5f8f7' }}>
    <style>{CSS}</style>
    <section className="ksp-hero"><div className="ksp-hero-in">
        <div className="ksp-orb ksp-orb-a" /><div className="ksp-orb ksp-orb-b" />
        <div className="ksp-hero-top"><div><div className="ksp-eyebrow"><Sparkles /> گەڕانی زیرەک</div><h1>دۆزینەوەی دەرفەت و تواناکان</h1><p>کۆمپانیا، هەلی کار و کارخوازە گونجاوەکان بە خێرایی بدۆزەرەوە.</p></div><div className="ksp-result-bubble"><strong>{resultCount.toLocaleString()}</strong><span>ئەنجام</span></div></div>
        <div className="ksp-search-row"><div className="ksp-searchbox"><Search /><input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder={isEmployer ? 'گەڕان بە ناو، شارەزایی یان بوار...' : 'گەڕان بە ناوی کۆمپانیا، کار یان کارخواز...'} />{searchTerm && <button onClick={() => setSearchTerm('')}><X /></button>}</div><button className={`ksp-filter-trigger ${filtersActive ? 'is-active' : ''}`} onClick={() => setFilterOpen(true)}><SlidersHorizontal /><span>فلتەر</span>{filtersActive && <b>{(selectedCategory !== 'all' ? 1 : 0) + (selectedGovernorate !== 'all' ? 1 : 0)}</b>}</button></div>
        {!isEmployer && <div className="ksp-tabs">{tabs.map(t => { const on = activeTab === t.id; return <button key={t.id} onClick={() => { soundService.playTick(); setActiveTab(t.id) }} className={on ? 'active' : ''}><t.Icon /><span>{t.label}</span><em>{t.count}</em></button> })}</div>}
        {isEmployer && <div className="ksp-employer-tab"><Users /> <span>کارخوازان</span><em>{filteredFreelancers.length}</em></div>}
    </div></section>

    <main className="ksp-shell">
      <div className="ksp-toolbar"><div><span className="ksp-muted">نیشاندانی</span> <strong>{resultCount}</strong> <span className="ksp-muted">ئەنجام</span>{selectedGovernorate !== 'all' && <span className="ksp-location-pill"><MapPin />{GOV_LABELS[selectedGovernorate]}</span>}</div><div className="ksp-toolbar-actions"><button onClick={handleLocation} disabled={isDetectingLocation}>{isDetectingLocation ? <Loader2 className="spin" /> : <Crosshair />}شوێنی من</button>{filtersActive && <button onClick={clearFilters}><RotateCcw /> پاککردنەوە</button>}</div></div>

      <section className="ksp-grid">
        {activeTab === 'companies' && (filteredCompanies.length ? filteredCompanies.map((c, i) => <ResultCard key={c.name} delay={i} photoSrc={c.logo} photoSeed={c.name} name={c.name} verified={c.verified} location={GOV_LABELS[c.governorateId] || 'کوردستان'} description={`${c.jobs.length} هەلی کار بەردەستە`} tags={[...new Set(c.jobs.map(j => j.category).filter(Boolean))].slice(0, 3).map(id => categories.find(x => x.id === id)?.name || id)} onClick={() => openCompany(c)} kind="company" />) : <EmptyState active={filtersActive || !!searchTerm} clear={clearFilters} tab={0} />)}
        {activeTab === 'jobs' && (filteredJobs.length ? filteredJobs.map((j, i) => { const name = j.company_name || j.companyName || 'کۆمپانیا'; const logo = allCompanies.find(c => c.name.toLowerCase() === name.toLowerCase())?.logo || ''; const saved = savedJobIds.includes(j.id); return <ResultCard key={j.id} delay={i} photoSrc={logo} photoSeed={name} name={j.title_ku || j.title} location={GOV_LABELS[j.governorate_id] || 'کوردستان'} description={`${name} · ${formatSalary(j)}`} tags={(Array.isArray(j.requiredSkills) ? j.requiredSkills : parseSkillsList(j.required_skills)).slice(0, 4)} saved={saved} onSave={() => { soundService.playTick(); toggleSaveJob?.(j.id) }} onClick={() => { soundService.playTick(); onNavigate?.('job_detail', { jobId: j.id }) }} kind="job" /> }) : <EmptyState active={filtersActive || !!searchTerm} clear={clearFilters} tab={1} />)}
        {activeTab === 'freelancers' && (filteredFreelancers.length ? filteredFreelancers.map((f, i) => { const tier = planTiers.find(t => t.id === f.plan), vip = tier?.id === vipTierId, boost = isBoosted(f), theme = cardTheme(tier); return <ResultCard key={f.id} delay={i} photoSrc={f.avatar} photoSeed={f.name} name={f.name} verified={Number(f.verified) === 1} location={GOV_LABELS[f.governorate] || f.governorate || 'کوردستان'} description={f.title || f.bio || 'کارخواز'} tags={parseSkillsList(f.skills).slice(0, 4)} vip={vip} boost={boost} accent={theme.accent} onClick={() => openFreelancer(f)} kind="freelancer" /> }) : <EmptyState active={filtersActive || !!searchTerm} clear={clearFilters} tab={2} />)}
      </section>
    </main>

    {filterOpen && createPortal(<FilterSheet categories={categories} selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} selectedGovernorate={selectedGovernorate} setSelectedGovernorate={setSelectedGovernorate} govIds={GOV_IDS} govLabels={GOV_LABELS} handleLocation={handleLocation} isDetectingLocation={isDetectingLocation} resultCount={resultCount} active={filtersActive} clear={clearFilters} close={() => setFilterOpen(false)} />, document.body)}
    <FreelancerProfileModal freelancer={viewingFreelancerProfile} isOpen={!!viewingFreelancerProfile} onClose={closeFreelancer} />
  </div>;
};

const ResultCard = ({ photoSrc, photoSeed, name, verified, location, description, tags = [], saved, onSave, onClick, vip, boost, accent = TEAL, delay = 0, kind }) => <article className={`ksp-card ${vip ? 'vip' : ''}`} style={{ animationDelay: `${Math.min(delay, 8) * 35}ms`, ...(vip ? { borderColor: `${accent}55` } : {}) }} onClick={onClick}>
  {vip && <div className="ksp-vip-glow" style={{ background: `${accent}08` }} />}
  <div className="ksp-card-head"><div className="ksp-avatar" style={vip ? { boxShadow: `0 0 0 2px ${accent}30` } : {}}>{photoSrc ? <img src={photoSrc} alt="" /> : <Monogram name={photoSeed} className="w-full h-full" />}</div><div className="ksp-card-title"><div className="ksp-name">{vip && <span className="ksp-vip-badge" style={{ background: accent }}><Crown />VIP</span>}<span>{name}</span>{verified && <BadgeCheck style={{ color: TEAL }} />}</div><div className="ksp-meta">{kind === 'job' ? <Briefcase /> : <MapPin />}<span>{description}</span><i /> <span>{location}</span></div></div>{kind === 'job' && <button className={`ksp-save ${saved ? 'saved' : ''}`} onClick={e => { e.stopPropagation(); onSave?.() }}>{saved ? <BookmarkCheck /> : <Bookmark />}</button>}</div>
  <p className="ksp-desc">{description}</p><div className="ksp-tags">{tags.slice(0, 4).map((t, i) => <span key={i}>{t}</span>)}{boost && <span className="boost">بەرزکراوە</span>}</div>
  <div className="ksp-card-foot"><span>{kind === 'company' ? 'بینینی کۆمپانیا' : kind === 'job' ? 'بینینی هەلی کار' : 'بینینی پڕۆفایل'}</span><ArrowUpRight /></div>
</article>;

const FilterSheet = ({ categories, selectedCategory, setSelectedCategory, selectedGovernorate, setSelectedGovernorate, govIds, govLabels, handleLocation, isDetectingLocation, resultCount, active, clear, close }) => <div className="ksp-filter-backdrop" onClick={close}><div className="ksp-filter" onClick={e => e.stopPropagation()}>
  <div className="ksp-filter-handle" /><div className="ksp-filter-head"><div><small>گەڕان</small><h2>فلتەرەکان</h2></div>{active && <button onClick={clear}>پاککردنەوە</button>}</div>
  <FilterGroup title="بوار" subtitle="جۆری کار و پیشەی دڵخوازت هەڵبژێرە"><div className="ksp-chip-grid">{categories.map(c => <button key={c.id} className={selectedCategory === c.id ? 'active' : ''} onClick={() => { soundService.playTick(); setSelectedCategory(c.id) }}>{c.name}</button>)}</div></FilterGroup>
  <FilterGroup title="شوێن" subtitle="پارێزگا یان نزیکترین شوێن دیاری بکە"><button className="ksp-gps" onClick={handleLocation} disabled={isDetectingLocation}><span>{isDetectingLocation ? <Loader2 className="spin" /> : <Crosshair />}</span><div><strong>شوێنی من</strong><small>{selectedGovernorate !== 'all' ? `${govLabels[selectedGovernorate]} دیاریکراوە` : 'نزیکترین پارێزگا بە GPS بدۆزەرەوە'}</small></div><ChevronDown /></button><div className="ksp-chip-grid">{[{ id: 'all', label: 'هەموو' }, ...govIds.map(id => ({ id, label: govLabels[id] }))].map(g => <button key={g.id} className={selectedGovernorate === g.id ? 'active' : ''} onClick={() => setSelectedGovernorate(g.id)}>{g.label}</button>)}</div></FilterGroup>
  <div className="ksp-filter-summary"><div><span>ئەنجامی ئێستا</span><strong>{resultCount}</strong></div><button onClick={close}>نیشاندانەوەی ئەنجامەکان</button></div>
</div></div>;
const FilterGroup = ({ title, subtitle, children }) => <div className="ksp-filter-group"><div className="ksp-filter-label"><strong>{title}</strong><span>{subtitle}</span></div>{children}</div>;
const EmptyState = ({ active, clear, tab }) => <div className="ksp-empty"><div className="ksp-empty-icon"><FolderSearch /></div><h3>{tab === 0 ? 'هیچ کۆمپانیایەک نەدۆزرایەوە' : 'هیچ ئەنجامێک نەدۆزرایەوە'}</h3><p>{active ? 'فلتەرەکان کەم بکەرەوە یان وشەی گەڕان بگۆڕە.' : 'لە ئێستادا هیچ داتایەک لەم بەشەدا نییە.'}</p>{active && <button onClick={clear}>سڕینەوەی گەڕان و فلتەرەکان</button>}</div>;

const CSS = `
.ksp-page,.ksp-filter-backdrop{--t:#12796b;--td:#0d5c50;--soft:#e7f4f1;--ink:#111d1a;--muted:#74817d;--line:#e5ece9}.ksp-shell{max-width:1260px;margin:auto;padding:22px 22px 48px}.ksp-hero{position:relative;overflow:hidden;padding:0;border:0;border-radius:0 0 34px 34px;margin-top:calc(-1 * env(safe-area-inset-top));background:linear-gradient(155deg,#12897a 0%,#0d6a5d 48%,#083f37 100%);box-shadow:0 18px 45px rgba(8,63,55,.25);color:#fff}.ksp-orb{position:absolute;border-radius:999px;pointer-events:none}.ksp-orb-a{width:260px;height:260px;left:-110px;top:-150px;background:#43d1b840}.ksp-orb-b{width:180px;height:180px;right:-80px;bottom:-110px;background:#ffffff14}.ksp-hero-in{position:relative;max-width:1260px;margin:0 auto;padding:calc(26px + env(safe-area-inset-top)) 22px 26px}
.ksp-hero-top{position:relative;display:flex;align-items:flex-start;justify-content:space-between;gap:20px}.ksp-eyebrow{display:flex;align-items:center;gap:6px;color:#c8fff3;font-size:11px;font-weight:950;margin-bottom:8px}.ksp-eyebrow svg{width:14px;height:14px}.ksp-hero h1{margin:0;color:#fff;font-size:clamp(22px,3vw,31px);line-height:1.3;font-weight:950;letter-spacing:-.5px}.ksp-hero p{margin:7px 0 0;color:rgba(255,255,255,.75);font-size:12px;font-weight:700}.ksp-result-bubble{min-width:90px;padding:12px 15px;border:1px solid #dceae6;border-radius:18px;background:#ffffffcc;text-align:center}.ksp-result-bubble strong{display:block;color:var(--td);font-size:21px;font-weight:950;line-height:1.1}.ksp-result-bubble span{font-size:10px;color:#84908c;font-weight:800}.ksp-search-row{position:relative;display:flex;gap:10px;margin-top:22px}.ksp-searchbox{height:58px;display:flex;align-items:center;flex:1;position:relative;border:1px solid var(--line);border-radius:18px;background:#fff;box-shadow:0 6px 20px rgba(15,35,31,.045);transition:.2s}.ksp-searchbox:focus-within{border-color:#12796b55;box-shadow:0 0 0 4px #12796b10,0 9px 26px rgba(15,35,31,.06)}.ksp-searchbox>svg{width:18px;color:#9aa5a1;margin:0 15px;flex:0 0 auto}.ksp-searchbox input{width:100%;height:100%;border:0;outline:0;background:transparent;color:var(--ink);font-size:13px;font-weight:800}.ksp-searchbox input::placeholder{color:#a7b0ad}.ksp-searchbox button{width:32px;height:32px;margin-left:10px;border:0;border-radius:10px;background:#f3f6f5;color:#77837f;display:grid;place-items:center}.ksp-searchbox button svg{width:14px}.ksp-filter-trigger{height:58px;min-width:116px;padding:0 17px;display:flex;align-items:center;justify-content:center;gap:8px;border:1px solid var(--line);border-radius:18px;background:#fff;color:#66736f;font-size:12px;font-weight:950;box-shadow:0 6px 20px rgba(15,35,31,.045);position:relative}.ksp-filter-trigger svg{width:17px}.ksp-filter-trigger b{min-width:18px;height:18px;padding:0 5px;display:grid;place-items:center;border-radius:999px;background:var(--soft);color:var(--td);font-size:9px}.ksp-filter-trigger.is-active{color:var(--td);border-color:#bcded6;background:#fafffe}.ksp-tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:18px;padding:5px;border-radius:17px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.2)}.ksp-tabs button{min-height:46px;border:0;border-radius:13px;background:transparent;color:rgba(255,255,255,.82);font-weight:900;font-size:11px;display:flex;align-items:center;justify-content:center;gap:7px}.ksp-tabs button svg{width:15px}.ksp-tabs button em{font-style:normal;font-size:9px;padding:3px 7px;border-radius:999px;background:#e3eae7;color:#87928f}.ksp-tabs button.active{background:#fff;color:var(--ink);box-shadow:0 5px 16px rgba(15,35,31,.07)}.ksp-tabs button.active em{background:var(--soft);color:var(--td)}.ksp-employer-tab{margin-top:17px;display:flex;align-items:center;gap:8px;color:#fff;font-size:12px;font-weight:950}.ksp-employer-tab svg{width:16px}.ksp-employer-tab em{font-style:normal;color:#899590;font-family:ui-monospace,monospace}.ksp-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:18px 3px 12px}.ksp-toolbar>div:first-child{display:flex;align-items:center;gap:4px;font-size:11px}.ksp-toolbar strong{color:var(--ink);font-size:13px}.ksp-muted{color:#8b9692;font-weight:800}.ksp-toolbar-actions{display:flex;gap:7px}.ksp-toolbar-actions button{display:flex;align-items:center;gap:5px;border:0;background:transparent;color:var(--td);font-size:10px;font-weight:900;padding:7px}.ksp-toolbar-actions button:last-child{color:#7b8783}.ksp-toolbar-actions svg{width:14px}.ksp-toolbar-actions .spin{animation:spin 1s linear infinite}.ksp-location-pill{margin-right:8px;display:inline-flex;align-items:center;gap:4px;padding:5px 9px;border-radius:999px;background:var(--soft);color:var(--td);font-size:9px;font-weight:900}.ksp-location-pill svg{width:11px}.ksp-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.ksp-card{position:relative;overflow:hidden;min-height:205px;padding:18px;border:1px solid #e5ece9;border-radius:24px;background:#fff;box-shadow:0 6px 25px rgba(15,35,31,.045);cursor:pointer;animation:kIn .45s both;transition:transform .22s,box-shadow .22s,border-color .22s}.ksp-card:hover{transform:translateY(-4px);border-color:#cfe2dd;box-shadow:0 18px 42px rgba(15,35,31,.10)}.ksp-card.vip{background:linear-gradient(145deg,#fff,#f5fbf9)}.ksp-vip-glow{position:absolute;width:180px;height:180px;border-radius:999px;left:-90px;top:-90px;filter:blur(12px)}.ksp-card-head{position:relative;display:flex;align-items:flex-start;gap:12px}.ksp-avatar{width:58px;height:58px;flex:0 0 58px;border-radius:17px;overflow:hidden;border:1px solid #e3ebe8;background:#f4f7f6}.ksp-avatar img{width:100%;height:100%;object-fit:cover}.ksp-card-title{min-width:0;flex:1}.ksp-name{display:flex;align-items:center;gap:6px;flex-wrap:wrap;color:var(--ink);font-size:14px;font-weight:950;line-height:1.5}.ksp-name>span:not(.ksp-vip-badge){max-width:100%;overflow:hidden;text-overflow:ellipsis}.ksp-name svg{width:15px;height:15px;flex:0 0 auto}.ksp-vip-badge{display:inline-flex;align-items:center;gap:3px;padding:4px 7px;border-radius:8px;color:#fff;font-size:8px;font-weight:950}.ksp-vip-badge svg{width:10px}.ksp-meta{display:flex;align-items:center;gap:5px;margin-top:6px;color:#8a9591;font-size:9px;font-weight:800}.ksp-meta svg{width:12px}.ksp-meta i{width:3px;height:3px;border-radius:50%;background:#c2cbc8}.ksp-save{width:35px;height:35px;flex:0 0 35px;border:1px solid #edf1ef;border-radius:11px;background:#fafcfc;color:#9aa5a1;display:grid;place-items:center}.ksp-save svg{width:15px}.ksp-save.saved{background:var(--soft);color:var(--td);border-color:#cde6df}.ksp-desc{position:relative;margin:16px 0 0;min-height:35px;color:#66736f;font-size:11px;font-weight:750;line-height:1.7}.ksp-tags{position:relative;display:flex;flex-wrap:wrap;gap:5px;margin-top:12px}.ksp-tags span{padding:6px 8px;border-radius:8px;background:#f6f8f7;border:1px solid #e9efed;color:#6e7a76;font-size:9px;font-weight:850}.ksp-tags .boost{background:#edf9e8;border-color:#d7edcd;color:#3f7b2e}.ksp-card-foot{position:relative;display:flex;align-items:center;justify-content:space-between;margin-top:14px;padding-top:12px;border-top:1px solid #eff3f1;color:var(--td);font-size:9px;font-weight:950}.ksp-card-foot svg{width:14px}.ksp-empty{grid-column:1/-1;min-height:310px;border:1px dashed #d7e3df;border-radius:25px;background:linear-gradient(180deg,#fff,#fafcfb);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:30px}.ksp-empty-icon{width:58px;height:58px;border-radius:18px;background:var(--soft);color:var(--td);display:grid;place-items:center}.ksp-empty-icon svg{width:24px}.ksp-empty h3{margin:14px 0 5px;color:var(--ink);font-size:15px;font-weight:950}.ksp-empty p{margin:0;color:#8b9692;font-size:11px;font-weight:700}.ksp-empty button{margin-top:15px;border:0;border-radius:12px;padding:10px 14px;background:#f0f4f2;color:#33403c;font-size:10px;font-weight:900}.ksp-filter-backdrop{position:fixed;inset:0;z-index:100;background:#07131066;backdrop-filter:blur(5px);display:flex;align-items:flex-end;justify-content:center;animation:kFade .18s ease both}.ksp-filter{width:min(680px,100%);max-height:92vh;overflow:auto;border-radius:30px 30px 0 0;background:#fff;padding:10px 22px 24px;box-shadow:0 -15px 60px rgba(0,0,0,.18);animation:kUp .28s cubic-bezier(.22,1,.36,1) both}.ksp-filter-handle{width:42px;height:5px;border-radius:999px;background:#dce3e0;margin:2px auto 18px}.ksp-filter-head{display:flex;align-items:center;justify-content:space-between}.ksp-filter-head small{color:var(--td);font-size:9px;font-weight:900}.ksp-filter-head h2{margin:2px 0 0;color:var(--ink);font-size:21px;font-weight:950}.ksp-filter-head button{border:0;background:var(--soft);color:var(--td);border-radius:10px;padding:8px 10px;font-size:9px;font-weight:950}.ksp-filter-group{padding:22px 0;border-bottom:1px solid #edf1ef}.ksp-filter-label{margin-bottom:12px}.ksp-filter-label strong{display:block;color:var(--ink);font-size:12px;font-weight:950}.ksp-filter-label span{display:block;color:#929d99;font-size:9px;font-weight:700;margin-top:4px}.ksp-chip-grid{display:flex;flex-wrap:wrap;gap:7px}.ksp-chip-grid button{border:1px solid #e6ecea;border-radius:12px;background:#f8faf9;color:#697571;padding:10px 13px;font-size:10px;font-weight:850}.ksp-chip-grid button.active{border-color:var(--t);background:var(--t);color:#fff;box-shadow:0 7px 18px #12796b25}.ksp-gps{width:100%;display:flex;align-items:center;gap:11px;border:1px solid #e7eeeb;background:#f8fbfa;border-radius:17px;padding:11px;text-align:right;margin-bottom:10px}.ksp-gps>span{width:38px;height:38px;border-radius:12px;background:var(--t);color:#fff;display:grid;place-items:center}.ksp-gps>span svg{width:16px}.ksp-gps>div{flex:1}.ksp-gps strong{display:block;color:var(--ink);font-size:11px;font-weight:950}.ksp-gps small{display:block;color:#929d99;font-size:9px;font-weight:700;margin-top:3px}.ksp-gps>svg{width:14px;color:#a6b0ad}.ksp-filter-summary{position:sticky;bottom:0;margin-top:18px;padding-top:14px;background:#fff;display:flex;align-items:center;justify-content:space-between;gap:10px}.ksp-filter-summary span{display:block;color:#929d99;font-size:9px;font-weight:800}.ksp-filter-summary strong{display:block;color:var(--ink);font-size:18px;font-weight:950}.ksp-filter-summary button{flex:1;max-width:270px;border:0;border-radius:15px;background:var(--t);color:#fff;padding:14px;font-size:11px;font-weight:950;box-shadow:0 9px 22px #12796b25}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@keyframes kIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}@keyframes kFade{from{opacity:0}to{opacity:1}}@keyframes kUp{from{opacity:0;transform:translateY(35px)}to{opacity:1;transform:none}}
@media(max-width:1080px){.ksp-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.ksp-shell{padding-left:16px;padding-right:16px}}
@media(max-width:700px){.ksp-shell{padding:10px 11px 30px}.ksp-hero{border-radius:0 0 26px 26px}.ksp-hero-in{padding:calc(16px + env(safe-area-inset-top)) 16px 18px}.ksp-hero-top{gap:10px}.ksp-result-bubble{min-width:68px;padding:9px}.ksp-result-bubble strong{font-size:17px}.ksp-hero h1{font-size:21px}.ksp-hero p{font-size:10px;line-height:1.7}.ksp-search-row{gap:7px;margin-top:16px}.ksp-searchbox{height:52px;border-radius:15px}.ksp-filter-trigger{height:52px;min-width:52px;width:52px;padding:0;border-radius:15px}.ksp-filter-trigger span{display:none}.ksp-tabs{margin-top:12px}.ksp-tabs button{font-size:10px;gap:4px}.ksp-tabs button svg{display:none}.ksp-toolbar{padding-top:13px}.ksp-grid{grid-template-columns:1fr;gap:9px}.ksp-card{min-height:0;border-radius:20px;padding:15px}.ksp-avatar{width:52px;height:52px;flex-basis:52px;border-radius:15px}.ksp-card:hover{transform:none;box-shadow:0 7px 25px rgba(15,35,31,.06)}.ksp-filter{padding-left:15px;padding-right:15px;border-radius:26px 26px 0 0}.ksp-filter-summary button{max-width:none}.ksp-toolbar-actions button:last-child{display:none}}
@media(max-width:430px){.ksp-hero-top{align-items:center}.ksp-result-bubble{display:none}.ksp-hero h1{font-size:19px}.ksp-hero p{max-width:30ch}.ksp-tabs button em{display:none}.ksp-tabs button{min-height:42px}.ksp-toolbar-actions button{font-size:9px;padding:5px}.ksp-filter{max-height:95vh}.ksp-chip-grid button{padding:9px 11px}}
@media(prefers-reduced-motion:reduce){.ksp-card,.ksp-filter-backdrop,.ksp-filter{animation:none}.ksp-card{transition:none}}
`;
