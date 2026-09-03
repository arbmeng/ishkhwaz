import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { soundService } from '../../services/soundService';
import { kurdistanGovernorates } from '../../data/kurdistanLocations';
import { compressImageFile } from '../../utils/image';
import { getPlanColor } from '../../utils/planPresets';
import { apiService } from '../../services/api';
import { pushService } from '../../services/pushService';
import { AboutModal } from '../layout/AboutModal';
import {
  Settings, Share2, Camera, FileText, Eye, CheckCircle2, Save,
  Heart, Trash2, Briefcase, ChevronLeft, LogOut, User,
  Bell, MapPin, Plus, X, Layers, Sparkles, Building2,
  ExternalLink, ShieldCheck, FileCheck,
  HelpCircle, Info
} from 'lucide-react';

/* ─── Design tokens ─────────────────────────────────────────────── */
const NK = "'Noto Kufi Arabic', 'Vazirmatn', system-ui, sans-serif";
const TEAL   = '#12796b';
const TEAL_DEEP = '#0d5c50';
const TEAL2  = '#286d64';
const MINT   = '#d4f7ee';
const MINT2  = '#e4fcf6';
const BORDER = '#beece2';
const TXT    = '#113d36';
const SUB    = '#2b6d64';
const MUTED  = '#4e8e84';
const CARD   = '#f8faf9';

const parseJsonArray = (val) => {
  if (Array.isArray(val)) return val;
  try { const p = JSON.parse(val || '[]'); return Array.isArray(p) ? p : []; }
  catch { return []; }
};

const SUGGESTED_SKILLS = [
  'React', 'Node.js', 'Figma', 'UI/UX', 'JavaScript', 'Python', 'Tailwind',
  'Graphic Design', 'AutoCAD', 'Accounting', 'Content Writing', 'Marketing',
  'Sales', 'Flutter', 'Video Editing', 'WordPress'
];

/* ─── Progress bar ───────────────────────────────────────────────── */
const ProgressBar = ({ pct }) => {
  const [width, setWidth] = useState(0);
  useEffect(() => { const t = setTimeout(() => setWidth(pct), 120); return () => clearTimeout(t); }, [pct]);
  return (
    <div className="w-full h-2.5 bg-white/70 rounded-full overflow-hidden border border-[#c1ede3]" style={{ padding: '2px' }}>
      <div
        className="h-full rounded-full"
        style={{
          width: `${width}%`,
          background: 'linear-gradient(90deg, #12796b, #2db89f)',
          transition: 'width 1.1s cubic-bezier(0.22,1,0.36,1)',
        }}
      />
    </div>
  );
};

/* ─── Bento card section head (eyebrow + title + optional link) ──── */
const BentoHead = ({ eyebrow, title, link, onLink }) => (
  <div className="flex items-center justify-between mb-3.5">
    {link && (
      <button onClick={onLink} className="text-[11.5px] font-black flex items-center gap-1 hover:underline" style={{ color: TEAL }}>
        {link} <ChevronLeft className="w-3 h-3 rtl:rotate-180" />
      </button>
    )}
    <div>
      <span className="text-[10.5px] font-black uppercase tracking-wide block" style={{ color: TEAL }}>{eyebrow}</span>
      <h3 className="text-[15.5px] font-black mt-0.5" style={{ color: TXT }}>{title}</h3>
    </div>
  </div>
);

/* ─── Completion ring around the avatar ─────────────────────────── */
const CompletionRing = ({ pct, size = 108, strokeW = 4 }) => {
  const r = (size - strokeW) / 2;
  const c = 2 * Math.PI * r;
  const [offset, setOffset] = useState(c);
  useEffect(() => { const t = setTimeout(() => setOffset(c - (pct / 100) * c), 150); return () => clearTimeout(t); }, [pct, c]);
  return (
    <svg width={size} height={size} className="absolute inset-0" style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e4eae7" strokeWidth={strokeW} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={TEAL} strokeWidth={strokeW} strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.22,1,.36,1)' }} />
    </svg>
  );
};

