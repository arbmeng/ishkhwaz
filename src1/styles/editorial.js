// Shared style tokens/helpers for the "editorial" redesign (Home v2 / Redesign v2 —
// oklch cream + warm-gold palette, Noto Naskh Arabic headlines, Space Grotesk numerals).
// Kept as plain style-object generators (not Tailwind) so the oklch() values are used
// verbatim from the source design, and so every redesigned page (Home, Search, Company,
// Freelancer, Job) shares one definition instead of five copies drifting apart.

export const ink = {
  base: 'oklch(0.2 0.01 60)',
  hover: 'oklch(0.28 0.015 60)',
  onDark: 'oklch(0.98 0.003 85)',
};

export const gold = {
  icon: 'oklch(0.82 0.09 82)',
  iconSoft: 'oklch(0.75 0.07 82)',
  gradient: 'linear-gradient(to left, oklch(0.86 0.08 88), oklch(0.8 0.09 78))',
  onGradient: 'oklch(0.24 0.04 70)',
  border: 'oklch(0.78 0.08 82)',
  chipBg: 'oklch(0.97 0.02 85)',
  chipBorder: 'oklch(0.92 0.03 85)',
  badgeBg: 'oklch(0.97 0.02 85)',
  badgeBorder: 'oklch(0.88 0.05 85)',
  badgeText: 'oklch(0.42 0.06 75)',
};

export const muted = {
  1: 'oklch(0.42 0.01 60)',
  2: 'oklch(0.45 0.01 60)',
  3: 'oklch(0.5 0.01 60)',
  4: 'oklch(0.52 0.01 60)',
  5: 'oklch(0.55 0.01 60)',
  6: 'oklch(0.58 0.01 60)',
  7: 'oklch(0.62 0.01 60)',
};

export const line = {
  1: 'oklch(0.91 0.006 85)',
  2: 'oklch(0.92 0.006 85)',
  3: 'oklch(0.93 0.006 85)',
  4: 'oklch(0.94 0.006 85)',
  5: 'oklch(0.95 0.005 85)',
};

export const surface = {
  page: 'oklch(0.975 0.006 85)',
  card: 'oklch(1 0 0)',
  input: 'oklch(0.985 0.004 85)',
  inputHover: 'oklch(0.97 0.005 85)',
  dark: 'oklch(0.2 0.01 60)',
};

export const font = {
  headline: "'Noto Naskh Arabic', serif",
  mono: "'Space Grotesk', monospace",
};

export const card = {
  background: surface.card,
  border: `1px solid ${line[1]}`,
  borderRadius: 16,
};

export const darkCard = {
  background: surface.dark,
  borderRadius: 16,
  color: ink.onDark,
};

export const goldButton = {
  padding: '13px 18px',
  borderRadius: 11,
  border: `1px solid ${gold.border}`,
  background: gold.gradient,
  color: gold.onGradient,
  fontFamily: 'inherit',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
};

export const darkButton = {
  padding: '13px 18px',
  borderRadius: 11,
  border: `1px solid ${ink.base}`,
  background: ink.base,
  color: ink.onDark,
  fontFamily: 'inherit',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
};

export const outlineButton = {
  padding: '13px 18px',
  borderRadius: 11,
  border: `1px solid ${line[1]}`,
  background: surface.card,
  color: 'oklch(0.28 0.01 60)',
  fontFamily: 'inherit',
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
};

export const searchInputWrap = {
  flex: 1,
  minWidth: 200,
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '0 14px',
  border: `1px solid ${line.top || line[1]}`,
  borderRadius: 11,
  background: surface.input,
};

// pill(active) — the small segmented-control pill used for desktop/mobile,
// search/company/freelancer/job toggles etc.
export const pill = (active) => ({
  padding: '8px 15px',
  borderRadius: 999,
  border: 'none',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: 12.5,
  fontWeight: active ? 600 : 400,
  background: active ? surface.card : 'transparent',
  color: active ? ink.base : 'oklch(0.48 0.01 60)',
  boxShadow: active ? `0 1px 3px ${ink.base} / 0.1` : 'none',
  transition: 'background .18s ease, color .18s ease',
});

// segPill(active) — the larger tab pill used for search-result-type tabs.
export const segPill = (active) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  padding: '9px 16px',
  borderRadius: 999,
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: 13,
  fontWeight: active ? 600 : 500,
  border: active ? `1px solid ${ink.base}` : `1px solid ${line[1]}`,
  background: active ? ink.base : surface.card,
  color: active ? ink.onDark : 'oklch(0.4 0.01 60)',
  transition: 'background .18s ease, color .18s ease, border-color .18s ease',
});

// chip(active) — small filter chip (job type, price, city…)
export const chip = (active) => ({
  padding: '8px 14px',
  borderRadius: 999,
  fontSize: 12.5,
  cursor: 'pointer',
  border: active ? `1px solid ${ink.base}` : `1px solid ${line[1]}`,
  background: active ? ink.base : surface.card,
  color: active ? 'oklch(0.98 0.003 85)' : 'oklch(0.42 0.01 60)',
  fontWeight: active ? 600 : 400,
});

