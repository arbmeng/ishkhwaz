// Real administrative divisions — Governorate (شار) → District/Qaza (قەزا) →
// Sub-district/Nahiya (ناحیە). Compiled from Wikipedia district-level articles
// and hawlergov.org (Erbil Governorate's own site), cross-checked where
// possible. Genuinely undocumented sub-district breakdowns are left as a
// bare district (no fabricated nahiyas) rather than guessed — see the
// per-district comments below for what's missing and why.
export const kurdistanGovernorates = [
  {
    id: 'sulaymaniyah',
    name_ku: 'سلێمانی',
    name_ar: 'السليمانية',
    name_en: 'Sulaymaniyah',
    districts: [
      {
        id: 'chemchamal',
        name_ku: 'چەمچەماڵ',
        name_ar: 'جمجمال',
        name_en: 'Chamchamal',
        subDistricts: [
          { id: 'takya_kak_mand', name_ku: 'تەکیەی کاکەمەند', name_ar: 'تكية كاكمند', name_en: 'Takya Kak Mand' },
          { id: 'bazyan', name_ku: 'بازیان', name_ar: 'بازيان', name_en: 'Bazyan' },
          { id: 'bawanij', name_ku: 'باوانج', name_ar: 'باوانج', name_en: 'Bawanij' },
          { id: 'shorish', name_ku: 'شۆڕش', name_ar: 'شورش', name_en: 'Shorish' },
          { id: 'sangkaw', name_ku: 'سەنگاو', name_ar: 'سنكاو', name_en: 'Sangkaw' },
          { id: 'agjalar', name_ku: 'ئاغجەلەر', name_ar: 'اغجلر', name_en: 'Aghjalar' },
          { id: 'qadir_karam', name_ku: 'قادر کەرەم', name_ar: 'قادر كرم', name_en: 'Qadir Karam' },
        ],
      },
      {
        id: 'sulaymaniyah_center',
        name_ku: 'مەڵبەندی سلێمانی',
        name_ar: 'مركز السليمانية',
        name_en: 'Sulaymaniyah Center',
        subDistricts: [
          { id: 'bakrajo', name_ku: 'بەکڕەجۆ', name_ar: 'بكرةجو', name_en: 'Bakrajo' },
          { id: 'tanjaro', name_ku: 'تانجەرۆ', name_ar: 'تانجرو', name_en: 'Tanjaro' },
          { id: 'sarchinar', name_ku: 'سەرچنار', name_ar: 'سرجنار', name_en: 'Sarchinar' },
          { id: 'sitak', name_ku: 'سیتەک', name_ar: 'سيتك', name_en: 'Sitak' },
        ],
      },
      {
        id: 'dokan',
        name_ku: 'دووکان',
        name_ar: 'دوكان',
        name_en: 'Dokan',
        subDistricts: [
          { id: 'piramagrun', name_ku: 'پیرەمەگروون', name_ar: 'بيره مكرون', name_en: 'Piramagrun' },
          { id: 'surdash', name_ku: 'سوردادش', name_ar: 'سورداش', name_en: 'Surdash' },
          { id: 'bingird', name_ku: 'بنگرد', name_ar: 'بينكرد', name_en: 'Bingird' },
          { id: 'chinaran', name_ku: 'چیناران', name_ar: 'جينارن', name_en: 'Chinaran' },
          { id: 'khidran', name_ku: 'خدران', name_ar: 'خدران', name_en: 'Khidran' },
        ],
      },
      {
        id: 'penjwin',
        name_ku: 'پێنجوێن',
        name_ar: 'بنجوين',
        name_en: 'Penjwin',
        subDistricts: [
          { id: 'garmik', name_ku: 'گەرمک', name_ar: 'كرمك', name_en: 'Garmik' },
          { id: 'nalparez', name_ku: 'ناڵپارێز', name_ar: 'نالباريز', name_en: 'Nalparez' },
        ],
      },
      {
        id: 'ranya',
        name_ku: 'ڕانیە',
        name_ar: 'رانية',
        name_en: 'Ranya',
        subDistricts: [
          { id: 'chwarqurna', name_ku: 'چوارقوڕنە', name_ar: 'جوارقورنة', name_en: 'Chwarqurna' },
          { id: 'hajiawa', name_ku: 'حاجیاوا', name_ar: 'حاجياوة', name_en: 'Hajiawa' },
          { id: 'betwata', name_ku: 'بێتواتە', name_ar: 'بيتواتة', name_en: 'Betwata' },
          { id: 'serkepkan', name_ku: 'سەرکەپکان', name_ar: 'سركبكان', name_en: 'Serkepkan' },
        ],
      },
      // Garmian (گەرمیان) is a district-region of Sulaymaniyah governorate,
      // not a separate governorate — its districts belong here.
      {
        id: 'kalar',
        name_ku: 'کەلار',
        name_ar: 'كلار',
        name_en: 'Kalar',
        subDistricts: [
          { id: 'rizgari_kalar', name_ku: 'ڕزگاری', name_ar: 'رزكاري', name_en: 'Rizgari' },
          { id: 'pebaz', name_ku: 'پێباز', name_ar: 'بيباز', name_en: 'Pebaz' },
          { id: 'sheikh_tawil', name_ku: 'شێخ تاویل', name_ar: 'شيخ تاويل', name_en: 'Sheikh Tawil' },
        ],
      },
      {
        id: 'kifri',
        name_ku: 'کفری',
        name_ar: 'كفري',
        name_en: 'Kifri',
        subDistricts: [
          { id: 'kokas', name_ku: 'کۆکەس', name_ar: 'كوكار', name_en: 'Kokas' },
          { id: 'sarqala', name_ku: 'سەرقەڵا', name_ar: 'سرقلعة', name_en: 'Sarqala' },
        ],
      },
      {
        id: 'darbandikhan',
        name_ku: 'دەربەندیخان',
        name_ar: 'دربنديخان',
        name_en: 'Darbandikhan',
        subDistricts: [
          { id: 'bawa_khoshen', name_ku: 'باوە خۆشین', name_ar: 'باوة خوشين', name_en: 'Bawa Khoshen' },
        ],
      },
      // No documented sub-district breakdown found — treated as a single leaf.
      { id: 'mawat', name_ku: 'مەوەت', name_ar: 'مووت', name_en: 'Mawat', subDistricts: [] },
      { id: 'qaradagh', name_ku: 'قەرەداغ', name_ar: 'قره داغ', name_en: 'Qaradagh', subDistricts: [] },
      {
        id: 'pshdar',
        name_ku: 'پشدەر',
        name_ar: 'بشدر',
        name_en: 'Pshdar',
        subDistricts: [
          { id: 'hero', name_ku: 'هێرۆ', name_ar: 'هيرو', name_en: 'Hero' },
          { id: 'nawdasht', name_ku: 'ناودەشت', name_ar: 'ناودشت', name_en: 'Nawdasht' },
        ],
      },
      {
        id: 'said_sadiq',
        name_ku: 'سەید سادق',
        name_ar: 'سيد صادق',
        name_en: 'Said Sadiq',
        subDistricts: [
          { id: 'siruchik', name_ku: 'سیرووچک', name_ar: 'سيروجك', name_en: 'Siruchik' },
        ],
      },
      { id: 'sharazur', name_ku: 'شارەزوور', name_ar: 'شهرزور', name_en: 'Sharazur', subDistricts: [] },
      {
        id: 'sharbazher',
        name_ku: 'شاربژێر',
        name_ar: 'شاربازير',
        name_en: 'Sharbazher',
        subDistricts: [
          { id: 'zalan', name_ku: 'زەلان', name_ar: 'زلان', name_en: 'Zalan' },
        ],
      },
    ],
  },
  {
    id: 'erbil',
    name_ku: 'هەولێر',
    name_ar: 'أربيل',
    name_en: 'Erbil',
    districts: [
      {
        id: 'erbil_center',
        name_ku: 'مەڵبەندی هەولێر',
        name_ar: 'مركز أربيل',
        name_en: 'Erbil Center',
        subDistricts: [
          { id: 'ankawa', name_ku: 'عەنکاوە', name_ar: 'عنكاوا', name_en: 'Ankawa' },
          { id: 'baharka', name_ku: 'بەحرکە', name_ar: 'بحركة', name_en: 'Baharka' },
          { id: 'shamamok', name_ku: 'شەمامک', name_ar: 'شمامك', name_en: 'Shamamok' },
        ],
      },
      {
        id: 'erbil_countryside',
        name_ku: 'دەشتی هەولێر',
        name_ar: 'ريف أربيل',
        name_en: 'Erbil Countryside',
        subDistricts: [
          { id: 'qushtapa', name_ku: 'قوشتەپە', name_ar: 'قوشتبة', name_en: 'Qushtapa' },
          { id: 'rizgari_erbil', name_ku: 'ڕزگاری', name_ar: 'رزكاري', name_en: 'Rizgari' },
          { id: 'kasnazan', name_ku: 'کەسنەزان', name_ar: 'كسنزان', name_en: 'Kasnazan' },
          { id: 'daratu', name_ku: 'دارەتوو', name_ar: 'دارتو', name_en: 'Daratu' },
        ],
      },
      {
        id: 'khabat',
        name_ku: 'خەبات',
        name_ar: 'خبات',
        name_en: 'Khabat',
        subDistricts: [
          { id: 'kewrgosk', name_ku: 'کەورگۆسک', name_ar: 'كوركوسك', name_en: 'Kewrgosk' },
          { id: 'darashekran', name_ku: 'دارەشەکران', name_ar: 'دارشكران', name_en: 'Darashekran' },
        ],
      },
      {
        id: 'koya',
        name_ku: 'کۆیە',
        name_ar: 'كويسنجق',
        name_en: 'Koy Sanjaq (Koya)',
        subDistricts: [
          { id: 'shorash_koya', name_ku: 'شۆڕش', name_ar: 'شورش', name_en: 'Shorash' },
          { id: 'ashti', name_ku: 'ئاشتی', name_ar: 'اشتي', name_en: 'Ashti' },
        ],
      },
      {
        id: 'mergasor',
        name_ku: 'مەرگەسوور',
        name_ar: 'مركةسور',
        name_en: 'Mergasor',
        subDistricts: [
          { id: 'barzan', name_ku: 'بارزان', name_ar: 'بارزان', name_en: 'Barzan' },
        ],
      },
      {
        id: 'shaqlawa',
        name_ku: 'شەقڵاوە',
        name_ar: 'شقلاوة',
        name_en: 'Shaqlawa',
        subDistricts: [
          { id: 'harir', name_ku: 'هەریر', name_ar: 'حرير', name_en: 'Harir' },
          { id: 'hiran', name_ku: 'هیران', name_ar: 'هيران', name_en: 'Hiran' },
          { id: 'salahaddin', name_ku: 'سەڵاحەدین', name_ar: 'صلاح الدين', name_en: 'Salahaddin' },
        ],
      },
      {
        id: 'soran',
        name_ku: 'سۆران',
        name_ar: 'سوران',
        name_en: 'Soran',
        subDistricts: [
          { id: 'diana', name_ku: 'دیانا', name_ar: 'ديانا', name_en: 'Diana' },
          { id: 'sidakan', name_ku: 'سیدەکان', name_ar: 'سيدكان', name_en: 'Sidakan' },
          { id: 'khalifan', name_ku: 'خەلیفان', name_ar: 'خليفان', name_en: 'Khalifan' },
        ],
      },
      { id: 'choman', name_ku: 'چۆمان', name_ar: 'جومان', name_en: 'Choman', subDistricts: [] },
      { id: 'rawanduz', name_ku: 'ڕواندز', name_ar: 'راوندوز', name_en: 'Rawanduz', subDistricts: [] },
      { id: 'taqtaq', name_ku: 'تەقتەق', name_ar: 'طقطق', name_en: 'Taqtaq', subDistricts: [] },
    ],
  },
  {
    id: 'duhok',
    name_ku: 'دهۆک',
    name_ar: 'دهوك',
    name_en: 'Duhok',
    districts: [
      {
        id: 'duhok_center',
        name_ku: 'مەڵبەندی دهۆک',
        name_ar: 'مركز دهوك',
        name_en: 'Duhok Center',
        subDistricts: [
          { id: 'zawiat', name_ku: 'زاویتە', name_ar: 'زاوية', name_en: 'Zawiat' },
          { id: 'mangesh', name_ku: 'مانگێش', name_ar: 'مانكيش', name_en: 'Mangesh' },
        ],
      },
      {
        id: 'zakhaw',
        name_ku: 'زاخۆ',
        name_ar: 'زاخو',
        name_en: 'Zakho',
        subDistricts: [
          { id: 'rizgari_zakho', name_ku: 'ڕزگاری', name_ar: 'رزكاري زاخو', name_en: 'Rizgari Zakho' },
          { id: 'darkar', name_ku: 'دەرکار', name_ar: 'دركار', name_en: 'Darkar' },
        ],
      },
      {
        id: 'amedi',
        name_ku: 'ئامێدی',
        name_ar: 'العمادية',
        name_en: 'Amedi',
        subDistricts: [
          { id: 'sheladiz', name_ku: 'شێلادزێ', name_ar: 'شيلادزي', name_en: 'Sheladiz' },
          { id: 'bamarni', name_ku: 'بامەڕنێ', name_ar: 'بامرتي', name_en: 'Bamarni' },
          { id: 'kani_masi', name_ku: 'کانی ماسی', name_ar: 'كاني ماسي', name_en: 'Kani Masi' },
          { id: 'sarsing', name_ku: 'سەرسنگ', name_ar: 'سرسنك', name_en: 'Sarsing' },
        ],
      },
      {
        id: 'semel',
        name_ku: 'سێمێل',
        name_ar: 'سيميل',
        name_en: 'Semel',
        subDistricts: [
          { id: 'fayda', name_ku: 'فایدە', name_ar: 'فايدة', name_en: 'Fayda' },
        ],
      },
      // No documented sub-district breakdowns found for these three.
      { id: 'akre', name_ku: 'ئاکرێ', name_ar: 'عقرة', name_en: 'Akre', subDistricts: [] },
      { id: 'bardarash', name_ku: 'بەردەڕەش', name_ar: 'بردرش', name_en: 'Bardarash', subDistricts: [] },
      { id: 'shekhan', name_ku: 'شێخان', name_ar: 'الشيخان', name_en: 'Shekhan', subDistricts: [] },
    ],
  },
  {
    id: 'halabja',
    name_ku: 'هەڵەبجە',
    name_ar: 'حلبجة',
    name_en: 'Halabja',
    districts: [
      // Halabja's former nahiyas (Khurmal, Sirwan, Byara, Bamo) were each
      // promoted to full districts when Halabja became its own governorate
      // in 2014 — kept as top-level districts here to match that, not
      // nested under halabja_center like before.
      { id: 'halabja_center', name_ku: 'مەڵبەندی هەڵەبجە', name_ar: 'مركز حلبجة', name_en: 'Halabja Center', subDistricts: [] },
      { id: 'khurmal', name_ku: 'خورماڵ', name_ar: 'خورمال', name_en: 'Khurmal', subDistricts: [] },
      { id: 'byara', name_ku: 'بیارە', name_ar: 'بيارة', name_en: 'Byara', subDistricts: [] },
      { id: 'sirwan', name_ku: 'سیروان', name_ar: 'سيروان', name_en: 'Sirwan', subDistricts: [] },
      { id: 'bamo', name_ku: 'بامۆ', name_ar: 'بامو', name_en: 'Bamo', subDistricts: [] },
    ],
  },
  {
    id: 'kirkuk',
    name_ku: 'کەرکووک',
    name_ar: 'كركوك',
    name_en: 'Kirkuk',
    districts: [
      {
        id: 'kirkuk_center',
        name_ku: 'مەڵبەندی کەرکووک',
        name_ar: 'مركز كركوك',
        name_en: 'Kirkuk Center',
        subDistricts: [
          { id: 'arahimawa', name_ku: 'ڕەحیماوا', name_ar: 'رحيم اوة', name_en: 'Rahimawa' },
          { id: 'shorjaw', name_ku: 'شۆڕجە', name_ar: 'شورجة', name_en: 'Shorja' },
          { id: 'laylan', name_ku: 'لەیلان', name_ar: 'ليلان', name_en: 'Laylan' },
          { id: 'taza_khurmatu', name_ku: 'تازە خورماتوو', name_ar: 'تازة خورماتو', name_en: 'Taza Khurmatu' },
        ],
      },
      {
        id: 'dibis',
        name_ku: 'دیبس',
        name_ar: 'دبس',
        name_en: 'Dibis',
        subDistricts: [
          { id: 'sargaran', name_ku: 'سەرگەران', name_ar: 'سركران', name_en: 'Sargaran' },
        ],
      },
      {
        id: 'hawija',
        name_ku: 'حەویجە',
        name_ar: 'الحويجة',
        name_en: 'Hawija',
        subDistricts: [
          { id: 'rashad', name_ku: 'ڕەشاد', name_ar: 'رشاد', name_en: 'Rashad' },
          { id: 'riyadh', name_ku: 'ڕیاز', name_ar: 'الرياض', name_en: 'Riyadh' },
        ],
      },
      { id: 'daquq', name_ku: 'داقووق', name_ar: 'داقوق', name_en: 'Daquq', subDistricts: [] },
    ],
  },
];
