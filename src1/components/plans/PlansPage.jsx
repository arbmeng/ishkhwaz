import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api';
import { soundService } from '../../services/soundService';
import { PlanBadge } from '../ui/PlanBadge';
import { getPlanIcon, getPlanColor, formatCredits } from '../../utils/planPresets';
import { ArrowRight, Check, X, Loader2, CheckCircle2 } from 'lucide-react';

// Shared light theme — matches DesktopHeaderNav, UserProfilePage, Dashboard.
const NK = "'Noto Kufi Arabic', 'Vazirmatn', system-ui, sans-serif";
const TEAL = '#12796b';
const TEAL_DEEP = '#0d5c50';
const TEAL_SOFT = '#e7f4f1';
const BG = '#f4f7f6';
const CARD = '#ffffff';
const BORDER = '#e8eeec';
const TXT = '#111d1a';
const MUTED = '#7b8e88';

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
    if (!token) return;
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const pendingFor = (plan) => purchases.find(p => p.plan === plan && p.status === 'pending');

  const isEmployer = user?.role === 'employer';
  const visibleTiers = tiers.filter(t => !t.audience || t.audience === 'both' || t.audience === (isEmployer ? 'employer' : 'freelancer'));
  const PLANS = visibleTiers.map((t) => {
    let features = [];
    try {
      const parsed = JSON.parse(t.features || '[]');
      if (Array.isArray(parsed)) features = parsed;
    } catch { /* malformed — just show no bullets rather than crash the page */ }

    return {
      id: t.id,
      name: t.name_ku,
      icon: getPlanIcon(t.icon),
      colorName: t.color || 'lime',
      color: getPlanColor(t.color),
      price: Number(t.price) || 0,
      credits: Number(t.credits) || 0,
      boostDays: Number(t.boost_days) || 0,
      tagline: t.tagline || '',
      featured: !!Number(t.featured),
      features,
    };
  });

  const PLANS_BY_PRICE = [...PLANS].sort((a, b) => a.price - b.price);
  const previousPlanName = (planId) => {
    const idx = PLANS_BY_PRICE.findIndex(p => p.id === planId);
    return idx > 0 ? PLANS_BY_PRICE[idx - 1].name : null;
  };

  const handleBuy = async (planId) => {
    soundService.playTick?.();
    setPurchaseError('');
    setPurchasingId(planId);
    const res = await apiService.purchasePlan(planId, 'zera_payment', '', token);
    if (res?.success && res.paymentUrl) {
      window.location.href = res.paymentUrl;
      return;
    }
    if (res?.success) {
      soundService.playSuccess?.();
      load();
    } else {
      setPurchaseError(res?.message || 'داواکارییەکە سەرکەوتوو نەبوو، تکایە دووبارە هەوڵبدەرەوە.');
    }
    setPurchasingId(null);
  };

  const currentTier = tiers.find(t => t.id === user?.plan);
  const isBoostActive = user?.plan_boost_until && new Date(user.plan_boost_until) > new Date();
  const currentPlanDef = PLANS.find(p => p.id === user?.plan);
  // Real boost-duration meter — only shown when we actually know the tier's
  // total boost length (boost_days), not a fabricated countdown.
  const boostDaysTotal = currentPlanDef?.boostDays || 0;
  const boostDaysLeft = isBoostActive ? Math.max(0, Math.ceil((new Date(user.plan_boost_until) - new Date()) / 86400000)) : 0;
  const boostPct = boostDaysTotal > 0 ? Math.min(100, Math.round((boostDaysLeft / boostDaysTotal) * 100)) : 0;

  return (
    <div dir="rtl" className="min-h-screen pb-28" style={{ background: BG, color: TXT, fontFamily: NK }}>
      <div className="sticky top-0 z-30 backdrop-blur-xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-3"
        style={{ background: 'rgba(244,247,246,0.9)', borderBottom: `1px solid ${BORDER}` }}>
        <div className="flex items-center gap-3">
          <button onClick={() => { soundService.playTick?.(); onBack?.(); }}
            className="p-2.5 rounded-xl transition-colors" style={{ background: CARD, border: `1px solid ${BORDER}`, color: MUTED }}>
            <ArrowRight className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-base font-black" style={{ color: TXT }}>پلانەکان</h1>
            <p className="text-[11px] font-bold" style={{ color: MUTED }}>کڕینێکی یەکجارە — نەک بەشداریی مانگانە</p>
          </div>
        </div>

        {user && (
          <div className="hidden sm:flex items-center gap-2.5">
            <div className="text-right">
              <div className="flex items-center gap-1.5 justify-end">
                {currentTier && Number(currentTier.price) > 0 && <PlanBadge plan={currentTier.id} size="sm" />}
                <span className="text-xs font-bold" style={{ color: TXT }}>{user.name}</span>
              </div>
              <span className="text-[10px]" style={{ color: MUTED }}>{isEmployer ? 'خاوەنکار (Employer)' : 'کارخواز (Candidate)'}</span>
            </div>
            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 overflow-hidden"
              style={{ background: TEAL_SOFT, border: `2px solid ${currentTier && Number(currentTier.price) > 0 ? TEAL : BORDER}` }}>
              {user.avatar ? <img src={user.avatar} alt="" className="w-full h-full object-cover" /> : <span style={{ fontWeight: 800, color: TEAL_DEEP }}>{(user.name || '؟').charAt(0)}</span>}
            </div>
          </div>
        )}
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
        {currentTier && Number(currentTier.price) > 0 && (
          <div className="mb-5 rounded-3xl p-5 flex items-center gap-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <PlanBadge plan={user.plan} size="lg" />
            <div className="flex-1">
              <div className="text-sm font-black" style={{ color: TXT }}>پلانی ئێستات: {currentTier?.name_ku || user.plan}</div>
              <div className="text-xs font-bold mt-0.5" style={{ color: MUTED }}>
                کرێدیتی ماوە: <span className="font-mono" style={{ color: TXT }}>{formatCredits(user.plan_credits)}</span>
                {isBoostActive && <> · بەرزکراوە تا {new Date(user.plan_boost_until).toLocaleDateString('en-GB')}</>}
              </div>
            </div>
          </div>
        )}

        {isBoostActive && boostDaysTotal > 0 && (
          <div className="mb-5 rounded-2xl p-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold">ماوەی پلان</span>
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: TEAL_SOFT, color: TEAL_DEEP }}>{boostDaysLeft} ڕۆژی ماوە</span>
            </div>
            <div className="h-1 rounded-full overflow-hidden mt-3" style={{ background: BORDER }}>
              <div className="h-full" style={{ width: `${boostPct}%`, background: TEAL }} />
            </div>
            <div className="flex items-center justify-between mt-2 text-[11px]" style={{ color: MUTED }}>
              <span>بەرزکردنەوەی پرۆفایل چالاکە</span>
              <span dir="ltr" className="font-mono">{boostDaysTotal} → {boostDaysLeft}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {PLANS.map(plan => {
            const isDark = plan.color.dark;
            const isCurrent = (user?.plan || 'free') === plan.id;
            const pending = plan.price > 0 ? pendingFor(plan.id) : null;
            const PlanIcon = plan.icon;

            return (
              <div key={plan.id}
                className="relative rounded-3xl p-6 flex flex-col"
                style={isDark
                  ? { background: 'linear-gradient(165deg, #16211f, #0f1917)', border: '1px solid #24413b', color: '#fff', boxShadow: '0 20px 45px -25px rgba(0,0,0,0.4)' }
                  : { background: CARD, border: `1px solid ${BORDER}`, color: TXT }}>

                {plan.featured && plan.tagline && (
                  <span className="absolute -top-3 right-6 px-3 py-1 rounded-full text-[10px] font-black text-white" style={{ background: TEAL }}>
                    {plan.tagline}
                  </span>
                )}

                <div className="flex items-center gap-2 mb-4">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : TEAL_SOFT }}>
                    <PlanIcon className="w-4.5 h-4.5" style={{ color: isDark ? '#5fd3bb' : TEAL_DEEP }} />
                  </div>
                  <span className="text-base font-black">{plan.name}</span>
                  {!plan.featured && plan.tagline && <span className="text-[10px] font-bold" style={{ color: isDark ? 'rgba(255,255,255,0.5)' : MUTED }}>{plan.tagline}</span>}
                </div>

                <div className="mb-5">
                  {plan.price === 0 ? (
                    <div className="text-3xl font-black font-mono">بێ بەرامبەر</div>
                  ) : (
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-black font-mono" dir="ltr">{plan.price.toLocaleString()}</span>
                      <span className="text-xs font-bold" style={{ color: isDark ? 'rgba(255,255,255,0.45)' : MUTED }}>IQD یەکجارە</span>
                    </div>
                  )}
                </div>

                <div className="space-y-3 flex-1 pt-4" style={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : BORDER}` }}>
                  {previousPlanName(plan.id) && (
                    <p className="text-[11px] font-black pb-1" style={{ color: isDark ? '#5fd3bb' : MUTED }}>
                      هەموو ئەوەی لە «{previousPlanName(plan.id)}» هەیە، بەڵام:
                    </p>
                  )}
                  {plan.features.map((f, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      {f.ok ? (
                        <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: isDark ? '#5fd3bb' : TEAL }} />
                      ) : (
                        <X className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: isDark ? 'rgba(255,255,255,0.25)' : '#c3d1cd' }} />
                      )}
                      <span className="text-xs font-bold leading-relaxed" style={{ color: f.ok ? 'inherit' : isDark ? 'rgba(255,255,255,0.3)' : '#a0afa9' }}>{f.label}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-6">
                  {plan.price === 0 ? (
                    isCurrent ? (
                      <div className="w-full py-3 rounded-2xl text-center text-xs font-black" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : '#f4f7f6', color: isDark ? 'rgba(255,255,255,0.5)' : MUTED }}>
                        پلانی ئێستا
                      </div>
                    ) : null
                  ) : isCurrent ? (
                    <div className="w-full py-3 rounded-2xl text-center text-xs font-black flex items-center justify-center gap-1.5" style={{ border: `1px solid ${isDark ? '#2f5850' : '#beece2'}`, background: isDark ? '#1a2b27' : TEAL_SOFT, color: isDark ? '#5fd3bb' : TEAL_DEEP }}>
                      <CheckCircle2 className="w-4 h-4" /> پلانی ئێستات
                    </div>
                  ) : pending ? (
                    <div className="w-full py-3 rounded-2xl text-center text-xs font-black flex items-center justify-center gap-1.5" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : TEAL_SOFT, color: isDark ? '#5fd3bb' : TEAL_DEEP }}>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> چاوەڕوانی پشکنین...
                    </div>
                  ) : (
                    <button onClick={() => handleBuy(plan.id)}
                      disabled={purchasingId === plan.id}
                      className="w-full py-3 rounded-2xl text-xs font-black text-white transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-1.5"
                      style={{ background: TEAL, boxShadow: `0 2px 8px ${TEAL}40` }}>
                      {purchasingId === plan.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      {previousPlanName(plan.id) ? `بەرزکردنەوە بۆ ${plan.name}` : `کڕینی ${plan.name}`}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {purchaseError && (
          <div className="mt-5 rounded-2xl px-4 py-3 text-xs font-bold flex items-center justify-between gap-3" style={{ background: '#fdf2f2', border: '1px solid #f2c6c6', color: '#b91c1c' }}>
            <span>{purchaseError}</span>
            <button onClick={() => setPurchaseError('')} className="p-1.5 rounded-lg shrink-0"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}
      </div>
    </div>
  );
};
