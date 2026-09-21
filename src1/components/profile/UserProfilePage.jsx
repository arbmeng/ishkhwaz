import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { soundService } from '../../services/soundService';
import { kurdistanGovernorates } from '../../data/kurdistanLocations';
import { compressImageFile } from '../../utils/image';
import { getPlanColor } from '../../utils/planPresets';
import { apiService } from '../../services/api';
import { pushService } from '../../services/pushService';
import { AboutModal } from '../layout/AboutModal';
import { PlanBadge } from '../ui/PlanBadge';
import { canSeePlans } from '../../config/features';
import {
  Settings, Share2, Camera, FileText, Eye, CheckCircle2, Save,
  Heart, Trash2, Briefcase, ChevronLeft, LogOut, User,
  Bell, MapPin, Plus, X, Layers, Sparkles, Building2,
  ExternalLink, ShieldCheck, FileCheck,
  HelpCircle, Info, MailWarning, Loader2, Activity, Award, Target, UserRoundCheck, Zap, Globe2
} from 'lucide-react';

/* ─── Design tokens ─────────────────────────────────────────────── */
const NK = "'Noto Kufi Arabic', 'Vazirmatn', system-ui, sans-serif";
// Deliberately muted/neutral — the previous bright mint-pastel palette,
// heavy corner-rounding and animated shimmer/pulse effects read as too
// playful for a page employers also use professionally. Kept teal as the
// single accent color, dropped the candy-mint backgrounds for neutral gray.
const TEAL = '#12796b';
const TEAL_DEEP = '#0d5c50';
const TEAL2 = '#245e56';
const MINT = '#eef1f0';
const MINT2 = '#f4f5f4';
const BORDER = '#dde3e0';
const TXT = '#161f1c';
const SUB = '#425049';
const MUTED = '#6b7975';
const CARD = '#f6f7f6';

// Components defined *inside* UserProfilePage used to be a brand-new component type on every
// render, so React unmounted and remounted the whole profile (avatar flicker, reset scroll,
// wiped form fields) every time anything above it changed — e.g. the 30 s background sync.
// This keeps one stable component identity while still rendering the latest closure.
const useStable = (render) => {
  const ref = useRef(render);
  ref.current = render;
  return useMemo(() => function Stable(props) { return ref.current(props); }, []);
};

const Field = ({ label, children }) => (
  <div className="space-y-1.5 text-right">
    <label className="text-xs font-bold" style={{ color: TXT }}>{label}</label>
    {children}
  </div>
);

const SectionCard = ({ title, icon: SIcon, children, className = '' }) => (
  <div className={`rounded-2xl border p-5 space-y-4 ${className}`} style={{ background: '#fff', borderColor: '#eef3f1', boxShadow: '0 1px 3px rgba(17,61,54,.04)' }}>
    {title && (
      <div className="flex items-center gap-2 pb-3 border-b" style={{ borderColor: '#f4f7f6' }}>
        {SIcon && (
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#eef7f5', color: TEAL }}>
            <SIcon className="w-3.5 h-3.5" />
          </div>
        )}
        <h4 className="text-xs font-black" style={{ color: TXT }}>{title}</h4>
      </div>
    )}
    {children}
  </div>
);

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

