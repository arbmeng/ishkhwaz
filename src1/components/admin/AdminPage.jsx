import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { apiService } from '../../services/api';
import { realtimeService } from '../../services/realtimeService';
import { soundService } from '../../services/soundService';
import { Monogram } from '../ui/Monogram';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { getPlanIcon, getPlanColor, PLAN_ICON_NAMES, PLAN_COLOR_NAMES } from '../../utils/planPresets';
import { gold } from '../../styles/editorial';
import {
  ArrowLeft, Users, CreditCard, Briefcase, Search, X, Check, Trash2, ShieldCheck,
  Ban, Plus, Save, Loader2, ChevronLeft, RadioTower, Star,
} from 'lucide-react';

// "Editorial system v1" tokens — same shape as CompanyDashboard/UserProfilePage.
const NK = "'Noto Kufi Arabic', system-ui, sans-serif";
const SG = "'Space Grotesk', sans-serif";
const C = {
  ink: 'oklch(0.2 0.01 60)', lime: 'oklch(0.82 0.09 82)', cardBorder: 'oklch(0.91 0.006 85)', cardBorderSoft: 'oklch(0.93 0.006 85)',
  softBg: 'oklch(0.985 0.004 85)', softBg2: 'oklch(0.97 0.005 85)', softBorder: 'oklch(0.94 0.006 85)',
  muted1: 'oklch(0.42 0.01 60)', muted2: 'oklch(0.55 0.01 60)', muted3: 'oklch(0.62 0.01 60)', muted4: 'oklch(0.45 0.01 60)',
  green: 'oklch(0.55 0.09 155)', roseBg: 'oklch(0.985 0.012 25)', roseBorder: 'oklch(0.88 0.06 25)', roseText: 'oklch(0.42 0.13 25)',
  amberBg: gold.chipBg, amberBorder: gold.chipBorder, amberText: gold.badgeText,
};
const cardStyle = {
  borderRadius: 24,
  background: 'linear-gradient(180deg, oklch(1 0 0), oklch(0.995 0.003 85))',
  border: `1px solid ${C.cardBorderSoft}`,
  boxShadow: '0 1px 2px rgba(20,17,13,0.03), 0 16px 40px -20px rgba(20,17,13,0.16)',
};

const ROLE_LABELS = { freelancer: 'کارخواز', employer: 'کۆمپانیا', admin: 'ئەدمین', owner: 'خاوەن' };
const STATUS_LABELS = { active: 'چالاک', blocked: 'بلۆککراو', frozen: 'فریزکراو' };
const AUDIENCE_LABELS = { freelancer: 'تەنها کارخواز', employer: 'تەنها کۆمپانیا', both: 'هەردووکیان' };

const inputCls = "w-full rounded-xl bg-white border outline-none transition-all text-xs px-3 py-2.5";
const inputStyle = { borderColor: C.cardBorder, color: C.ink };
const labelCls = "text-[11px] font-bold block mb-1";

const TabButton = ({ active, onClick, Icon, label, count }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      padding: '10px 4px', marginInlineEnd: 24, background: 'transparent', border: 'none',
      borderBottom: `2.5px solid ${active ? C.ink : 'transparent'}`, fontSize: 13, fontWeight: 700,
      color: active ? C.ink : C.muted3, cursor: 'pointer', whiteSpace: 'nowrap',
      display: 'flex', alignItems: 'center', gap: 6, transition: 'color 0.15s ease, border-color 0.15s ease',
    }}
  >
    <Icon className="w-4 h-4" />
    <span>{label}</span>
    {count > 0 && (
      <span style={{ padding: '1px 7px', borderRadius: 999, background: active ? C.ink : C.softBg, color: active ? C.lime : C.muted2, fontSize: 10.5, fontWeight: 800 }}>
        {count}
      </span>
    )}
  </button>
);

const Chip = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className="shrink-0 whitespace-nowrap rounded-full transition-all"
    style={{
      padding: '7px 13px', fontSize: 11.5, fontWeight: active ? 700 : 500,
      background: active ? C.ink : '#fff', color: active ? '#fff' : C.muted1,
      border: `1px solid ${active ? C.ink : C.cardBorder}`,
    }}
  >
    {children}
  </button>
);

const Badge = ({ children, tone = 'default' }) => {
  const tones = {
    default: { bg: C.softBg, fg: C.muted1, border: C.softBorder },
    green: { bg: '#eefbf1', fg: C.green, border: '#d3f0da' },
    rose: { bg: C.roseBg, fg: C.roseText, border: C.roseBorder },
    amber: { bg: C.amberBg, fg: C.amberText, border: C.amberBorder },
    dark: { bg: C.ink, fg: C.lime, border: C.ink },
  };
  const t = tones[tone] || tones.default;
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-full" style={{ padding: '2px 9px', fontSize: 10.5, fontWeight: 700, background: t.bg, color: t.fg, border: `1px solid ${t.border}` }}>
      {children}
    </span>
  );
};