// underTab(active) — an underlined text tab (About / Jobs on a profile page)
export const underTab = (active) => ({
  padding: '0 0 12px',
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  fontFamily: font.headline,
  fontSize: 16,
  fontWeight: active ? 700 : 500,
  color: active ? ink.base : muted[5],
  borderBottom: active ? `1.5px solid ${gold.border}` : '1.5px solid transparent',
  marginBottom: -1,
});

// ─────────────────────────────────────────────────────────────────────────
// "Editorial system v1" — the full token sheet from the Ishkhwaz.dc.html
// design-doc canvas (project df6fe277…), meant to replace the legacy dark/
// lime "cinematic" theme app-wide. Additive to everything above (which
// already matches this same palette) — new names below rather than
// redefining old ones, so already-shipped screens don't shift silently.

// Inline text / link color — `a { color: oklch(0.52 0.09 72) }`, hover oklch(0.44 0.1 70)
export const accentText = { base: 'oklch(0.52 0.09 72)', hover: 'oklch(0.44 0.1 70)' };

export const status = {
  success: 'oklch(0.55 0.09 155)',
  danger: 'oklch(0.55 0.14 25)',
};

export const radius = { sm: 11, md: 14, lg: 16, pill: 999 };

export const motion = { duration: '200ms', easing: 'cubic-bezier(.32,.72,0,1)' };

// Icon set for this system is Phosphor (https://phosphoricons.com) — classes
// `ph` (regular), `ph-fill`, `ph-bold`, e.g. <i className="ph-fill ph-seal-check" />.
// Directional icons (arrows) must be mirrored for RTL — "back" uses ph-arrow-right.

// Five distinct badge treatments, each its own hue — never reuse one color
// for all badge kinds, that's a deliberate part of this system.
export const badge = {
  vip:      { background: gold.gradient, color: gold.onGradient, icon: 'ph-fill ph-crown-simple' },
  boosted:  { background: 'oklch(0.94 0.03 85)', color: 'oklch(0.45 0.09 70)', border: '1px solid oklch(0.88 0.045 82)', icon: 'ph-fill ph-rocket-launch' },
  new:      { background: 'oklch(0.94 0.03 155)', color: 'oklch(0.42 0.08 155)' },
  verified: { background: 'oklch(0.94 0.02 240)', color: 'oklch(0.42 0.07 240)', icon: 'ph-fill ph-seal-check' },
  applied:  { background: 'oklch(0.93 0.006 80)', color: 'oklch(0.45 0.012 60)' },
};

export const badgePillStyle = (kind) => {
  const b = badge[kind];
  return {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    fontSize: 11, fontWeight: 600, padding: '5px 11px', borderRadius: radius.pill,
    background: b.background, color: b.color,
    ...(b.border ? { border: b.border } : {}),
  };
};

// Buttons — exact spec from the design-system chapter (primary is always a
// gold-gradient fill with a soft glow, never a flat/solid dark fill).
export const btnPrimary = {
  fontFamily: 'inherit', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer',
  padding: '13px 24px', borderRadius: radius.md,
  background: gold.gradient, color: gold.onGradient,
  boxShadow: '0 2px 8px oklch(0.6 0.09 78 / 0.25)',
};
export const btnSecondary = {
  fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  padding: '13px 24px', borderRadius: radius.md,
  background: 'transparent', color: 'oklch(0.28 0.01 60)', border: '1px solid oklch(0.82 0.01 80)',
};
export const btnGhost = {
  fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  padding: '13px 20px', borderRadius: radius.md,
  background: 'transparent', color: accentText.base, border: 'none',
};
export const btnIcon = {
  width: 44, height: 44, borderRadius: radius.md,
  border: '1px solid oklch(0.87 0.01 80)', background: surface.card, color: 'oklch(0.35 0.01 60)',
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19,
};
export const btnDisabled = {
  fontFamily: 'inherit', fontSize: 14, fontWeight: 600, border: 'none',
  padding: '13px 24px', borderRadius: radius.md,
  background: 'oklch(0.9 0.008 80)', color: 'oklch(0.65 0.01 60)', opacity: 0.75, cursor: 'not-allowed',
};

// Text input — focus ring is a soft gold glow, not the browser default.
export const inputStyle = {
  fontFamily: 'inherit', fontSize: 14, padding: '14px 16px', borderRadius: radius.md,
  border: '1px solid oklch(0.87 0.01 80)', background: surface.card, color: ink.base, outline: 'none',
};
export const inputFocusRing = '0 0 0 3px oklch(0.86 0.08 88 / 0.28)';

// Segmented control track (e.g. Jobs / Companies / Freelancers switcher)
export const segTrackStyle = {
  display: 'flex', background: 'oklch(0.93 0.008 82)', borderRadius: radius.md, padding: 4, gap: 4,
};
export const segItemStyle = (active) => ({
  flex: 1, textAlign: 'center', fontSize: 13, fontWeight: active ? 600 : 500,
  padding: '9px', borderRadius: 9,
  background: active ? surface.card : 'transparent',
  color: active ? ink.base : muted[3],
  boxShadow: active ? '0 1px 2px oklch(0.2 0.01 60 / 0.06)' : 'none',
});
