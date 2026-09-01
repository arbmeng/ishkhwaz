const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'laravel-backend', 'database.sqlite');
const db = new Database(dbPath);

console.log('Seeding Ish-khwaz SQLite database with real jobs, companies, candidates & applications...');

// Clear existing jobs & applications
db.prepare('DELETE FROM jobs').run();
db.prepare('DELETE FROM applications').run();

// Seed Jobs
const insertJob = db.prepare(`
  INSERT INTO jobs (id, company_id, company_name, company_logo, company_phone, company_email, title_ku, category, job_type, workplace_type, governorate_id, district_id, sub_district_id, location_detail, salary_min, salary_max, salary_period, description, required_skills, fee_amount, deadline, status, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

insertJob.run(
  'job_101', 'usr_emp1', 'دیجیتاڵ تەکنۆلوجی (Erbil Tech)', 
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80', 
  '0750 123 4567', 'info@erbiltech.iq', 
  'گەشەپێدەری Full Stack React / Node.js', 'cat_it', 'fullTime', 'onSite', 
  'erbil', 'ankawa', 'ankawa_center', 'ئەنکاوە - بەرامبەر پەرلەمان', 
  1200000, 1800000, 'monthly', 
  'پێویستیمان بە گەشەپێدەری ئەزمووندارە بۆ دروستکردن و بەڕێوەبردنی سیستەمی وێب.', 
  JSON.stringify(['React', 'Node.js', 'SQLite']), 
  2500, '2026-10-01', 'active', new Date().toISOString()
);

insertJob.run(
  'job_102', 'usr_emp2', 'کۆمپانیای ڕێساز سۆلوشنز', 
  'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=150&auto=format&fit=crop&q=80', 
  '0770 987 6543', 'hr@rexaz.iq', 
  'بەڕێوەبەری کۆگا و سەرپەرشتیاری POS', 'cat_retail', 'fullTime', 'onSite', 
  'sulaymaniyah', 'sulaymaniyah_center', 'salim_st', 'شەقامی سەلیم - تەلاری سەرەکی', 
  850000, 1300000, 'monthly', 
  'بەڕێوەبردنی بەشی فرۆشتن و ژمێریاری POS لە کۆگای فرە لقی.', 
  JSON.stringify(['POS', 'Inventory', 'Accounting']), 
  2500, '2026-10-15', 'active', new Date().toISOString()
);

insertJob.run(
  'job_103', 'usr_emp3', 'یانەی وەرزشی ڕۆیاڵ فیت VIP', 
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=150&auto=format&fit=crop&q=80', 
  '0750 888 9999', 'club@royalfit.iq', 
  'ڕاهێنەری سەرەکی فیتنس و پێدانی بەرنامەی خۆراک', 'cat_health', 'partTime', 'onSite', 
  'duhok', 'duhok_center', 'kRO', 'گەڕەکی KRO', 
  900000, 1400000, 'monthly', 
  'ڕاهێنەری شارەزا بۆ ئامادەکردنی بەرنامەی ڕاهێنان و شوێنکەوتنی بەشداربووان.', 
  JSON.stringify(['Fitness', 'Nutrition', 'Personal Training']), 
  2500, '2026-11-01', 'active', new Date().toISOString()
);

// Seed Applications
const insertApp = db.prepare(`
  INSERT INTO applications (id, job_id, job_title, company_name, freelancer_id, freelancer_name, freelancer_phone, freelancer_email, freelancer_avatar, cover_letter, cv_url, payment_proof_image, payment_method, payment_tx_id, fee_paid, payment_status, company_status, status, applied_at, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

insertApp.run(
  'app_201', 'job_101', 'گەشەپێدەری Full Stack React / Node.js', 'دیجیتاڵ تەکنۆلوجی (Erbil Tech)',
  'usr_free1', 'ئاری محەمەد', '0750 123 4567', 'ari@ishkhwaz.iq', '',
  'ئەزموونی ٤ ساڵم هەیە لە گەشەپێدانی سەکۆکان.', 'cv_ari.pdf',
  'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=300&auto=format&fit=crop&q=80',
  'FastPay', 'FP-998822', 2500, 'verified', 'accepted', 'accepted', new Date().toISOString(), new Date().toISOString()
);

insertApp.run(
  'app_202', 'job_102', 'بەڕێوەبەری کۆگا و سەرپەرشتیاری POS', 'کۆمپانیای ڕێساز سۆلوشنز',
  'usr_free2', 'سارە ئەحمەد', '0770 111 2233', 'sara@ishkhwaz.iq', '',
  'شارەزای ته‌واوی سیستەمەکانی POS و بەڕێوەبردنی کۆگام.', 'cv_sara.pdf',
  'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=300&auto=format&fit=crop&q=80',
  'FIB', 'FIB-441100', 2500, 'pending', 'pending', 'pending_payment_verification', new Date().toISOString(), new Date().toISOString()
);

console.log('✅ DATABASE SEEDING COMPLETED SUCCESSFULLY!');