const IconAction = ({ icon: IconEl, label, onClick, tone = 'default', disabled }) => {
  const tones = {
    default: { bg: C.softBg, fg: C.muted1, border: C.softBorder },
    green: { bg: '#eefbf1', fg: C.green, border: '#d3f0da' },
    danger: { bg: C.roseBg, fg: C.roseText, border: C.roseBorder },
    dark: { bg: C.ink, fg: '#fff', border: C.ink },
  };
  const t = tones[tone];
  return (
    <button
      type="button" onClick={onClick} disabled={disabled}
      style={{
        display: 'flex', alignItems: 'center', gap: 5, padding: '7px 11px', borderRadius: 10,
        background: t.bg, color: t.fg, border: `1px solid ${t.border}`, fontSize: 11, fontWeight: 700,
        cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1, whiteSpace: 'nowrap',
      }}
      className={disabled ? '' : 'active:scale-95 transition'}
    >
      <IconEl className="w-3.5 h-3.5" />
      {label && <span>{label}</span>}
    </button>
  );
};

const emptyUserForm = () => ({
  id: '', name: '', phone: '', email: '', role: 'freelancer', status: 'active', verified: false,
  gender: 'male', governorate: '', district: '', sub_district: '', bio: '',
  wallet_balance: 0, plan: '', plan_credits: 0, plan_boost_until: '',
  company_name: '', company_reg: '', company_phone: '', company_email: '', industry: '',
  company_size: '', company_type: '', skills: '', favorite_categories: '',
});

const userToForm = (u) => ({
  id: u.id, name: u.name || '', phone: u.phone || '', email: u.email || '',
  role: u.role || 'freelancer', status: u.status || 'active', verified: Number(u.verified) === 1,
  gender: u.gender || 'male', governorate: u.governorate || '', district: u.district || '', sub_district: u.sub_district || '',
  bio: u.bio || '', wallet_balance: Number(u.wallet_balance) || 0,
  plan: u.plan || '', plan_credits: Number(u.plan_credits) || 0, plan_boost_until: u.plan_boost_until || '',
  company_name: u.company_name || '', company_reg: u.company_reg || '', company_phone: u.company_phone || '',
  company_email: u.company_email || '', industry: u.industry || '',
  company_size: u.company_size || '', company_type: u.company_type || '',
  skills: (() => { try { return (JSON.parse(u.skills || '[]') || []).join('، '); } catch { return ''; } })(),
  favorite_categories: (() => { try { return (JSON.parse(u.favorite_categories || '[]') || []).join('، '); } catch { return ''; } })(),
});

const emptyPlanForm = () => ({
  id: '', name_ku: '', name_en: '', tagline: '', icon: 'Star', color: 'lime',
  price: 0, credits: 0, boost_days: 0, audience: 'both', featured: false, is_primary_free: false,
  can_message: true, can_receive_invitations: true, can_see_profile_viewers: false, is_active: true,
  featuresText: '',
});

const planToForm = (p) => {
  let features = [];
  try { features = JSON.parse(p.features || '[]') || []; } catch { /* ignore */ }
  return {
    id: p.id, name_ku: p.name_ku || '', name_en: p.name_en || '', tagline: p.tagline || '',
    icon: p.icon || 'Star', color: p.color || 'lime',
    price: Number(p.price) || 0, credits: Number(p.credits) || 0, boost_days: Number(p.boost_days) || 0,
    audience: p.audience || 'both', featured: Number(p.featured) === 1, is_primary_free: Number(p.is_primary_free) === 1,
    can_message: Number(p.can_message) !== 0, can_receive_invitations: Number(p.can_receive_invitations) !== 0,
    can_see_profile_viewers: Number(p.can_see_profile_viewers) === 1, is_active: Number(p.is_active) !== 0,
    featuresText: features.map(f => `${f.ok ? '+' : '-'} ${f.label}`).join('\n'),
  };
};

const parseFeaturesText = (text) => (text || '').split('\n').map(l => l.trim()).filter(Boolean).map(l => {
  const ok = !l.startsWith('-');
  const label = l.replace(/^[+-]\s*/, '').trim();
  return { ok, label };
}).filter(f => f.label);

