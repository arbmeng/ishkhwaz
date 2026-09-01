import React from 'react';
import { Star } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { getPlanIcon, getPlanColor } from '../../utils/planPresets';

// A real badge tied to an actually-purchased, admin-verified plan — never
// shown unconditionally. Free accounts render nothing. The label/icon/color
// always come from the plan's own admin-authored row in plan_tiers, never
// a hardcoded pro/vip guess — plan ids are admin-chosen slugs now, not a
// fixed pair, so a badge that only knew 'pro'/'vip' would show the raw
// internal id for anything else.
export const PlanBadge = ({ plan, size = 'sm' }) => {
  const { planTiers = [] } = useStore() || {};
  if (!plan || plan === 'free') return null;

  const tier = planTiers.find(t => t.id === plan);
  if (tier && Number(tier.price) === 0) return null; // a free-tier plan gets no badge

  const Icon = tier ? getPlanIcon(tier.icon) : Star;
  const color = tier ? getPlanColor(tier.color) : getPlanColor('lime');
  const label = tier ? (tier.name_ku || tier.name_en || plan) : plan;

  const sizeCls = size === 'sm' ? 'text-[9px] px-1.5 py-0.5 gap-0.5' : 'text-[10px] px-2.5 py-1 gap-1';
  return (
    <span
      className={`inline-flex items-center rounded-full font-black shrink-0 shadow-sm text-slate-950 ${sizeCls}`}
      style={{ background: color.gradient || color.accent }}
      title={label}>
      <Icon className={size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
      {label}
    </span>
  );
};
