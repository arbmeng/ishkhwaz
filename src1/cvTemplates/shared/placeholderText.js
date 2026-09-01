// Ghost text shown in place of empty fields so the template layout
// always preserves its professional structure. Disappears the instant user types.
const PLACEHOLDERS = {
  ku: {
    fullName: 'ناوی سیانیت لێرە بنووسە',
    jobTitle: 'ناونیشانی پیشە / پسپۆڕییەکەت',
    email: 'info@ishkhwaz.iq',
    phone: '+964 750 123 4567',
    location: 'هەولێر، کوردستان',
    website: 'portfolio.iq',
    linkedin: 'linkedin.com/in/profile',
    summary: 'پوختەیەکی کورت و پرۆفیشناڵ لەسەر ئەزموونی کار و لێهاتووییەکانت لێرە بنووسە...',
  },
  ar: {
    fullName: 'اكتب اسمك الكامل هنا',
    jobTitle: 'المسمى الوظيفي أو التخصص',
    email: 'info@ishkhwaz.iq',
    phone: '+964 750 123 4567',
    location: 'أربيل، العراق',
    website: 'portfolio.iq',
    linkedin: 'linkedin.com/in/profile',
    summary: 'اكتب ملخصاً موجزاً ومهنياً عن خبراتك العملية ومهاراتك الأساسية هنا...',
  },
  en: {
    fullName: 'Your Full Name Here',
    jobTitle: 'Your Professional Job Title',
    email: 'info@ishkhwaz.iq',
    phone: '+964 750 123 4567',
    location: 'Erbil, Kurdistan',
    website: 'portfolio.iq',
    linkedin: 'linkedin.com/in/profile',
    summary: 'Write a brief, impactful summary highlighting your background, core strengths, and career achievements here...',
  },
};

export const getPlaceholders = (language) => PLACEHOLDERS[language] || PLACEHOLDERS.en;