/* ─── Bento card section head (eyebrow + title + optional link) ──── */
const BentoHead = ({ eyebrow, title, link, onLink }) => (
  <div className="flex items-center justify-between mb-3.5">
    {link && (
      <button onClick={onLink} className="text-[11px] font-black flex items-center gap-1 hover:underline" style={{ color: TEAL }}>
        {link} <ChevronLeft className="w-3 h-3 rtl:rotate-180" />
      </button>
    )}
    <div>
      <span className="text-[11px] font-black uppercase tracking-wide block" style={{ color: TEAL }}>{eyebrow}</span>
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
  const [showEdit, setShowEdit] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [copied, setCopied] = useState(false);

  /* ── push ── */
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  useEffect(() => {
    if (!showSettings) return;
    const onKey = (e) => { if (e.key === 'Escape') setShowSettings(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showSettings]);

  /* ── email verification ── */
  const [resendBusy, setResendBusy] = useState(false);
  const needsEmailVerification = Boolean(user?.email) && !Number(user?.email_verified);
  const handleResendVerification = async () => {
    soundService.playTick?.();
    setResendBusy(true);
    const res = await apiService.resendVerificationEmail(token);
    setResendBusy(false);
    if (res?.success) {
      addToast?.({ title: 'نێردرا ✓', message: 'ئیمەیلی دڵنیاکردنەوە نێردرایەوە — سندوقی نامەکانت بپشکنە.', type: 'success' });
    } else {
      addToast?.({ title: 'هەڵە', message: res?.message || 'ناردنی ئیمەیل سەرکەوتوو نەبوو.', type: 'warning' });
    }
  };

  /* ── viewers ── */
  const [viewersState, setViewersState] = useState({ loaded: false, viewers: [] });

  /* ── form state — seeded from real user ── */
  const [name, setName] = useState('');
  const [profession, setProfession] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState('');
  const [cover, setCover] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [companyReg, setCompanyReg] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [saved, setSaved] = useState(false);

  /* ── location ── */
  const [govId, setGovId] = useState('sulaymaniyah');
  const [distId, setDistId] = useState('');
  const [subId, setSubId] = useState('');

  /* ── skills / experiences ── */
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [experiences, setExperiences] = useState([]);
  const [expTitle, setExpTitle] = useState('');
  const [expPeriod, setExpPeriod] = useState('');
  const [expDesc, setExpDesc] = useState('');
  const [expLink, setExpLink] = useState('');

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
    setDistId(user.districtId || user.district || '');
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
      } catch { }
    })();
  }, []);

  /* ── viewers ── */
  useEffect(() => {
    if (!token) return;
    apiService.getProfileViewers(token).then((res) => setViewersState({ loaded: true, ...res })).catch(() => { });
  }, [token]);

  /* ── location objects ── */
  const govObj = kurdistanGovernorates.find(g => g.id === govId || g.name_ku === govId) || kurdistanGovernorates[0];
  const dists = govObj?.districts || [];
  const distObj = dists.find(d => d.id === distId || d.name_ku === distId) || dists[0];
  const subs = distObj?.subDistricts || [];
  const subObj = subs.find(s => s.id === subId || s.name_ku === subId);
  const location = [govObj?.name_ku, distObj?.name_ku, subObj?.name_ku].filter(Boolean).join('، ');

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
  const displayName = isEmployer ? (companyName || user?.company_name || user?.name || 'کۆمپانیا') : (name || user?.name || 'بەکارهێنەر');
  // For an employer, the subtitle under the name is the OWNER's own job
  // title (e.g. "گەشەپێدەر") — not the company's industry, which already
  // has its own field/section further down the page.
  const displayTitle = isEmployer ? (profession || user?.profession || 'خاوەنکار') : (profession || user?.profession || 'کارخواز');
  const displayAvatar = avatar || user?.avatar || user?.company_logo || '';
  const initial = displayName.trim().charAt(0) || (isEmployer ? 'ک' : 'ئ');
  const joinYear = user?.created_at ? new Date(user.created_at).getFullYear() : null;
  const userPlanTier = planTiers.find(t => t.id === user?.plan);
  // The free tier's real id is a generated string (e.g. "_fc74"), never the
  // literal "free" — comparing against that literal meant every user (auto-
  // assigned the free plan at signup) showed a VIP badge on their own profile.
  const isVIP = !!userPlanTier && Number(userPlanTier.price) > 0;
  const planAccent = userPlanTier ? (getPlanColor(userPlanTier.color).gradient || getPlanColor(userPlanTier.color).accent) : TEAL;

  const completion = useMemo(() => {
    let s = 0;
    if (displayAvatar) s += 20;
    if ((bio || user?.bio || '').length > 10) s += 20;
    if (isEmployer) {
      if (companyName || user?.company_name) s += 20;
      if (industry || user?.industry) s += 20;
      if (phone || user?.phone) s += 20;
    } else {
      if (skills.length > 0 || parseJsonArray(user?.skills).length > 0) s += 20;
      if (govId || user?.governorate) s += 20;
      if ((phone || user?.phone) || (profession || user?.profession)) s += 20;
    }
    return Math.min(Math.max(s, 20), 100);
  }, [displayAvatar, bio, skills, govId, phone, profession, user, isEmployer, companyName, industry]);

  const profileViews = Number(user?.profile_views) || 0;
  const applCount = applications.length;
  const savedCount = savedJobIds.length;
  const savedList = jobs.filter(j => savedJobIds.includes(j.id));

  /* ── handlers ── */
  const handleShare = () => {
    soundService.playTick?.();
    const link = isEmployer
      ? `${window.location.origin}/search?company=${encodeURIComponent(displayName)}`
      : `${window.location.origin}/search/freelancers/${user?.id || ''}`;

    if (navigator.share) {
      navigator.share({ title: `${displayName} — ئیش خواز`, url: link }).catch(() => { });
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
      sub_district: subObj?.name_ku || '',
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
      sub_district: subObj?.name_ku || '',
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
      try { const reg = await navigator.serviceWorker.ready; const sub = await reg.pushManager.getSubscription(); if (sub) await sub.unsubscribe(); setPushEnabled(false); } catch { }
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
    `;
    document.head.appendChild(style);
  }, []);

  /* ══════════════════════════════════════════════════════════════════
     PREMIUM PROFILE COMMAND BAR — responsive across phone/tablet/desktop
  ══════════════════════════════════════════════════════════════════ */
  const ProfileCommandBar = () => {
    const completionLabel = completion >= 90 ? 'پڕۆفایلی تەواو' : completion >= 70 ? 'نزیکەی تەواو' : 'پێویستی بە نوێکردنەوە هەیە';
    return (
      <section className="profile-commandbar mb-5" dir="rtl" style={{ fontFamily: NK }}>
        <div className="relative overflow-hidden rounded-[26px] border border-[#dce8e4] bg-white shadow-[0_14px_45px_rgba(17,61,54,.08)]">
          <div className="absolute inset-0 pointer-events-none opacity-60"
            style={{ background: 'radial-gradient(circle at 8% 15%, rgba(15,107,95,.13), transparent 30%), radial-gradient(circle at 90% 90%, rgba(36,94,86,.09), transparent 34%)' }} />
          <div className="relative p-4 sm:p-5 lg:p-6">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black"
                    style={{ background: '#eaf5f2', color: TEAL_DEEP }}>
                    <Activity className="w-3 h-3" /> پڕۆفایلی پیشەیی
                  </span>
                  {isVIP && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black text-white"
                      style={{ background: planAccent }}>
                      <Award className="w-3 h-3" /> VIP
                    </span>
                  )}
                </div>
                <h2 className="text-xl sm:text-2xl lg:text-[28px] font-black tracking-tight" style={{ color: TXT }}>
                  {isEmployer ? `کۆمپانیای ${displayName}` : `بەخێربێیت، ${displayName}`}
                </h2>
                <p className="text-[11px] sm:text-xs font-medium mt-1.5 max-w-2xl leading-6" style={{ color: MUTED }}>
                  {isEmployer
                    ? 'پڕۆفایلی کۆمپانیاکەت بە شێوەیەکی پیشەیی ڕێکبخە بۆ ئەوەی کاندیدەکان زووتر باوەڕت پێ بکەن.'
                    : 'پڕۆفایلێکی بەهێزتر دەبێتە ناسنامەی پیشەیی تۆ و یارمەتیت دەدات لەگەڵ هەلی کارە گونجاوەکاندا دیارتر بیت.'}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full lg:w-auto lg:min-w-[390px]">
                <div className="rounded-2xl border p-3 bg-[#fbfdfc]" style={{ borderColor: '#e5eeeb' }}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black" style={{ color: MUTED }}>تەواوی</span>
                    <Target className="w-3.5 h-3.5" style={{ color: TEAL }} />
                  </div>
                  <div className="text-lg sm:text-xl font-black font-mono mt-1" style={{ color: TXT }}>{completion}%</div>
                  <div className="text-[9px] font-bold mt-0.5 truncate" style={{ color: TEAL }}>{completionLabel}</div>
                </div>
                <div className="rounded-2xl border p-3 bg-[#fbfdfc]" style={{ borderColor: '#e5eeeb' }}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black" style={{ color: MUTED }}>بینین</span>
                    <Eye className="w-3.5 h-3.5" style={{ color: TEAL }} />
                  </div>
                  <div className="text-lg sm:text-xl font-black font-mono mt-1" style={{ color: TXT }}>{profileViews}</div>
                  <div className="text-[9px] font-bold mt-0.5 truncate" style={{ color: MUTED }}>بینینی پڕۆفایل</div>
                </div>
                <div className="rounded-2xl border p-3 bg-[#fbfdfc]" style={{ borderColor: '#e5eeeb' }}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black" style={{ color: MUTED }}>{isEmployer ? 'هەلی کار' : 'داواکاری'}</span>
                    <Briefcase className="w-3.5 h-3.5" style={{ color: TEAL }} />
                  </div>
                  <div className="text-lg sm:text-xl font-black font-mono mt-1" style={{ color: TXT }}>{isEmployer ? employerJobs.length : applCount}</div>
                  <div className="text-[9px] font-bold mt-0.5 truncate" style={{ color: MUTED }}>{isEmployer ? 'بڵاوکراوە' : 'نێردراوە'}</div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row gap-2.5">
              <button onClick={() => { soundService.playTick?.(); setShowEdit(true); }}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-white text-xs font-black shadow-[0_8px_20px_rgba(15,107,95,.18)] hover:-translate-y-0.5 transition"
                style={{ background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DEEP})` }}>
                <UserRoundCheck className="w-4 h-4" />
                {isEmployer ? 'نوێکردنەوەی پڕۆفایل' : 'بەهێزکردنی پڕۆفایل'}
              </button>
              {!isEmployer && (
                <button onClick={() => { soundService.playTick?.(); onNavigate?.('resumes'); }}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border text-xs font-black hover:bg-[#f4faf8] transition"
                  style={{ borderColor: '#dbe7e3', color: TEAL_DEEP, background: '#fff' }}>
                  <FileText className="w-4 h-4" /> بەڕێوەبردنی CV
                </button>
              )}
              <div className="hidden lg:flex items-center gap-2 mr-auto text-[10px] font-bold" style={{ color: MUTED }}>
                <Zap className="w-3.5 h-3.5" style={{ color: TEAL }} />
                {location || 'سلێمانی'} <Globe2 className="w-3 h-3 mr-1" />
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  };

  /* ══════════════════════════════════════════════════════════════════
     PROFILE HERO — identity rail + bento grid, one responsive layout
     shared by mobile and desktop (rail stacks on top below 1024px)
  ══════════════════════════════════════════════════════════════════ */

  /* ══════════════════════════════════════════════════════════════════
     SNAP-INSPIRED PROFILE — simple, social, fast
     Visual direction: centered identity, strong avatar, compact stats,
     white surfaces, warm yellow accent, black typography.
  ══════════════════════════════════════════════════════════════════ */
  const ProfileHeroImpl = () => (
    <div className="snap-profile w-full max-w-4xl mx-auto" dir="rtl" style={{ fontFamily: NK }}>
      <div className="snap-topbar">
        <button type="button" onClick={() => { soundService.playTick?.(); setShowSettings(true); }}
          className="snap-settings-btn" aria-label="ڕێکخستنەکان" aria-haspopup="dialog">
          <Settings className="w-[18px] h-[18px]" />
          <span>ڕێکخستن</span>
        </button>
        <span className="snap-page-title">{isEmployer ? 'پڕۆفایلی کۆمپانیا' : 'پڕۆفایل'}</span>
        <button type="button" onClick={handleShare} className="snap-icon-btn" aria-label="هاوبەشکردن">
          <Share2 className="w-[18px] h-[18px]" />
        </button>
      </div>

      {needsEmailVerification && (
        <div className="snap-alert">
          <MailWarning className="w-4 h-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <strong>ئیمەیلەکەت پشتڕاست نەکراوەتەوە</strong>
            <span>{user?.email}</span>
          </div>
          <button onClick={handleResendVerification} disabled={resendBusy}>
            {resendBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'ناردنەوە'}
          </button>
        </div>
      )}

      <section className="snap-identity">
        <div className="snap-avatar-wrap">
          <div className="snap-avatar-ring" style={{ '--pct': `${completion}%` }}>
            <div className="snap-avatar">
              <button type="button" onClick={() => avatarRef.current?.click()} className="snap-avatar-button" aria-label="گۆڕینی وێنە">
                {displayAvatar
                  ? <img src={displayAvatar} alt={displayName} />
                  : <span>{initial}</span>}
                <span className="snap-camera"><Camera className="w-4 h-4" /></span>
              </button>
            </div>
          </div>
          <span className="snap-completion">{completion}%</span>
        </div>

        <div className="snap-name-row">
          <h1>{displayName}</h1>
          {isVIP && <PlanBadge plan={userPlanTier.id} size="sm" />}
        </div>
        <p className="snap-handle">{displayTitle}</p>
        <p className="snap-location">{location || 'سلێمانی'}{joinYear ? ` · ئەندام لە ${joinYear}` : ''}</p>

        <div className="snap-actions">
          <button onClick={() => { soundService.playTick?.(); setShowEdit(true); }} className="snap-primary">
            <UserRoundCheck className="w-4 h-4" /> {isEmployer ? 'دەستکاری کۆمپانیا' : 'دەستکاری پڕۆفایل'}
          </button>
          {!isEmployer && (
            <button onClick={() => { soundService.playTick?.(); onNavigate?.('resumes'); }} className="snap-secondary">
              <FileText className="w-4 h-4" /> CV
            </button>
          )}
        </div>

        <div className="snap-stats">
          {(isEmployer ? [
            { val: employerJobs.length, label: 'هەلی کار', fn: () => onNavigate?.('my_company_dashboard') },
            { val: employerReceivedApplications, label: 'داواکاری', fn: () => onNavigate?.('my_company_dashboard') },
            { val: profileViews, label: 'بینین', fn: () => setShowViewers(true) },
          ] : [
            { val: profileViews, label: 'بینین', fn: () => setShowViewers(true) },
            { val: applCount, label: 'داواکاری', fn: () => onNavigate?.('my_applications') },
            { val: savedCount, label: 'پاشەکەوت', fn: () => setShowSaved(true) },
          ]).map(({ val, label, fn }) => (
            <button key={label} onClick={() => { soundService.playTick?.(); fn(); }} className="snap-stat">
              <strong>{val}</strong><span>{label}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="snap-completion-card">
        <div>
          <span>پڕۆفایلی پیشەیی</span>
          <strong>{completion}% تەواوە</strong>
        </div>
        <div className="snap-progress"><i style={{ width: `${completion}%` }} /></div>
        <div className="snap-completion-foot">
          <p>{completion >= 90 ? 'پڕۆفایلەکەت ئامادەیە.' : 'زانیارییە کەمەکان تەواو بکە بۆ پڕۆفایلێکی بەهێزتر.'}</p>
          {completion < 90 && <button type="button" onClick={() => { soundService.playTick?.(); setShowEdit(true); }}>تەواوکردن</button>}
        </div>
      </div>

      <div className="snap-grid">
        <section className="snap-card snap-about">
          <div className="snap-section-head"><span>دەربارە</span><button onClick={() => setShowEdit(true)}>دەستکاری</button></div>
          <p>{bio || user?.bio || (isEmployer ? 'کورتەیەک دەربارەی کۆمپانیاکەت بنووسە.' : 'کورتەیەک دەربارەی خۆت و ئەزموونەکانت بنووسە.')}</p>
        </section>

        {isFreelancer ? (
          <>
            <section className="snap-card">
              <div className="snap-section-head"><span>کارنامەکان</span><button onClick={() => onNavigate?.('resumes')}>هەموو</button></div>
              <button className="snap-list-row" onClick={() => onNavigate?.('resumes')}>
                <span className="snap-list-icon"><FileText className="w-5 h-5" /></span>
                <span><strong>کارنامەی فەرمی</strong><small>{user?.cv_url ? 'سیڤی بارکراوە' : 'دروستکردنی CV'}</small></span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </section>

            <section className="snap-card">
              <div className="snap-section-head"><span>شوێن</span></div>
              <div className="snap-list-row static">
                <span className="snap-list-icon"><MapPin className="w-5 h-5" /></span>
                <span><strong>{govObj?.name_ku || 'سلێمانی'}{distObj?.name_ku ? `، ${distObj.name_ku}` : ''}</strong><small>ناوچەی کارکردن</small></span>
              </div>
            </section>

            <section className="snap-card snap-wide">
              <div className="snap-section-head"><span>شارەزایی</span><button onClick={() => setShowEdit(true)}>زیادکردن</button></div>
              <div className="snap-chips">
                {(skills.length ? skills : parseJsonArray(user?.skills)).map(s => <span key={s}>{s}</span>)}
                {skills.length === 0 && !parseJsonArray(user?.skills).length && <small>هیچ شارەزاییەک زیاد نەکراوە.</small>}
              </div>
            </section>

            <section className="snap-card snap-wide">
              <div className="snap-section-head"><span>ئەزموونی کار</span><button onClick={() => setShowEdit(true)}>زیادکردن</button></div>
              {experiences.length === 0 ? <p className="snap-empty">هیچ ئەزموونێک زیاد نەکراوە.</p> : (
                <div className="snap-timeline">
                  {experiences.map((exp, i) => (
                    <div className="snap-experience" key={exp.id || i}>
                      <span className="snap-dot" />
                      <div><div className="snap-exp-top"><strong>{exp.title}</strong><small>{exp.period}</small></div>{exp.description && <p>{exp.description}</p>}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : (
          <>
            {Number(user?.verified) === 1 && (
              <section className="snap-card snap-wide snap-verified"><ShieldCheck className="w-5 h-5" /><span>هەژماری پشتڕاستکراوە</span></section>
            )}
            <section className="snap-card">
              <div className="snap-section-head"><span>شوێن</span></div>
              <div className="snap-list-row static"><span className="snap-list-icon"><MapPin className="w-5 h-5" /></span><span><strong>{govObj?.name_ku || 'سلێمانی'}</strong><small>{distObj?.name_ku || 'ناوچەی کارکردن'}</small></span></div>
            </section>
            <section className="snap-card">
              <div className="snap-section-head"><span>هەلی کار</span><button onClick={() => onNavigate?.('my_company_dashboard')}>بینین</button></div>
              <div className="snap-list-row static"><span className="snap-list-icon"><Briefcase className="w-5 h-5" /></span><span><strong>{employerJobs.length}</strong><small>هەلی کار بڵاوکراوە</small></span></div>
            </section>
          </>
        )}
      </div>
    </div>
  );
  const EditModalImpl = () => {
    const [activeSection, setActiveSection] = useState(isEmployer ? 'company_info' : 'basic');

    // Tells main.jsx's service-worker updater not to force-reload the app
    // while this form is open (see main.jsx for the full reasoning) — a
    // deploy landing mid-edit used to silently wipe whatever was typed here.
    useEffect(() => {
      window.__ishkhwazEditing = true;
      return () => {
        window.__ishkhwazEditing = false;
        window.dispatchEvent(new Event('ishkhwaz:edit-done'));
      };
    }, []);

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

    // Shared field styling — one place so every tab's inputs stay consistent.
    const fieldCls = 'w-full bg-white border rounded-xl px-4 py-3 text-xs font-bold outline-none transition';
    const fieldStyle = { borderColor: '#e4eae7', color: TXT };
    const fieldFocus = 'focus:border-[#12796b]';
    return (
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-0 lg:p-6"
        style={{ animation: 'profileFadeUp 0.25s ease both' }}>
        <div
          className="w-full max-w-full lg:max-w-5xl bg-white rounded-none lg:rounded-2xl min-h-screen lg:min-h-0 max-h-screen lg:max-h-[90vh] flex flex-col shadow-2xl border border-[#e4eae7] overflow-hidden"
          onClick={e => e.stopPropagation()} dir="rtl" style={{ fontFamily: NK }}
        >
          {/* Header Bar */}
          <div
            className="px-6 flex items-center justify-between shrink-0 relative overflow-hidden"
            style={{
              paddingTop: 'max(20px, calc(env(safe-area-inset-top) + 16px))',
              paddingBottom: '20px',
              background: `linear-gradient(120deg, ${TEAL_DEEP}, ${TEAL})`,
            }}
          >
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.08]"
              style={{
                backgroundImage: `repeating-linear-gradient(45deg, #fff 0 1.5px, transparent 1.5px 22px)`,
              }}
            />
            <button onClick={() => setShowEdit(false)} className="w-9 h-9 rounded-2xl flex items-center justify-center transition active:scale-95 relative" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5 relative">
              <h3 className="text-sm sm:text-base font-black text-white">
                {isEmployer ? 'دەستکاری پڕۆفایلی کۆمپانیا' : 'دەستکاری پڕۆفایل'}
              </h3>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
                {isEmployer ? <Building2 className="w-4 h-4 text-white" /> : <User className="w-4 h-4 text-white" />}
              </div>
            </div>
          </div>

          <div
            className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-6"
            style={{
              paddingBottom: 'max(24px, calc(env(safe-area-inset-bottom) + 24px))',
            }}
          >

            {/* ──── RIGHT COLUMN: identity card + tab nav ──── */}
            <div className="lg:col-span-4 p-5 lg:border-l border-[#eef3f1] space-y-4 bg-[#fbfdfc] order-1 lg:order-2">
              <div className="bg-white rounded-xl p-5 border shadow-sm text-center" style={{ borderColor: '#e4eae7' }}>
                <div className="relative w-20 h-20 mx-auto mb-3">
                  <CompletionRing pct={completion} size={80} strokeW={3} />
                  <div
                    onClick={() => avatarRef.current?.click()}
                    className={`absolute inset-2 ${isEmployer ? 'rounded-xl' : 'rounded-full'} overflow-hidden cursor-pointer group flex items-center justify-center border-2 border-white shadow-sm`}
                    style={{ background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DEEP})` }}
                  >
                    {displayAvatar ? (
                      <img src={displayAvatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl font-black text-white">{initial}</span>
                    )}
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white">
                      <Camera className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                <h4 className="text-base font-black truncate" style={{ color: TXT }}>{displayName}</h4>
                <p className="text-xs font-bold mt-0.5 truncate" style={{ color: SUB }}>{displayTitle}</p>

                <div className="mt-3 pt-3 border-t" style={{ borderColor: '#f0f4f2' }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold" style={{ color: MUTED }}>تەواوی پڕۆفایل</span>
                    <span className="text-xs font-black font-mono" style={{ color: TEAL }}>{completion}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#eef3f1' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${completion}%`, background: `linear-gradient(90deg, ${TEAL}, ${TEAL_DEEP})` }} />
                  </div>
                </div>
              </div>

              {/* Navigation Tabs — icon-badge style, active tab gets a
                  colored accent bar + tinted background instead of a plain
                  highlighted row */}
              <div className="space-y-1.5 text-xs font-bold">
                {tabs.map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeSection === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveSection(tab.id)}
                      className="w-full flex items-center gap-3 py-2.5 px-3 rounded-xl transition-all relative overflow-hidden"
                      style={isActive
                        ? { background: '#eef7f5', color: TEAL_DEEP, fontWeight: 900 }
                        : { color: SUB }}
                    >
                      {isActive && <span className="absolute right-0 top-1.5 bottom-1.5 w-[3px] rounded-full" style={{ background: TEAL }} />}
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors"
                        style={isActive ? { background: TEAL, color: '#fff' } : { background: '#f0f4f2', color: SUB }}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="flex-1 text-right">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ──── LEFT COLUMN: Main Tab Content Area ──── */}
            <div className="lg:col-span-8 p-6 lg:p-8 space-y-5 order-2 lg:order-1">

              {/* ── TAB 1: BASIC INFO (FREELANCER) ── */}
              {activeSection === 'basic' && (
                <SectionCard title="زانیاری بنەڕەتی" icon={User} className="animate-fadeIn">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="ناوی تەواو *">
                      <input value={name} onChange={e => setName(e.target.value)} placeholder="هەڵمەت ئازاد" className={`${fieldCls} ${fieldFocus}`} style={fieldStyle} />
                    </Field>
                    <Field label="ناونیشانی پیشەیی">
                      <input value={profession} onChange={e => setProfession(e.target.value)} placeholder="پەرەپێدەری وێب / دیزاینەر" className={`${fieldCls} ${fieldFocus}`} style={fieldStyle} />
                    </Field>
                    <Field label="ژمارەی مۆبایل">
                      <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+964 770 123 4567" dir="ltr" className={`${fieldCls} ${fieldFocus} font-mono text-right`} style={fieldStyle} />
                    </Field>
                    <Field label="ئیمەیڵ">
                      <input value={email || user?.email || ''} onChange={e => setEmail(e.target.value)} placeholder="info@ishkhwaz.iq" dir="ltr" className={`${fieldCls} ${fieldFocus}`} style={fieldStyle} />
                    </Field>
                  </div>

                  <div className="space-y-1.5 text-right">
                    <div className="flex items-center justify-between text-xs font-bold" style={{ color: MUTED }}>
                      <span className="font-mono">{(bio || '').length}/600</span>
                      <label style={{ color: TXT }}>دەربارەی من</label>
                    </div>
                    <textarea rows={4} value={bio} onChange={e => setBio(e.target.value)} placeholder="سێ ساڵ ئەزموون لە بواری کاری ئازاد..."
                      className={`${fieldCls} ${fieldFocus} font-medium leading-relaxed resize-none p-4`} style={fieldStyle} />
                  </div>
                </SectionCard>
              )}

              {/* ── TAB 1: COMPANY INFO (EMPLOYER) ── */}
              {activeSection === 'company_info' && (
                <div className="space-y-4 animate-fadeIn">
                  {/* Live preview — updates as the fields below change, so it's
                      obvious what a viewer will actually see instead of only
                      seeing raw form fields */}
                  <div
                    className="rounded-2xl p-4 flex items-center gap-3.5 relative overflow-hidden"
                    style={{ background: `linear-gradient(120deg, ${TEAL_DEEP}, ${TEAL})` }}
                  >
                    <div className="w-12 h-12 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center overflow-hidden shrink-0">
                      {displayAvatar ? <img src={displayAvatar} alt="" className="w-full h-full object-cover" /> : <span className="text-lg font-black text-white">{initial}</span>}
                    </div>
                    <div className="text-right flex-1 min-w-0">
                      <div className="text-sm font-black text-white truncate">{companyName || 'ناوی کۆمپانیا'}</div>
                      <div className="text-[11px] font-bold text-white/75 truncate">{profession || industry || 'ناونیشانی پیشەیی'}</div>
                    </div>
                    <span className="text-[10px] font-black text-white/70 shrink-0">پێشبینین</span>
                  </div>

                  <SectionCard title="زانیاری کۆمپانیا" icon={Building2}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="ناوی فەرمی کۆمپانیا *">
                        <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="کۆمپانیای ئاسۆ" className={`${fieldCls} ${fieldFocus}`} style={fieldStyle} />
                      </Field>
                      <Field label="بواری کار (Industry)">
                        <input value={industry} onChange={e => setIndustry(e.target.value)} placeholder="تەکنەلۆژیا، بیناسازی، پزیشکی..." className={`${fieldCls} ${fieldFocus}`} style={fieldStyle} />
                      </Field>
                      <Field label="ناونیشانی پیشەیی خاوەنکار">
                        <input value={profession} onChange={e => setProfession(e.target.value)} placeholder="گەشەپێدەر، بەڕێوەبەر..." className={`${fieldCls} ${fieldFocus}`} style={fieldStyle} />
                      </Field>
                      <Field label="ژمارەی تەلەفۆنی فەرمی">
                        <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+964 770 000 0000" dir="ltr" className={`${fieldCls} ${fieldFocus} font-mono text-right`} style={fieldStyle} />
                      </Field>
                      <Field label="ژمارەی تۆماری بازرگانی">
                        <input value={companyReg} onChange={e => setCompanyReg(e.target.value)} placeholder="KR-123456" dir="ltr" className={`${fieldCls} ${fieldFocus}`} style={fieldStyle} />
                      </Field>
                    </div>

                    <Field label="دەربارەی کۆمپانیا و خزمەتگوزارییەکان">
                      <textarea rows={4} value={bio} onChange={e => setBio(e.target.value)} placeholder="ناساندنی کورتی کۆمپانیا و بواری سەرەکی کارەکانتان..."
                        className={`${fieldCls} ${fieldFocus} font-medium leading-relaxed resize-none p-4`} style={fieldStyle} />
                    </Field>
                  </SectionCard>
                </div>
              )}

              {/* ── TAB 2: LOCATION ── */}
              {activeSection === 'location' && (
                <SectionCard title="شوێن و ناوچە" icon={MapPin} className="animate-fadeIn">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Field label="شار">
                      <select value={govId} onChange={e => { setGovId(e.target.value); setDistId(''); setSubId(''); }} className={`${fieldCls} ${fieldFocus}`} style={fieldStyle}>
                        {kurdistanGovernorates.map(g => <option key={g.id} value={g.id}>{g.name_ku}</option>)}
                      </select>
                    </Field>
                    <Field label="قەزا">
                      <select value={distId} onChange={e => { setDistId(e.target.value); setSubId(''); }} className={`${fieldCls} ${fieldFocus}`} style={fieldStyle}>
                        <option value="">هەموو قەزاکان</option>
                        {dists.map(d => <option key={d.id} value={d.id}>{d.name_ku}</option>)}
                      </select>
                    </Field>
                    <Field label="ناحیە">
                      <select value={subId} onChange={e => setSubId(e.target.value)} disabled={subs.length === 0} className={`${fieldCls} ${fieldFocus}`} style={fieldStyle}>
                        <option value="">{subs.length === 0 ? 'ناحیە نییە' : 'هەموو ناحیەکان'}</option>
                        {subs.map(s => <option key={s.id} value={s.id}>{s.name_ku}</option>)}
                      </select>
                    </Field>
                  </div>

                  <div className="p-4 rounded-xl flex items-center gap-2.5 text-xs font-bold" style={{ background: '#eef1f0', border: '1px solid #dde3e0', color: TEAL_DEEP }}>
                    <MapPin className="w-4 h-4 shrink-0" />
                    شوێنی دیاریکراو: {location}
                  </div>
                </SectionCard>
              )}

              {/* ── TAB 3: SKILLS (FREELANCER) ── */}
              {activeSection === 'skills' && (
                <div className="space-y-4 animate-fadeIn">
                  <SectionCard title="زیادکردنی شارەزایی" icon={Plus}>
                    <div className="flex gap-2">
                      <input
                        value={skillInput}
                        onChange={e => setSkillInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
                        placeholder="شارەزاییەک بنووسە و ئینتەر دابگرە..."
                        className={`${fieldCls} ${fieldFocus} flex-1`} style={fieldStyle}
                      />
                      <button type="button" onClick={() => addSkill()} className="px-5 py-3 rounded-xl text-white text-xs font-black transition shrink-0" style={{ background: TEAL }}>
                        زیادکردن
                      </button>
                    </div>
                  </SectionCard>

                  <SectionCard title={`شارەزاییە هەڵبژێردراوەکان (${skills.length})`} icon={Layers}>
                    <div className="flex flex-wrap gap-2 min-h-[46px]">
                      {skills.map(s => (
                        <span key={s} className="px-3 py-1.5 rounded-xl bg-white border text-xs font-bold flex items-center gap-1.5 shadow-2xs" style={{ borderColor: '#dce5e1', color: TXT }}>
                          {s}
                          <button type="button" onClick={() => removeSkill(s)} className="text-stone-400 hover:text-rose-500"><X className="w-3.5 h-3.5" /></button>
                        </span>
                      ))}
                      {skills.length === 0 && <span className="text-xs font-bold my-auto" style={{ color: MUTED }}>هیچ شارەزاییەک زیاد نەکراوە.</span>}
                    </div>
                  </SectionCard>

                  <SectionCard title="پێشنیارە باوەکان" icon={Sparkles}>
                    <div className="flex flex-wrap gap-1.5">
                      {SUGGESTED_SKILLS.filter(s => !skills.includes(s)).map(s => (
                        <button key={s} type="button" onClick={() => addSkill(s)}
                          className="px-3 py-1 rounded-xl bg-white border text-[11px] font-bold hover:border-[#12796b] hover:text-[#12796b] transition"
                          style={{ borderColor: '#e4eae7', color: SUB }}>
                          + {s}
                        </button>
                      ))}
                    </div>
                  </SectionCard>
                </div>
              )}

              {/* ── TAB 4: EXPERIENCE (FREELANCER) ── */}
              {activeSection === 'experience' && (
                <div className="space-y-4 animate-fadeIn">
                  <SectionCard title="زیادکردنی ئەزموونی نوێ" icon={Plus}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input value={expTitle} onChange={e => setExpTitle(e.target.value)} placeholder="ناونیشانی کار / پڕۆژە *" className={`${fieldCls} ${fieldFocus} py-2.5`} style={fieldStyle} />
                      <input value={expPeriod} onChange={e => setExpPeriod(e.target.value)} placeholder="ماوە (نموونە: 2022 — 2024)" className={`${fieldCls} ${fieldFocus} py-2.5`} style={fieldStyle} />
                    </div>
                    <input value={expLink} onChange={e => setExpLink(e.target.value)} placeholder="لینکی پڕۆژە یان پۆرتفۆلیۆ (ئارەزوومەندانە)" dir="ltr" className={`${fieldCls} ${fieldFocus} py-2.5`} style={fieldStyle} />
                    <textarea rows={2} value={expDesc} onChange={e => setExpDesc(e.target.value)} placeholder="ڕوونکردنەوەی کورت دەربارەی پڕۆژە یان کارەکە..." className={`${fieldCls} ${fieldFocus} font-medium resize-none`} style={fieldStyle} />
                    <button type="button" onClick={addExperience} className="w-full py-2.5 rounded-xl text-white text-xs font-black transition flex items-center justify-center gap-1.5" style={{ background: TEAL }}>
                      <Plus className="w-4 h-4" /> زیادکردنی ئەزموون
                    </button>
                  </SectionCard>

                  <SectionCard title={`مێژووی تۆمارکراو (${experiences.length})`} icon={Briefcase}>
                    {experiences.length === 0 ? (
                      <p className="text-xs font-bold" style={{ color: MUTED }}>هیچ ئەزموونێک زیاد نەکراوە.</p>
                    ) : experiences.map((exp, idx) => (
                      <div key={exp.id || idx} className="p-3.5 rounded-xl bg-white border flex items-start justify-between gap-3 shadow-2xs" style={{ borderColor: '#e4eae7' }}>
                        <button type="button" onClick={() => removeExperience(idx)} className="text-stone-400 hover:text-rose-500 transition p-1"><Trash2 className="w-4 h-4" /></button>
                        <div className="text-right flex-1 min-w-0">
                          <div className="text-xs font-black" style={{ color: TXT }}>{exp.title}</div>
                          <div className="text-[11px] font-mono mt-0.5" style={{ color: MUTED }}>{exp.period}</div>
                          {exp.description && <p className="text-[11px] mt-1" style={{ color: SUB }}>{exp.description}</p>}
                        </div>
                      </div>
                    ))}
                  </SectionCard>
                </div>
              )}

              {/* ── TAB: BRANDING (EMPLOYER) ── */}
              {activeSection === 'branding' && (
                <div className="space-y-4 animate-fadeIn">
                  <SectionCard title="لۆگۆی کۆمپانیا" icon={Camera}>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-white border flex items-center justify-center overflow-hidden shrink-0 shadow-xs" style={{ borderColor: '#e4eae7' }}>
                        {displayAvatar ? <img src={displayAvatar} alt="" className="w-full h-full object-cover" /> : <span className="text-xl font-black" style={{ color: TEAL }}>{initial}</span>}
                      </div>
                      <button type="button" onClick={() => avatarRef.current?.click()} className="px-4 py-2.5 rounded-xl bg-white border text-xs font-bold hover:bg-stone-50 transition" style={{ borderColor: '#dce5e1', color: SUB }}>
                        گۆڕینی لۆگۆ
                      </button>
                    </div>
                  </SectionCard>

                  <SectionCard title="وێنەی کەڤەری کۆمپانیا" icon={Camera}>
                    <div className="h-28 w-full rounded-xl overflow-hidden relative" style={{ background: cover ? `url(${cover}) center/cover` : `linear-gradient(135deg, ${TEAL}, #2db89f)` }}>
                      <button type="button" onClick={() => coverRef.current?.click()} className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-white/90 text-xs font-bold shadow-md hover:bg-white transition flex items-center gap-1.5" style={{ color: TXT }}>
                        <Camera className="w-3.5 h-3.5" /> گۆڕینی کەڤەر
                      </button>
                    </div>
                  </SectionCard>
                </div>
              )}

              {/* ── TAB: PHOTOS (FREELANCER) ── */}
              {activeSection === 'photos' && (
                <div className="space-y-4 animate-fadeIn">
                  <SectionCard title="وێنەی پرۆفایل" icon={Camera}>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-white border flex items-center justify-center overflow-hidden shrink-0 shadow-xs" style={{ borderColor: '#e4eae7' }}>
                        {displayAvatar ? <img src={displayAvatar} alt="" className="w-full h-full object-cover" /> : <span className="text-xl font-black" style={{ color: TEAL }}>{initial}</span>}
                      </div>
                      <button type="button" onClick={() => avatarRef.current?.click()} className="px-4 py-2.5 rounded-xl bg-white border text-xs font-bold hover:bg-stone-50 transition" style={{ borderColor: '#dce5e1', color: SUB }}>
                        گۆڕینی وێنە
                      </button>
                    </div>
                  </SectionCard>

                  <SectionCard title="وێنەی کەڤەر" icon={Camera}>
                    <div className="h-28 w-full rounded-xl overflow-hidden relative" style={{ background: cover ? `url(${cover}) center/cover` : `linear-gradient(135deg, ${TEAL}, #2db89f)` }}>
                      <button type="button" onClick={() => coverRef.current?.click()} className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-white/90 text-xs font-bold shadow-md hover:bg-white transition flex items-center gap-1.5" style={{ color: TXT }}>
                        <Camera className="w-3.5 h-3.5" /> گۆڕینی کەڤەر
                      </button>
                    </div>
                  </SectionCard>
                </div>
              )}

              {/* ── TAB: CV (FREELANCER) ── */}
              {activeSection === 'cv' && (
                <div className="animate-fadeIn">
                  <SectionCard className="!bg-[#eef1f0]" title={null}>
                    <div className="flex items-center gap-2 font-black text-sm" style={{ color: TEAL_DEEP }}>
                      <FileCheck className="w-5 h-5" />
                      <span>کارنامەی کەسی و فەرمی (CV)</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: '#3a7c73' }}>
                      دەتوانیت کارنامەی خۆت بە شێوازی ئەدیتۆریال و پرۆفیشناڵ لە بەشی تایبەتی کارنامەکان دروست بکەیت یان فایلی تایبەت باربکەیت.
                    </p>
                    <button type="button" onClick={() => { setShowEdit(false); onNavigate?.('resumes'); }} className="px-5 py-2.5 rounded-xl text-white text-xs font-black transition" style={{ background: TEAL }}>
                      چوون بۆ بەڕێوەبردنی کارنامەکان →
                    </button>
                  </SectionCard>
                </div>
              )}

              {/* ── TAB: SETTINGS ── */}
              {activeSection === 'settings' && (
                <div className="animate-fadeIn">
                  <SectionCard title="ڕێکخستن" icon={Settings}>
                    <div className="flex items-center justify-between">
                      <button type="button" onClick={handleTogglePush} disabled={pushBusy}
                        className="w-12 h-6 rounded-full p-1 flex items-center transition-colors duration-300"
                        style={{ background: pushEnabled ? TEAL : '#cbd5d3', justifyContent: pushEnabled ? 'flex-end' : 'flex-start' }}>
                        <span className="w-4 h-4 rounded-full bg-white shadow-sm block" />
                      </button>
                      <div>
                        <div className="text-xs font-bold" style={{ color: TXT }}>ئاگادارکردنەوەکانی نۆتیفیکەیشن</div>
                        <div className="text-[11px] mt-0.5" style={{ color: MUTED }}>{pushEnabled ? 'چالاککراوە' : 'ناچالاکە'}</div>
                      </div>
                    </div>
                  </SectionCard>
                </div>
              )}

            </div>

          </div>

          {/* Sticky footer — save/cancel always reachable, same pattern as the other modals */}
          <div
            className="px-6 border-t flex items-center justify-between gap-3 bg-white shrink-0"
            style={{
              borderColor: '#eef3f1',
              paddingTop: '14px',
              paddingBottom: 'max(14px, calc(env(safe-area-inset-bottom) + 14px))',
            }}
          >
            <span className="text-xs font-bold hidden sm:block" style={{ color: MUTED }}>
              {tabs.find(t => t.id === activeSection)?.label}
            </span>
            <div className="flex items-center gap-2 flex-1 sm:flex-none">
              <button
                type="button"
                onClick={() => setShowEdit(false)}
                className="flex-1 sm:flex-none py-3 sm:py-2.5 px-4 rounded-xl border text-xs font-bold transition active:scale-95"
                style={{ background: 'white', borderColor: '#e4eae7', color: SUB }}
              >
                داخستن
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex-1 sm:flex-none py-3 sm:py-2.5 px-6 rounded-xl text-white text-xs font-black shadow-sm flex items-center justify-center gap-2 active:scale-95 transition"
                style={{ background: TEAL }}
              >
                {saved ? <><CheckCircle2 className="w-4 h-4" /> پاشەکەوتکرا</> : <><Save className="w-4 h-4" /> {saving ? 'خەریکی...' : 'پاشەکەوتکردن'}</>}
              </button>
            </div>
          </div>

        </div>
      </div>
    );
  };

  /* ── Settings sheet ── bottom sheet on mobile, centred card on desktop.
     Portalled to <body>: inside this page's isolated stacking context the
     sticky desktop header (z-50) would otherwise paint over the backdrop. */
  const renderSettings = () => {
    const go = (fn) => () => { soundService.playTick?.(); setShowSettings(false); fn(); };
    return createPortal(
      <div className="snap-sheet-overlay" onClick={() => setShowSettings(false)}>
        <div className="snap-sheet" role="dialog" aria-modal="true" aria-label="ڕێکخستنەکان" dir="rtl" onClick={e => e.stopPropagation()}>
          <div className="snap-sheet-grab" aria-hidden="true" />
          <header className="snap-sheet-head">
            <h2>ڕێکخستنەکان</h2>
            <button type="button" className="snap-icon-btn" onClick={() => setShowSettings(false)} aria-label="داخستن"><X className="w-5 h-5" /></button>
          </header>
          <div className="snap-sheet-body">
            <div className="snap-sheet-account">
              <div className="snap-sheet-avatar">{displayAvatar ? <img src={displayAvatar} alt="" /> : <span>{initial}</span>}</div>
              <div className="min-w-0 flex-1">
                <strong>{displayName}</strong>
                <span dir="ltr">{user?.phone || user?.email || ''}</span>
              </div>
              <button type="button" onClick={go(() => setShowEdit(true))}>دەستکاری</button>
            </div>

            <div className="snap-sheet-label">ئاگادارکردنەوە</div>
            <div className="snap-sheet-group">
              <div className="snap-row" style={{ cursor: 'default' }}>
                <span className="snap-row-icon"><Bell className="w-[18px] h-[18px]" /></span>
                <span className="snap-row-copy"><strong>ئاگادارکردنەوەی ئامێر</strong><small>{pushEnabled ? 'چالاکە' : 'ناچالاکە'}</small></span>
                <button type="button" role="switch" aria-checked={pushEnabled} aria-label="ئاگادارکردنەوەی ئامێر"
                  className="snap-switch" onClick={handleTogglePush} disabled={pushBusy}><i /></button>
              </div>
            </div>

            <div className="snap-sheet-label">هەژمار و یارمەتی</div>
            <div className="snap-sheet-group">
              {canSeePlans(user) && (
                <button type="button" className="snap-row" onClick={go(() => onNavigate?.('plans'))}>
                  <span className="snap-row-icon"><Sparkles className="w-[18px] h-[18px]" /></span>
                  <span className="snap-row-copy"><strong>پلانەکانی ئیش خواز</strong><small>{userPlanTier ? `پلانی ئێستا: ${userPlanTier.name_ku}` : 'بەرزکردنەوەی هەژمار'}</small></span>
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              <button type="button" className="snap-row" onClick={go(() => onNavigate?.('how_it_works'))}>
                <span className="snap-row-icon"><HelpCircle className="w-[18px] h-[18px]" /></span>
                <span className="snap-row-copy"><strong>چۆنیەتی کارکردنی ئەپ</strong><small>چوونەژوورەوە و بەکارهێنانی سیستەم</small></span>
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button type="button" className="snap-row" onClick={go(() => setShowAbout(true))}>
                <span className="snap-row-icon"><Info className="w-[18px] h-[18px]" /></span>
                <span className="snap-row-copy"><strong>دەربارەی ئیش خواز</strong><small>زانیاری و پەیوەندی پشتگیری</small></span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            <button type="button" className="snap-row snap-danger" onClick={go(() => setShowLogout(true))}>
              <span className="snap-row-icon"><LogOut className="w-[18px] h-[18px]" /></span>
              <span className="snap-row-copy"><strong>چوونەدەرەوە</strong></span>
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  /* ── Saved jobs modal ── */
  const SavedModalImpl = () => (
    <div className="fixed inset-0 z-50 bg-[#07110f]/55 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ animation: 'profileFadeUp 0.25s ease both' }}>
      <div className="w-full max-w-lg bg-white rounded-t-[32px] sm:rounded-2xl max-h-[85vh] flex flex-col shadow-2xl border border-[#e4eae7] overflow-hidden"
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
              <p className="text-xs font-bold" style={{ color: '#6b7975' }}>هیچ کارێکت پاشەکەوت نەکردووە.</p>
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
                <div className="text-[11px] truncate mt-0.5" style={{ color: '#6b7975' }}>{job.company_name} · {job.governorate || 'سلێمانی'}</div>
              </div>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#eef1f0' }}><Briefcase className="w-4 h-4" style={{ color: TEAL }} /></div>
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
  const ViewersModalImpl = () => (
    <div className="fixed inset-0 z-50 bg-[#07110f]/55 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ animation: 'profileFadeUp 0.25s ease both' }}>
      <div className="w-full max-w-md bg-white rounded-t-[32px] sm:rounded-2xl max-h-[85vh] flex flex-col shadow-2xl border border-[#e4eae7] overflow-hidden"
        onClick={e => e.stopPropagation()} dir="rtl" style={{ fontFamily: NK }}>
        <div className="p-5 border-b border-[#f0f4f2] flex items-center justify-between bg-[#fbfdfc]">
          <button onClick={() => setShowViewers(false)} className="w-9 h-9 rounded-full bg-[#f0f4f2] flex items-center justify-center transition"><X className="w-5 h-5 text-[#4a5854]" /></button>
          <h3 className="text-lg font-black flex items-center gap-2" style={{ color: '#1a2321' }}><Eye className="w-5 h-5" style={{ color: TEAL }} /> بینەرانی پڕۆفایل</h3>
        </div>
        <div className="p-5 overflow-y-auto space-y-3 flex-1 text-right">
          <div className="p-3.5 rounded-2xl text-xs font-bold text-center" style={{ background: '#eef1f0', border: '1px solid #dde3e0', color: '#1e584f' }}>
            پڕۆفایلەکەت بە گشتی <strong>{profileViews}</strong> جار بینراوە.
          </div>
          {viewersState.viewers?.length > 0
            ? viewersState.viewers.map((v, i) => (
              <div key={i} className="p-3 rounded-xl border flex items-center justify-between text-xs" style={{ background: CARD, borderColor: '#e4eae7' }}>
                <span className="font-bold" style={{ color: '#1a2321' }}>{v.viewer_company_name || v.viewer_name || 'کۆمپانیایەک'}</span>
                <span dir="ltr" className="font-mono" style={{ fontSize: '10px', color: '#6b7975' }}>{new Date(v.viewed_at).toLocaleDateString('en-GB')}</span>
              </div>
            ))
            : <div className="text-center py-8 text-xs font-bold" style={{ color: '#6b7975' }}>بینەرە نوێیەکان لێرەدا دەردەکەون.</div>}
        </div>
        <div className="p-4 border-t border-[#f0f4f2] bg-[#fbfdfc]">
          <button onClick={() => setShowViewers(false)} className="w-full py-3 rounded-2xl text-white font-bold text-xs" style={{ background: '#111d1a' }}>داخستن</button>
        </div>
      </div>
    </div>
  );

  /* ── Logout modal ── */
  const LogoutModalImpl = () => createPortal(
    <div className="fixed inset-0 z-[9000] bg-[#07110f]/60 backdrop-blur-md flex items-center justify-center p-4"
      style={{ animation: 'profileFadeUp 0.2s ease both' }}>
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 text-center shadow-2xl border border-[#e4eae7] space-y-4"
        onClick={e => e.stopPropagation()} dir="rtl" style={{ fontFamily: NK }}>
        <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-500 mx-auto flex items-center justify-center"><LogOut className="w-6 h-6" /></div>
        <div>
          <h3 className="text-lg font-black" style={{ color: '#1a2321' }}>چوونەدەرەوە لە ئەژمێر؟</h3>
          <p className="text-xs font-medium mt-1" style={{ color: '#6b7975' }}>ئایا دڵنیایت لە چوونەدەرەوە لە ئەژمێری ئیش خوازەکەت؟</p>
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
    , document.body);

  const ProfileHero = useStable(ProfileHeroImpl);
  const EditModal = useStable(EditModalImpl);
  const SavedModal = useStable(SavedModalImpl);
  const ViewersModal = useStable(ViewersModalImpl);
  const LogoutModal = useStable(LogoutModalImpl);

  /* ══════════════════════════════════════════════════════════════════
     ROOT RENDER
  ══════════════════════════════════════════════════════════════════ */
  return (
    <div className="profile-page-shell w-full min-h-screen pb-24 pt-3 sm:pt-5 px-3 sm:px-5 lg:px-8" style={{ background: 'linear-gradient(180deg,#f8fbfa 0%,#eef4f1 42%,#f2f6f4 100%)' }}>
      <div className="profile-ambient profile-ambient-a" aria-hidden="true" />
      <div className="profile-ambient profile-ambient-b" aria-hidden="true" />
      <input ref={avatarRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
      <input ref={coverRef} type="file" accept="image/*" onChange={handleCoverChange} className="hidden" />

      <style>{`
        .profile-page-shell{position:relative;isolation:isolate;overflow:hidden;background:#f4f7f6!important}
        .profile-ambient{position:absolute!important;z-index:0!important;pointer-events:none}
        .profile-ambient-a{width:520px;height:520px;right:-260px;top:80px;background:radial-gradient(circle,rgba(18,121,107,.11),transparent 68%)}
        .profile-ambient-b{width:460px;height:460px;left:-260px;bottom:60px;background:radial-gradient(circle,rgba(13,92,80,.07),transparent 68%)}
        .profile-commandbar{animation:profileFadeUp .45s cubic-bezier(.22,1,.36,1) both}
        .profile-page-shell{--ink:#10201c;--sub:#50625c;--muted:#7b8c87;--line:#e2ebe7;--teal:#12796b;--teal-deep:#0d5c50;--mint:#e9f5f2;--mint-line:#cfe6df;--bg:#f4f7f6;--danger:#dc2626}
        .profile-page-shell .profile-commandbar{max-width:1180px;margin-left:auto;margin-right:auto}
        .profile-page-shell .profile-commandbar>div{border-radius:30px!important;box-shadow:0 18px 55px rgba(13,92,80,.09)!important}
        .profile-page-shell .profile-commandbar .grid>div{background:linear-gradient(180deg,#fff,#f8fbfa)!important;border-color:#e2ebe7!important;border-radius:18px!important}
        .snap-profile{color:var(--ink);padding-bottom:42px;max-width:1180px!important;margin:0 auto}
        .snap-profile button:focus-visible,.snap-sheet button:focus-visible{outline:2px solid var(--teal);outline-offset:3px}
        .snap-topbar{height:68px;display:flex;align-items:center;justify-content:space-between;gap:14px;padding:0 2px}
        .snap-page-title{font-size:17px;font-weight:950;letter-spacing:-.03em}
        .snap-icon-btn{width:46px;height:46px;border:1px solid var(--line);background:rgba(255,255,255,.92);border-radius:15px;display:flex;align-items:center;justify-content:center;color:var(--teal-deep);transition:.2s;box-shadow:0 5px 18px rgba(13,92,80,.05)}
        .snap-icon-btn:hover{background:var(--teal);border-color:var(--teal);color:#fff;transform:translateY(-2px)}
        .snap-settings-btn{height:46px;padding:0 17px;border:1px solid var(--mint-line);background:#fff;color:var(--teal-deep);border-radius:15px;display:inline-flex;align-items:center;gap:8px;font-size:11px;font-weight:950;transition:.2s;box-shadow:0 5px 18px rgba(13,92,80,.05)}
        .snap-settings-btn:hover{background:var(--teal);border-color:var(--teal);color:#fff;transform:translateY(-2px)}
        .snap-settings-btn svg{transition:transform .35s}.snap-settings-btn:hover svg{transform:rotate(60deg)}
        .snap-alert{display:flex;align-items:center;gap:11px;padding:13px 15px;background:#fffaf0;border:1px solid #f2dfae;border-radius:18px;margin-bottom:14px;color:var(--ink);box-shadow:0 8px 24px rgba(94,72,15,.04)}
        .snap-alert strong,.snap-alert span{display:block;font-size:10px;font-weight:850}.snap-alert span{color:var(--muted);margin-top:2px;direction:ltr;text-align:right}.snap-alert button{border:0;background:var(--teal);color:#fff;border-radius:11px;padding:9px 13px;font-size:10px;font-weight:950}
        .snap-identity{position:relative;text-align:center;background:linear-gradient(145deg,#fff 0%,#fbfdfc 70%,#f0f8f5 100%);border:1px solid var(--line);border-radius:30px;padding:34px 28px 20px;box-shadow:0 20px 65px rgba(13,92,80,.09);overflow:hidden}
        .snap-identity:before{content:"";position:absolute;width:300px;height:300px;top:-190px;left:-100px;border-radius:50%;background:radial-gradient(circle,rgba(18,121,107,.12),transparent 68%);pointer-events:none}
        .snap-avatar-wrap{position:relative;width:128px;height:128px;margin:0 auto 15px}.snap-avatar-ring{position:absolute;inset:0;border-radius:50%;background:conic-gradient(var(--teal) var(--pct),#dce9e5 0);padding:1px}
        .snap-avatar-ring:after{content:"";position:absolute;inset:5px;background:#fff;border-radius:50%}.snap-avatar{position:absolute;inset:10px;border-radius:50%;overflow:hidden;background:linear-gradient(135deg,var(--teal),var(--teal-deep));z-index:2;box-shadow:0 10px 30px rgba(13,92,80,.18)}
        .snap-avatar-button{width:100%;height:100%;border:0;padding:0;display:flex;align-items:center;justify-content:center;background:transparent;color:#fff;font-size:42px;font-weight:950;position:relative}.snap-avatar-button img{width:100%;height:100%;object-fit:cover}.snap-camera{position:absolute;bottom:5px;right:5px;width:29px;height:29px;border-radius:50%;background:var(--teal);color:#fff;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,.16)}
        .snap-completion{position:absolute;bottom:-2px;left:50%;transform:translateX(-50%);background:var(--teal-deep);color:#fff;padding:4px 9px;border-radius:99px;font:900 9px monospace;z-index:3;box-shadow:0 4px 12px rgba(13,92,80,.2)}
        .snap-name-row{display:flex;align-items:center;justify-content:center;gap:9px;flex-wrap:wrap}.snap-name-row h1{font-size:29px;line-height:1.2;font-weight:950;letter-spacing:-.04em;margin:0}.snap-handle{margin:6px 0 0;font-size:13px;font-weight:850;color:var(--sub)}.snap-location{margin:6px 0 18px;font-size:10px;font-weight:750;color:var(--muted)}
        .snap-actions{display:flex;justify-content:center;gap:9px;margin-bottom:19px}.snap-actions button{height:46px;border-radius:15px;padding:0 21px;border:1px solid var(--mint-line);font-size:11px;font-weight:950;display:inline-flex;align-items:center;justify-content:center;gap:7px;transition:.2s;box-shadow:0 6px 18px rgba(13,92,80,.05)}.snap-actions button:hover{transform:translateY(-2px)}
        .snap-primary{background:linear-gradient(135deg,var(--teal),var(--teal-deep));color:#fff;border-color:var(--teal)!important}.snap-secondary{background:#fff;color:var(--teal-deep)}.snap-secondary:hover{background:var(--mint)}
        .snap-stats{max-width:620px;margin:auto;border-top:1px solid var(--line);padding-top:15px;display:grid;grid-template-columns:repeat(3,1fr)}.snap-stat{border:0;background:transparent;min-width:0;padding:7px 0;border-radius:13px;transition:.18s}.snap-stat:hover{background:var(--mint)}.snap-stat+.snap-stat{border-right:1px solid var(--line)}.snap-stat strong,.snap-stat span{display:block}.snap-stat strong{font-size:20px;font-weight:950;line-height:1.1;color:var(--teal-deep)}.snap-stat span{font-size:9px;color:var(--muted);font-weight:850;margin-top:5px}
        .snap-completion-card{background:linear-gradient(135deg,#117a6b 0%,#0d5c50 100%);color:#fff;border-radius:22px;padding:18px 20px;margin:14px 0;box-shadow:0 14px 36px rgba(13,92,80,.20)}.snap-completion-card>div:first-child{display:flex;align-items:center;justify-content:space-between;font-size:10px}.snap-completion-card strong{font-size:12px}.snap-progress{height:7px;background:rgba(255,255,255,.2);border-radius:99px;overflow:hidden;margin-top:11px}.snap-progress i{display:block;height:100%;background:#fff;border-radius:inherit;transition:width .5s ease}.snap-completion-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:10px}.snap-completion-foot p{margin:0;color:rgba(255,255,255,.82);font-size:9px;font-weight:750}.snap-completion-foot button{flex:0 0 auto;border:0;background:#fff;color:var(--teal-deep);border-radius:11px;padding:8px 13px;font-size:10px;font-weight:950}
        .snap-grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:14px}.snap-card{grid-column:span 6;background:rgba(255,255,255,.96);border:1px solid var(--line);border-radius:22px;padding:19px;min-width:0;box-shadow:0 8px 30px rgba(13,92,80,.045);transition:.2s}.snap-card:hover{box-shadow:0 12px 34px rgba(13,92,80,.075);transform:translateY(-1px)}.snap-wide{grid-column:1/-1}.snap-section-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}.snap-section-head span{font-size:12px;font-weight:950}.snap-section-head button{border:0;background:var(--mint);color:var(--teal-deep);font-size:9px;font-weight:950;padding:7px 10px;border-radius:10px}.snap-section-head button:hover{background:var(--teal);color:#fff}.snap-card>p{font-size:12px;line-height:2;color:var(--sub);margin:0;font-weight:600}
        .snap-list-row{width:100%;display:flex;align-items:center;gap:11px;border:1px solid transparent;background:var(--bg);border-radius:16px;padding:12px;text-align:right;color:var(--ink);transition:.18s}.snap-list-row:hover{background:var(--mint);border-color:var(--mint-line)}.snap-list-row.static{cursor:default}.snap-list-icon{width:40px;height:40px;border-radius:13px;background:#fff;color:var(--teal);display:flex;align-items:center;justify-content:center;flex:0 0 auto;box-shadow:0 4px 12px rgba(13,92,80,.07)}.snap-list-row>span:nth-child(2){flex:1;min-width:0}.snap-list-row strong,.snap-list-row small{display:block}.snap-list-row strong{font-size:11px;font-weight:950}.snap-list-row small{font-size:9px;color:var(--muted);font-weight:750;margin-top:3px}.snap-chips{display:flex;flex-wrap:wrap;gap:8px}.snap-chips span{padding:8px 12px;border-radius:11px;background:var(--mint);border:1px solid var(--mint-line);color:var(--teal-deep);font-size:10px;font-weight:850}.snap-chips small,.snap-empty{font-size:10px;color:var(--muted);font-weight:750}.snap-timeline{display:flex;flex-direction:column;gap:16px}.snap-experience{display:grid;grid-template-columns:10px 1fr;gap:11px}.snap-dot{width:8px;height:8px;background:var(--teal);border-radius:50%;margin-top:5px;box-shadow:0 0 0 4px var(--mint)}.snap-exp-top{display:flex;align-items:baseline;justify-content:space-between;gap:10px}.snap-exp-top strong{font-size:11px;font-weight:950}.snap-exp-top small{font-size:9px;color:var(--muted);font-family:monospace}.snap-experience p{margin:5px 0 0;font-size:10px;line-height:1.8;color:var(--sub)}.snap-verified{display:flex;align-items:center;gap:8px;color:var(--teal-deep);font-size:11px;font-weight:950}.snap-verified svg{color:#16a34a}
        @media(max-width:900px){.snap-profile{max-width:760px!important}.snap-card{grid-column:span 12}}
        @media(max-width:640px){.profile-page-shell{padding-left:10px!important;padding-right:10px!important}.snap-profile{padding-bottom:22px}.snap-topbar{height:60px}.snap-settings-btn{padding:0 12px}.snap-settings-btn span{display:none}.snap-identity{border-radius:23px;padding:26px 14px 17px}.snap-name-row h1{font-size:23px}.snap-avatar-wrap{width:116px;height:116px}.snap-actions{width:100%}.snap-actions button{flex:1;padding:0 10px}.snap-grid{grid-template-columns:1fr;gap:10px}.snap-card{grid-column:auto;border-radius:18px;padding:16px}.snap-wide{grid-column:auto}.snap-completion-card{border-radius:18px;padding:16px}.profile-commandbar .grid{gap:7px}.profile-commandbar .grid>div{padding:10px!important}.profile-commandbar h2{font-size:20px!important}}
        @media(prefers-reduced-motion:reduce){.profile-commandbar,.snap-profile *,.snap-sheet,.snap-sheet-overlay{animation:none!important;transition:none!important}}
        @keyframes snapFade{from{opacity:0}to{opacity:1}}@keyframes snapSheetUp{from{transform:translateY(24px);opacity:0}to{transform:none;opacity:1}}
        .snap-sheet-overlay{position:fixed;inset:0;z-index:9000;background:rgba(7,17,15,.55);backdrop-filter:blur(10px);display:flex;align-items:flex-end;justify-content:center;animation:snapFade .2s ease both;font-family:'Noto Kufi Arabic','Vazirmatn',system-ui,sans-serif;color:var(--ink)}
        .snap-sheet{width:100%;max-width:540px;max-height:92vh;background:#f5f8f7;border:1px solid rgba(255,255,255,.7);border-radius:30px 30px 0 0;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 -24px 80px rgba(0,0,0,.28);animation:snapSheetUp .28s cubic-bezier(.22,1,.36,1) both}.snap-sheet-grab{width:42px;height:4px;border-radius:99px;background:#c5d5d0;margin:10px auto 0}.snap-sheet-head{display:flex;align-items:center;justify-content:space-between;padding:10px 19px}.snap-sheet-head h2{margin:0;font-size:17px;font-weight:950}.snap-sheet-body{padding:5px 17px calc(22px + env(safe-area-inset-bottom));overflow-y:auto;display:flex;flex-direction:column;gap:9px}.snap-sheet-account{display:flex;align-items:center;gap:12px;background:#fff;border:1px solid var(--line);border-radius:20px;padding:14px;box-shadow:0 7px 24px rgba(13,92,80,.05)}.snap-sheet-avatar{width:54px;height:54px;border-radius:17px;background:linear-gradient(135deg,var(--teal),var(--teal-deep));color:#fff;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:950;overflow:hidden;flex:0 0 auto}.snap-sheet-avatar img{width:100%;height:100%;object-fit:cover}.snap-sheet-account strong{display:block;font-size:13px;font-weight:950;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.snap-sheet-account span{display:block;font-size:10px;color:var(--muted);font-weight:700;margin-top:3px;text-align:right}.snap-sheet-account>button{height:36px;padding:0 14px;border-radius:12px;border:1px solid var(--mint-line);background:var(--mint);color:var(--teal-deep);font-size:10px;font-weight:950;flex:0 0 auto}.snap-sheet-label{margin:13px 4px 3px;font-size:9px;font-weight:950;color:var(--muted)}.snap-sheet-group{background:#fff;border:1px solid var(--line);border-radius:20px;overflow:hidden;box-shadow:0 6px 22px rgba(13,92,80,.04)}.snap-row{width:100%;min-height:62px;display:flex;align-items:center;gap:12px;padding:10px 14px;background:#fff;border:0;border-bottom:1px solid #edf2f0;text-align:right;color:var(--ink);cursor:pointer;transition:.16s}.snap-row:last-child{border-bottom:0}.snap-row:hover{background:#f5faf8}.snap-row-icon{width:39px;height:39px;border-radius:12px;background:var(--mint);color:var(--teal);display:flex;align-items:center;justify-content:center;flex:0 0 auto}.snap-row-copy{flex:1;min-width:0}.snap-row-copy strong{display:block;font-size:12px;font-weight:950}.snap-row-copy small{display:block;font-size:10px;color:var(--muted);font-weight:700;margin-top:2px}.snap-row>svg{color:#a9b9b4;flex:0 0 auto}.snap-switch{width:48px;height:28px;border-radius:99px;background:#cbd5d3;padding:3px;display:flex;justify-content:flex-start;border:0;transition:background .2s;flex:0 0 auto}.snap-switch i{width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.25);display:block}.snap-switch[aria-checked=true]{background:var(--teal);justify-content:flex-end}.snap-switch:disabled{opacity:.6}.snap-row.snap-danger{margin-top:8px;border:1px solid #f6d6d6;border-radius:18px;color:var(--danger)}.snap-row.snap-danger .snap-row-icon{background:#fef0f0;color:var(--danger)}
        @media(min-width:640px){.snap-sheet-overlay{align-items:center;padding:22px}.snap-sheet{border-radius:30px;max-height:88vh}}
      `}</style>
      <ProfileHero />

      {/* Modals are portalled to <body>: inside this page's isolated stacking
          context the sticky desktop header would paint over their backdrop. */}
      {showEdit && createPortal(<EditModal />, document.body)}
      {showSettings && renderSettings()}
      {showSaved && createPortal(<SavedModal />, document.body)}
      {showViewers && createPortal(<ViewersModal />, document.body)}
      {showLogout && <LogoutModal />}
      {showAbout && createPortal(<AboutModal onClose={() => setShowAbout(false)} />, document.body)}
    </div>
  );
};