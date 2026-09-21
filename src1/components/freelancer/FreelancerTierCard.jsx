import React from 'react';
import { BadgeCheck, MapPin, Send, Crown, Rocket } from 'lucide-react';
import { getPlanColor, getPlanIcon, getContrastColor, hexToRgba, tintToward } from '../../utils/planPresets';
import { monogramColors } from '../ui/Monogram';

const TEAL = '#641bd9';
const INK = '#0e0b12';

const parseSkills = (raw) => {
  if (Array.isArray(raw)) return raw;
  try { const p = JSON.parse(raw || '[]'); return Array.isArray(p) ? p : []; } catch { return []; }
};

// ─── tier helpers (shared by every page that lists freelancers) ─────────────────────────
// "Paid" = any plan tier with a real price. VIP = the most expensive paid tier (derived from the
// admin-managed plan list rather than a hardcoded id, same rule SearchPage uses).
export const boostedNow = (f) => !!(f?.plan_boost_until && new Date(f.plan_boost_until) > new Date());

export const vipTierIdOf = (planTiers = []) => {
  const paid = planTiers.filter(t => Number(t.price) > 0);
  return paid.length ? paid.reduce((top, t) => (Number(t.price) > Number(top.price) ? t : top)).id : null;
};

export const tierInfo = (f, planTiers = []) => {
  const tier = planTiers.find(t => t.id === f?.plan) || null;
  const isPaid = !!tier && Number(tier.price) > 0;
  return { tier, isPaid, isVip: isPaid && tier.id === vipTierIdOf(planTiers), price: isPaid ? Number(tier.price) : 0 };
};

// Boosted first, then higher tier (VIP above Pro above free), then newest.
export const sortByTier = (list, planTiers = []) => [...list].sort((a, b) => {
  const boost = (boostedNow(b) ? 1 : 0) - (boostedNow(a) ? 1 : 0);
  if (boost) return boost;
  const price = tierInfo(b, planTiers).price - tierInfo(a, planTiers).price;
  if (price) return price;
  return String(b.created_at || '').localeCompare(String(a.created_at || ''));
});

const Tags = ({ skills, style, max = 4 }) => {
  if (!skills.length) return null;
  const shown = skills.slice(0, max);
  const extra = skills.length - shown.length;
  return (
    <div className="mt-3 flex flex-wrap justify-center gap-1.5">
      {shown.map((s, i) => (
        <span key={i} dir="auto" className="rounded-full px-2.5 py-1 text-[10px] font-black leading-none" style={style}>
          #{String(s).trim().replace(/\s+/g, '_')}
        </span>
      ))}
      {extra > 0 && <span className="rounded-full px-2 py-1 text-[10px] font-black leading-none opacity-60" style={style}>+{extra}</span>}
    </div>
  );
};

const Avatar = ({ f, ring, size = 'h-16 w-16', className = '' }) => {
  const [c1, c2] = monogramColors(f.name || 'x');
  return (
    <div className={`${size} shrink-0 overflow-hidden rounded-full bg-white shadow-lg ${className}`} style={{ boxShadow: `0 0 0 3px ${ring}, 0 8px 20px rgba(0,0,0,.18)` }}>
      {f.avatar
        ? <img src={f.avatar} alt={f.name} className="h-full w-full object-cover" />
        : <div className="grid h-full w-full place-items-center text-lg font-black text-white" style={{ background: `linear-gradient(135deg,${c1},${c2})` }}>{(f.name || 'ئ').trim().charAt(0)}</div>}
    </div>
  );
};

