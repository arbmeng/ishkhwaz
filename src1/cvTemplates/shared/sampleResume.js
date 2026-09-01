// Example content shown in template gallery/thumbnails, defaulting to Kurdish.
export const sampleResume = (overrides = {}) => ({
  id: 'sample',
  language: 'ku',
  direction: 'rtl',
  accentColor: '#0f172a',
  fontFamily: 'arabic',
  personalInfo: {
    fullName: 'ئالان ئەحمەد',
    jobTitle: 'دیزاینەری باڵای بەرهەم و UI/UX',
    photo: '',
    email: 'aland.ahmad@ishkhwaz.iq',
    phone: '+964 750 123 4567',
    city: 'هەولێر',
    country: 'کوردستان',
    website: 'aland.design',
    linkedin: 'linkedin.com/in/aland-ahmad',
    summary: 'دیزاینەری بەئەزموونی بەرهەمی دیجیتاڵی بە زیاتر لە ٥ ساڵ ئەزموون لە دروستکردنی ئەپی مۆبایل و سیستەمی دیزاینی سەردەمیانە بۆ پڕۆژە و کۆمپانیا پێشەنگەکان.',
  },
  sections: {
    experience: [
      {
        id: 'e1',
        company: 'نیشتمان تێک',
        role: 'سەرپەرشتیاری دیزاینی بەرهەم',
        startDate: '2022-03',
        endDate: '',
        current: true,
        location: 'هەولێر',
        description: 'سەرپەرشتیکردنی دیزاینی ئەپە سەرەکییەکان، بەرزکردنەوەی بەکارهێنەرانی چالاک بە ڕێژەی ٤٠٪ و دروستکردنی سیستەمی دیزاینی یەکگرتوو.',
      },
      {
        id: 'e2',
        company: 'کوردستان دیجیتاڵ',
        role: 'دیزاینەری UI/UX',
        startDate: '2019-06',
        endDate: '2022-02',
        current: false,
        location: 'سلێمانی',
        description: 'دیزاینکردن و جێبەجێکردنی زیاتر لە ٢٠ پڕۆژەی ماڵپەڕ و ئەپی مۆبایل لەگەڵ تیمی پەرەپێدان.',
      },
    ],
    education: [
      {
        id: 'ed1',
        institution: 'زانکۆی سەڵاحەدین',
        degree: 'بەکالۆریۆس',
        field: 'ئەندازیاری سۆفتوێر و IT',
        startDate: '2015-09',
        endDate: '2019-06',
        description: 'دەرچوون بە پلەی نایاب بە تەرکیز لەسەر دیزاین و وێب.',
      },
    ],
    skills: [
      { id: 's1', name: 'دیزاینی UI/UX و Figma', level: 5 },
      { id: 's2', name: 'سیستەمی دیزاین (Design Systems)', level: 5 },
      { id: 's3', name: 'توێژینەوەی بەکارهێنەر', level: 4 },
      { id: 's4', name: 'پرۆتۆتایپ و وایەرفرەیم', level: 4 },
      { id: 's5', name: 'HTML, CSS & Tailwind', level: 4 },
    ],
    languages: [
      { id: 'l1', name: 'کوردی', level: 'زمانی دایک' },
      { id: 'l2', name: 'ئینگلیزی', level: 'زۆر باش' },
      { id: 'l3', name: 'عەرەبی', level: 'باش' },
    ],
    certifications: [
      { id: 'c1', name: 'بڕوانامەی پرۆفیشناڵی UX لە Google', issuer: 'Google / Coursera', date: '2021' },
    ],
    projects: [
      { id: 'p1', name: 'ئەپی پارەدانی دیجیتاڵی', description: 'دیزاینی تەواوەتی بۆ ئەپی مۆبایلی پارەدان بە زیاتر لە ٥٠,٠٠٠ بەکارهێنەر.', link: '' },
    ],
    references: [
      { id: 'r1', name: 'سارا کەریم', relation: 'بەڕێوەبەری دیزاین، نیشتمان تێک', phone: '+964 750 987 6543', email: 'sara@nishtiman.tech' },
    ],
  },
  sectionOrder: ['experience', 'education', 'skills', 'languages', 'certifications', 'projects', 'references'],
  visibleSections: { experience: true, education: true, skills: true, languages: true, certifications: true, projects: true, references: true },
  ...overrides,
});
