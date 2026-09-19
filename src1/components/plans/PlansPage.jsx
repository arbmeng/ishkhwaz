import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api';
import { soundService } from '../../services/soundService';
import { PlanBadge } from '../ui/PlanBadge';
import { getPlanIcon, getPlanColor, formatCredits } from '../../utils/planPresets';
import { ArrowRight, Check, X, Loader2, CheckCircle2, Zap, ShieldCheck, Sparkles, HelpCircle } from 'lucide-react';

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

  const load = () => { 
    if (token) apiService.getMyPlanPurchases(token).then(setPurchases); 
  };
  
  useEffect(load, [token]);
  useEffect(() => { 
    apiService.getPlanTiers().then(setTiers); 
  }, []);

  useEffect(() => {
    if (!token) return;
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [token]);

  const pendingFor = (plan) => purchases.find(p => p.plan === plan && p.status === 'pending');

  const isEmployer = user?.role === 'employer';
  const visibleTiers = tiers.filter(t => !t.audience || t.audience === 'both' || t.audience === (isEmployer ? 'employer' : 'freelancer'));

  const PLANS = useMemo(() => {
    return visibleTiers.map((t) => {
      let features = [];
      try {
        const parsed = JSON.parse(t.features || '[]');
        if (Array.isArray(parsed)) features = parsed;
      } catch { /* parse failure fallback */ }

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
  }, [visibleTiers]);

  const PLANS_BY_PRICE = useMemo(() => [...PLANS].sort((a, b) => a.price - b.price), [PLANS]);

  // Consolidate all feature keys across all plans to build the comparison table matrix dynamically
  const ALL_FEATURE_LABELS = useMemo(() => {
    const labels = new Set();
    PLANS.forEach(p => {
      p.features.forEach(f => {
        if (f.label) labels.add(f.label);
      });
    });
    return Array.from(labels);
  }, [PLANS]);

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

  const boostDaysTotal = currentPlanDef?.boostDays || 0;
  const boostDaysLeft = isBoostActive ? Math.max(0, Math.ceil((new Date(user.plan_boost_until) - new Date()) / 86400000)) : 0;
  const boostPct = boostDaysTotal > 0 ? Math.min(100, Math.round((boostDaysLeft / boostDaysTotal) * 100)) : 0;

  return (
    <div dir="rtl" className="min-h-screen pb-28" style={{ background: BG, color: TXT, fontFamily: NK }}>
      
      {/* Mobile-only bar: on lg+ the shared DesktopHeaderNav already provides
          navigation + the user pill, so this would be a second header. */}
      <div
        className="lg:hidden sticky top-0 z-30 backdrop-blur-xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-3"
        style={{ background: 'rgba(244,247,246,0.92)', borderBottom: `1px solid ${BORDER}` }}
      >
        <div className="flex items-center gap-3">
          <button 
            onClick={() => { soundService.playTick?.(); onBack?.(); }}
            className="p-2.5 rounded-xl transition-all hover:scale-105 active:scale-95" 
            style={{ background: CARD, border: `1px solid ${BORDER}`, color: MUTED }}
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-base font-black flex items-center gap-2" style={{ color: TXT }}>
              پلانەکان و بەرزکردنەوە <Sparkles className="w-4 h-4 text-amber-500" />
            </h1>
            <p className="text-[11px] font-bold" style={{ color: MUTED }}>کڕینێکی یەکجارە — بێ تێچووی شاراوەی مانگانە</p>
          </div>
        </div>

        {user && (
          <div className="hidden sm:flex items-center gap-3 bg-white/60 p-1.5 pr-3 rounded-full border border-emerald-900/5">
            <div className="text-right">
              <div className="flex items-center gap-1.5 justify-end">
                {currentTier && Number(currentTier.price) > 0 && <PlanBadge plan={currentTier.id} size="sm" />}
                <span className="text-xs font-bold" style={{ color: TXT }}>{user.name}</span>
              </div>
              <span className="text-[10px]" style={{ color: MUTED }}>{isEmployer ? 'خاوەنکار (Employer)' : 'کارخواز (Candidate)'}</span>
            </div>
            <div 
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 overflow-hidden"
              style={{ background: TEAL_SOFT, border: `2px solid ${currentTier && Number(currentTier.price) > 0 ? TEAL : BORDER}` }}
            >
              {user.avatar ? (
                <img src={user.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <span style={{ fontWeight: 800, color: TEAL_DEEP }}>{(user.name || '؟').charAt(0)}</span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">

        {/* Desktop heading (the mobile bar above carries the same title) */}
        <div className="hidden lg:block">
          <h1 className="text-xl font-black" style={{ color: TXT }}>پلانەکان و بەرزکردنەوە</h1>
          <p className="text-xs font-bold mt-1" style={{ color: MUTED }}>کڕینێکی یەکجارە — بێ تێچووی شاراوەی مانگانە</p>
        </div>

        {/* Active Plan Overview Dashboard */}
        {currentTier && Number(currentTier.price) > 0 && (
          <div className="rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden" 
               style={{ background: CARD, border: `1px solid ${BORDER}`, boxShadow: '0 4px 20px -5px rgba(0,0,0,0.03)' }}>
            <div className="flex items-center gap-4 z-10">
              <PlanBadge plan={user.plan} size="lg" />
              <div>
                <div className="text-xs font-bold uppercase tracking-wider mb-0.5" style={{ color: TEAL }}>پلانی بەکارخراو</div>
                <div className="text-lg font-black" style={{ color: TXT }}>{currentTier?.name_ku || user.plan}</div>
                <div className="text-xs font-bold mt-1" style={{ color: MUTED }}>
                  کرێدیتی ماوە: <span className="font-mono px-2 py-0.5 rounded-md text-emerald-800 bg-emerald-50 border border-emerald-100">{formatCredits(user.plan_credits)}</span>
                </div>
              </div>
            </div>

            {isBoostActive && boostDaysTotal > 0 && (
              <div className="sm:w-72 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/60 z-10">
                <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                  <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> ماوەی بەرزکردنەوە</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px]" style={{ background: TEAL_SOFT, color: TEAL_DEEP }}>{boostDaysLeft} ڕۆژی ماوە</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden bg-slate-200">
                  <div className="h-full transition-all duration-500 rounded-full" style={{ width: `${boostPct}%`, background: TEAL }} />
                </div>
                <div className="flex items-center justify-between mt-1.5 text-[10px]" style={{ color: MUTED }}>
                  <span>پرۆفایلی بەرزکراوە</span>
                  <span dir="ltr" className="font-mono">{boostDaysTotal} / {boostDaysLeft} Days</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pricing Tier Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {PLANS.map(plan => {
            const isDark = plan.color.dark;
            const isCurrent = (user?.plan || 'free') === plan.id;
            const pending = plan.price > 0 ? pendingFor(plan.id) : null;
            const PlanIcon = plan.icon;

            return (
              <div 
                key={plan.id}
                className="relative rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1"
                style={isDark
                  ? { background: 'linear-gradient(165deg, #16211f, #0f1917)', border: '1px solid #24413b', color: '#fff', boxShadow: '0 20px 40px -20px rgba(0,0,0,0.3)' }
                  : { background: CARD, border: `1px solid ${BORDER}`, color: TXT, boxShadow: '0 4px 25px -5px rgba(0,0,0,0.03)' }}
              >
                {plan.featured && (
                  <div className="absolute -top-3.5 right-6 px-3.5 py-1 rounded-full text-[10px] font-black text-white shadow-sm flex items-center gap-1" style={{ background: TEAL }}>
                    <Sparkles className="w-3 h-3" /> {plan.tagline || 'پێشنیاکراو'}
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : TEAL_SOFT }}>
                        <PlanIcon className="w-5 h-5" style={{ color: isDark ? '#5fd3bb' : TEAL_DEEP }} />
                      </div>
                      <div>
                        <h3 className="text-base font-black">{plan.name}</h3>
                        {!plan.featured && plan.tagline && (
                          <span className="text-[10px] font-bold block" style={{ color: isDark ? 'rgba(255,255,255,0.5)' : MUTED }}>{plan.tagline}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mb-6 pb-6" style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : BORDER}` }}>
                    {plan.price === 0 ? (
                      <div className="text-3xl font-black font-mono">بێ بەرامبەر</div>
                    ) : (
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl font-black font-mono" dir="ltr">{plan.price.toLocaleString()}</span>
                        <span className="text-xs font-bold" style={{ color: isDark ? 'rgba(255,255,255,0.45)' : MUTED }}>IQD / یەکجار</span>
                      </div>
                    )}
                    <div className="text-[11px] font-bold mt-2 flex items-center gap-1.5" style={{ color: isDark ? '#5fd3bb' : TEAL_DEEP }}>
                      <Zap className="w-3 h-3" /> {plan.credits} کرێدیت + {plan.boostDays} ڕۆژ بەرزکردنەوە
                    </div>
                  </div>

                  {/* Highlights */}
                  <div className="space-y-3 mb-6">
                    {previousPlanName(plan.id) && (
                      <p className="text-[11px] font-black pb-1" style={{ color: isDark ? '#5fd3bb' : MUTED }}>
                        لەگەڵ هەموو تایبەتمەندییەکانی «{previousPlanName(plan.id)}»، بێجگە لە:
                      </p>
                    )}
                    {plan.features.map((f, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        {f.ok ? (
                          <Check className="w-4 h-4 shrink-0 mt-0.5" style={{ color: isDark ? '#5fd3bb' : TEAL }} />
                        ) : (
                          <X className="w-4 h-4 shrink-0 mt-0.5" style={{ color: isDark ? 'rgba(255,255,255,0.25)' : '#c3d1cd' }} />
                        )}
                        <span className="text-xs font-bold leading-relaxed" style={{ color: f.ok ? 'inherit' : isDark ? 'rgba(255,255,255,0.3)' : '#a0afa9' }}>
                          {f.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Purchase Button */}
                <div className="pt-4" style={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'transparent'}` }}>
                  {plan.price === 0 ? (
                    isCurrent ? (
                      <div className="w-full py-3 rounded-2xl text-center text-xs font-black" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : '#f4f7f6', color: isDark ? 'rgba(255,255,255,0.5)' : MUTED }}>
                        پلانی ئێستا
                      </div>
                    ) : null
                  ) : isCurrent ? (
                    <div className="w-full py-3 rounded-2xl text-center text-xs font-black flex items-center justify-center gap-1.5" style={{ border: `1px solid ${isDark ? '#2f5850' : '#beece2'}`, background: isDark ? '#1a2b27' : TEAL_SOFT, color: isDark ? '#5fd3bb' : TEAL_DEEP }}>
                      <CheckCircle2 className="w-4 h-4" /> پلانی چالاکە
                    </div>
                  ) : pending ? (
                    <div className="w-full py-3 rounded-2xl text-center text-xs font-black flex items-center justify-center gap-1.5" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : TEAL_SOFT, color: isDark ? '#5fd3bb' : TEAL_DEEP }}>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> چاوەڕوانی پشکنین...
                    </div>
                  ) : (
                    <button 
                      onClick={() => handleBuy(plan.id)}
                      disabled={purchasingId === plan.id}
                      className="w-full py-3.5 rounded-2xl text-xs font-black text-white transition-all hover:brightness-110 active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg"
                      style={{ background: TEAL, boxShadow: `0 4px 14px ${TEAL}35` }}
                    >
                      {purchasingId === plan.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                      {previousPlanName(plan.id) ? `بەرزکردنەوە بۆ ${plan.name}` : `کڕینی ${plan.name}`}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Feature Comparison Matrix Table */}
        {ALL_FEATURE_LABELS.length > 0 && (
          <div className="mt-12 rounded-3xl p-6 sm:p-8" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <div className="mb-6">
              <h3 className="text-lg font-black" style={{ color: TXT }}>بەراوردی گشتگیری پلانەکان</h3>
              <p className="text-xs font-bold mt-1" style={{ color: MUTED }}>هەموو وردەکاری و تایبەتمەندییەکان بە بەراوردکاری ڕاستەوخۆ</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr style={{ borderBottom: `2px solid ${BORDER}` }}>
                    <th className="py-3 px-4 text-xs font-black" style={{ color: TXT }}>تایبەتمەندییەکان</th>
                    {PLANS.map(p => (
                      <th key={p.id} className="py-3 px-4 text-center text-xs font-black" style={{ color: TXT }}>
                        <div className="flex items-center justify-center gap-1">
                          <span>{p.name}</span>
                          {(user?.plan || 'free') === p.id && (
                            <span className="w-2 h-2 rounded-full" style={{ background: TEAL }} title="پلانی ئێستات" />
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: BORDER }}>
                  {/* Credits Row */}
                  <tr>
                    <td className="py-3.5 px-4 text-xs font-bold" style={{ color: TXT }}>ژمارەی کرێدیت</td>
                    {PLANS.map(p => (
                      <td key={p.id} className="py-3.5 px-4 text-center text-xs font-mono font-bold" style={{ color: TEAL_DEEP }}>
                        {formatCredits(p.credits)}
                      </td>
                    ))}
                  </tr>
                  
                  {/* Boost Days Row */}
                  <tr>
                    <td className="py-3.5 px-4 text-xs font-bold" style={{ color: TXT }}>ماوەی بەرزکردنەوەی پرۆفایل</td>
                    {PLANS.map(p => (
                      <td key={p.id} className="py-3.5 px-4 text-center text-xs font-bold" style={{ color: MUTED }}>
                        {p.boostDays > 0 ? `${p.boostDays} ڕۆژ` : '—'}
                      </td>
                    ))}
                  </tr>

                  {/* Dynamic Feature Rows */}
                  {ALL_FEATURE_LABELS.map((label, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 text-xs font-bold" style={{ color: TXT }}>{label}</td>
                      {PLANS.map(p => {
                        const feature = p.features.find(f => f.label === label);
                        const isOk = feature ? feature.ok : false;
                        return (
                          <td key={p.id} className="py-3.5 px-4 text-center">
                            {isOk ? (
                              <div className="w-6 h-6 rounded-full inline-flex items-center justify-center" style={{ background: TEAL_SOFT, color: TEAL_DEEP }}>
                                <Check className="w-3.5 h-3.5" />
                              </div>
                            ) : (
                              <div className="w-6 h-6 rounded-full inline-flex items-center justify-center bg-slate-100 text-slate-300">
                                <X className="w-3.5 h-3.5" />
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Global Error Banner */}
        {purchaseError && (
          <div className="rounded-2xl px-4 py-3 text-xs font-bold flex items-center justify-between gap-3 shadow-sm animate-shake" 
               style={{ background: '#fdf2f2', border: '1px solid #f2c6c6', color: '#b91c1c' }}>
            <span>{purchaseError}</span>
            <button onClick={() => setPurchaseError('')} className="p-1 rounded-lg hover:bg-red-100"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* FAQ Context Footer */}
        <div className="rounded-2xl p-4 flex items-center gap-3 text-xs font-bold" style={{ background: TEAL_SOFT, color: TEAL_DEEP }}>
          <HelpCircle className="w-5 h-5 shrink-0 text-emerald-700" />
          <span>پێویستت بە یارمەتییە لە هەڵبژاردنی پلانێک؟ کرێدیتەکان دوای کڕین بەشێوەیەکی ڕاستەوخۆ دەخرێنە سەر هەژمارەکەت.</span>
        </div>

      </div>
    </div>
  );
};