const Cover = ({ f, accent, dark }) => {
  const [c1, c2] = monogramColors(f.name || 'x');
  return (
    <div className="relative h-28 overflow-hidden">
      {f.cover
        ? <img src={f.cover} alt="" className="h-full w-full object-cover" />
        : <div className="h-full w-full" style={{ background: dark ? `linear-gradient(135deg, ${hexToRgba(accent, .5)}, ${INK} 75%)` : `linear-gradient(135deg, ${c1}, ${c2})` }} />}
      {dark && <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, transparent 30%, ${INK} 100%)` }} />}
    </div>
  );
};

export const FreelancerTierCard = ({ f, tier, isVip = false, matched = false, onOpen, onInvite }) => {
  const isPaid = !!tier && Number(tier.price) > 0;
  const boosted = boostedNow(f);
  const skills = parseSkills(f.skills);
  const place = [f.district, f.governorate].filter(Boolean).join('، ') || 'کوردستان';
  const headline = f.title || f.profession || skills.slice(0, 2).join('، ') || 'کارخواز';
  const verified = Number(f.verified) === 1;
  const accent = isPaid ? getPlanColor(tier.color).accent : TEAL;
  const onAccent = getContrastColor(accent);
  const PlanIcon = isPaid ? getPlanIcon(tier.icon) : null;
  const tierName = isPaid ? String(tier.name_ku || '').replace(/^پلانی\s+/, '') || 'PRO' : '';

  const open = () => onOpen?.(f);
  const invite = (e) => { e.stopPropagation(); onInvite?.(f); };

  /* ───── VIP: dark premium card with a glowing accent frame ───── */
  if (isVip) {
    return (
      <div onClick={open} className="tier-vip group relative h-full cursor-pointer rounded-[30px] p-[2px] transition-all duration-300 hover:-translate-y-1.5"
        style={{ background: `linear-gradient(135deg, ${accent}, ${hexToRgba(accent, .15)} 45%, ${accent})`, boxShadow: `0 18px 50px ${hexToRgba(accent, .28)}` }}>
        <style>{'@keyframes tierShine{0%{transform:translateX(-130%) skewX(-18deg)}60%,100%{transform:translateX(330%) skewX(-18deg)}}.tier-vip .shine{animation:tierShine 4.5s ease-in-out infinite}@media (prefers-reduced-motion:reduce){.tier-vip .shine{animation:none}}'}</style>
        <div className="relative flex h-full flex-col overflow-hidden rounded-[28px]" style={{ background: INK }}>
          <Cover f={f} accent={accent} dark />
          <span className="shine pointer-events-none absolute inset-y-0 left-0 w-1/4" style={{ background: `linear-gradient(90deg, transparent, ${hexToRgba(accent, .22)}, transparent)` }} />

          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[10px] font-black shadow-lg" style={{ background: accent, color: onAccent }}>
            <Crown className="h-3.5 w-3.5" /> VIP
          </span>
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/45 px-2.5 py-1.5 text-[10px] font-black text-white backdrop-blur">
            <MapPin className="h-3 w-3" />{f.governorate || 'کوردستان'}
          </span>
          {boosted && (
            <span className="absolute left-3 top-11 inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-black text-white backdrop-blur"><Rocket className="h-3 w-3" />بەرزکراوە</span>
          )}

          <div className="relative -mt-9 flex flex-1 flex-col px-4 pb-4 text-center">
            <Avatar f={f} ring={accent} size="h-[72px] w-[72px]" className="mx-auto" />
            <h3 className="mt-3 flex items-center justify-center gap-1.5 truncate text-[15px] font-black text-white">
              <span className="truncate">{f.name || 'کارخواز'}</span>
              {verified && <BadgeCheck className="h-4 w-4 shrink-0" style={{ color: accent }} />}
            </h3>
            <p className="mt-1 truncate text-[11px] font-bold" style={{ color: tintToward(accent, .35) }}>{headline}</p>
            {f.bio && <p className="mt-2 line-clamp-2 text-[11px] font-medium leading-6 text-white/55">{f.bio}</p>}
            <Tags skills={skills} style={{ background: hexToRgba(accent, .14), border: `1px solid ${hexToRgba(accent, .35)}`, color: tintToward(accent, .4) }} />
            <div className="mt-auto pt-4"><button onClick={invite} className="flex w-full items-center justify-center gap-1.5 rounded-2xl py-3 text-[11px] font-black shadow-lg transition active:scale-95 hover:brightness-110"
              style={{ background: `linear-gradient(135deg, ${accent}, ${tintToward(accent, .25)})`, color: onAccent }}>
              <Send className="h-3.5 w-3.5" />ناردنی داواکاری
            </button></div>
          </div>
        </div>
      </div>
    );
  }

  /* ───── PRO: white card with a coloured frame, plan badge and hashtag chips ───── */
  if (isPaid) {
    return (
      <div onClick={open} className="group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-[28px] bg-white transition-all duration-300 hover:-translate-y-1.5"
        style={{ boxShadow: `0 0 0 2px ${accent}, 0 14px 34px ${hexToRgba(accent, .22)}` }}>
        <Cover f={f} accent={accent} />
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[10px] font-black shadow-md" style={{ background: accent, color: onAccent }}>
          {PlanIcon && <PlanIcon className="h-3.5 w-3.5" />}{tierName}
        </span>
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1.5 text-[10px] font-black text-stone-700 shadow-sm backdrop-blur">
          <MapPin className="h-3 w-3" />{f.governorate || 'کوردستان'}
        </span>
        {boosted && <span className="absolute left-3 top-11 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black text-white shadow-sm" style={{ background: TEAL }}><Rocket className="h-3 w-3" />بەرزکراوە</span>}
        {matched && <span className="absolute bottom-2 left-3 rounded-full bg-[#4b13a5] px-2.5 py-1 text-[10px] font-black text-white shadow-sm">گونجاو بۆ تۆ</span>}

        <div className="relative -mt-8 flex flex-1 flex-col px-4 pb-4 text-center">
          <Avatar f={f} ring={accent} className="mx-auto" />
          <h3 className="mt-3 flex items-center justify-center gap-1.5 truncate text-sm font-black text-stone-900">
            <span className="truncate">{f.name || 'کارخواز'}</span>
            {verified && <BadgeCheck className="h-4 w-4 shrink-0" style={{ color: TEAL }} />}
          </h3>
          <p className="mt-1 truncate text-[11px] font-bold text-[#4b13a5]">{headline}</p>
          <Tags skills={skills} style={{ background: hexToRgba(accent, .13), border: `1px solid ${hexToRgba(accent, .45)}`, color: '#262031' }} />
          <div className="mt-auto pt-4"><button onClick={invite} className="flex w-full items-center justify-center gap-1.5 rounded-2xl py-3 text-[11px] font-black text-white shadow-[0_8px_20px_rgba(100,27,217,.2)] transition active:scale-95 hover:brightness-105" style={{ background: TEAL }}>
            <Send className="h-3.5 w-3.5" />ناردنی داواکاری
          </button></div>
        </div>
      </div>
    );
  }

  /* ───── free: clean plain card ───── */
  return (
    <div onClick={open} className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-[26px] border border-stone-100 bg-white shadow-[0_4px_18px_rgba(29,19,46,.05)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(29,19,46,.1)]">
      <div className="relative shrink-0">
        <Cover f={f} accent={TEAL} />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1.5 text-[10px] font-black text-stone-700 shadow-sm"><MapPin className="h-3 w-3" />{f.governorate || 'کوردستان'}</span>
      </div>
      <div className="relative -mt-7 flex flex-1 flex-col px-4 pb-4 text-center">
        <Avatar f={f} ring="#fff" size="h-14 w-14" className="mx-auto" />
        <h3 className="mt-2.5 flex items-center justify-center gap-1.5 truncate text-sm font-black text-stone-900">
          <span className="truncate">{f.name || 'کارخواز'}</span>
          {verified && <BadgeCheck className="h-4 w-4 shrink-0" style={{ color: TEAL }} />}
        </h3>
        <p className="mt-1 truncate text-[11px] font-bold text-stone-400">{headline}</p>
        <Tags skills={skills} max={3} style={{ background: '#f4f3f6', color: '#4a5854' }} />
        <div className="mt-auto pt-4"><button onClick={invite} className="flex w-full items-center justify-center gap-1.5 rounded-2xl py-2.5 text-[11px] font-black text-white transition active:scale-95" style={{ background: TEAL }}>
          <Send className="h-3.5 w-3.5" />ناردنی داواکاری
        </button></div>
      </div>
    </div>
  );
};
