// Labels burned into the printed resume itself — driven by the resume's own
// `language` field, independent of whatever language the app UI is currently
// showing (a user can browse in English and still write a Kurdish resume).
const LABELS = {
  ku: {
    contact: 'پەیوەندی',
    summary: 'پوختە',
    experience: 'ئەزموونی کار',
    education: 'خوێندن',
    skills: 'بەهرەکان',
    languages: 'زمانەکان',
    certifications: 'بڕوانامەکان',
    projects: 'پڕۆژەکان',
    references: 'کەسانی متمانەپێکراو',
    present: 'ئێستا',
  },
  ar: {
    contact: 'معلومات الاتصال',
    summary: 'الملخص',
    experience: 'الخبرة العملية',
    education: 'التعليم',
    skills: 'المهارات',
    languages: 'اللغات',
    certifications: 'الشهادات',
    projects: 'المشاريع',
    references: 'المراجع',
    present: 'الآن',
  },
  en: {
    contact: 'Contact',
    summary: 'Summary',
    experience: 'Experience',
    education: 'Education',
    skills: 'Skills',
    languages: 'Languages',
    certifications: 'Certifications',
    projects: 'Projects',
    references: 'References',
    present: 'Present',
  },
};

export const getResumeLabels = (language) => LABELS[language] || LABELS.ku;
