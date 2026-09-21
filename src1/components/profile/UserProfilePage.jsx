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
  MessageCircle, Settings, Share2, Camera, FileText, Eye, CheckCircle2, Save, Pencil, ChevronRight,
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
  <div className={`rounded-2xl border p-5 space-y-4 ${className}`} style={{ background: '#fafbfb', borderColor: '#f0f2f3' }}>
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
  const ProfileHeroImpl = () => {
    // One soft rounded row, used for every menu item (same look as the settings sheet).
    const row = (key, Icon, title, { hint, onClick, danger } = {}) => (
      <button key={key} type="button" className={`ap-row${danger ? ' ap-danger' : ''}`} onClick={() => { soundService.playTick?.(); onClick?.(); }}>
        <span className="ap-row-ic"><Icon className="w-[19px] h-[19px]" /></span>
        <span className="ap-row-t">{title}</span>
        {hint != null && hint !== '' && <span className="ap-row-hint">{hint}</span>}
        {!danger && <ChevronLeft className="ap-chev w-4 h-4" />}
      </button>
    );
    const stats = isEmployer ? [
      { val: employerJobs.length, label: 'هەلی کار', fn: () => onNavigate?.('my_company_dashboard') },
      { val: employerReceivedApplications, label: 'داواکاری', fn: () => onNavigate?.('my_company_dashboard') },
      { val: profileViews, label: 'بینین', fn: () => setShowViewers(true) },
    ] : [
      { val: profileViews, label: 'بینین', fn: () => setShowViewers(true) },
      { val: applCount, label: 'داواکاری', fn: () => onNavigate?.('my_applications') },
      { val: savedCount, label: 'پاشەکەوت', fn: () => setShowSaved(true) },
    ];
    const skillList = skills.length ? skills : parseJsonArray(user?.skills);

    return (
      <div className="ap" dir="rtl" style={{ fontFamily: NK }}>
        <header className="ap-top">
          <h1 className="ap-title">{isEmployer ? 'پڕۆفایلی کۆمپانیا' : 'پڕۆفایل'}</h1>
          <div className="ap-top-actions">
            <button type="button" className="ap-circle lg:hidden" onClick={handleShare} aria-label="هاوبەشکردن"><Share2 className="w-[18px] h-[18px]" /></button>
          </div>
        </header>

        {needsEmailVerification && (
          <div className="ap-alert">
            <MailWarning className="w-4 h-4 shrink-0" />
            <div className="min-w-0 flex-1"><strong>ئیمەیلەکەت پشتڕاست نەکراوەتەوە</strong><span>{user?.email}</span></div>
            <button onClick={handleResendVerification} disabled={resendBusy}>{resendBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'ناردنەوە'}</button>
          </div>
        )}

        <div className="ap-cols"><div className="ap-col">
        <section className="ap-id">
          <div className="ap-avatar-wrap">
            <button type="button" className="ap-avatar" onClick={() => avatarRef.current?.click()} aria-label="گۆڕینی وێنە">
              {displayAvatar ? <img src={displayAvatar} alt={displayName} /> : <span>{initial}</span>}
            </button>
            <button type="button" className="ap-pencil" onClick={() => avatarRef.current?.click()} aria-label="گۆڕینی وێنە"><Pencil className="w-3 h-3" /></button>
          </div>
          <div className="ap-id-text">
            <h2>{displayName}{isVIP && <PlanBadge plan={userPlanTier.id} size="sm" />}</h2>
            <p dir="ltr">{user?.email || user?.phone || displayTitle}</p>
            <span className="ap-chip">{displayTitle}{location ? ` · ${govObj?.name_ku || ''}` : ''}</span>
          </div>
        </section>

        <div className="ap-stats">
          {stats.map(({ val, label, fn }) => (
            <button key={label} type="button" className="ap-stat" onClick={() => { soundService.playTick?.(); fn(); }}>
              <strong>{val}</strong><span>{label}</span>
            </button>
          ))}
        </div>

        <div className="ap-progress-card">
          <div className="ap-progress-top"><span>تەواوی پڕۆفایل</span><strong>{completion}%</strong></div>
          <div className="ap-bar"><i style={{ width: `${completion}%` }} /></div>
          {completion < 90 && (
            <div className="ap-progress-foot">
              <small>زانیارییە کەمەکان تەواو بکە بۆ پڕۆفایلێکی بەهێزتر.</small>
              <button type="button" onClick={() => { soundService.playTick?.(); setShowEdit(true); }}>تەواوکردن</button>
            </div>
          )}
        </div>

        <div className="ap-label">گشتی</div>
        <div className="ap-group">
          {row('edit', User, isEmployer ? 'دەستکاری کۆمپانیا' : 'دەستکاری پڕۆفایل', { onClick: () => setShowEdit(true) })}
          {isFreelancer && row('cv', FileText, 'کارنامەکانم (CV)', { hint: user?.cv_url ? 'بارکراوە' : '', onClick: () => onNavigate?.('resumes') })}
          {isFreelancer && row('apps', Briefcase, 'داواکارییەکانم', { hint: applCount, onClick: () => onNavigate?.('my_applications') })}
          {isFreelancer && row('saved', Heart, 'کارە پاشەکەوتکراوەکان', { hint: savedCount, onClick: () => setShowSaved(true) })}
          {isEmployer && row('dash', Briefcase, 'داشبۆردی کۆمپانیا', { hint: employerJobs.length, onClick: () => onNavigate?.('my_company_dashboard') })}
          {row('viewers', Eye, 'بینەرانی پڕۆفایل', { hint: profileViews, onClick: () => setShowViewers(true) })}
        </div>

        </div><div className="ap-col">
        <div className="ap-label ap-first">دەربارە</div>
        <section className="ap-card">
          <div className="ap-card-head"><span>{isEmployer ? 'دەربارەی کۆمپانیا' : 'دەربارەی من'}</span><button onClick={() => setShowEdit(true)}>دەستکاری</button></div>
          <p>{bio || user?.bio || (isEmployer ? 'کورتەیەک دەربارەی کۆمپانیاکەت بنووسە.' : 'کورتەیەک دەربارەی خۆت و ئەزموونەکانت بنووسە.')}</p>
          <div className="ap-place"><MapPin className="w-4 h-4" />{location || 'سلێمانی'}{joinYear ? ` · ئەندام لە ${joinYear}` : ''}</div>
        </section>

        {isFreelancer && (
          <>
            <section className="ap-card">
              <div className="ap-card-head"><span>شارەزایی</span><button onClick={() => setShowEdit(true)}>زیادکردن</button></div>
              <div className="ap-chips">
                {skillList.map(sk => <span key={sk}>#{String(sk).replace(/\s+/g, '_')}</span>)}
                {skillList.length === 0 && <small>هیچ شارەزاییەک زیاد نەکراوە.</small>}
              </div>
            </section>
            <section className="ap-card">
              <div className="ap-card-head"><span>ئەزموونی کار</span><button onClick={() => setShowEdit(true)}>زیادکردن</button></div>
              {experiences.length === 0 ? <small className="ap-empty">هیچ ئەزموونێک زیاد نەکراوە.</small> : (
                <div className="ap-timeline">
                  {experiences.map((exp, i) => (
                    <div className="ap-exp" key={exp.id || i}>
                      <span className="ap-dot" />
                      <div><div className="ap-exp-top"><strong>{exp.title}</strong><small>{exp.period}</small></div>{exp.description && <p>{exp.description}</p>}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
        {isEmployer && Number(user?.verified) === 1 && (
          <section className="ap-card ap-verified"><ShieldCheck className="w-5 h-5" /><span>هەژماری پشتڕاستکراوە</span></section>
        )}

        <div className="ap-label">ڕێکخستن</div>
        <div className="ap-group">
          <div className="ap-row ap-static">
            <span className="ap-row-ic"><Bell className="w-[19px] h-[19px]" /></span>
            <span className="ap-row-t">ئاگادارکردنەوەکان</span>
            <button type="button" role="switch" aria-checked={pushEnabled} aria-label="ئاگادارکردنەوەکان" className="ap-switch" onClick={handleTogglePush} disabled={pushBusy}><i /></button>
          </div>
          {canSeePlans(user) && row('plans', Sparkles, 'پلانەکانی ئیش خواز', { hint: userPlanTier?.name_ku || '', onClick: () => onNavigate?.('plans') })}
          {row('how', HelpCircle, 'چۆنیەتی کارکردنی ئەپ', { onClick: () => onNavigate?.('how_it_works') })}
          {row('about', Info, 'دەربارەی ئیش خواز', { onClick: () => onNavigate?.('about') })}
          {row('contact', MessageCircle, 'پەیوەندیمان پێوە بکە', { onClick: () => onNavigate?.('contact') })}
          {row('logout', LogOut, 'چوونەدەرەوە', { onClick: () => setShowLogout(true), danger: true })}
        </div>
        </div></div>
      </div>
    );
  };
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
    const fieldCls = 'w-full bg-[#f6f7f8] border border-transparent rounded-2xl px-4 py-3.5 text-[13px] font-medium outline-none transition';
    const fieldStyle = { color: TXT };
    const fieldFocus = 'focus:bg-white focus:border-[#12796b]/40 focus:shadow-[0_0_0_4px_rgba(18,121,107,.08)]';
    return (
      <div className="ap-page" dir="rtl" style={{ fontFamily: NK }}>
        <div className="ap-edit w-full bg-white rounded-[28px] border border-[#e5ece9] [overflow:clip]">
          {/* Header — soft wash, round back button, big title (same look as the profile page) */}
          <div className="ap-modal-head shrink-0">
            <button onClick={() => setShowEdit(false)} className="ap-circle" aria-label="گەڕانەوە"><ChevronRight className="w-5 h-5" /></button>
            <h3>{isEmployer ? 'دەستکاری پڕۆفایلی کۆمپانیا' : 'دەستکاری پڕۆفایل'}</h3>
          </div>

          <div
            className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-6"
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

          {/* Footer — always-reachable save pill */}
          <div className="ap-modal-foot shrink-0">
            <button type="button" onClick={() => setShowEdit(false)} className="ap-ghost">داخستن</button>
            <button type="button" onClick={handleSave} disabled={saving} className="ap-save">
              {saved ? <><CheckCircle2 className="w-4 h-4" /> پاشەکەوتکرا</> : <><Save className="w-4 h-4" /> {saving ? 'خەریکی...' : 'پاشەکەوتکردن'}</>}
            </button>
          </div>

        </div>
      </div>
    );
  };

  /* ── Saved jobs modal ── */
  const SavedModalImpl = () => (
    <div className="ap-page" dir="rtl" style={{ fontFamily: NK }}>
      <div className="ap-sub w-full max-w-2xl mx-auto bg-white rounded-[28px] border border-[#e5ece9] flex flex-col [overflow:clip]">
        <div className="ap-modal-head">
          <button onClick={() => setShowSaved(false)} className="ap-circle" aria-label="گەڕانەوە"><ChevronRight className="w-5 h-5" /></button>
          <h3>
            کارە پاشەکەوتکراوەکان ({savedList.length})
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
          <button onClick={() => setShowSaved(false)} className="ap-save w-full">داخستن</button>
        </div>
      </div>
    </div>
  );

  /* ── Viewers modal ── */
  const ViewersModalImpl = () => (
    <div className="ap-page" dir="rtl" style={{ fontFamily: NK }}>
      <div className="ap-sub w-full max-w-2xl mx-auto bg-white rounded-[28px] border border-[#e5ece9] flex flex-col [overflow:clip]">
        <div className="ap-modal-head">
          <button onClick={() => setShowViewers(false)} className="ap-circle" aria-label="گەڕانەوە"><ChevronRight className="w-5 h-5" /></button>
          <h3>بینەرانی پڕۆفایل</h3>
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
          <button onClick={() => setShowViewers(false)} className="ap-save w-full">داخستن</button>
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

  useEffect(() => { window.scrollTo(0, 0); }, [showEdit, showSaved, showViewers]);

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
        .profile-page-shell:before{content:"";position:absolute;inset:0 0 auto 0;height:420px;z-index:0;pointer-events:none;
          background:radial-gradient(60% 90% at 92% 0%,rgba(18,121,107,.13),transparent 66%),radial-gradient(50% 70% at 4% 10%,rgba(18,121,107,.06),transparent 68%)}
        .profile-page-shell .profile-ambient{display:none}
        :root{--ink:#111d1a;--sub:#4a5b55;--muted:#7b8e88;--soft:#fff;--line:#e5ece9;--teal:#12796b;--teal-deep:#0d5c50;--mint:#e7f4f1;--danger:#dc2626}
        .ap{position:relative;z-index:1;max-width:640px;margin:0 auto;color:var(--ink);padding-bottom:36px}
        .ap button:focus-visible,.ap-sheet button:focus-visible,.ap-edit button:focus-visible{outline:2px solid var(--teal);outline-offset:2px}
        .ap-top{display:flex;align-items:center;justify-content:space-between;height:64px}
        .ap-title{margin:0;font-size:26px;font-weight:800}
        .ap-top-actions{display:flex;gap:8px}
        .ap-circle{width:42px;height:42px;border-radius:50%;border:1px solid var(--line);background:#fff;display:inline-flex;align-items:center;justify-content:center;color:var(--ink);transition:.18s;flex:0 0 auto}
        .ap-circle:hover{background:#fff;transform:translateY(-1px)}
        .ap-alert{display:flex;align-items:center;gap:10px;padding:12px 14px;background:#fffaf0;border:1px solid #f2dfae;border-radius:18px;margin:4px 0 12px}
        .ap-alert strong,.ap-alert span{display:block;font-size:11px;font-weight:700}.ap-alert span{color:var(--muted);margin-top:2px;direction:ltr;text-align:right}
        .ap-alert button{border:0;background:var(--teal);color:#fff;border-radius:999px;padding:8px 14px;font-size:11px;font-weight:700}
        .ap-id{display:flex;align-items:center;gap:16px;margin:10px 0 18px}
        .ap-avatar-wrap{position:relative;width:88px;height:88px;flex:0 0 auto}
        .ap-avatar{width:88px;height:88px;border-radius:50%;overflow:hidden;border:0;padding:0;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--teal),var(--teal-deep));color:#fff;font-size:32px;font-weight:800;box-shadow:0 8px 24px rgba(18,121,107,.22)}
        .ap-avatar img{width:100%;height:100%;object-fit:cover}
        .ap-pencil{position:absolute;bottom:2px;left:2px;width:26px;height:26px;border-radius:50%;background:var(--teal);color:#fff;border:2px solid #fff;display:flex;align-items:center;justify-content:center}
        .ap-id-text{min-width:0}
        .ap-id-text h2{margin:0;font-size:24px;line-height:1.3;font-weight:800;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
        .ap-id-text p{margin:2px 0 8px;font-size:12px;color:var(--muted);text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .ap-chip{display:inline-block;padding:5px 12px;border-radius:999px;background:#e7f4f1;border:1px solid var(--line);font-size:11px;font-weight:600;color:var(--sub)}
        .ap-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
        .ap-stat{border:1px solid var(--line);background:var(--soft);border-radius:20px;padding:14px 8px;text-align:center;transition:.18s}
        .ap-stat:hover{background:var(--mint)}
        .ap-stat strong{display:block;font-size:22px;font-weight:800;line-height:1.1}
        .ap-stat span{display:block;margin-top:5px;font-size:11px;color:var(--muted);font-weight:600}
        .ap-progress-card{border:1px solid var(--line);background:var(--soft);border-radius:20px;padding:14px 16px;margin-top:10px}
        .ap-progress-top{display:flex;align-items:center;justify-content:space-between;font-size:12px;font-weight:600;color:var(--sub)}
        .ap-progress-top strong{font-size:14px;color:var(--teal-deep)}
        .ap-bar{height:6px;border-radius:99px;background:#e3e6e9;margin-top:10px;overflow:hidden}
        .ap-bar i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--teal),#43bea4);transition:width .5s ease}
        .ap-progress-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:10px}
        .ap-progress-foot small{font-size:11px;color:var(--muted)}
        .ap-progress-foot button{border:0;background:#e7f4f1;border-radius:999px;padding:7px 14px;font-size:11px;font-weight:700;color:var(--teal-deep);}
        .ap-label{margin:24px 4px 8px;font-size:12px;color:var(--muted);font-weight:600}
        .ap-group{display:flex;flex-direction:column;gap:8px}
        .ap-row{border:1px solid var(--line);width:100%;min-height:58px;display:flex;align-items:center;gap:12px;padding:8px 16px;background:var(--soft);border-radius:20px;text-align:right;color:var(--ink);font-size:14px;font-weight:600;transition:background .16s,transform .16s}
        button.ap-row:hover{background:#f7fbfa;border-color:#cfe6df}button.ap-row:active{transform:scale(.99)}
        .ap-static{cursor:default}
        .ap-row-ic{display:flex;color:#2a2f33;flex:0 0 auto}
        .ap-row-t{flex:1;min-width:0}
        .ap-row-t small{display:block;margin-top:2px;font-size:11px;font-weight:500;color:var(--muted)}
        .ap-row-hint{min-width:26px;padding:3px 9px;border-radius:999px;background:#e7f4f1;color:var(--teal-deep);font-size:12px;font-weight:700;color:var(--sub);text-align:center}
        .ap-chev{color:#b4b9bf;flex:0 0 auto}
        .ap-danger{background:#fff4f4;color:var(--danger)}.ap-danger .ap-row-ic{color:var(--danger)}
        button.ap-danger:hover{background:#ffeaea}
        .ap-switch{width:48px;height:28px;border-radius:99px;background:#dcdfe3;padding:3px;display:flex;justify-content:flex-start;border:0;transition:background .2s;flex:0 0 auto}
        .ap-switch i{width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.25);display:block;transition:transform .2s}
        .ap-switch[aria-checked=true]{background:var(--teal);justify-content:flex-end}.ap-switch:disabled{opacity:.6}
        .ap-card{border:1px solid var(--line);background:var(--soft);border-radius:20px;padding:16px;margin-bottom:8px}
        .ap-card-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
        .ap-card-head span{font-size:13px;font-weight:700}
        .ap-card-head button{border:0;background:#e7f4f1;border-radius:999px;padding:6px 12px;font-size:11px;font-weight:700;color:var(--teal-deep)}
        .ap-card>p{margin:0;font-size:13px;line-height:2;color:var(--sub);font-weight:500}
        .ap-place{display:flex;align-items:center;gap:6px;margin-top:12px;font-size:12px;color:var(--muted);font-weight:600}
        .ap-chips{display:flex;flex-wrap:wrap;gap:7px}
        .ap-chips span{padding:7px 12px;border-radius:999px;background:#e7f4f1;border:1px solid #cfe6df;font-size:12px;font-weight:600;color:var(--teal-deep)}
        .ap-chips small,.ap-empty{font-size:12px;color:var(--muted)}
        .ap-timeline{display:flex;flex-direction:column;gap:14px}
        .ap-exp{display:grid;grid-template-columns:10px 1fr;gap:12px}
        .ap-dot{width:8px;height:8px;border-radius:50%;background:var(--teal);margin-top:7px;box-shadow:0 0 0 4px var(--mint)}
        .ap-exp-top{display:flex;justify-content:space-between;gap:10px;align-items:baseline}
        .ap-exp-top strong{font-size:13px;font-weight:700}.ap-exp-top small{font-size:11px;color:var(--muted)}
        .ap-exp p{margin:4px 0 0;font-size:12px;line-height:1.8;color:var(--sub)}
        .ap-verified{display:flex;align-items:center;gap:8px;color:var(--teal-deep);font-size:13px;font-weight:700}
        /* sheets + edit modal */
        @keyframes apFade{from{opacity:0}to{opacity:1}}@keyframes apUp{from{transform:translateY(28px);opacity:0}to{transform:none;opacity:1}}
        .ap-overlay{position:fixed;inset:0;z-index:9000;background:rgba(15,20,25,.45);backdrop-filter:blur(8px);display:flex;align-items:flex-end;justify-content:center;animation:apFade .2s ease both;font-family:${NK};color:var(--ink)}
        .ap-sheet{position:relative;width:100%;max-width:540px;max-height:94vh;background:#fff;border-radius:32px 32px 0 0;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 -24px 80px rgba(0,0,0,.25);animation:apUp .3s cubic-bezier(.22,1,.36,1) both}
        .ap-modal-head{position:relative;display:flex;flex-direction:column;align-items:flex-start;gap:14px;padding:18px 20px 12px;
          background:radial-gradient(70% 130% at 96% 0%,rgba(18,121,107,.14),transparent 66%),#fff}
        .ap-modal-head h2,.ap-modal-head h3{margin:0;font-size:24px;font-weight:800;color:var(--ink)}
        .ap-sheet-body{padding:6px 18px calc(22px + env(safe-area-inset-bottom));overflow-y:auto}
        .ap-account{border:1px solid var(--line);display:flex;align-items:center;gap:12px;background:var(--soft);border-radius:22px;padding:12px 14px}
        .ap-account-av{width:52px;height:52px;border-radius:50%;overflow:hidden;background:linear-gradient(135deg,var(--teal),var(--teal-deep));display:flex;align-items:center;justify-content:center;font-weight:800;font-size:20px;color:#fff;flex:0 0 auto}
        .ap-account-av img{width:100%;height:100%;object-fit:cover}
        .ap-account strong{display:block;font-size:14px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .ap-account span{display:block;font-size:11px;color:var(--muted);margin-top:2px;text-align:right}
        .ap-account>button{border:0;background:#fff;border-radius:999px;padding:8px 14px;font-size:11px;font-weight:700;color:var(--teal-deep);}
        .ap-modal-foot{display:flex;align-items:center;gap:10px;padding:12px 18px;border-top:1px solid var(--line);background:#fff}
        .ap-save{flex:1;height:50px;border:0;border-radius:999px;background:linear-gradient(135deg,var(--teal),var(--teal-deep));color:#fff;font-size:13px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 10px 24px rgba(18,121,107,.22);transition:.18s}
        .ap-save:active{transform:scale(.98)}.ap-save:disabled{opacity:.7}
        .ap-ghost{height:50px;padding:0 22px;border-radius:999px;background:var(--soft);border:0;font-size:13px;font-weight:700;color:var(--sub)}
        @media(min-width:640px){.ap-overlay{align-items:center;padding:22px}.ap-sheet{border-radius:32px;max-height:90vh}}
        .ap-cols{display:block}
        .ap-page{position:relative;z-index:1;max-width:1100px;margin:0 auto;padding-bottom:36px}
        .ap-page .ap-modal-foot{position:sticky;bottom:calc(74px + env(safe-area-inset-bottom));z-index:5;border:1px solid var(--line);border-radius:26px;margin:0 12px 12px;box-shadow:0 12px 34px rgba(13,60,52,.12)}
        .ap-page .ap-modal-head{padding-top:18px}
        @media(min-width:1024px){
          .ap{max-width:1140px}
          .ap-title{font-size:30px}
          .ap-cols{display:grid;grid-template-columns:minmax(0,440px) minmax(0,1fr);gap:32px;align-items:start}
          .ap-col{min-width:0}
          .ap-col:first-child{position:sticky;top:96px}
          .ap-first{margin-top:6px}
          .ap-page .ap-modal-foot{bottom:16px}
        }
        @media(max-width:640px){.profile-page-shell{padding-left:14px!important;padding-right:14px!important}.ap-title{font-size:24px}}
        @media(prefers-reduced-motion:reduce){.ap *,.ap-sheet,.ap-overlay{animation:none!important;transition:none!important}}
      `}</style>
      {/* Edit / saved / viewers are pages of their own (not popups); only the small confirm dialogs float. */}
      {showEdit ? <EditModal /> : showSaved ? <SavedModal /> : showViewers ? <ViewersModal /> : <ProfileHero />}
      {showLogout && <LogoutModal />}
      {showAbout && createPortal(<AboutModal onClose={() => setShowAbout(false)} />, document.body)}
    </div>
  );
};