import { lazy } from 'react';

// Complete curated collection: 5 Free Templates + 8 Pro Templates
export const TEMPLATE_LIST = [
  // ---- Free Templates (5) ----
  {
    id: 'free-modern-minimal',
    name: 'مۆدێرنی سادە',
    category: 'modern',
    isPremium: false,
    accentColorDefault: '#2563eb',
    thumbnail: 'live',
    component: lazy(() => import('./FreeModernMinimal.jsx')),
  },
  {
    id: 'free-clean-ats',
    name: 'پوختی ATS',
    category: 'ats',
    isPremium: false,
    accentColorDefault: '#0f172a',
    thumbnail: 'live',
    component: lazy(() => import('./FreeCleanATS.jsx')),
  },
  {
    id: 'free-creative-split',
    name: 'دابەشکراوی داهێنەر',
    category: 'creative',
    isPremium: false,
    accentColorDefault: '#0284c7',
    thumbnail: 'live',
    component: lazy(() => import('./FreeCreativeSplit.jsx')),
  },
  {
    id: 'free-student-clean',
    name: 'قوتابی ڕێکخراو',
    category: 'student',
    isPremium: false,
    accentColorDefault: '#7c3aed',
    thumbnail: 'live',
    component: lazy(() => import('./FreeStudentClean.jsx')),
  },
  {
    id: 'free-executive-line',
    name: 'هێڵی بەڕێوەبەرایەتی',
    category: 'executive',
    isPremium: false,
    accentColorDefault: '#334155',
    thumbnail: 'live',
    component: lazy(() => import('./FreeExecutiveLine.jsx')),
  },

  // ---- Pro Templates (8) ----
  {
    id: 'pro-fresher-curve',
    name: 'کێرڤی تازەکار',
    category: 'modern',
    isPremium: true,
    accentColorDefault: '#0f172a',
    thumbnail: 'live',
    component: lazy(() => import('./ProFresherCurve.jsx')),
  },
  {
    id: 'pro-navy-split',
    name: 'شینی دابەشکراو',
    category: 'executive',
    isPremium: true,
    accentColorDefault: '#1a365d',
    thumbnail: 'live',
    component: lazy(() => import('./ProNavySplit.jsx')),
  },
  {
    id: 'pro-geometric-wave',
    name: 'شەپۆلی ئەندازەیی',
    category: 'creative',
    isPremium: true,
    accentColorDefault: '#0284c7',
    thumbnail: 'live',
    component: lazy(() => import('./ProGeometricWave.jsx')),
  },
  {
    id: 'pro-bronze-ribbon',
    name: 'شریتی برۆنزی',
    category: 'creative',
    isPremium: true,
    accentColorDefault: '#c27803',
    thumbnail: 'live',
    component: lazy(() => import('./ProBronzeRibbon.jsx')),
  },
  {
    id: 'pro-executive-polygon',
    name: 'فرەگۆشەی بەڕێوەبەری',
    category: 'executive',
    isPremium: true,
    accentColorDefault: '#059669',
    thumbnail: 'live',
    component: lazy(() => import('./ProExecutivePolygon.jsx')),
  },
  {
    id: 'pro-lavender-fresher',
    name: 'لاڤێندەری تازەکار',
    category: 'modern',
    isPremium: true,
    accentColorDefault: '#8b5cf6',
    thumbnail: 'live',
    component: lazy(() => import('./ProLavenderFresher.jsx')),
  },
  {
    id: 'pro-purple-badge',
    name: 'باجی مۆر',
    category: 'creative',
    isPremium: true,
    accentColorDefault: '#6366f1',
    thumbnail: 'live',
    component: lazy(() => import('./ProPurpleBadge.jsx')),
  },
  {
    id: 'pro-teal-clinical',
    name: 'کلینیکی شینباو',
    category: 'executive',
    isPremium: true,
    accentColorDefault: '#0d9488',
    thumbnail: 'live',
    component: lazy(() => import('./ProTealClinical.jsx')),
  },
];

export const TEMPLATE_CATEGORIES = ['all', 'ats', 'modern', 'executive', 'creative', 'student'];

export const CATEGORY_LABELS = {
  all: 'هەموو', ats: 'گونجاو بۆ ATS', modern: 'مۆدێرن', creative: 'داهێنەرانە',
  executive: 'بەڕێوەبەرایەتی', student: 'قوتابی',
};

export const getTemplate = (id) => TEMPLATE_LIST.find((t) => t.id === id) || TEMPLATE_LIST[0];
