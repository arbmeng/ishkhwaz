import React from 'react';

// A branded monogram avatar/banner (first letter of the real name + a color
// picked deterministically from that same name) — used everywhere a company
// or freelancer has no real uploaded photo, instead of a fake stock photo
// pretending to be theirs or a flat, identical generic icon on every card.
const MONOGRAM_PALETTE = [
  ['#1d4ed8', '#3b82f6'], // blue
  ['#059669', '#10b981'], // emerald
  ['#7c3aed', '#a78bfa'], // violet
  ['#ea580c', '#fb923c'], // orange
  ['#db2777', '#f472b6'], // pink
  ['#0891b2', '#22d3ee'], // cyan
  ['#4338ca', '#818cf8'], // indigo
];

export function monogramColors(name) {
  const str = String(name || '');
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  return MONOGRAM_PALETTE[hash % MONOGRAM_PALETTE.length];
}

export const Monogram = ({ name, className = '', textClassName = 'text-lg', style }) => {
  const [c1, c2] = monogramColors(name);
  const letter = String(name || '؟').trim().charAt(0);
  return (
    <div
      className={`flex items-center justify-center font-black text-white shrink-0 ${className}`}
      style={{ background: `linear-gradient(135deg, ${c1}, ${c2})`, ...style }}
    >
      <span className={textClassName}>{letter}</span>
    </div>
  );
};
