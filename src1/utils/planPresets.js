import { Star, Crown, Zap, Sparkles, Gem, Rocket, Award, Trophy, Flame, Shield } from 'lucide-react';

// A curated icon set for plan cards/badges — admins pick from these by name,
// stored as a plain string in plan_tiers.icon so the DB never has to know
// about React components.
export const PLAN_ICONS = { Star, Crown, Zap, Sparkles, Gem, Rocket, Award, Trophy, Flame, Shield };
export const PLAN_ICON_NAMES = Object.keys(PLAN_ICONS);
export const getPlanIcon = (name) => PLAN_ICONS[name] || Star;

// A curated accent palette. `dark` cards render on a near-black background
// (the current "featured" look); everything else sits on white.
export const PLAN_COLORS = {
  lime:    { label: 'لایم',    accent: '#baff2c', dark: true },
  gold:    { label: 'ئاڵتوونی', accent: '#f59e0b', dark: false, gradient: 'linear-gradient(135deg,#fde68a,#f59e0b)' },
  purple:  { label: 'مۆر',     accent: '#a78bfa', dark: false, gradient: 'linear-gradient(135deg,#ddd6fe,#a78bfa)' },
  blue:    { label: 'شین',     accent: '#60a5fa', dark: false, gradient: 'linear-gradient(135deg,#bfdbfe,#60a5fa)' },
  rose:    { label: 'ڕۆز',     accent: '#fb7185', dark: false, gradient: 'linear-gradient(135deg,#fecdd3,#fb7185)' },
  emerald: { label: 'زمرد',    accent: '#34d399', dark: false, gradient: 'linear-gradient(135deg,#a7f3d0,#34d399)' },
  slate:   { label: 'ئاسمانی تاریک', accent: '#94a3b8', dark: false },
  crimson: { label: 'سووری تۆخ', accent: '#dc2626', dark: true, gradient: 'linear-gradient(135deg,#f87171,#991b1b)' },
};
export const PLAN_COLOR_NAMES = Object.keys(PLAN_COLORS);
export const getPlanColor = (name) => PLAN_COLORS[name] || PLAN_COLORS.lime;

// A plan generous enough to hand out 200+ credits is meant to read as
// "unlimited", not as a specific number that just looks like a typo.
export const formatCredits = (credits) => {
  const n = Number(credits) || 0;
  return n > 200 ? 'بێ سنوور' : n;
};

// Shared color-math helpers so any admin-chosen accent hex (not just the
// curated PLAN_COLORS presets) can be turned into a translucent background,
// a lightened "text on dark" tint, or a legible foreground automatically —
// no per-color hardcoding needed.
const parseHex = (hex) => {
  const h = (hex || '').replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16) || 0,
    g: parseInt(h.substring(2, 4), 16) || 0,
    b: parseInt(h.substring(4, 6), 16) || 0,
  };
};

export const hexToRgba = (hex, alpha) => {
  const { r, g, b } = parseHex(hex);
  return `rgba(${r},${g},${b},${alpha})`;
};

// Mixes a hex color toward white by `amount` (0..1) — used to turn a deep,
// low-contrast accent (e.g. a dark maroon) into something legible as plain
// text on a near-black background, without touching its use as a solid fill.
export const tintToward = (hex, amount) => {
  const { r, g, b } = parseHex(hex);
  const mix = (c) => Math.round(c + (255 - c) * amount);
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
};

// Picks a legible foreground (near-black or off-white) for text/icons sitting
// directly on top of a solid accent fill, based on the accent's own luminance.
export const getContrastColor = (hex) => {
  const { r, g, b } = parseHex(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#0b0f0a' : '#fff1f2';
};