export const AdminPage = ({ onBack }) => {
  const { user, token } = useAuth();
  const { jobs = [], setJobs, deleteJob, addToast, settings = {}, syncBackendData } = useStore();
  const isAdmin = !!user && (user.role === 'admin' || user.role === 'owner');

  const [tab, setTab] = useState('users');
  const [isLive, setIsLive] = useState(false);

  // ---------------- Settings ----------------
  const [settingsForm, setSettingsForm] = useState({ cv_fee_amount: '', fastpay_number: '', job_boost_price: '', job_boost_days: '' });
  const [savingSettings, setSavingSettings] = useState(false);
  useEffect(() => {
    setSettingsForm(prev => ({
      cv_fee_amount: settings.cv_fee_amount ?? prev.cv_fee_amount,
      fastpay_number: settings.fastpay_number ?? prev.fastpay_number,
      job_boost_price: settings.job_boost_price ?? prev.job_boost_price,
      job_boost_days: settings.job_boost_days ?? prev.job_boost_days,
    }));
  }, [settings.cv_fee_amount, settings.fastpay_number, settings.job_boost_price, settings.job_boost_days]);

  const saveSetting = async (key) => {
    setSavingSettings(true);
    const res = await apiService.updateSetting(key, String(settingsForm[key] ?? ''), token);
    setSavingSettings(false);
    if (res?.success) {
      addToast?.({ title: 'پاشەکەوتکرا ✓', message: 'ڕێکخستنەکە نوێکرایەوە.', type: 'success' });
      syncBackendData?.();
    } else {
      addToast?.({ title: 'سەرنەکەوت', message: 'نوێکردنەوەی ڕێکخستن سەرکەوتوو نەبوو.', type: 'warning' });
    }
  };

  // ---------------- Users ----------------
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [editingUser, setEditingUser] = useState(null); // form object, or null
  const [savingUser, setSavingUser] = useState(false);
  const [deletingUser, setDeletingUser] = useState(null); // user id pending delete confirmation
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', phone: '', email: '', password: '', role: 'freelancer' });

  const loadUsers = async () => {
    const list = await apiService.getAdminUsers(token);
    setUsers(Array.isArray(list) ? list : []);
    setUsersLoading(false);
  };

  // ---------------- Plans ----------------
  const [planTiers, setPlanTiers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState(null); // form object, or null
  const [savingPlan, setSavingPlan] = useState(false);
  const [deletingPlan, setDeletingPlan] = useState(null);

  const loadPlans = async () => {
    const [tiers, allPurchases] = await Promise.all([
      apiService.getAllPlanTiers(token),
      apiService.getPendingPlanPurchases(token),
    ]);
    setPlanTiers(Array.isArray(tiers) ? tiers : []);
    setPurchases(Array.isArray(allPurchases) ? allPurchases : []);
    setPlansLoading(false);
  };

  useEffect(() => { if (isAdmin) { loadUsers(); loadPlans(); } }, [isAdmin]);

  // Live: any admin-update event (from this session or another admin's)
  // refreshes both lists — simplest robust approach, cheap enough for a
  // small marketplace's data volume.
  useEffect(() => {
    if (!isAdmin) return;
    const off = realtimeService.on('admin-update', () => {
      setIsLive(true);
      loadUsers();
      loadPlans();
    });
    return off;
  }, [isAdmin]);

  const pendingPurchases = useMemo(() => purchases.filter(p => p.status === 'pending'), [purchases]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return users.filter(u => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (!q) return true;
      return (u.name || '').toLowerCase().includes(q) || (u.phone || '').includes(q) || (u.email || '').toLowerCase().includes(q);
    });
  }, [users, userSearch, roleFilter]);

  const roleCounts = useMemo(() => {
    const c = { all: users.length, freelancer: 0, employer: 0, admin: 0, owner: 0 };
    users.forEach(u => { if (c[u.role] !== undefined) c[u.role]++; });
    return c;
  }, [users]);

  // ---------------- User actions ----------------
  const handleSaveUser = async () => {
    if (!editingUser) return;
    setSavingUser(true);
    const payload = {
      ...editingUser,
      skills: editingUser.skills.split(/[،,]/).map(s => s.trim()).filter(Boolean),
      favorite_categories: editingUser.favorite_categories.split(/[،,]/).map(s => s.trim()).filter(Boolean),
      verified: editingUser.verified ? 1 : 0,
    };
    const res = await apiService.updateAdminUser(payload, token);
    setSavingUser(false);
    if (res?.success) {
      soundService.playSuccess?.();
      addToast?.({ title: 'پاشەکەوتکرا', message: 'زانیارییەکانی بەکارهێنەر نوێکرانەوە.', type: 'success' });
      setEditingUser(null);
      loadUsers();
    } else {
      addToast?.({ title: 'کێشە', message: res?.message || 'پاشەکەوتکردن سەرکەوتوو نەبوو.', type: 'error' });
    }
  };

  const handleToggleBlock = async (u) => {
    const nextBlocked = u.status !== 'blocked';
    const res = await apiService.toggleBlockUser(u.id, nextBlocked, token);
    if (res?.success) { soundService.playTick?.(); loadUsers(); }
  };

  const handleToggleVerify = async (u) => {
    const res = await apiService.toggleVerifyUser(u.id, Number(u.verified) !== 1, token);
    if (res?.success) { soundService.playTick?.(); loadUsers(); }
  };

  const handleConfirmDeleteUser = async () => {
    if (!deletingUser) return;
    const res = await apiService.deleteAdminUser(deletingUser, token);
    setDeletingUser(null);
    if (res?.success) { addToast?.({ title: 'سڕایەوە', message: 'هەژمارەکە سڕایەوە.', type: 'success' }); loadUsers(); }
  };

  const handleAddUser = async () => {
    if (!newUser.name.trim() || !newUser.phone.trim()) return;
    setSavingUser(true);
    const res = await apiService.createAdminUser(newUser, token);
    setSavingUser(false);
    if (res?.success) {
      soundService.playSuccess?.();
      setShowAddUser(false);
      setNewUser({ name: '', phone: '', email: '', password: '', role: 'freelancer' });
      loadUsers();
    } else {
      addToast?.({ title: 'کێشە', message: res?.message || 'زیادکردن سەرکەوتوو نەبوو.', type: 'error' });
    }
  };

  // ---------------- Plan actions ----------------
  const handleSavePlan = async () => {
    if (!editingPlan) return;
    setSavingPlan(true);
    const payload = { ...editingPlan, features: parseFeaturesText(editingPlan.featuresText) };
    delete payload.featuresText;
    const res = editingPlan.id
      ? await apiService.updatePlanTier(payload, token)
      : await apiService.addPlanTier(payload, token);
    setSavingPlan(false);
    if (res?.success) {
      soundService.playSuccess?.();
      addToast?.({ title: 'پاشەکەوتکرا', message: 'پلانەکە پاشەکەوتکرا.', type: 'success' });
      setEditingPlan(null);
      loadPlans();
    } else {
      addToast?.({ title: 'کێشە', message: res?.message || 'پاشەکەوتکردن سەرکەوتوو نەبوو.', type: 'error' });
    }
  };

  const handleConfirmDeletePlan = async () => {
    if (!deletingPlan) return;
    const res = await apiService.deletePlanTier(deletingPlan, token);
    setDeletingPlan(null);
    if (res?.success) { addToast?.({ title: 'سڕایەوە', message: 'پلانەکە سڕایەوە.', type: 'success' }); loadPlans(); }
  };

  const handleVerifyPurchase = async (purchaseId, status) => {
    const res = await apiService.verifyPlanPurchase(purchaseId, status, token);
    if (res?.success) { soundService.playSuccess?.(); loadPlans(); }
  };

  // ---------------- Job actions ----------------
  const [deletingJob, setDeletingJob] = useState(null);
  const handleConfirmDeleteJob = async () => {
    if (!deletingJob) return;
    await deleteJob(deletingJob);
    setDeletingJob(null);
  };
  const handleApproveJob = async (id) => {
    soundService.playSuccess?.();
    const res = await apiService.approveJob(id, token);
    if (res?.success) {
      // Patch locally right away — a full syncBackendData() refetch (7
      // concurrent calls) can take several seconds, and on the shared host
      // sometimes longer, which made a genuinely successful approve look
      // like nothing happened. syncBackendData still runs after, to
      // reconcile with the server.
      setJobs?.(prev => prev.map(j => String(j.id) === String(id) ? { ...j, status: 'active' } : j));
      addToast?.({ title: 'پەسەندکرا ✓', message: 'کارەکە ئێستا بۆ هەموو کاندیدەکان دیارە.', type: 'success' });
      syncBackendData?.();
    }
  };
  const handleRejectJob = async (id) => {
    soundService.playTick?.();
    const res = await apiService.rejectJob(id, '', token);
    if (res?.success) {
      setJobs?.(prev => prev.map(j => String(j.id) === String(id) ? { ...j, status: 'rejected' } : j));
      addToast?.({ title: 'ڕەتکرایەوە', message: 'کارەکە ڕەتکرایەوە.', type: 'info' });
      syncBackendData?.();
    }
  };

  if (!isAdmin) {
    return (
      <div dir="rtl" className="min-h-screen flex items-center justify-center font-vazirmatn p-6">
        <div className="text-center">
          <p className="text-sm font-bold text-slate-500">تەنها ئەدمین دەتوانێت ئەم پەیجە ببینێت.</p>
          <button onClick={onBack} className="mt-3 text-xs font-bold underline text-slate-400">گەڕانەوە</button>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" style={{ fontFamily: NK, color: C.ink, minHeight: '100vh' }} className="select-none pb-28 px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
      <style>{`.ishk-admin-input:focus { border-color: ${C.ink} !important; background: #fff; }`}</style>

      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 rounded-full" style={{ background: C.softBg, border: `1px solid ${C.softBorder}` }}>
              <ArrowLeft className="w-4 h-4 rtl:rotate-180" style={{ color: C.muted1 }} />
            </button>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>پانێلی ئەدمین</h1>
              <p style={{ fontSize: 11, color: C.muted2, margin: 0 }}>بەڕێوەبردنی بەکارهێنەران، پلانەکان و کارەکان</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5" style={{ fontSize: 10.5, fontWeight: 700, color: isLive ? C.green : C.muted3 }}>
            <RadioTower className="w-3.5 h-3.5" />
            {isLive ? 'ڕاستەوخۆ چالاکە' : 'چاوەڕوانی داتا...'}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center" style={{ borderBottom: `1px solid ${C.softBorder}` }}>
          <TabButton active={tab === 'users'} onClick={() => setTab('users')} Icon={Users} label="بەکارهێنەران" count={users.length} />
          <TabButton active={tab === 'plans'} onClick={() => setTab('plans')} Icon={CreditCard} label="پلانەکان" count={pendingPurchases.length} />
          <TabButton active={tab === 'jobs'} onClick={() => setTab('jobs')} Icon={Briefcase} label="کارەکان" count={jobs.filter(j => j.status === 'pending').length} />
          <TabButton active={tab === 'settings'} onClick={() => setTab('settings')} Icon={Save} label="ڕێکخستنەکان" count={0} />
        </div>

        {/* ============ USERS TAB ============ */}
        {tab === 'users' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex-1 min-w-[180px] relative flex items-center">
                <Search className="w-3.5 h-3.5 absolute right-3 pointer-events-none" style={{ color: C.muted3 }} />
                <input
                  value={userSearch} onChange={e => setUserSearch(e.target.value)}
                  placeholder="گەڕان بە ناو، ژمارە یان ئیمەیل..."
                  className={`${inputCls} ishk-admin-input pr-9`} style={inputStyle}
                />
              </div>
              <button onClick={() => setShowAddUser(true)} className="flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-xs font-bold" style={{ background: C.ink, color: '#fff' }}>
                <Plus className="w-3.5 h-3.5" /> زیادکردنی بەکارهێنەر
              </button>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {['all', 'freelancer', 'employer', 'admin', 'owner'].map(r => (
                <Chip key={r} active={roleFilter === r} onClick={() => setRoleFilter(r)}>
                  {r === 'all' ? 'هەموو' : ROLE_LABELS[r]} ({roleCounts[r] || 0})
                </Chip>
              ))}
            </div>

            <div style={{ ...cardStyle, overflow: 'hidden' }}>
              {usersLoading ? (
                <div className="p-10 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: C.muted3 }} /></div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-10 text-center text-xs font-bold" style={{ color: C.muted2 }}>هیچ بەکارهێنەرێک نەدۆزرایەوە.</div>
              ) : (
                <div className="divide-y" style={{ borderColor: C.softBorder }}>
                  {filteredUsers.map(u => (
                    <div key={u.id} className="flex items-center gap-3 p-3 flex-wrap" style={{ borderColor: C.softBorder }}>
                      <div style={{ width: 38, height: 38, borderRadius: 12, overflow: 'hidden', flexShrink: 0 }}>
                        {u.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover" /> : <Monogram name={u.name} className="w-full h-full" />}
                      </div>
                      <div className="min-w-0" style={{ flex: '1 1 160px' }}>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span style={{ fontSize: 12.5, fontWeight: 700 }} className="truncate">{u.name}</span>
                          {Number(u.verified) === 1 && <ShieldCheck className="w-3.5 h-3.5 shrink-0" style={{ color: C.green }} />}
                        </div>
                        <div dir="ltr" style={{ fontSize: 11, color: C.muted2, marginTop: 2 }}>{u.phone}</div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap" style={{ flex: '1 1 220px' }}>
                        <Badge tone={u.role === 'owner' || u.role === 'admin' ? 'dark' : 'default'}>{ROLE_LABELS[u.role] || u.role}</Badge>
                        <Badge tone={u.status === 'blocked' ? 'rose' : u.status === 'frozen' ? 'amber' : 'green'}>{STATUS_LABELS[u.status] || u.status}</Badge>
                        {u.plan && <Badge tone="amber">{u.plan}</Badge>}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <IconAction icon={ShieldCheck} tone={Number(u.verified) === 1 ? 'green' : 'default'} onClick={() => handleToggleVerify(u)} label="" />
                        <IconAction icon={Ban} tone={u.status === 'blocked' ? 'danger' : 'default'} onClick={() => handleToggleBlock(u)} label="" />
                        <IconAction icon={Save} tone="default" onClick={() => setEditingUser(userToForm(u))} label="" />
                        {u.role !== 'owner' && <IconAction icon={Trash2} tone="danger" onClick={() => setDeletingUser(u.id)} label="" />}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============ PLANS TAB ============ */}
        {tab === 'plans' && (
          <div className="space-y-5">
            {pendingPurchases.length > 0 && (
              <div style={{ ...cardStyle, padding: 16 }}>
                <h3 style={{ fontSize: 13, fontWeight: 800, margin: '0 0 10px' }}>داواکارییە چاوەڕوانەکان ({pendingPurchases.length})</h3>
                <div className="space-y-2">
                  {pendingPurchases.map(p => (
                    <div key={p.id} className="flex items-center justify-between gap-3 flex-wrap p-2.5 rounded-xl" style={{ background: C.softBg }}>
                      <div className="min-w-0">
                        <div style={{ fontSize: 12, fontWeight: 700 }}>{p.user_name} <span style={{ color: C.muted2, fontWeight: 500 }}>· {p.user_phone}</span></div>
                        <div style={{ fontSize: 11, color: C.muted2 }}>{p.plan} — {Number(p.price).toLocaleString()} IQD</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <IconAction icon={Check} tone="green" label="پەسەندکردن" onClick={() => handleVerifyPurchase(p.id, 'approved')} />
                        <IconAction icon={X} tone="danger" label="ڕەتکردنەوە" onClick={() => handleVerifyPurchase(p.id, 'rejected')} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <h3 style={{ fontSize: 13, fontWeight: 800, margin: 0 }}>پلانەکان</h3>
              <button onClick={() => setEditingPlan(emptyPlanForm())} className="flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-xs font-bold" style={{ background: C.ink, color: '#fff' }}>
                <Plus className="w-3.5 h-3.5" /> پلانی نوێ
              </button>
            </div>

            {plansLoading ? (
              <div className="p-10 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: C.muted3 }} /></div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {planTiers.map(p => {
                  const Icon = getPlanIcon(p.icon);
                  const color = getPlanColor(p.color);
                  return (
                    <div key={p.id} style={{ ...cardStyle, padding: 16 }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: C.softBg }}>
                            <Icon className="w-4 h-4" style={{ color: color.accent }} />
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 800 }}>{p.name_ku}</span>
                        </div>
                        {Number(p.featured) === 1 && <Star className="w-3.5 h-3.5" style={{ color: '#f5b93d' }} fill="#f5b93d" />}
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 800, marginTop: 10 }}>{Number(p.price).toLocaleString()} <span style={{ fontSize: 10.5, color: C.muted2, fontWeight: 600 }}>IQD</span></div>
                      <div className="flex items-center gap-1.5 flex-wrap mt-2">
                        <Badge>{AUDIENCE_LABELS[p.audience] || 'هەردووکیان'}</Badge>
                        {Number(p.is_primary_free) === 1 && <Badge tone="green">فرێی سەرەکی</Badge>}
                        {Number(p.is_active) === 0 && <Badge tone="rose">ناچالاک</Badge>}
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        <IconAction icon={Save} label="دەستکاری" onClick={() => setEditingPlan(planToForm(p))} />
                        <IconAction icon={Trash2} tone="danger" label="سڕینەوە" onClick={() => setDeletingPlan(p.id)} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============ JOBS TAB ============ */}
        {tab === 'jobs' && (
          <div style={{ ...cardStyle, overflow: 'hidden' }}>
            {jobs.length === 0 ? (
              <div className="p-10 text-center text-xs font-bold" style={{ color: C.muted2 }}>هیچ کارێک نییە.</div>
            ) : (
              <div className="divide-y" style={{ borderColor: C.softBorder }}>
                {[...jobs].sort((a, b) => (a.status === 'pending' ? -1 : 1) - (b.status === 'pending' ? -1 : 1)).map(j => (
                  <div key={j.id} className="flex items-center gap-3 p-3 flex-wrap">
                    <div className="min-w-0" style={{ flex: '1 1 220px' }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700 }} className="truncate">{j.title_ku || j.title}</div>
                      <div style={{ fontSize: 11, color: C.muted2, marginTop: 2 }}>{j.company_name}</div>
                    </div>
                    <Badge tone={j.status === 'active' ? 'green' : j.status === 'pending' ? 'amber' : j.status === 'rejected' ? 'rose' : 'default'}>
                      {j.status === 'pending' ? 'چاوەڕوانی پەسەندکردن' : j.status === 'rejected' ? 'ڕەتکراوە' : j.status}
                    </Badge>
                    {j.status === 'pending' && (
                      <>
                        <IconAction icon={Check} tone="green" label="پەسەندکردن" onClick={() => handleApproveJob(j.id)} />
                        <IconAction icon={X} tone="danger" label="ڕەتکردنەوە" onClick={() => handleRejectJob(j.id)} />
                      </>
                    )}
                    <IconAction icon={Trash2} tone="danger" label="سڕینەوە" onClick={() => setDeletingJob(j.id)} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============ SETTINGS TAB ============ */}
        {tab === 'settings' && (
          <div style={{ ...cardStyle, padding: 20 }} className="space-y-5">
            {[
              { key: 'cv_fee_amount', label: 'نرخی ناردنی سیڤی (بەبێ پلان/کرێدیت) — IQD', hint: 'ئەم نرخە بۆ هەر سیڤیەک بەکاردێت کە کاندیدەکە پلان یان کرێدیتی نییە، لە کاتی داواکردندا لای فرێلانسەر نیشان دەدرێت.' },
              { key: 'fastpay_number', label: 'ژمارەی FastPay بۆ وەرگرتنی پارە', hint: 'ژمارەیەک کە فرێلانسەرەکان پارەی کۆمیسیۆنی بۆ دەنێرن.' },
              { key: 'job_boost_price', label: 'نرخی بەرزکردنەوەی هەلی کار — IQD', hint: '' },
              { key: 'job_boost_days', label: 'ماوەی بەرزکردنەوە — ڕۆژ', hint: '' },
            ].map(({ key, label, hint }) => (
              <div key={key} className="space-y-1.5">
                <label className={labelCls}>{label}</label>
                <div className="flex items-center gap-2">
                  <input
                    dir="ltr"
                    className={`${inputCls} ishk-admin-input flex-1`}
                    style={inputStyle}
                    value={settingsForm[key]}
                    onChange={e => setSettingsForm(prev => ({ ...prev, [key]: e.target.value }))}
                  />
                  <button
                    type="button"
                    disabled={savingSettings}
                    onClick={() => saveSetting(key)}
                    className="px-4 py-2.5 rounded-xl text-white text-xs font-black shrink-0 flex items-center gap-1.5 disabled:opacity-50"
                    style={{ background: C.ink }}
                  >
                    {savingSettings ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    پاشەکەوتکردن
                  </button>
                </div>
                {hint && <p style={{ fontSize: 11, color: C.muted3 }}>{hint}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ============ EDIT USER MODAL ============ */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: 'rgba(12,21,18,0.5)' }}>
          <div className="w-full max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 style={{ fontSize: 15, fontWeight: 800 }}>دەستکاری {editingUser.name}</h3>
              <button onClick={() => setEditingUser(null)}><X className="w-4 h-4" style={{ color: C.muted2 }} /></button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className={labelCls}>ناو</label><input className={`${inputCls} ishk-admin-input`} style={inputStyle} value={editingUser.name} onChange={e => setEditingUser({ ...editingUser, name: e.target.value })} /></div>
              <div><label className={labelCls}>ئیمەیل</label><input className={`${inputCls} ishk-admin-input`} style={inputStyle} value={editingUser.email} onChange={e => setEditingUser({ ...editingUser, email: e.target.value })} /></div>
              <div><label className={labelCls}>ژمارە مۆبایل</label><input dir="ltr" className={`${inputCls} ishk-admin-input`} style={inputStyle} value={editingUser.phone} onChange={e => setEditingUser({ ...editingUser, phone: e.target.value })} /></div>
              <div>
                <label className={labelCls}>ڕۆڵ</label>
                <select className={`${inputCls} ishk-admin-input`} style={inputStyle} value={editingUser.role} onChange={e => setEditingUser({ ...editingUser, role: e.target.value })} disabled={editingUser.role === 'owner'}>
                  {Object.keys(ROLE_LABELS).map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>دۆخ</label>
                <select className={`${inputCls} ishk-admin-input`} style={inputStyle} value={editingUser.status} onChange={e => setEditingUser({ ...editingUser, status: e.target.value })}>
                  {Object.keys(STATUS_LABELS).map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input type="checkbox" id="verified" checked={editingUser.verified} onChange={e => setEditingUser({ ...editingUser, verified: e.target.checked })} />
                <label htmlFor="verified" className="text-xs font-bold">پشکنراو (Verified)</label>
              </div>
              <div><label className={labelCls}>پارێزگا</label><input className={`${inputCls} ishk-admin-input`} style={inputStyle} value={editingUser.governorate} onChange={e => setEditingUser({ ...editingUser, governorate: e.target.value })} /></div>
              <div><label className={labelCls}>کیسەی پارە (IQD)</label><input type="number" className={`${inputCls} ishk-admin-input`} style={inputStyle} value={editingUser.wallet_balance} onChange={e => setEditingUser({ ...editingUser, wallet_balance: e.target.value })} /></div>
              <div>
                <label className={labelCls}>پلان</label>
                <select className={`${inputCls} ishk-admin-input`} style={inputStyle} value={editingUser.plan} onChange={e => setEditingUser({ ...editingUser, plan: e.target.value })}>
                  <option value="">— هیچ —</option>
                  {planTiers.map(p => <option key={p.id} value={p.id}>{p.name_ku}</option>)}
                </select>
              </div>
              <div><label className={labelCls}>کرێدیتی پلان</label><input type="number" className={`${inputCls} ishk-admin-input`} style={inputStyle} value={editingUser.plan_credits} onChange={e => setEditingUser({ ...editingUser, plan_credits: e.target.value })} /></div>
              <div className="sm:col-span-2"><label className={labelCls}>کورتەباس</label><textarea rows={2} className={`${inputCls} ishk-admin-input`} style={inputStyle} value={editingUser.bio} onChange={e => setEditingUser({ ...editingUser, bio: e.target.value })} /></div>

              {editingUser.role === 'employer' && (
                <>
                  <div><label className={labelCls}>ناوی کۆمپانیا</label><input className={`${inputCls} ishk-admin-input`} style={inputStyle} value={editingUser.company_name} onChange={e => setEditingUser({ ...editingUser, company_name: e.target.value })} /></div>
                  <div><label className={labelCls}>ژمارەی کۆمپانیا</label><input dir="ltr" className={`${inputCls} ishk-admin-input`} style={inputStyle} value={editingUser.company_phone} onChange={e => setEditingUser({ ...editingUser, company_phone: e.target.value })} /></div>
                  <div><label className={labelCls}>خانەی کار</label><input className={`${inputCls} ishk-admin-input`} style={inputStyle} value={editingUser.industry} onChange={e => setEditingUser({ ...editingUser, industry: e.target.value })} /></div>
                </>
              )}
              {editingUser.role === 'freelancer' && (
                <div className="sm:col-span-2"><label className={labelCls}>شارەزاییەکان (بە فاریزەکراو، جیاکراوە بە فاریزە)</label><input className={`${inputCls} ishk-admin-input`} style={inputStyle} value={editingUser.skills} onChange={e => setEditingUser({ ...editingUser, skills: e.target.value })} /></div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button onClick={handleSaveUser} disabled={savingUser} className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-black disabled:opacity-60" style={{ background: C.ink, color: '#fff' }}>
                {savingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} پاشەکەوتکردن
              </button>
              <button onClick={() => setEditingUser(null)} className="rounded-xl py-3 px-5 text-xs font-bold" style={{ background: C.softBg, color: C.muted1 }}>پاشگەزبوونەوە</button>
            </div>
          </div>
        </div>
      )}

      {/* ============ ADD USER MODAL ============ */}
      {showAddUser && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: 'rgba(12,21,18,0.5)' }}>
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 style={{ fontSize: 15, fontWeight: 800 }}>زیادکردنی بەکارهێنەری نوێ</h3>
              <button onClick={() => setShowAddUser(false)}><X className="w-4 h-4" style={{ color: C.muted2 }} /></button>
            </div>
            <input placeholder="ناو" className={`${inputCls} ishk-admin-input`} style={inputStyle} value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} />
            <input dir="ltr" placeholder="ژمارە مۆبایل" className={`${inputCls} ishk-admin-input`} style={inputStyle} value={newUser.phone} onChange={e => setNewUser({ ...newUser, phone: e.target.value })} />
            <input placeholder="ئیمەیل (ئارەزوومەندانە)" className={`${inputCls} ishk-admin-input`} style={inputStyle} value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} />
            <input type="password" placeholder="وشەی نهێنی (بەتاڵ بۆ ڕەندۆم)" className={`${inputCls} ishk-admin-input`} style={inputStyle} value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} />
            <select className={`${inputCls} ishk-admin-input`} style={inputStyle} value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
              {Object.keys(ROLE_LABELS).map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
            <button onClick={handleAddUser} disabled={savingUser} className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-black disabled:opacity-60" style={{ background: C.ink, color: '#fff' }}>
              {savingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} زیادکردن
            </button>
          </div>
        </div>
      )}

      {/* ============ EDIT/ADD PLAN MODAL ============ */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: 'rgba(12,21,18,0.5)' }}>
          <div className="w-full max-w-xl bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 style={{ fontSize: 15, fontWeight: 800 }}>{editingPlan.id ? 'دەستکاریکردنی پلان' : 'پلانی نوێ'}</h3>
              <button onClick={() => setEditingPlan(null)}><X className="w-4 h-4" style={{ color: C.muted2 }} /></button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className={labelCls}>ناو (کوردی)</label><input className={`${inputCls} ishk-admin-input`} style={inputStyle} value={editingPlan.name_ku} onChange={e => setEditingPlan({ ...editingPlan, name_ku: e.target.value })} /></div>
              <div><label className={labelCls}>ناو (ئینگلیزی)</label><input dir="ltr" className={`${inputCls} ishk-admin-input`} style={inputStyle} value={editingPlan.name_en} onChange={e => setEditingPlan({ ...editingPlan, name_en: e.target.value })} /></div>
              <div className="sm:col-span-2"><label className={labelCls}>سلۆگان (ئارەزوومەندانە)</label><input className={`${inputCls} ishk-admin-input`} style={inputStyle} value={editingPlan.tagline} onChange={e => setEditingPlan({ ...editingPlan, tagline: e.target.value })} /></div>
              <div><label className={labelCls}>نرخ (IQD)</label><input type="number" className={`${inputCls} ishk-admin-input`} style={inputStyle} value={editingPlan.price} onChange={e => setEditingPlan({ ...editingPlan, price: e.target.value })} /></div>
              <div><label className={labelCls}>کرێدیت</label><input type="number" className={`${inputCls} ishk-admin-input`} style={inputStyle} value={editingPlan.credits} onChange={e => setEditingPlan({ ...editingPlan, credits: e.target.value })} /></div>
              <div><label className={labelCls}>ڕۆژانی بەرزکردنەوە</label><input type="number" className={`${inputCls} ishk-admin-input`} style={inputStyle} value={editingPlan.boost_days} onChange={e => setEditingPlan({ ...editingPlan, boost_days: e.target.value })} /></div>
              <div>
                <label className={labelCls}>بۆ کێ؟</label>
                <select className={`${inputCls} ishk-admin-input`} style={inputStyle} value={editingPlan.audience} onChange={e => setEditingPlan({ ...editingPlan, audience: e.target.value })}>
                  <option value="both">هەردووکیان</option>
                  <option value="freelancer">تەنها کارخواز</option>
                  <option value="employer">تەنها کۆمپانیا</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>ئایکۆن</label>
                <select className={`${inputCls} ishk-admin-input`} style={inputStyle} value={editingPlan.icon} onChange={e => setEditingPlan({ ...editingPlan, icon: e.target.value })}>
                  {PLAN_ICON_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>ڕەنگ</label>
                <select className={`${inputCls} ishk-admin-input`} style={inputStyle} value={editingPlan.color} onChange={e => setEditingPlan({ ...editingPlan, color: e.target.value })}>
                  {PLAN_COLOR_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>تایبەتمەندییەکان (هەر دانەیەک لە هێڵێکی جیا، + بۆ هەیە، - بۆ نییە)</label>
                <textarea rows={4} className={`${inputCls} ishk-admin-input`} style={inputStyle} value={editingPlan.featuresText} onChange={e => setEditingPlan({ ...editingPlan, featuresText: e.target.value })} placeholder={'+ ٥ سیڤی مانگانە\n- بەرزکردنەوەی کار'} />
              </div>
              <div className="sm:col-span-2 flex items-center gap-4 flex-wrap">
                {[
                  ['featured', 'دیارترین پلان'],
                  ['is_primary_free', 'پلانی فرێی سەرەکی'],
                  ['can_message', 'دەتوانێت پەیام بنێرێت'],
                  ['can_receive_invitations', 'وەرگرتنی داواکاری'],
                  ['can_see_profile_viewers', 'بینینی سەردانکەران'],
                  ['is_active', 'چالاک'],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-1.5 text-xs font-bold">
                    <input type="checkbox" checked={editingPlan[key]} onChange={e => setEditingPlan({ ...editingPlan, [key]: e.target.checked })} />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button onClick={handleSavePlan} disabled={savingPlan} className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-black disabled:opacity-60" style={{ background: C.ink, color: '#fff' }}>
                {savingPlan ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} پاشەکەوتکردن
              </button>
              <button onClick={() => setEditingPlan(null)} className="rounded-xl py-3 px-5 text-xs font-bold" style={{ background: C.softBg, color: C.muted1 }}>پاشگەزبوونەوە</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={!!deletingUser}
        title="سڕینەوەی بەکارهێنەر"
        message="دڵنیایت لە سڕینەوەی ئەم هەژمارە؟ ئەم کردارە گەڕاندنەوەی نییە."
        confirmText="سڕینەوە"
        isDangerous
        onConfirm={handleConfirmDeleteUser}
        onCancel={() => setDeletingUser(null)}
      />
      <ConfirmationModal
        isOpen={!!deletingPlan}
        title="سڕینەوەی پلان"
        message="دڵنیایت لە سڕینەوەی ئەم پلانە؟"
        confirmText="سڕینەوە"
        isDangerous
        onConfirm={handleConfirmDeletePlan}
        onCancel={() => setDeletingPlan(null)}
      />
      <ConfirmationModal
        isOpen={!!deletingJob}
        title="سڕینەوەی کار"
        message="دڵنیایت لە سڕینەوەی ئەم کارە؟"
        confirmText="سڕینەوە"
        isDangerous
        onConfirm={handleConfirmDeleteJob}
        onCancel={() => setDeletingJob(null)}
      />
    </div>
  );
};
