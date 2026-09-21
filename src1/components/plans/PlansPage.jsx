import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api';
import { soundService } from '../../services/soundService';
import { PageHeader } from '../layout/PageHeader';
import { getPlanIcon, getPlanColor, getContrastColor, hexToRgba, tintToward, formatCredits } from '../../utils/planPresets';
import { Check, X, Loader2, CheckCircle2, Zap, ShieldCheck, Sparkles, Crown, Rocket, TrendingUp, BadgePercent } from 'lucide-react';

const NK = "'IBM Plex Sans Arabic','Noto Kufi Arabic','Vazirmatn',system-ui,sans-serif";
const TEAL = '#641bd9';
const TEAL_DEEP = '#4b13a5';
const TEAL_SOFT = '#ece7f4';
const GRAD = 'linear-gradient(155deg,#7229e8 0%,#5513bf 48%,#1d0740 100%)';
const INK = '#0e0b12';
const BORDER = '#e8e5ec';
const MUTED = '#7b8e88';

// Plan feature texts are typed with the numbers inside them ("3 CVs", "10 CVs", "unlimited CVs"...), so the same
// feature would show as several unrelated rows. Merge them into one row and show each plan's own value.
const zw = (t) => String(t)
  .replace(/\u0647\u200c/g, '\u06d5')          // "ه" + ZWNJ is how "ە" was typed in the plan texts
  .replace(/[\u200c\u200d]/g, '')
  .replace(/\u0643/g, '\u06a9').replace(/\u064a/g, '\u06cc').replace(/\u0631\u06c6\u0698/g, '\u0695\u06c6\u0698');
// the plan-name words inside a text ("Pro" badge / "VIP" badge) — not "پرۆفایل"
const PLAN_WORD = /(VIP|\u067e\u0631\u06c6(?!\u0641))/;
const featureKey = (label) => zw(label).replace(/\+.*$/, '').replace(/\u0628\u06c6 \u0645\u0627\u0648\u06d5\u06cc\s*\d+\s*\u0695\u06c6\u0698/g, '').replace(/\u0628\u06ce \u0633\u0646\u0648\u0648\u0631\u06cc?/g, '#').replace(/[0-9\u0660-\u0669]+/g, '#').replace(PLAN_WORD, '#').replace(/[.\s]+/g, ' ').trim();
const featureValue = (label) => {
  const t = zw(label).replace(/\+.*$/, '');
  const m = t.match(/[0-9]+/);
  if (m) return m[0];
  if (/\u0628\u06ce \u0633\u0646\u0648\u0648\u0631/.test(t)) return '\u0628\u06ce \u0633\u0646\u0648\u0648\u0631';
  const w = t.match(PLAN_WORD);
  if (w) return /VIP/.test(w[0]) ? 'VIP' : 'Pro';
  return null;
};
const featureExtra = (label) => { const m = String(label).match(/\+\s*(.+?)\.?$/); return m ? m[1].trim() : ''; };
const featureTitle = (label) => String(label).replace(/\+.*$/, '').replace(/[0-9\u0660-\u0669]+/g, '').replace(/(VIP|\u067e\u0631\u06c6(?!\u0641))/g, '').replace(/[.]+\s*$/, '').replace(/\s+/g, ' ').trim();

const okLabels = (p) => new Set(p.features.filter(f => f.ok && f.label).map(f => f.label));