/* ═══════════════════════════════════════════════════════════════════ */
export const UserProfilePage = ({ onNavigate }) => {
  const { user, token, logout, updateUserProfile } = useAuth();
  const { applications = [], savedJobIds = [], jobs = [], planTiers = [], toggleSaveJob, addToast } = useStore();
  const isEmployer = user?.role === 'employer';
  const isFreelancer = !isEmployer;

  /* ── modal flags ── */
  const [showEdit,     setShowEdit]     = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSaved,    setShowSaved]    = useState(false);
  const [showViewers,  setShowViewers]  = useState(false);
  const [showLogout,   setShowLogout]   = useState(false);
  const [showAbout,    setShowAbout]    = useState(false);
  const [copied,       setCopied]       = useState(false);

  /* ── push ── */
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy,    setPushBusy]    = useState(false);

  /* ── viewers ── */
  const [viewersState, setViewersState] = useState({ loaded: false, viewers: [] });

  /* ── form state — seeded from real user ── */
  const [name,          setName]          = useState('');
  const [profession,    setProfession]    = useState('');
  const [phone,         setPhone]         = useState('');
  const [email,         setEmail]         = useState('');
  const [bio,           setBio]           = useState('');
  const [avatar,        setAvatar]        = useState('');
  const [cover,         setCover]         = useState('');
  const [companyName,   setCompanyName]   = useState('');
  const [industry,      setIndustry]      = useState('');
  const [companyReg,    setCompanyReg]    = useState('');
  const [saving,        setSaving]        = useState(false);
  const [savingPhoto,   setSavingPhoto]   = useState(false);
  const [saved,         setSaved]         = useState(false);

  /* ── location ── */
  const [govId,  setGovId]  = useState('sulaymaniyah');
  const [distId, setDistId] = useState('');
  const [subId,  setSubId]  = useState('');

  /* ── skills / experiences ── */
  const [skills,       setSkills]       = useState([]);
  const [skillInput,   setSkillInput]   = useState('');
  const [experiences,  setExperiences]  = useState([]);
  const [expTitle,     setExpTitle]     = useState('');
  const [expPeriod,    setExpPeriod]    = useState('');
  const [expDesc,      setExpDesc]      = useState('');
  const [expLink,      setExpLink]      = useState('');

  const avatarRef = useRef(null);
  const coverRef = useRef(null);

  /* ── seed real user data ── */
  useEffect(() => {
    if (!user) return;
    setName(user.name || user.full_name || '');
    setProfession(user.profession || user.title || (isEmployer ? (user.industry || 'خاوەنکار') : 'کارخواز'));
    setPhone(user.phone || user.company_phone || '');
    setEmail(user.email || user.company_email || '');
    setBio(user.bio || user.description || '');
    setAvatar(user.avatar || user.company_logo || '');
    setCover(user.cover || user.company_cover || '');
    setCompanyName(user.company_name || user.name || '');
    setIndustry(user.industry || 'تەکنەلۆژیا');
    setCompanyReg(user.company_reg || user.regNumber || '');
    setGovId(user.governorateId || user.governorate || 'sulaymaniyah');
    setDistId(user.districtId  || user.district  || '');
    setSubId(user.subDistrictId || user.subDistrict || '');
    const sk = parseJsonArray(user.skills);
    if (sk.length) setSkills(sk);
    const ex = parseJsonArray(user.experiences || user.work_history);
    if (ex.length) setExperiences(ex);
  }, [user?.id, isEmployer]);

  /* ── push check ── */
  useEffect(() => {
    (async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setPushEnabled(!!sub && Notification.permission === 'granted');
      } catch {}
    })();
  }, []);

  /* ── viewers ── */
  useEffect(() => {
    if (!token) return;
    apiService.getProfileViewers(token).then((res) => setViewersState({ loaded: true, ...res })).catch(() => {});
  }, [token]);

  /* ── location objects ── */
  const govObj  = kurdistanGovernorates.find(g => g.id === govId || g.name_ku === govId) || kurdistanGovernorates[0];
  const dists   = govObj?.districts || [];
  const distObj = dists.find(d => d.id === distId || d.name_ku === distId) || dists[0];
  const location = `${govObj?.name_ku || 'سلێمانی'}، ${distObj?.name_ku || ''}`;

  /* ── employer jobs & applications ── */
  const employerJobs = useMemo(() => {
    if (!isEmployer) return [];
    return (Array.isArray(jobs) ? jobs : []).filter(j => {
      if (!j) return false;
      const matchId = user?.id && (String(j.company_id) === String(user.id) || String(j.employer_id) === String(user.id) || String(j.user_id) === String(user.id));
      const matchName = user?.company_name && (j.company_name === user.company_name || j.companyName === user.company_name);
      return matchId || matchName;
    });
  }, [jobs, isEmployer, user]);

  const employerReceivedApplications = useMemo(() => {
    if (!isEmployer) return 0;
    const myJobIds = employerJobs.map(j => String(j.id));
    return (Array.isArray(applications) ? applications : []).filter(a => myJobIds.includes(String(a.job_id))).length;
  }, [isEmployer, employerJobs, applications]);

  /* ── computed ── */
  const displayName   = isEmployer ? (companyName || user?.company_name || user?.name || 'کۆمپانیا') : (name || user?.name || 'بەکارهێنەر');
  const displayTitle  = isEmployer ? (industry || user?.industry || 'کۆمپانیا و خاوەنکار') : (profession || user?.profession || 'کارخواز');
  const displayAvatar = avatar     || user?.avatar || user?.company_logo || '';
  const initial       = displayName.trim().charAt(0) || (isEmployer ? 'ک' : 'ئ');
  const joinYear      = user?.created_at ? new Date(user.created_at).getFullYear() : null;
  const userPlanTier  = planTiers.find(t => t.id === user?.plan);
  // The free tier's real id is a generated string (e.g. "_fc74"), never the
  // literal "free" — comparing against that literal meant every user (auto-
  // assigned the free plan at signup) showed a VIP badge on their own profile.
  const isVIP         = !!userPlanTier && Number(userPlanTier.price) > 0;
  const planAccent    = userPlanTier ? (getPlanColor(userPlanTier.color).gradient || getPlanColor(userPlanTier.color).accent) : TEAL;

  const completion = useMemo(() => {
    let s = 0;
    if (displayAvatar)                                    s += 20;
    if ((bio || user?.bio || '').length > 10)             s += 20;
    if (isEmployer) {
      if (companyName || user?.company_name)              s += 20;
      if (industry || user?.industry)                     s += 20;
      if (phone || user?.phone)                           s += 20;
    } else {
      if (skills.length > 0 || parseJsonArray(user?.skills).length > 0) s += 20;
      if (govId || user?.governorate)                       s += 20;
      if ((phone || user?.phone) || (profession || user?.profession)) s += 20;
    }
    return Math.min(Math.max(s, 20), 100);
  }, [displayAvatar, bio, skills, govId, phone, profession, user, isEmployer, companyName, industry]);

  const profileViews    = Number(user?.profile_views) || 0;
  const applCount       = applications.length;
  const savedCount      = savedJobIds.length;
  const savedList       = jobs.filter(j => savedJobIds.includes(j.id));

  /* ── handlers ── */
  const handleShare = () => {
    soundService.playTick?.();
    const link = isEmployer
      ? `${window.location.origin}/search?company=${encodeURIComponent(displayName)}`
      : `${window.location.origin}/search/freelancers/${user?.id || ''}`;
    
    if (navigator.share) {
      navigator.share({ title: `${displayName} — ئیش خواز`, url: link }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(link);
      setCopied(true);
      addToast?.({ title: 'کۆپیکرا ✓', message: 'لینکی پڕۆفایل کۆپیکرا.', type: 'success' });
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSavingPhoto(true);
    try {
      const url = await compressImageFile(file, 480, 0.82);
      setAvatar(url);
      if (updateUserProfile) {
        await updateUserProfile(isEmployer ? { company_logo: url, avatar: url } : { avatar: url });
      }
      soundService.playSuccess?.();
      addToast?.({ title: 'وێنە نوێکرایەوە ✓', message: 'وێنەی پڕۆفایل بە سەرکەوتوویی گۆڕدرا.', type: 'success' });
    } catch {
      setAvatar(user?.avatar || '');
      addToast?.({ title: 'هەڵە', message: 'گۆڕینی وێنە سەرکەوتوو نەبوو.', type: 'error' });
    }
    setSavingPhoto(false);
  };

  const handleCoverChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const url = await compressImageFile(file, 960, 0.85);
      setCover(url);
      if (updateUserProfile) {
        await updateUserProfile(isEmployer ? { company_cover: url, cover: url } : { cover: url });
      }
      soundService.playSuccess?.();
      addToast?.({ title: 'کەڤەر نوێکرایەوە ✓', message: 'وێنەی کەڤەر بە سەرکەوتوویی نوێکرایەوە.', type: 'success' });
    } catch {
      addToast?.({ title: 'هەڵە', message: 'گۆڕینی کەڤەر سەرکەوتوو نەبوو.', type: 'error' });
    }
  };

  const addSkill = (sToAdd) => {
    const s = (sToAdd || skillInput).trim();
    if (s && !skills.includes(s)) {
      setSkills(p => [...p, s]);
    }
    setSkillInput('');
  };

  const removeSkill = (sToRemove) => {
    setSkills(p => p.filter(s => s !== sToRemove));
  };

  const addExperience = () => {
    if (!expTitle.trim()) return;
    setExperiences(p => [{
      id: `exp-${Date.now()}`,
      title: expTitle.trim(),
      period: expPeriod.trim() || '2024 — ئێستا',
      description: expDesc.trim() || '',
      link: expLink.trim() || '',
      current: false,
    }, ...p]);
    setExpTitle(''); setExpPeriod(''); setExpDesc(''); setExpLink('');
  };

  const removeExperience = (idToRemove) => {
    setExperiences(p => p.filter((_, idx) => idx !== idToRemove && _.id !== idToRemove));
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = isEmployer ? {
      name: name || displayName,
      company_name: companyName || displayName,
      industry: industry || 'تەکنەلۆژیا',
      company_reg: companyReg,
      phone,
      company_phone: phone,
      company_email: email,
      bio,
      description: bio,
      avatar: displayAvatar,
      company_logo: displayAvatar,
      cover,
      company_cover: cover,
      governorate: govObj?.name_ku,
      district: distObj?.name_ku,
      governorateId: govId,
      districtId: distId,
      subDistrictId: subId,
      fullLocation: location,
    } : {
      name: name || user?.name,
      profession: profession || 'کارخواز',
      phone,
      email,
      bio,
      avatar: displayAvatar,
      cover,
      governorate: govObj?.name_ku,
      district: distObj?.name_ku,
      governorateId: govId,
      districtId: distId,
      subDistrictId: subId,
      fullLocation: location,
      skills,
      experiences,
    };

    if (updateUserProfile) {
      const res = await updateUserProfile(payload);
      if (res?.success === false) {
        addToast?.({ title: 'هەڵە', message: res.message || 'پاشەکەوت نەبوو.', type: 'error' });
        setSaving(false);
        return;
      }
    }
    soundService.playSuccess?.();
    addToast?.({ title: 'پاشەکەوتکرا ✓', message: 'زانیارییەکانی پڕۆفایل بە سەرکەوتوویی نوێکرانەوە.', type: 'success' });
    setSaved(true); setSaving(false);
    setTimeout(() => { setSaved(false); setShowEdit(false); }, 900);
  };

  const handleTogglePush = async () => {
    soundService.playTick?.();
    if (pushBusy) return;
    setPushBusy(true);
    if (pushEnabled) {
      try { const reg = await navigator.serviceWorker.ready; const sub = await reg.pushManager.getSubscription(); if (sub) await sub.unsubscribe(); setPushEnabled(false); } catch {}
    } else {
      const res = await pushService.subscribeUserToPush(token);
      if (res?.success) setPushEnabled(true);
      else if (res?.reason === 'denied') addToast?.({ title: 'ئاگاداری', message: 'ڕێگەت نەدا بە ئاگادارکردنەوەکان لە وێبگەڕ.', type: 'warning' });
    }
    setPushBusy(false);
  };

  /* ── CSS keyframes injected once ── */
  useEffect(() => {
    const id = 'profile-keyframes';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      @keyframes profileFadeUp {
        from { opacity: 0; transform: translateY(18px); }
        to   { opacity: 1; transform: translateY(0);    }
      }
      @keyframes profilePulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(18,121,107,0.35); }
        50%      { box-shadow: 0 0 0 8px rgba(18,121,107,0);   }
      }
      @keyframes shimmerSlide {
        0%   { background-position: -200% center; }
        100% { background-position:  200% center; }
      }
      .profile-vip-pulse   { animation: profilePulse 2.2s ease-in-out infinite; }
      .shimmer-btn {
        background: linear-gradient(90deg, #12796b 0%, #2db89f 45%, #12796b 100%);
        background-size: 200% auto;
        animation: shimmerSlide 2.8s linear infinite;
      }
    `;
    document.head.appendChild(style);
  }, []);

  /* ══════════════════════════════════════════════════════════════════
     PROFILE HERO — identity rail + bento grid, one responsive layout
     shared by mobile and desktop (rail stacks on top below 1024px)
  ══════════════════════════════════════════════════════════════════ */
  const ProfileHero = () => (
    <div className="w-full max-w-6xl mx-auto" dir="rtl" style={{ fontFamily: NK }}>

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between pt-1 pb-4 px-1">
        <button
          onClick={() => { soundService.playTick?.(); setShowSettings(true); }}
          className="w-10 h-10 rounded-2xl bg-white border border-[#e4eae7] shadow-sm flex items-center justify-center text-[#4a5854] hover:text-[#12796b] active:scale-90 transition"
        >
          <Settings className="w-4.5 h-4.5" />
        </button>
        <h1 className="text-lg font-black" style={{ color: TXT }}>
          {isEmployer ? 'پڕۆفایلی کۆمپانیا' : 'پڕۆفایل'}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5 items-start">

        {/* ══════════ IDENTITY RAIL ══════════ */}
        <aside className="bg-white rounded-[26px] border border-[#e4eae7] shadow-sm p-6 lg:sticky lg:top-5 relative overflow-hidden">
          {/* subtle kilim-inspired weave, restrained */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.05]"
            style={{
              backgroundImage: `repeating-linear-gradient(45deg, ${TXT} 0 1.5px, transparent 1.5px 22px), repeating-linear-gradient(-45deg, ${TXT} 0 1.5px, transparent 1.5px 22px)`,
              WebkitMaskImage: 'radial-gradient(circle at 100% 0%, #000 0%, transparent 62%)',
              maskImage: 'radial-gradient(circle at 100% 0%, #000 0%, transparent 62%)',
            }}
          />

          <div className="flex items-start justify-between gap-2 relative">
            {isVIP && (
              <span
                className="profile-vip-pulse text-white text-[10.5px] font-black px-2.5 py-1 rounded-full inline-flex items-center gap-1 shrink-0"
                style={{ background: planAccent }}
              >
                <span className="text-[10px]">👑</span> VIP
              </span>
            )}
            <span
              className="text-[10.5px] font-black px-2.5 py-1 rounded-full shrink-0"
              style={{ background: CARD, color: TXT, border: '1px solid #e4eae7' }}
            >
              {isEmployer ? 'کۆمپانیا و خاوەنکار' : 'کارخواز'}
            </span>
          </div>

          <div className="relative w-[108px] h-[108px] mx-auto my-5">
            <CompletionRing pct={completion} />
            <div
              onClick={() => avatarRef.current?.click()}
              className={`absolute inset-[9px] ${isEmployer ? 'rounded-2xl' : 'rounded-full'} overflow-hidden border-2 border-white cursor-pointer group flex items-center justify-center shadow-sm`}
              style={{ background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DEEP})` }}
            >
              {displayAvatar
                ? <img src={displayAvatar} alt={displayName} className="w-full h-full object-cover" />
                : <span className="text-3xl font-black text-white">{initial}</span>}
              <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white">
                <Camera className="w-4 h-4" />
              </div>
            </div>
            <span
              className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 text-white text-[10px] font-black px-2 py-0.5 rounded-full border-2 border-white font-mono"
              style={{ background: TEAL }}
            >
              {completion}٪
            </span>
          </div>

          <h2 className="text-center text-xl font-black relative" style={{ color: TXT }}>{displayName}</h2>
          <p className="text-center text-xs font-bold mt-1 relative" style={{ color: SUB }}>{displayTitle}</p>
          <p className="text-center text-[11px] font-medium mt-1 mb-6 relative" style={{ color: MUTED }}>
            {govObj?.name_ku || 'سلێمانی'}{distObj?.name_ku ? `، ${distObj.name_ku}` : ''}{joinYear ? ` · ئەندام لە ${joinYear}` : ''}
          </p>

          <button
            onClick={() => { soundService.playTick?.(); setShowEdit(true); }}
            className="shimmer-btn w-full py-3.5 rounded-2xl text-white font-black text-sm shadow-md active:scale-[0.98] transition relative mb-2.5"
          >
            {isEmployer ? 'دەستکاری زانیاری کۆمپانیا' : 'دەستکاری پڕۆفایل'}
          </button>

          <div className="flex gap-2 relative">
            <button
              onClick={handleShare}
              className="flex-1 py-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 border transition hover:text-white hover:bg-[#12796b] hover:border-[#12796b]"
              style={{ background: CARD, borderColor: '#e4eae7', color: SUB }}
            >
              <Share2 className="w-3.5 h-3.5" /> هاوبەشکردن
            </button>
            <button
              onClick={() => { soundService.playTick?.(); setShowLogout(true); }}
              className="flex-1 py-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 border transition"
              style={{ background: '#fef5f5', borderColor: '#fad8d8', color: '#d84848' }}
            >
              <LogOut className="w-3.5 h-3.5" /> چوونەدەرەوە
            </button>
          </div>

          <div className="h-px my-5 relative" style={{ background: '#eef3f1' }} />

          <div className="flex text-center relative">
            {(isEmployer ? [
              { val: employerJobs.length, label: 'هەلی کار', fn: () => onNavigate?.('employer') },
              { val: employerReceivedApplications, label: 'داواکاری', fn: () => onNavigate?.('employer') },
              { val: profileViews, label: 'بینین', fn: () => setShowViewers(true) },
            ] : [
              { val: profileViews, label: 'بینین', fn: () => setShowViewers(true) },
              { val: applCount, label: 'داواکاری', fn: () => onNavigate?.('my_applications') },
              { val: savedCount, label: 'پاشەکەوت', fn: () => setShowSaved(true) },
            ]).map(({ val, label, fn }, i) => (
              <button
                key={label}
                onClick={() => { soundService.playTick?.(); fn(); }}
                className="flex-1 py-1.5 rounded-xl hover:bg-[#f4faf8] transition"
                style={i > 0 ? { borderRight: '1px solid #eef3f1' } : {}}
              >
                <div className="text-lg font-black font-mono" style={{ color: TXT }}>{val}</div>
                <div className="text-[10px] font-bold mt-0.5" style={{ color: MUTED }}>{label}</div>
              </button>
            ))}
          </div>
        </aside>

        {/* ══════════ BENTO GRID ══════════ */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">

          {/* About */}
          <div className="col-span-2 lg:col-span-6 bg-white rounded-[18px] border border-[#e4eae7] shadow-sm p-5">
            <BentoHead eyebrow="دەربارە" title={isEmployer ? 'دەربارەی کۆمپانیا' : 'دەربارەی من'} />
            <p className="text-[13.5px] leading-[1.9] font-medium" style={{ color: SUB }}>
              {bio || user?.bio || (
                <span style={{ color: MUTED }}>
                  {isEmployer ? 'کورتەیەک دەربارەی کار و بەرهەمەکانی کۆمپانیاکەت بنووسە.' : 'کورتەیەک دەربارەی خۆت و ئەزموونەکانت بنووسە.'}
                </span>
              )}
            </p>
          </div>

          {isFreelancer ? (
            <>
              {/* Resumes */}
              <div className="col-span-1 lg:col-span-3 bg-white rounded-[18px] border border-[#e4eae7] shadow-sm p-5 flex flex-col">
                <BentoHead eyebrow="سیڤیەکان" title="کارنامەکانم" link="هەموو" onLink={() => { soundService.playTick?.(); onNavigate?.('resumes'); }} />
                <button
                  onClick={() => { soundService.playTick?.(); onNavigate?.('resumes'); }}
                  className="flex-1 rounded-2xl border flex items-center gap-3 p-4 transition hover:border-[#12796b]/40 hover:bg-[#f4faf8]"
                  style={{ background: CARD, borderColor: '#eef3f1' }}
                >
                  <div className="w-11 h-12 rounded-xl flex items-center justify-center shrink-0 border" style={{ background: '#e0f3ee', borderColor: '#c1ede3' }}>
                    <FileText className="w-6 h-6" style={{ color: TEAL }} />
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-black" style={{ color: TXT }}>کارنامەی فەرمی</div>
                    <div className="text-[11px] mt-0.5" style={{ color: MUTED }}>{user?.cv_url ? 'سیڤی بارکراو' : 'دروستکردنی CV'}</div>
                  </div>
                </button>
              </div>

              {/* Location */}
              <div className="col-span-1 lg:col-span-3 bg-white rounded-[18px] border border-[#e4eae7] shadow-sm p-5">
                <BentoHead eyebrow="شوێن" title="ناونیشان" />
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#e0f3ee', color: TEAL }}>
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-black" style={{ color: TXT }}>{govObj?.name_ku}{distObj?.name_ku ? `، ${distObj.name_ku}` : ''}</div>
                    <div className="text-[11px] font-bold mt-0.5" style={{ color: MUTED }}>ناوچەی کارکردن</div>
                  </div>
                </div>
              </div>

              {/* Skills */}
              <div className="col-span-2 lg:col-span-6 bg-white rounded-[18px] border border-[#e4eae7] shadow-sm p-5">
                <BentoHead eyebrow="شارەزایی" title="کارامەیی و تواناکان" />
                <div className="flex flex-wrap gap-2">
                  {(skills.length ? skills : parseJsonArray(user?.skills)).map(s => (
                    <span key={s} className="px-3.5 py-2 rounded-xl border text-xs font-bold" style={{ background: '#fff', borderColor: '#dce5e1', color: '#2d3a36' }}>
                      {s}
                    </span>
                  ))}
                  {skills.length === 0 && !parseJsonArray(user?.skills).length && (
                    <span className="text-xs font-bold" style={{ color: MUTED }}>هیچ شارەزاییەک زیاد نەکراوە.</span>
                  )}
                  <button
                    onClick={() => { soundService.playTick?.(); setShowEdit(true); }}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1"
                    style={{ background: CARD, color: TEAL }}
                  >
                    <Plus className="w-3.5 h-3.5" /> زیادکردن
                  </button>
                </div>
              </div>

              {/* Experience timeline */}
              <div className="col-span-2 lg:col-span-6 bg-white rounded-[18px] border border-[#e4eae7] shadow-sm p-5">
                <BentoHead eyebrow="مێژوو" title="ئەزموونی کار" link="زیادکردن" onLink={() => { soundService.playTick?.(); setShowEdit(true); }} />
                {experiences.length === 0 ? (
                  <p className="text-xs font-bold" style={{ color: MUTED }}>هیچ ئەزموونێک زیاد نەکراوە.</p>
                ) : (
                  <div className="space-y-5">
                    {experiences.map((exp, i) => (
                      <div key={exp.id || i} className="relative pr-5">
                        {i < experiences.length - 1 && (
                          <span className="absolute right-[3px] top-3 bottom-[-20px] w-px" style={{ background: '#eef3f1' }} />
                        )}
                        <span className="absolute -right-[2px] top-1 w-2.5 h-2.5 rounded-full" style={{ background: TEAL }} />
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-[10.5px] font-mono shrink-0" style={{ color: MUTED }}>{exp.period}</span>
                          <h4 className="text-sm font-black" style={{ color: TXT }}>{exp.title}</h4>
                        </div>
                        {exp.description && <p className="text-xs font-medium mt-1 leading-relaxed" style={{ color: SUB }}>{exp.description}</p>}
                        {exp.link && (
                          <a href={exp.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-black mt-1 hover:underline" style={{ color: TEAL }}>
                            بینینی لینک <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Verified strip — only when the admin has actually verified this account */}
              {Number(user?.verified) === 1 && (
                <div className="col-span-1 lg:col-span-3 bg-white rounded-[18px] border border-[#e4eae7] shadow-sm p-5 flex items-center">
                  <div className="w-full flex items-center gap-2.5 rounded-xl p-3.5" style={{ background: '#e8f7f4', border: '1px solid #c1ede3' }}>
                    <ShieldCheck className="w-4.5 h-4.5 shrink-0" style={{ color: TEAL_DEEP }} />
                    <span className="text-[11.5px] font-bold" style={{ color: TEAL_DEEP }}>کۆمپانیای پشتڕاستکراو</span>
                  </div>
                </div>
              )}

              {/* Post job CTA */}
              <div className={Number(user?.verified) === 1 ? 'col-span-1 lg:col-span-3' : 'col-span-2 lg:col-span-6'}>
                <button
                  onClick={() => { soundService.playTick?.(); onNavigate?.('post_job'); }}
                  className="w-full h-full min-h-[76px] rounded-[18px] flex items-center justify-between px-5 text-white font-black text-xs shadow-sm transition active:scale-[0.98]"
                  style={{ background: TEAL }}
                >
                  <Plus className="w-5 h-5" />
                  بڵاوکردنەوەی هەلی کاری نوێ
                </button>
              </div>

              {/* Jobs list */}
              <div className="col-span-2 lg:col-span-6 bg-white rounded-[18px] border border-[#e4eae7] shadow-sm p-5">
                <BentoHead eyebrow="چالاک" title={`هەلی کارەکان (${employerJobs.length})`} link="هەموو" onLink={() => { soundService.playTick?.(); onNavigate?.('employer'); }} />
                {employerJobs.length === 0 ? (
                  <p className="text-xs font-bold" style={{ color: MUTED }}>هێشتا هیچ هەلی کارێکت بڵاونەکردووەتەوە.</p>
                ) : (
                  <div className="space-y-2">
                    {employerJobs.map(job => (
                      <div key={job.id} className="p-3.5 rounded-xl border flex items-center justify-between gap-3 hover:bg-[#f4faf8] transition" style={{ borderColor: '#eef3f1', background: CARD }}>
                        <button onClick={() => { soundService.playTick?.(); onNavigate?.('employer'); }} className="text-[10.5px] font-bold px-3 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 shrink-0">
                          بەڕێوەبردن
                        </button>
                        <div className="text-right flex-1 min-w-0">
                          <div className="text-xs font-black truncate" style={{ color: TXT }}>{job.title_ku || job.title}</div>
                          <div className="text-[11px] mt-0.5" style={{ color: MUTED }}>{job.governorate_name || job.governorate || 'سلێمانی'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Company info table */}
              <div className="col-span-2 lg:col-span-6 bg-white rounded-[18px] border border-[#e4eae7] shadow-sm p-5">
                <BentoHead eyebrow="زانیاری فەرمی" title="تۆماری کۆمپانیا" />
                <div className="divide-y" style={{ borderColor: '#eef3f1' }}>
                  {[
                    [companyName, 'ناوی کۆمپانیا'],
                    [industry, 'بواری چالاکی'],
                    [phone || 'دیارینەکراوە', 'ژمارەی تەلەفۆن'],
                    [email || user?.email || 'دیارینەکراوە', 'ئیمەیلی فەرمی'],
                    [companyReg || 'دیارینەکراوە', 'ژمارەی تۆماری بازرگانی'],
                  ].map(([val, label]) => (
                    <div key={label} className="py-2.5 flex items-center justify-between text-xs">
                      <span className="font-bold" style={{ color: TXT }}>{val}</span>
                      <span style={{ color: MUTED }}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );

  /* ══════════════════════════════════════════════════════════════════
     MODALS
  ══════════════════════════════════════════════════════════════════ */

  /* ── Interactive Multi-Tab Edit Modal ── */
  const EditModal = () => {
    const [activeSection, setActiveSection] = useState(isEmployer ? 'company_info' : 'basic');

    const tabs = isEmployer ? [
      { id: 'company_info', label: 'زانیاری کۆمپانیا', icon: Building2 },
      { id: 'location', label: 'شوێن و ناونیشان', icon: MapPin },
      { id: 'branding', label: 'لۆگۆ و کەڤەر', icon: Camera },
      { id: 'settings', label: 'ڕێکخستنەکان', icon: Settings },
    ] : [
      { id: 'basic', label: 'زانیاری بنەڕەتی', icon: User },
      { id: 'location', label: 'شوێن و ناوچە', icon: MapPin },
      { id: 'photos', label: 'وێنەی پرۆفایل و کەڤەر', icon: Camera },
      { id: 'skills', label: 'شارەزاییەکان', icon: Layers },
      { id: 'experience', label: 'مێژووی کار', icon: Briefcase },
      { id: 'cv', label: 'کارنامە (CV)', icon: FileText },
      { id: 'settings', label: 'ڕێکخستن', icon: Settings },
    ];

    return (
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-0 lg:p-6"
        style={{ animation: 'profileFadeUp 0.25s ease both' }}>
        <div
          className="w-full max-w-full lg:max-w-5xl bg-white rounded-none lg:rounded-[32px] min-h-screen lg:min-h-0 max-h-screen lg:max-h-[90vh] flex flex-col shadow-2xl border border-[#e4eae7] overflow-hidden"
          onClick={e => e.stopPropagation()} dir="rtl" style={{ fontFamily: NK }}
        >
          {/* Header Bar */}
          <div
            className="px-6 border-b border-[#f0f4f2] flex items-center justify-between bg-[#fbfdfc] shrink-0"
            style={{
              paddingTop: 'max(16px, calc(env(safe-area-inset-top) + 12px))',
              paddingBottom: '14px',
            }}
          >
            <button onClick={() => setShowEdit(false)} className="w-9 h-9 rounded-2xl bg-[#f0f4f2] text-[#4a5854] hover:bg-[#e4ece9] flex items-center justify-center transition active:scale-95">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-sm sm:text-base font-black text-[#111d1a]">
              {isEmployer ? 'دەستکاری پڕۆفایلی کۆمپانیا' : 'دەستکاری پڕۆفایل'}
            </h3>
          </div>

          <div
            className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-6"
            style={{
              paddingBottom: 'max(24px, calc(env(safe-area-inset-bottom) + 24px))',
            }}
          >

            {/* ──── RIGHT COLUMN: Sidebar Navigation (Cols 8-12 in RTL) ──── */}
            <div className="lg:col-span-4 p-5 lg:border-l border-[#f0f4f2] space-y-4 bg-[#fbfdfc] order-1 lg:order-2">
              <div className="bg-white rounded-3xl p-5 border border-[#e8eeec] shadow-2xs text-center space-y-3">
                <div
                  onClick={() => avatarRef.current?.click()}
                  className={`w-20 h-20 ${isEmployer ? 'rounded-2xl' : 'rounded-full'} mx-auto bg-[#c8eee6] border-2 border-[#12796b]/30 flex items-center justify-center text-2xl font-black text-[#12796b] overflow-hidden cursor-pointer relative group`}
                >
                  {displayAvatar ? (
                    <img src={displayAvatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span>{initial}</span>
                  )}
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white">
                    <Camera className="w-5 h-5" />
                  </div>
                </div>

                <div>
                  <h4 className="text-base font-black text-[#111d1a] truncate">{displayName}</h4>
                  <p className="text-xs text-[#7b8e88] font-bold mt-0.5 truncate">{displayTitle}</p>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-[#f4f7f6]">
                  <div className="flex items-center justify-between text-[11px] font-bold text-[#12796b]">
                    <span className="font-mono">{completion}%</span>
                    <span>تەواوی پڕۆفایل</span>
                  </div>
                  <ProgressBar pct={completion} />
                </div>
              </div>

              {/* Vertical Navigation Tabs */}
              <div className="space-y-1 text-xs font-bold">
                {tabs.map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeSection === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveSection(tab.id)}
                      className={`w-full flex items-center justify-between py-3 px-4 rounded-2xl transition-all ${
                        isActive
                          ? 'bg-[#d4f7ee] text-[#12796b] font-black shadow-xs'
                          : 'hover:bg-white text-[#5a6b65]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4" />
                        <span>{tab.label}</span>
                      </div>
                      <ChevronLeft className="w-3.5 h-3.5 rtl:rotate-0 rotate-180 opacity-50" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ──── LEFT COLUMN (Main Tab Content Area): Cols 1-8 in RTL ──── */}
            <div className="lg:col-span-8 p-6 lg:p-8 space-y-6 order-2 lg:order-1">

              {/* Top Form Header with Save & Cancel Buttons */}
              <div className="flex items-start justify-between gap-4 border-b border-[#f4f7f6] pb-5">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEdit(false)}
                    className="py-2.5 px-4 rounded-2xl bg-white border border-[#e8eeed] text-xs font-bold text-[#4a5854] hover:bg-[#f8faf9] active:scale-95 transition"
                  >
                    داخستن
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="py-2.5 px-6 rounded-2xl bg-[#12796b] hover:bg-[#0d5c50] text-white text-xs font-black shadow-sm flex items-center gap-2 active:scale-95 transition"
                  >
                    {saved ? <><CheckCircle2 className="w-4 h-4" /> پاشەکەوتکرا</> : <><Save className="w-4 h-4" /> {saving ? 'خەریکی...' : 'پاشەکەوتکردن'}</>}
                  </button>
                </div>

                <div className="text-right">
                  <h3 className="text-xl font-black text-[#111d1a]">
                    {tabs.find(t => t.id === activeSection)?.label}
                  </h3>
                  <p className="text-xs text-[#7b8e88] font-medium mt-0.5">
                    ئەم بەشە نوێ بکەرەوە و کلیک لە پاشەکەوتکردن بکە.
                  </p>
                </div>
              </div>

              {/* ── TAB 1: BASIC INFO (FREELANCER) ── */}
              {activeSection === 'basic' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5 text-right">
                      <label className="text-xs font-bold text-[#111d1a]">ناوی تەواو *</label>
                      <input
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="هەڵمەت ئازاد"
                        className="w-full bg-[#fbfdfc] border border-[#e8eeed] rounded-2xl px-4 py-3 text-xs font-bold text-[#111d1a] outline-none focus:border-[#12796b]"
                      />
                    </div>
                    <div className="space-y-1.5 text-right">
                      <label className="text-xs font-bold text-[#111d1a]">ناونیشانی پیشەیی</label>
                      <input
                        value={profession}
                        onChange={e => setProfession(e.target.value)}
                        placeholder="پەرەپێدەری وێب / دیزاینەر"
                        className="w-full bg-[#fbfdfc] border border-[#e8eeed] rounded-2xl px-4 py-3 text-xs font-bold text-[#111d1a] outline-none focus:border-[#12796b]"
                      />
                    </div>
                    <div className="space-y-1.5 text-right">
                      <label className="text-xs font-bold text-[#111d1a]">ژمارەی مۆبایل</label>
                      <input
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="+964 770 123 4567"
                        dir="ltr"
                        className="w-full bg-[#fbfdfc] border border-[#e8eeed] rounded-2xl px-4 py-3 text-xs font-bold font-mono text-right text-[#111d1a] outline-none focus:border-[#12796b]"
                      />
                    </div>
                    <div className="space-y-1.5 text-right">
                      <label className="text-xs font-bold text-[#111d1a]">ئیمەیڵ</label>
                      <input
                        value={email || user?.email || ''}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="info@ishkhwaz.iq"
                        dir="ltr"
                        className="w-full bg-[#fbfdfc] border border-[#e8eeed] rounded-2xl px-4 py-3 text-xs font-bold text-[#111d1a] outline-none focus:border-[#12796b]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 text-right">
                    <div className="flex items-center justify-between text-xs font-bold text-[#7b8e88]">
                      <span className="font-mono">{(bio || '').length}/600</span>
                      <label className="text-[#111d1a]">دەربارەی من</label>
                    </div>
                    <textarea
                      rows={4}
                      value={bio}
                      onChange={e => setBio(e.target.value)}
                      placeholder="سێ ساڵ ئەزموون لە بواری کاری ئازاد..."
                      className="w-full bg-[#fbfdfc] border border-[#e8eeed] rounded-2xl p-4 text-xs font-medium leading-relaxed text-[#111d1a] outline-none focus:border-[#12796b] resize-none"
                    />
                  </div>
                </div>
              )}

              {/* ── TAB 1: COMPANY INFO (EMPLOYER) ── */}
              {activeSection === 'company_info' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5 text-right">
                      <label className="text-xs font-bold text-[#111d1a]">ناوی فەرمی کۆمپانیا *</label>
                      <input
                        value={companyName}
                        onChange={e => setCompanyName(e.target.value)}
                        placeholder="کۆمپانیای ئاسۆ"
                        className="w-full bg-[#fbfdfc] border border-[#e8eeed] rounded-2xl px-4 py-3 text-xs font-bold text-[#111d1a] outline-none focus:border-[#12796b]"
                      />
                    </div>
                    <div className="space-y-1.5 text-right">
                      <label className="text-xs font-bold text-[#111d1a]">بواری کار (Industry)</label>
                      <input
                        value={industry}
                        onChange={e => setIndustry(e.target.value)}
                        placeholder="تەکنەلۆژیا، بیناسازی، پزیشکی..."
                        className="w-full bg-[#fbfdfc] border border-[#e8eeed] rounded-2xl px-4 py-3 text-xs font-bold text-[#111d1a] outline-none focus:border-[#12796b]"
                      />
                    </div>
                    <div className="space-y-1.5 text-right">
                      <label className="text-xs font-bold text-[#111d1a]">ژمارەی تەلەفۆنی فەرمی</label>
                      <input
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="+964 770 000 0000"
                        dir="ltr"
                        className="w-full bg-[#fbfdfc] border border-[#e8eeed] rounded-2xl px-4 py-3 text-xs font-bold font-mono text-right text-[#111d1a] outline-none focus:border-[#12796b]"
                      />
                    </div>
                    <div className="space-y-1.5 text-right">
                      <label className="text-xs font-bold text-[#111d1a]">ژمارەی تۆماری بازرگانی</label>
                      <input
                        value={companyReg}
                        onChange={e => setCompanyReg(e.target.value)}
                        placeholder="KR-123456"
                        dir="ltr"
                        className="w-full bg-[#fbfdfc] border border-[#e8eeed] rounded-2xl px-4 py-3 text-xs font-bold text-[#111d1a] outline-none focus:border-[#12796b]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 text-right">
                    <label className="text-xs font-bold text-[#111d1a]">دەربارەی کۆمپانیا و خزمەتگوزارییەکان</label>
                    <textarea
                      rows={4}
                      value={bio}
                      onChange={e => setBio(e.target.value)}
                      placeholder="ناساندنی کورتی کۆمپانیا و بواری سەرەکی کارەکانتان..."
                      className="w-full bg-[#fbfdfc] border border-[#e8eeed] rounded-2xl p-4 text-xs font-medium leading-relaxed text-[#111d1a] outline-none focus:border-[#12796b] resize-none"
                    />
                  </div>
                </div>
              )}

              {/* ── TAB 2: LOCATION ── */}
              {activeSection === 'location' && (
                <div className="space-y-4 animate-fadeIn text-right">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#111d1a]">پارێزگا</label>
                      <select
                        value={govId}
                        onChange={e => { setGovId(e.target.value); setDistId(''); }}
                        className="w-full bg-[#fbfdfc] border border-[#e8eeed] rounded-2xl px-4 py-3 text-xs font-bold text-[#111d1a] outline-none focus:border-[#12796b]"
                      >
                        {kurdistanGovernorates.map(g => (
                          <option key={g.id} value={g.id}>{g.name_ku}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#111d1a]">قەزا / ناوچە</label>
                      <select
                        value={distId}
                        onChange={e => setDistId(e.target.value)}
                        className="w-full bg-[#fbfdfc] border border-[#e8eeed] rounded-2xl px-4 py-3 text-xs font-bold text-[#111d1a] outline-none focus:border-[#12796b]"
                      >
                        <option value="">هەموو قەزاکان</option>
                        {dists.map(d => (
                          <option key={d.id} value={d.id}>{d.name_ku}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#f4faf8] border border-[#d4f7ee] text-xs font-bold text-[#12796b]">
                    📍 شوێنی دیاریکراو: {location}
                  </div>
                </div>
              )}

              {/* ── TAB 3: SKILLS (FREELANCER) ── */}
              {activeSection === 'skills' && (
                <div className="space-y-5 animate-fadeIn text-right">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#111d1a]">زیادکردنی شارەزایی</label>
                    <div className="flex gap-2">
                      <input
                        value={skillInput}
                        onChange={e => setSkillInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
                        placeholder="شارەزاییەک بنووسە و ئینتەر دابگرە..."
                        className="flex-1 bg-[#fbfdfc] border border-[#e8eeed] rounded-2xl px-4 py-3 text-xs font-bold text-[#111d1a] outline-none focus:border-[#12796b]"
                      />
                      <button
                        type="button"
                        onClick={() => addSkill()}
                        className="px-5 py-3 rounded-2xl bg-[#12796b] text-white text-xs font-black hover:bg-[#0d5c50] transition"
                      >
                        زیادکردن
                      </button>
                    </div>
                  </div>

                  {/* Added skills chips */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#7b8e88]">شارەزاییە هەڵبژێردراوەکان ({skills.length}):</label>
                    <div className="flex flex-wrap gap-2 min-h-[50px] p-3 rounded-2xl bg-[#f8faf9] border border-[#e8eeed]">
                      {skills.map(s => (
                        <span key={s} className="px-3 py-1.5 rounded-xl bg-white border border-[#dce5e1] text-xs font-bold text-stone-800 flex items-center gap-1.5 shadow-2xs">
                          {s}
                          <button type="button" onClick={() => removeSkill(s)} className="text-stone-400 hover:text-rose-500"><X className="w-3.5 h-3.5" /></button>
                        </span>
                      ))}
                      {skills.length === 0 && (
                        <span className="text-xs text-stone-400 my-auto">هیچ شارەزاییەک زیاد نەکراوە.</span>
                      )}
                    </div>
                  </div>

                  {/* Suggestions */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#7b8e88]">پێشنیارە باوەکان:</label>
                    <div className="flex flex-wrap gap-1.5">
                      {SUGGESTED_SKILLS.filter(s => !skills.includes(s)).map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => addSkill(s)}
                          className="px-3 py-1 rounded-xl bg-white border border-stone-200 text-[11px] font-bold text-stone-600 hover:border-[#12796b] hover:text-[#12796b] transition"
                        >
                          + {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB 4: EXPERIENCE (FREELANCER) ── */}
              {activeSection === 'experience' && (
                <div className="space-y-5 animate-fadeIn text-right">
                  <div className="p-4 rounded-2xl bg-[#f8faf9] border border-[#e8eeed] space-y-3">
                    <h4 className="text-xs font-black text-stone-900">زیادکردنی ئەزموونی نوێ</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        value={expTitle}
                        onChange={e => setExpTitle(e.target.value)}
                        placeholder="ناونیشانی کار / پڕۆژە *"
                        className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold"
                      />
                      <input
                        value={expPeriod}
                        onChange={e => setExpPeriod(e.target.value)}
                        placeholder="ماوە (نموونە: 2022 — 2024)"
                        className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold"
                      />
                    </div>
                    <input
                      value={expLink}
                      onChange={e => setExpLink(e.target.value)}
                      placeholder="لینکی پڕۆژە یان پۆرتفۆلیۆ (ئارەزوومەندانە)"
                      dir="ltr"
                      className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold"
                    />
                    <textarea
                      rows={2}
                      value={expDesc}
                      onChange={e => setExpDesc(e.target.value)}
                      placeholder="ڕوونکردنەوەی کورت دەربارەی پڕۆژە یان کارەکە..."
                      className="w-full bg-white border border-stone-200 rounded-xl p-3 text-xs font-medium resize-none"
                    />
                    <button
                      type="button"
                      onClick={addExperience}
                      className="w-full py-2.5 rounded-xl bg-[#12796b] text-white text-xs font-black hover:bg-[#0d5c50] transition flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" /> زیادکردنی ئەزموون
                    </button>
                  </div>

                  {/* List of existing experiences */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-stone-700">مێژووی تۆمارکراو ({experiences.length})</label>
                    {experiences.map((exp, idx) => (
                      <div key={exp.id || idx} className="p-3.5 rounded-2xl bg-white border border-stone-200 flex items-start justify-between gap-3 shadow-2xs">
                        <button type="button" onClick={() => removeExperience(idx)} className="text-stone-400 hover:text-rose-500 transition p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="text-right flex-1 min-w-0">
                          <div className="text-xs font-black text-stone-900">{exp.title}</div>
                          <div className="text-[11px] text-stone-400 font-mono mt-0.5">{exp.period}</div>
                          {exp.description && <p className="text-[11px] text-stone-600 mt-1">{exp.description}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── TAB: BRANDING (EMPLOYER) ── */}
              {activeSection === 'branding' && (
                <div className="space-y-5 animate-fadeIn text-right">
                  <div className="p-4 rounded-2xl bg-[#f8faf9] border border-stone-200 space-y-3">
                    <label className="text-xs font-bold text-stone-900 block">لۆگۆی کۆمپانیا</label>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-white border border-stone-200 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                        {displayAvatar ? (
                          <img src={displayAvatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xl font-black text-[#12796b]">{initial}</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => avatarRef.current?.click()}
                        className="px-4 py-2.5 rounded-xl bg-white border border-stone-300 text-xs font-bold text-stone-700 hover:bg-stone-50 transition"
                      >
                        گۆڕینی لۆگۆ
                      </button>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#f8faf9] border border-stone-200 space-y-3">
                    <label className="text-xs font-bold text-stone-900 block">وێنەی کەڤەری کۆمپانیا</label>
                    <div className="h-28 w-full rounded-2xl border border-stone-200 overflow-hidden relative" style={{ background: cover ? `url(${cover}) center/cover` : 'linear-gradient(135deg, #12796b, #2db89f)' }}>
                      <button
                        type="button"
                        onClick={() => coverRef.current?.click()}
                        className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-white/90 text-stone-800 text-xs font-bold shadow-md hover:bg-white transition flex items-center gap-1.5"
                      >
                        <Camera className="w-3.5 h-3.5" /> گۆڕینی کەڤەر
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB: PHOTOS (FREELANCER) ── */}
              {activeSection === 'photos' && (
                <div className="space-y-5 animate-fadeIn text-right">
                  <div className="p-4 rounded-2xl bg-[#f8faf9] border border-stone-200 space-y-3">
                    <label className="text-xs font-bold text-stone-900 block">وێنەی پرۆفایل</label>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-white border border-stone-200 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                        {displayAvatar ? (
                          <img src={displayAvatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xl font-black text-[#12796b]">{initial}</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => avatarRef.current?.click()}
                        className="px-4 py-2.5 rounded-xl bg-white border border-stone-300 text-xs font-bold text-stone-700 hover:bg-stone-50 transition"
                      >
                        گۆڕینی وێنە
                      </button>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#f8faf9] border border-stone-200 space-y-3">
                    <label className="text-xs font-bold text-stone-900 block">وێنەی کەڤەر</label>
                    <div className="h-28 w-full rounded-2xl border border-stone-200 overflow-hidden relative" style={{ background: cover ? `url(${cover}) center/cover` : 'linear-gradient(135deg, #12796b, #2db89f)' }}>
                      <button
                        type="button"
                        onClick={() => coverRef.current?.click()}
                        className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-white/90 text-stone-800 text-xs font-bold shadow-md hover:bg-white transition flex items-center gap-1.5"
                      >
                        <Camera className="w-3.5 h-3.5" /> گۆڕینی کەڤەر
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB: CV (FREELANCER) ── */}
              {activeSection === 'cv' && (
                <div className="space-y-4 animate-fadeIn text-right">
                  <div className="p-5 rounded-2xl bg-[#f4faf8] border border-[#d4f7ee] space-y-2">
                    <div className="flex items-center gap-2 text-[#12796b] font-black text-sm">
                      <FileCheck className="w-5 h-5" />
                      <span>کارنامەی کەسی و فەرمی (CV)</span>
                    </div>
                    <p className="text-xs text-[#3a7c73] leading-relaxed">
                      دەتوانیت کارنامەی خۆت بە شێوازی ئەدیتۆریال و پرۆفیشناڵ لە بەشی تایبەتی کارنامەکان دروست بکەیت یان فایلی تایبەت باربکەیت.
                    </p>
                    <button
                      type="button"
                      onClick={() => { setShowEdit(false); onNavigate?.('resumes'); }}
                      className="mt-2 px-5 py-2.5 rounded-xl bg-[#12796b] text-white text-xs font-black hover:bg-[#0d5c50] transition"
                    >
                      چوون بۆ بەڕێوەبردنی کارنامەکان →
                    </button>
                  </div>
                </div>
              )}

              {/* ── TAB: SETTINGS ── */}
              {activeSection === 'settings' && (
                <div className="space-y-4 animate-fadeIn text-right">
                  <div className="p-4 rounded-2xl bg-[#f8faf9] border border-stone-200 flex items-center justify-between">
                    <button type="button" onClick={handleTogglePush} disabled={pushBusy}
                      className="w-12 h-6 rounded-full p-1 flex items-center transition-colors duration-300"
                      style={{ background: pushEnabled ? TEAL : '#cbd5d3', justifyContent: pushEnabled ? 'flex-end' : 'flex-start' }}>
                      <span className="w-4 h-4 rounded-full bg-white shadow-sm block" />
                    </button>
                    <div>
                      <div className="text-xs font-bold text-stone-900">ئاگادارکردنەوەکانی نۆتیفیکەیشن</div>
                      <div className="text-[11px] text-stone-400 mt-0.5">{pushEnabled ? 'چالاککراوە' : 'ناچالاکە'}</div>
                    </div>
                  </div>

                </div>
              )}

            </div>

          </div>

        </div>
      </div>
    );
  };

  /* ── Settings modal ── */
  const SettingsModal = () => (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ animation: 'profileFadeUp 0.25s ease both' }}>
      <div className="w-full max-w-md bg-white rounded-t-[32px] sm:rounded-[32px] max-h-[85vh] flex flex-col shadow-2xl border border-[#e4eae7] overflow-hidden"
        onClick={e => e.stopPropagation()} dir="rtl" style={{ fontFamily: NK }}>
        <div className="p-5 border-b border-[#f0f4f2] flex items-center justify-between bg-[#fbfdfc]">
          <button onClick={() => setShowSettings(false)} className="w-9 h-9 rounded-full bg-[#f0f4f2] flex items-center justify-center transition"><X className="w-5 h-5 text-[#4a5854]" /></button>
          <h3 className="text-lg font-black" style={{ color: '#1a2321' }}>ڕێکخستنەکان</h3>
        </div>
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-right">
          {/* Push */}
          <div className="p-4 rounded-2xl flex items-center justify-between" style={{ background: CARD, border: '1px solid #e4eae7' }}>
            <button type="button" onClick={handleTogglePush} disabled={pushBusy}
              className="w-12 h-6 rounded-full p-1 flex items-center transition-colors duration-300"
              style={{ background: pushEnabled ? TEAL : '#cbd5d3', justifyContent: pushEnabled ? 'flex-end' : 'flex-start' }}>
              <span className="w-4 h-4 rounded-full bg-white shadow-sm block" />
            </button>
            <div className="flex items-center gap-3">
              <div>
                <div className="text-xs font-bold" style={{ color: '#1a2321' }}>ئاگادارکردنەوەکان</div>
                <div className="text-[11px] mt-0.5" style={{ color: '#7b8e88' }}>{pushEnabled ? 'چالاکە' : 'ناچالاکە'}</div>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#e8f7f4' }}>
                <Bell className="w-5 h-5" style={{ color: TEAL }} />
              </div>
            </div>
          </div>
          {/* Plans */}
          <div onClick={() => { soundService.playTick?.(); setShowSettings(false); onNavigate?.('plans'); }}
            className="p-4 rounded-2xl flex items-center justify-between cursor-pointer hover:shadow-sm transition"
            style={{ background: 'linear-gradient(90deg, #dcf8f2, #edfcf8)', border: '1px solid #c1ede3' }}>
            <ChevronLeft className="w-4 h-4" style={{ color: TEAL }} />
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs font-black" style={{ color: '#123e37' }}>پلانەکانی ئیش خواز</div>
                <div className="text-[11px] font-medium mt-0.5" style={{ color: '#36796f' }}>بەرزکردنەوەی هەژمار</div>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm" style={{ background: TEAL }}>
                <Sparkles className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
          {/* How it works */}
          <div onClick={() => { soundService.playTick?.(); setShowSettings(false); onNavigate?.('how_it_works'); }}
            className="p-4 rounded-2xl flex items-center justify-between cursor-pointer hover:shadow-sm transition"
            style={{ background: CARD, border: '1px solid #e4eae7' }}>
            <ChevronLeft className="w-4 h-4" style={{ color: TEAL }} />
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs font-black" style={{ color: '#1a2321' }}>چۆنیەتی کارکردنی ئەپ</div>
                <div className="text-[11px] font-medium mt-0.5" style={{ color: '#7b8e88' }}>چوونەژوورەوە و بەکارهێنانی سیستەم</div>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#e8f7f4' }}>
                <HelpCircle className="w-5 h-5" style={{ color: TEAL }} />
              </div>
            </div>
          </div>
          {/* About the app */}
          <div onClick={() => { soundService.playTick?.(); setShowSettings(false); setShowAbout(true); }}
            className="p-4 rounded-2xl flex items-center justify-between cursor-pointer hover:shadow-sm transition"
            style={{ background: CARD, border: '1px solid #e4eae7' }}>
            <ChevronLeft className="w-4 h-4" style={{ color: TEAL }} />
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs font-black" style={{ color: '#1a2321' }}>دەربارەی ئیش خواز</div>
                <div className="text-[11px] font-medium mt-0.5" style={{ color: '#7b8e88' }}>زانیاری و پەیوەندی پشتگیری</div>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#e8f7f4' }}>
                <Info className="w-5 h-5" style={{ color: TEAL }} />
              </div>
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-[#f0f4f2] bg-[#fbfdfc]">
          <button onClick={() => setShowSettings(false)} className="w-full py-3 rounded-2xl text-white font-bold text-xs transition" style={{ background: '#111d1a' }}>داخستن</button>
        </div>
      </div>
    </div>
  );

  /* ── Saved jobs modal ── */
  const SavedModal = () => (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ animation: 'profileFadeUp 0.25s ease both' }}>
      <div className="w-full max-w-lg bg-white rounded-t-[32px] sm:rounded-[32px] max-h-[85vh] flex flex-col shadow-2xl border border-[#e4eae7] overflow-hidden"
        onClick={e => e.stopPropagation()} dir="rtl" style={{ fontFamily: NK }}>
        <div className="p-5 border-b border-[#f0f4f2] flex items-center justify-between bg-[#fbfdfc]">
          <button onClick={() => setShowSaved(false)} className="w-9 h-9 rounded-full bg-[#f0f4f2] flex items-center justify-center transition"><X className="w-5 h-5 text-[#4a5854]" /></button>
          <h3 className="text-lg font-black flex items-center gap-2" style={{ color: '#1a2321' }}>
            <Heart className="w-5 h-5 fill-rose-500 text-rose-500" /> کارە پاشەکەوتکراوەکان ({savedList.length})
          </h3>
        </div>
        <div className="p-5 overflow-y-auto space-y-2.5 flex-1 text-right">
          {savedList.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <div className="w-14 h-14 rounded-full bg-[#f0f4f2] mx-auto flex items-center justify-center"><Heart className="w-6 h-6 text-[#8a9b95]" /></div>
              <p className="text-xs font-bold" style={{ color: '#62736e' }}>هیچ کارێکت پاشەکەوت نەکردووە.</p>
              <button onClick={() => { setShowSaved(false); onNavigate?.('search'); }}
                className="px-4 py-2 rounded-xl text-white text-xs font-bold transition" style={{ background: TEAL }}>
                گەڕان بەدوای کارەکان →
              </button>
            </div>
          ) : savedList.map(job => (
            <div key={job.id} className="p-3.5 rounded-2xl border flex items-center justify-between gap-3 hover:bg-white hover:shadow-sm transition"
              style={{ background: CARD, borderColor: '#e4eae7' }}>
              <button onClick={() => { soundService.playTick?.(); toggleSaveJob(job.id); }} className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 transition shrink-0"><Trash2 className="w-4 h-4" /></button>
              <div className="flex-1 min-w-0 text-right cursor-pointer" onClick={() => { setShowSaved(false); onNavigate?.('home'); }}>
                <div className="text-xs font-black truncate" style={{ color: '#1a2321' }}>{job.title_ku || job.title}</div>
                <div className="text-[11px] truncate mt-0.5" style={{ color: '#7b8e88' }}>{job.company_name} · {job.governorate || 'سلێمانی'}</div>
              </div>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#e8f7f4' }}><Briefcase className="w-4 h-4" style={{ color: TEAL }} /></div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-[#f0f4f2] bg-[#fbfdfc]">
          <button onClick={() => setShowSaved(false)} className="w-full py-3 rounded-2xl text-white font-bold text-xs transition" style={{ background: '#111d1a' }}>داخستن</button>
        </div>
      </div>
    </div>
  );

  /* ── Viewers modal ── */
  const ViewersModal = () => (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ animation: 'profileFadeUp 0.25s ease both' }}>
      <div className="w-full max-w-md bg-white rounded-t-[32px] sm:rounded-[32px] max-h-[85vh] flex flex-col shadow-2xl border border-[#e4eae7] overflow-hidden"
        onClick={e => e.stopPropagation()} dir="rtl" style={{ fontFamily: NK }}>
        <div className="p-5 border-b border-[#f0f4f2] flex items-center justify-between bg-[#fbfdfc]">
          <button onClick={() => setShowViewers(false)} className="w-9 h-9 rounded-full bg-[#f0f4f2] flex items-center justify-center transition"><X className="w-5 h-5 text-[#4a5854]" /></button>
          <h3 className="text-lg font-black flex items-center gap-2" style={{ color: '#1a2321' }}><Eye className="w-5 h-5" style={{ color: TEAL }} /> بینەرانی پڕۆفایل</h3>
        </div>
        <div className="p-5 overflow-y-auto space-y-3 flex-1 text-right">
          <div className="p-3.5 rounded-2xl text-xs font-bold text-center" style={{ background: '#e8f7f4', border: '1px solid #c1ede3', color: '#1e584f' }}>
            پڕۆفایلەکەت بە گشتی <strong>{profileViews}</strong> جار بینراوە.
          </div>
          {viewersState.viewers?.length > 0
            ? viewersState.viewers.map((v, i) => (
              <div key={i} className="p-3 rounded-xl border flex items-center justify-between text-xs" style={{ background: CARD, borderColor: '#e4eae7' }}>
                <span className="font-bold" style={{ color: '#1a2321' }}>{v.viewer_company_name || v.viewer_name || 'کۆمپانیایەک'}</span>
                <span dir="ltr" className="font-mono" style={{ fontSize: '10px', color: '#7b8e88' }}>{new Date(v.viewed_at).toLocaleDateString('en-GB')}</span>
              </div>
            ))
            : <div className="text-center py-8 text-xs font-bold" style={{ color: '#7b8e88' }}>بینەرە نوێیەکان لێرەدا دەردەکەون.</div>}
        </div>
        <div className="p-4 border-t border-[#f0f4f2] bg-[#fbfdfc]">
          <button onClick={() => setShowViewers(false)} className="w-full py-3 rounded-2xl text-white font-bold text-xs" style={{ background: '#111d1a' }}>داخستن</button>
        </div>
      </div>
    </div>
  );

  /* ── Logout modal ── */
  const LogoutModal = () => (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      style={{ animation: 'profileFadeUp 0.2s ease both' }}>
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 text-center shadow-2xl border border-[#e4eae7] space-y-4"
        onClick={e => e.stopPropagation()} dir="rtl" style={{ fontFamily: NK }}>
        <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-500 mx-auto flex items-center justify-center"><LogOut className="w-6 h-6" /></div>
        <div>
          <h3 className="text-lg font-black" style={{ color: '#1a2321' }}>چوونەدەرەوە لە ئەژمێر؟</h3>
          <p className="text-xs font-medium mt-1" style={{ color: '#62736e' }}>ئایا دڵنیایت لە چوونەدەرەوە لە ئەژمێری ئیش خوازەکەت؟</p>
        </div>
        <div className="flex items-center gap-2 pt-2">
          <button onClick={() => setShowLogout(false)}
            className="flex-1 py-3 px-4 rounded-xl text-xs font-bold transition" style={{ background: '#f0f4f2', color: '#4a5854' }}>
            پاشگەزبوونەوە
          </button>
          <button onClick={() => { soundService.playTick?.(); setShowLogout(false); logout?.(); }}
            className="flex-1 py-3 px-4 rounded-xl text-white font-bold text-xs transition shadow-sm" style={{ background: '#dc2626' }}>
            بەڵێ، چوونەدەرەوە
          </button>
        </div>
      </div>
    </div>
  );

  /* ══════════════════════════════════════════════════════════════════
     ROOT RENDER
  ══════════════════════════════════════════════════════════════════ */
  return (
    <div className="w-full min-h-screen pb-24 pt-2 px-3 sm:px-5 lg:px-8" style={{ background: '#f0f4f2' }}>
      <input ref={avatarRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
      <input ref={coverRef} type="file" accept="image/*" onChange={handleCoverChange} className="hidden" />

      <ProfileHero />

      {showEdit     && <EditModal />}
      {showSettings && <SettingsModal />}
      {showSaved    && <SavedModal />}
      {showViewers  && <ViewersModal />}
      {showLogout   && <LogoutModal />}
      {showAbout    && <AboutModal onClose={() => setShowAbout(false)} />}
    </div>
  );
};
