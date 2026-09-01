import React from 'react';

// Original line-art emblems, one per governorate — a real, distinctive mark
// for each city instead of a generic placeholder, without pretending to be
// an actual photograph. Each is drawn from simple shapes in a 100x100 box.

const ErbilCitadel = (props) => (
  <svg viewBox="0 0 100 100" {...props}>
    <path d="M18 80 Q18 42 50 40 Q82 42 82 80 Z" />
    <rect x="26" y="33" width="7" height="9" />
    <rect x="40" y="31" width="7" height="9" />
    <rect x="53" y="31" width="7" height="9" />
    <rect x="67" y="33" width="7" height="9" />
    <rect x="45" y="20" width="10" height="21" />
    <polygon points="45,20 50,11 55,20" />
  </svg>
);

const SulaymaniyahMountains = (props) => (
  <svg viewBox="0 0 100 100" {...props}>
    <polygon points="0,88 20,52 36,73 56,38 76,68 100,48 100,88" opacity="0.45" />
    <polygon points="0,88 24,63 46,81 66,56 87,77 100,66 100,88" />
  </svg>
);

const DuhokDam = (props) => (
  <svg viewBox="0 0 100 100" {...props}>
    <polygon points="0,62 20,36 40,57 60,30 80,53 100,40 100,62" />
    <path d="M0 76 Q25 66 50 76 T100 76" fill="none" strokeWidth="3.5" />
    <path d="M0 87 Q25 80 50 87 T100 87" fill="none" strokeWidth="3" opacity="0.5" />
  </svg>
);

const KirkukFlame = (props) => (
  <svg viewBox="0 0 100 100" {...props}>
    <rect x="12" y="56" width="38" height="28" />
    <rect x="18" y="45" width="7" height="11" />
    <rect x="31" y="45" width="7" height="11" />
    <rect x="44" y="45" width="7" height="11" />
    <path d="M78 86 Q64 70 78 48 Q80 64 91 58 Q86 74 78 86 Z" />
  </svg>
);

const HalabjaMonument = (props) => (
  <svg viewBox="0 0 100 100" {...props}>
    <rect x="14" y="80" width="72" height="6" />
    <polygon points="46,80 50,18 54,80" />
    <circle cx="50" cy="12" r="4.5" opacity="0.85" />
  </svg>
);

const CITY_SYMBOLS = {
  erbil: ErbilCitadel,
  sulaymaniyah: SulaymaniyahMountains,
  duhok: DuhokDam,
  kirkuk: KirkukFlame,
  halabja: HalabjaMonument,
};

export const CitySymbol = ({ id, className = '' }) => {
  const Symbol = CITY_SYMBOLS[id];
  if (!Symbol) return null;
  return <Symbol className={className} fill="currentColor" stroke="currentColor" />;
};
