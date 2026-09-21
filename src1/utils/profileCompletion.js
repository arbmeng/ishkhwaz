// Profile completion computed from the saved account (same weights as the profile page).
const arr = (v) => { if (Array.isArray(v)) return v; try { const p = JSON.parse(v || '[]'); return Array.isArray(p) ? p : []; } catch { return []; } };
const obj = (v) => { if (v && typeof v === 'object') return v; try { const p = JSON.parse(v || '{}'); return p && typeof p === 'object' ? p : {}; } catch { return {}; } };

export const profileCompletion = (u) => {
  if (!u) return 0;
  const employer = u.role === 'employer';
  const has = (x) => !!String(x || '').trim();
  const items = [
    [15, has(employer ? (u.company_logo || u.avatar) : u.avatar)],
    [employer ? 15 : 10, has(u.bio) && String(u.bio).trim().length > 10],
    [10, has(u.governorate) && has(u.district)],
    [employer ? 15 : 10, Object.values(obj(u.social_links)).some(has)],
    [5, !!Number(u.email_verified)],
    ...(employer ? [
      [10, has(u.company_name)], [10, has(u.industry)], [10, has(u.phone || u.company_phone)], [10, !!(u.company_size && u.company_type)],
    ] : [
      [5, has(u.profession) && u.profession !== 'کارخواز'], [15, arr(u.skills).length > 0], [15, arr(u.experience).length > 0],
      [5, arr(u.languages).length > 0], [10, arr(u.education).length > 0],
    ]),
  ];
  return Math.min(100, items.reduce((n, [w, ok]) => n + (ok ? w : 0), 0));
};