export const PlansPage = ({ onBack }) => {
  const { user, token } = useAuth();

  const [purchases, setPurchases] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [purchasingId, setPurchasingId] = useState(null);
  const [purchaseError, setPurchaseError] = useState('');

  const load = () => { if (token) apiService.getMyPlanPurchases(token).then(setPurchases); };
  useEffect(load, [token]);
  useEffect(() => { apiService.getPlanTiers().then(setTiers); }, []);
  useEffect(() => {
    if (!token) return undefined;
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [token]);

  const pendingFor = (plan) => purchases.find(p => p.plan === plan && p.status === 'pending');

  const isEmployer = user?.role === 'employer';
  const visibleTiers = tiers.filter(t => !t.audience || t.audience === 'both' || t.audience === (isEmployer ? 'employer' : 'freelancer'));

  // Everything below is derived from the real plan rows (price, credits, boost days, features) — nothing is invented.
  const PLANS = useMemo(() => visibleTiers.map((t) => {
    let features = [];
    try { const parsed = JSON.parse(t.features || '[]'); if (Array.isArray(parsed)) features = parsed; } catch { /* keep [] */ }
    return {
      id: t.id,
      name: t.name_ku,
      icon: getPlanIcon(t.icon),
      color: getPlanColor(t.color),
      price: Number(t.price) || 0,
      credits: Number(t.credits) || 0,
      boostDays: Number(t.boost_days) || 0,
      tagline: t.tagline || '',
      featured: !!Number(t.featured),
      features,
    };
  }).sort((a, b) => a.price - b.price), [visibleTiers]);

  const paid = PLANS.filter(p => p.price > 0);
  const topId = paid.length ? paid[paid.length - 1].id : null; // most expensive plan = the premium card
  const perCredit = (p) => (p.price > 0 && p.credits > 0 && p.credits <= 200 ? Math.round(p.price / p.credits) : null);
  const bestValueId = useMemo(() => {
    const withValue = PLANS.filter(p => perCredit(p) != null);
    if (withValue.length < 2) return null;
    return withValue.reduce((best, p) => (perCredit(p) < perCredit(best) ? p : best)).id;
  }, [PLANS]);

  const ALL_FEATURE_LABELS = useMemo(() => {
    const labels = new Set();
    PLANS.forEach(p => p.features.forEach(f => { if (f.label) labels.add(f.label); }));
    return Array.from(labels);
  }, [PLANS]);
  // One row per feature, with each plan's own value (or a tick / cross). The CV-offering and boost rows are
  // shown separately above from the plan's real credits / boost days, so they are left out here.
  const FEATURE_ROWS = useMemo(() => {
    const map = new Map();
    PLANS.forEach(p => p.features.forEach(f => {
      if (!f.label) return;
      const k = featureKey(f.label);
      if (!map.has(k)) map.set(k, { key: k, title: featureTitle(f.label), cells: {} });
      map.get(k).cells[p.id] = { ok: !!f.ok, val: featureValue(f.label), extra: featureExtra(f.label) };
    }));
    return [...map.values()].filter(r => !/\u06a9\u0627\u0631\u0646\u0627\u0645\u06d5 \u0628\u06c6 \u062e\u0627\u0648\u06d5\u0646\u06a9\u0627\u0631/.test(r.key) && !/\u0628\u06d5\u0631\u0632\u06a9\u0631\u062f\u0646\u06d5\u0648\u06d5\u06cc \u067e\u0631\u06c6\u0641\u0627\u06cc\u0644/.test(r.key));
  }, [PLANS]);
  const maxCredits = Math.max(1, ...PLANS.map(p => (p.credits > 200 ? 0 : p.credits)));
  const maxBoost = Math.max(1, ...PLANS.map(p => p.boostDays));

  const prevOf = (plan) => { const i = PLANS.findIndex(p => p.id === plan.id); return i > 0 ? PLANS[i - 1] : null; };

  const handleBuy = async (planId) => {
    soundService.playTick?.();
    setPurchaseError('');
    setPurchasingId(planId);
    const res = await apiService.purchasePlan(planId, 'zera_payment', '', token);
    if (res?.success && res.paymentUrl) { window.location.href = res.paymentUrl; return; }
    if (res?.success) { soundService.playSuccess?.(); load(); }
    else setPurchaseError(res?.message || 'داواکارییەکە سەرکەوتوو نەبوو، تکایە دووبارە هەوڵبدەرەوە.');
    setPurchasingId(null);
  };

  const currentTier = tiers.find(t => t.id === user?.plan);
  const currentPlanDef = PLANS.find(p => p.id === user?.plan);
  const hasPaidPlan = !!currentTier && Number(currentTier.price) > 0;
  const currentPrice = Number(currentTier?.price) || 0;
  const isBoostActive = user?.plan_boost_until && new Date(user.plan_boost_until) > new Date();
  const boostDaysTotal = currentPlanDef?.boostDays || 0;
  const boostDaysLeft = isBoostActive ? Math.max(0, Math.ceil((new Date(user.plan_boost_until) - new Date()) / 86400000)) : 0;
  const boostPct = boostDaysTotal > 0 ? Math.min(100, Math.round((boostDaysLeft / boostDaysTotal) * 100)) : 0;
  const CurrentIcon = currentPlanDef ? currentPlanDef.icon : Sparkles;

  const cols = PLANS.length >= 4 ? 'xl:grid-cols-4 lg:grid-cols-2' : PLANS.length === 3 ? 'lg:grid-cols-3' : PLANS.length === 2 ? 'lg:grid-cols-2' : 'lg:grid-cols-1';

  /* ───────── one plan card ───────── */
  const PlanCard = ({ plan }) => {
    const premium = plan.id === topId;
    const isCurrent = (user?.plan || 'free') === plan.id;
    const isLower = !isCurrent && plan.price > 0 && plan.price < currentPrice; // cheaper than the plan already active
    const pending = plan.price > 0 ? pendingFor(plan.id) : null;
    const Icon = plan.icon;
    const accent = plan.color.accent;
    const onAccent = getContrastColor(accent);
    const prev = prevOf(plan);
    const prevOk = prev ? okLabels(prev) : new Set();
    const fresh = plan.features.filter(f => f.ok && !prevOk.has(f.label));
    const kept = prev ? plan.features.filter(f => f.ok && prevOk.has(f.label)).length : 0;
    const missing = plan.features.filter(f => !f.ok);
    const pc = perCredit(plan);

    const shell = premium
      ? { background: INK, color: '#fff' }
      : { background: '#fff', color: '#16111d' };
    const sub = premium ? 'rgba(255,255,255,.55)' : MUTED;
    const line = premium ? 'rgba(255,255,255,.1)' : BORDER;

    return (
      <div className="group relative flex" style={{ padding: premium ? 2 : 0, borderRadius: 30, background: premium ? `linear-gradient(135deg, ${accent}, ${hexToRgba(accent, .15)} 45%, ${accent})` : 'transparent', boxShadow: premium ? `0 22px 60px ${hexToRgba(accent, .28)}` : undefined }}>
        <div className="relative flex w-full flex-col overflow-hidden transition-all duration-300 group-hover:-translate-y-1" style={{ ...shell, borderRadius: 28, border: premium ? 'none' : `1px solid ${BORDER}`, boxShadow: premium ? 'none' : '0 6px 26px rgba(31,12,61,.05)' }}>
          {/* accent strip / glow */}
          {premium
            ? <div className="pointer-events-none absolute -top-16 left-1/2 h-40 w-64 -translate-x-1/2 rounded-full blur-3xl" style={{ background: hexToRgba(accent, .28) }} />
            : <div className="h-1.5 w-full" style={{ background: plan.price > 0 ? `linear-gradient(90deg, ${accent}, ${hexToRgba(accent, .35)})` : '#e8e5ec' }} />}

          <div className="relative flex flex-1 flex-col p-6">
            {/* ribbons */}
            <div className="mb-4 flex min-h-[26px] flex-wrap gap-1.5">
              {premium && <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-bold" style={{ background: accent, color: onAccent }}><Crown className="h-3 w-3" />باشترین</span>}
              {plan.featured && <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-bold text-white" style={{ background: TEAL }}><Sparkles className="h-3 w-3" />{plan.tagline || 'پێشنیارکراو'}</span>}
              {bestValueId === plan.id && <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-bold" style={{ background: premium ? 'rgba(255,255,255,.12)' : '#fff3d6', color: premium ? '#fff' : '#9a6a00' }}><BadgePercent className="h-3 w-3" />بەنرخترین</span>}
            </div>

            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl" style={{ background: plan.price > 0 ? accent : TEAL_SOFT, color: plan.price > 0 ? onAccent : TEAL_DEEP }}><Icon className="h-6 w-6" /></span>
              <div className="min-w-0">
                <h3 className="truncate text-[17px] font-bold">{plan.name}</h3>
                {!plan.featured && plan.tagline && <span className="block truncate text-[11px] font-medium" style={{ color: sub }}>{plan.tagline}</span>}
              </div>
            </div>

            {/* price */}
            <div className="mt-5">
              {plan.price === 0
                ? <div className="text-[30px] font-bold">بێ بەرامبەر</div>
                : <div className="flex items-baseline gap-1.5"><span className="text-[34px] font-bold" dir="ltr">{plan.price.toLocaleString()}</span><span className="text-[11px] font-medium" style={{ color: sub }}>IQD · یەکجار</span></div>}
              {pc != null && <div className="mt-1 text-[11px] font-medium" style={{ color: sub }}>نزیکەی <b dir="ltr" style={{ color: premium ? tintToward(accent, .4) : TEAL_DEEP }}>{pc.toLocaleString()}</b> IQD بۆ هەر کرێدیتێک</div>}
            </div>

            {/* real numbers */}
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl p-3" style={{ background: premium ? 'rgba(255,255,255,.07)' : '#f7f6f9' }}>
                <Zap className="h-4 w-4" style={{ color: premium ? tintToward(accent, .35) : TEAL }} />
                <div className="mt-2 text-[22px] font-bold leading-none">{formatCredits(plan.credits)}</div>
                <div className="mt-1 text-[10px] font-medium" style={{ color: sub }}>کرێدیت{prev && plan.credits > prev.credits && prev.credits <= 200 && plan.credits <= 200 ? ` (+${plan.credits - prev.credits})` : ''}</div>
              </div>
              <div className="rounded-2xl p-3" style={{ background: premium ? 'rgba(255,255,255,.07)' : '#f7f6f9' }}>
                <Rocket className="h-4 w-4" style={{ color: premium ? tintToward(accent, .35) : TEAL }} />
                <div className="mt-2 text-[22px] font-bold leading-none">{plan.boostDays > 0 ? plan.boostDays : '—'}</div>
                <div className="mt-1 text-[10px] font-medium" style={{ color: sub }}>ڕۆژی بەرزکردنەوە</div>
              </div>
            </div>

            {/* what is different */}
            <div className="mt-5 flex-1 space-y-2.5 border-t pt-5" style={{ borderColor: line }}>
              {prev && (
                <p className="flex items-center gap-1.5 text-[11px] font-bold" style={{ color: premium ? tintToward(accent, .4) : TEAL_DEEP }}>
                  <TrendingUp className="h-3.5 w-3.5" />
                  {kept > 0 ? `هەموو تایبەتمەندییەکانی «${prev.name}» + ئەمانە:` : `زیاتر لە «${prev.name}»:`}
                </p>
              )}
              {fresh.length === 0 && !prev && plan.features.length === 0 && <p className="text-[12px]" style={{ color: sub }}>تایبەتمەندییەکان بەم زووانە دادەنرێن.</p>}
              {fresh.map((f, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full" style={{ background: premium ? hexToRgba(accent, .22) : TEAL_SOFT, color: premium ? tintToward(accent, .4) : TEAL_DEEP }}><Check className="h-3 w-3" strokeWidth={3} /></span>
                  <span className="text-[12px] font-semibold leading-6">{f.label}</span>
                </div>
              ))}
              {missing.map((f, i) => (
                <div key={`m${i}`} className="flex items-start gap-2.5 opacity-60">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full" style={{ background: premium ? 'rgba(255,255,255,.08)' : '#f1f0f3' }}><X className="h-3 w-3" /></span>
                  <span className="text-[12px] font-medium leading-6 line-through decoration-1">{f.label}</span>
                </div>
              ))}
            </div>

            {/* action */}
            <div className="mt-6">
              {plan.price === 0 ? (
                isCurrent ? <div className="w-full rounded-2xl py-3.5 text-center text-xs font-bold" style={{ background: premium ? 'rgba(255,255,255,.08)' : '#f5f4f7', color: sub }}>پلانی ئێستا</div> : null
              ) : isCurrent ? (
                <div className="flex w-full items-center justify-center gap-1.5 rounded-2xl py-3.5 text-xs font-bold" style={{ border: `1px solid ${premium ? hexToRgba(accent, .4) : '#cfbded'}`, background: premium ? hexToRgba(accent, .12) : TEAL_SOFT, color: premium ? tintToward(accent, .4) : TEAL_DEEP }}><CheckCircle2 className="h-4 w-4" />پلانی چالاکە</div>
              ) : isLower ? (
                <div className="flex w-full items-center justify-center gap-1.5 rounded-2xl py-3.5 text-xs font-bold" style={{ background: premium ? 'rgba(255,255,255,.06)' : '#f1eff4', color: sub, cursor: 'not-allowed' }} aria-disabled="true"><CheckCircle2 className="h-3.5 w-3.5" />پلانەکەت لەمە بەرزترە</div>
              ) : pending ? (
                <div className="flex w-full items-center justify-center gap-1.5 rounded-2xl py-3.5 text-xs font-bold" style={{ background: premium ? 'rgba(255,255,255,.08)' : TEAL_SOFT, color: premium ? '#fff' : TEAL_DEEP }}><Loader2 className="h-3.5 w-3.5 animate-spin" />چاوەڕوانی پشکنین...</div>
              ) : (
                <button onClick={() => handleBuy(plan.id)} disabled={purchasingId === plan.id}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[13px] font-bold transition active:scale-[.98] hover:brightness-110 disabled:opacity-60"
                  style={premium ? { background: `linear-gradient(135deg, ${accent}, ${tintToward(accent, .25)})`, color: onAccent, boxShadow: `0 12px 30px ${hexToRgba(accent, .35)}` } : { background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DEEP})`, color: '#fff', boxShadow: `0 10px 26px ${TEAL}33` }}>
                  {purchasingId === plan.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  {prev ? `بەرزکردنەوە بۆ ${plan.name}` : `کڕینی ${plan.name}`}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div dir="rtl" className="min-h-screen pb-28 text-[#16111d]" style={{ background: '#f5f4f7', fontFamily: NK }}>

      <PageHeader title="پلانەکان و بەرزکردنەوە" subtitle="کڕینێکی یەکجارە، بێ تێچووی شاراوەی مانگانە" onBack={onBack} />

      <div className="relative mx-auto max-w-6xl space-y-10 px-4 pt-6 sm:px-6 lg:px-8">
        {/* current plan */}
            <div className="rounded-[26px] p-4 text-white shadow-[0_14px_34px_rgba(29,7,64,.2)] sm:p-5" style={{ background: GRAD }}>
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-[#4b13a5]"><CurrentIcon className="h-6 w-6" /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-medium text-white/65">پلانی ئێستات</div>
                  <div className="truncate text-[17px] font-bold">{currentTier?.name_ku || 'بنەڕەتی'}</div>
                </div>
                <div className="text-left">
                  <div className="text-[22px] font-bold leading-none">{currentPlanDef && currentPlanDef.credits > 200 ? formatCredits(currentPlanDef.credits) : (hasPaidPlan || currentTier ? formatCredits(user?.plan_credits ?? 0) : 0)}</div>
                  <div className="mt-1 text-[10px] text-white/65">کرێدیتی ماوە</div>
                </div>
              </div>
              {isBoostActive && boostDaysTotal > 0 && (
                <div className="mt-4">
                  <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium"><span className="flex items-center gap-1.5"><Rocket className="h-3.5 w-3.5" />پرۆفایلی بەرزکراوە</span><span>{boostDaysLeft} ڕۆژی ماوە</span></div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-white transition-all duration-500" style={{ width: `${boostPct}%` }} /></div>
                </div>
              )}
            </div>
        {purchaseError && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#f2c6c6] bg-[#fdf2f2] px-4 py-3 text-xs font-bold text-[#b91c1c] shadow-sm">
            <span>{purchaseError}</span>
            <button onClick={() => setPurchaseError('')} className="rounded-lg p-1 hover:bg-red-100"><X className="h-4 w-4" /></button>
          </div>
        )}

        {tiers.length === 0 ? (
          <div className="grid place-items-center rounded-[28px] bg-white py-20"><Loader2 className="h-7 w-7 animate-spin" style={{ color: TEAL }} /></div>
        ) : (
          <div className={`grid grid-cols-1 items-stretch gap-6 md:grid-cols-2 ${cols}`}>
            {PLANS.map(plan => <PlanCard key={plan.id} plan={plan} />)}
          </div>
        )}

        {/* side-by-side comparison, built from the same real plan rows */}
        {PLANS.length > 1 && (
          <section className="overflow-hidden rounded-[28px] border bg-white" style={{ borderColor: BORDER }}>
            <div className="p-5 sm:p-7">
              <h2 className="text-lg font-bold">بەراوردی پلانەکان</h2>
              <p className="mt-1 text-xs font-medium" style={{ color: MUTED }}>ژمارە و تایبەتمەندییەکان لە تەنیشت یەک.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-right">
                <thead>
                  <tr className="border-y" style={{ borderColor: BORDER, background: '#fbfafc' }}>
                    <th className="sticky right-0 bg-[#fbfafc] px-5 py-4 text-xs font-bold text-[#7b8e88]">پلان</th>
                    {PLANS.map(p => { const I = p.icon; const cur = (user?.plan || 'free') === p.id; return (
                      <th key={p.id} className="px-3 py-4 text-center" style={cur ? { background: TEAL_SOFT } : undefined}>
                        <span className="mx-auto grid h-9 w-9 place-items-center rounded-xl" style={{ background: p.price > 0 ? p.color.accent : TEAL_SOFT, color: p.price > 0 ? getContrastColor(p.color.accent) : TEAL_DEEP }}><I className="h-4 w-4" /></span>
                        <div className="mt-1.5 text-xs font-bold">{p.name}</div>
                        <div className="text-[11px] font-medium" style={{ color: MUTED }} dir="ltr">{p.price === 0 ? 'Free' : `${p.price.toLocaleString()} IQD`}</div>
                      </th>); })}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b" style={{ borderColor: '#f2f0f4' }}>
                    <td className="sticky right-0 bg-white px-5 py-4 text-xs font-bold">پێشکەشکردنی کارنامە<span className="block text-[10px] font-medium" style={{ color: MUTED }}>بۆ خاوەنکارەکان</span></td>
                    {PLANS.map(p => (
                      <td key={p.id} className="px-3 py-4 text-center" style={(user?.plan || 'free') === p.id ? { background: '#f6f3fa' } : undefined}>
                        <div className="text-sm font-bold" style={{ color: TEAL_DEEP }}>{formatCredits(p.credits)}</div>
                        <div className="mx-auto mt-1.5 h-1.5 w-16 overflow-hidden rounded-full bg-[#eae8ee]"><div className="h-full rounded-full" style={{ width: `${p.credits > 200 ? 100 : Math.round((p.credits / maxCredits) * 100)}%`, background: TEAL }} /></div>
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b" style={{ borderColor: '#f2f0f4' }}>
                    <td className="sticky right-0 bg-white px-5 py-4 text-xs font-bold">بەرزکردنەوەی پڕۆفایل</td>
                    {PLANS.map(p => (
                      <td key={p.id} className="px-3 py-4 text-center" style={(user?.plan || 'free') === p.id ? { background: '#f6f3fa' } : undefined}>
                        <div className="text-sm font-bold">{p.boostDays > 0 ? `${p.boostDays} ڕۆژ` : '—'}</div>
                        <div className="mx-auto mt-1.5 h-1.5 w-16 overflow-hidden rounded-full bg-[#eae8ee]"><div className="h-full rounded-full" style={{ width: `${Math.round((p.boostDays / maxBoost) * 100)}%`, background: '#f5a524' }} /></div>
                      </td>
                    ))}
                  </tr>
                  {FEATURE_ROWS.map((row) => (
                    <tr key={row.key} className="border-b transition hover:bg-[#fbfafc]" style={{ borderColor: '#f2f0f4' }}>
                      <td className="sticky right-0 bg-white px-5 py-3.5 text-xs font-medium leading-6">{row.title}</td>
                      {PLANS.map(p => {
                        const c = row.cells[p.id];
                        const ok = !!c?.ok;
                        return (
                          <td key={p.id} className="px-3 py-3.5 text-center" style={(user?.plan || 'free') === p.id ? { background: '#f6f3fa' } : undefined}>
                            {ok && c.val ? (
                              <span className="inline-flex flex-col items-center gap-0.5">
                                {c.val === 'Pro' || c.val === 'VIP'
                                  ? <span className="rounded-full px-3 py-1 text-[11px] font-bold" style={{ background: p.color.accent, color: getContrastColor(p.color.accent) }}>{c.val}</span>
                                  : <span className="text-sm font-bold" style={{ color: TEAL_DEEP }}>{c.val}</span>}
                                {c.extra && <span className="rounded-full bg-[#fff3d6] px-2 py-0.5 text-[9px] font-bold text-[#9a6a00]">+ {/AI/.test(c.extra) ? 'AI' : c.extra}</span>}
                              </span>
                            ) : (
                              <span className="inline-flex flex-col items-center gap-0.5">
                                <span className="inline-grid h-6 w-6 place-items-center rounded-full" style={ok ? { background: TEAL_SOFT, color: TEAL_DEEP } : { background: '#f2f1f4', color: '#c3cdc9' }}>{ok ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <X className="h-3.5 w-3.5" />}</span>
                                {ok && c.extra && <span className="rounded-full bg-[#fff3d6] px-2 py-0.5 text-[9px] font-bold text-[#9a6a00]">+ {/AI/.test(c.extra) ? 'AI' : c.extra}</span>}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <div className="flex items-center gap-3 rounded-2xl p-4 text-xs font-bold" style={{ background: TEAL_SOFT, color: TEAL_DEEP }}>
          <ShieldCheck className="h-5 w-5 shrink-0" />
          <span>پارەدان لە ڕێگەی ZeraPay ئەنجام دەدرێت. دوای پشتڕاستکردنەوە، کرێدیت و بەرزکردنەوەی پلانەکەت بۆ هەژمارەکەت زیاد دەکرێت.</span>
        </div>
      </div>
    </div>
  );
};
