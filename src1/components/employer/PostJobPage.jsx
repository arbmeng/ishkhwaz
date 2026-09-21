import React, { useState, useEffect } from 'react';
import { JOB_SECTORS } from '../../data/jobSectors';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { apiService } from '../../services/api';
import { soundService } from '../../services/soundService';
import { kurdistanGovernorates } from '../../data/kurdistanLocations';
import JobLocationPicker from '../ui/JobLocationPicker';
import {
  CheckCircle2, ChevronDown, Plus, ArrowRight,
} from 'lucide-react';

const NK = "'Noto Kufi Arabic', 'Vazirmatn', system-ui, sans-serif";

const WORKPLACE_TYPES = [
  { id: 'onSite', label: 'لە شوێنی کار' },
  { id: 'remote', label: 'لە ماڵەوە' },
  { id: 'hybrid', label: 'تێکەڵ' },
];

// One titled card per step — a normal (non-technical) person should be able
// to read the section title and know exactly what to fill in there, instead
// of a single dense wall of fields. Replaces the old PREVIEW/CHECKLIST
// all-caps monospace dev-dashboard styling with plain Kurdish.
function SectionCard({ title, hint, children }) {
  return (
    <div className="bg-white rounded-[28px] p-5 sm:p-7 border border-[#eae8ee] shadow-sm space-y-5 text-right">
      <div>
        <h3 className="text-sm sm:text-base font-black text-[#16111d]">{title}</h3>
        {hint && <p className="text-[11px] text-[#7b8e88] font-bold mt-0.5">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, help, children }) {
  return (
    <div className="space-y-1.5 text-right">
      <label className="text-xs font-bold text-[#16111d] block">{label}</label>
      {children}
      {help && <p className="text-[10px] text-[#a0afa9] font-medium">{help}</p>}
    </div>
  );
}

const selectClass =
  'w-full bg-[#f5f4f7] border border-[#eae8ee] rounded-2xl px-4 py-3.5 text-xs font-bold text-[#16111d] outline-none appearance-none cursor-pointer';
const inputClass =
  'w-full bg-[#f5f4f7] border border-[#eae8ee] rounded-2xl px-4 py-3.5 text-xs sm:text-sm font-bold text-[#16111d] outline-none';

// The job page shows a job as these dropdowns ("Title:" blocks in the description), so the form asks for each one
// separately and joins them in that format. `list` sections take one item per line and become bullets.
const JOB_SECTIONS = [
  { key: 'about', title: 'دەربارەی کۆمپانیا', label: 'دەربارەی کۆمپانیا', hint: 'کۆمپانیاکەت بە کورتی بناسێنە', placeholder: 'ئێمە کۆمپانیایەکین لە بواری... کە لە سلێمانی/هەولێر...' },
  { key: 'summary', title: 'کورتەی کارەکە', label: 'کورتەی کارەکە', hint: 'یەک دوو ڕستە: ئەم کارە چییە و بۆچی گرنگە', placeholder: 'بە دوای فرۆشیارێکی چالاک دەگەڕێین بۆ...', required: true },
  { key: 'duties', title: 'ئەرکە سەرەکییەکان', label: 'ئەرکە سەرەکییەکان', hint: 'هەر ئەرکێک لە دێڕێکدا', placeholder: 'وەڵامدانەوەی پەیوەندییەکان\nتۆمارکردنی داواکارییەکان', list: true },
  { key: 'must', title: 'مەرجە پێویستەکان', label: 'مەرجە پێویستەکان', hint: 'هەر مەرجێک لە دێڕێکدا', placeholder: 'ئەزموونی ٢ ساڵ\nزانینی زمانی ئینگلیزی', list: true },
  { key: 'nice', title: 'مەرجە باشترەکان (پێویست نین)', label: 'مەرجە باشترەکان (پێویست نین)', hint: 'ئەوانەی باشن بەڵام ناچارنین', placeholder: 'زانینی Excel\nئەگەری هەبوونی ئۆتۆمبێل', list: true },
  { key: 'when', title: 'کاتی کار و شوێن', label: 'کاتی کار و شوێن', hint: 'کاتژمێرەکان و شوێنی کارکردن', placeholder: 'شەممە تا پێنجشەممە، ٨ی بەیانی تا ٤ی دوانیوەڕۆ\nشوێن: هەولێر، شەقامی...', list: true },
  { key: 'pay', title: 'مووچە و بەرژەوەندییەکان', label: 'مووچە و بەرژەوەندییەکان', hint: 'مووچە، پاداشت، بیمە، گواستنەوە...', placeholder: 'مووچەی مانگانە + پاداشتی فرۆش\nبیمەی تەندروستی', list: true },
  { key: 'apply', title: 'چۆن داواکاری بنێرم', label: 'چۆن داواکاری بنێرم', hint: 'کاندید چی بکات بۆ داواکاری', placeholder: 'لە ئەپەکەدا «ناردنی سیڤی» بکە و CVـیەکەت هاوپێچ بکە.', list: true },
];
const SECTION_MAX = 320; // 8 x 320 stays inside the server's 3000-character limit

export const PostJobPage = ({ onBack, onSuccess }) => {
  const { user, token } = useAuth();
  const { addToast, categories: liveCategories = [], workTypes: liveWorkTypes = [] } = useStore();

  const [companyName] = useState(user?.company_name || user?.name || 'تیشک تێک');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [jobType, setJobType] = useState('');
  const [sector, setSector] = useState(''); // حکوومی / تایبەت / بازرگانی ...
  const [workplaceType, setWorkplaceType] = useState('onSite');
  const [salaryMin, setSalaryMin] = useState(1200000);
  const [salaryMax, setSalaryMax] = useState(1800000);
  const [selectedGov, setSelectedGov] = useState('sulaymaniyah');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedSubDistrict, setSelectedSubDistrict] = useState('');
  const [pin, setPin] = useState(null); // { lat, lng, locationName } from the map picker
  const [sec, setSec] = useState(() => ({ about: (user?.bio || user?.description || '').slice(0, 320), summary: '', duties: '', must: '', nice: '', when: '', pay: '', apply: '' }));
  const composeDescription = () => JOB_SECTIONS.map(({ key, title, list }) => {
    const lines = sec[key].split('\n').map(x => x.trim()).filter(Boolean);
    if (!lines.length) return '';
    return `${title}:\n` + lines.map(l => (list ? `• ${l.replace(/^[•\-–·*]\s*/, '')}` : l)).join('\n');
  }).filter(Boolean).join('\n\n');
  const descriptionLength = composeDescription().length;
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [deadline, setDeadline] = useState('');
  const [positions, setPositions] = useState(1);
  const [companyReg, setCompanyReg] = useState('');
  const [companyIndustry, setCompanyIndustry] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Job types come from the admin-managed work_types table (Zera-World
  // panel → Ish-khwaz → Worktypes) instead of a hardcoded list, so a new
  // type an admin adds shows up here automatically. Default to the first
  // active one once they load.
  useEffect(() => {
    if (!jobType && liveWorkTypes.length > 0) setJobType(liveWorkTypes[0].id);
  }, [liveWorkTypes, jobType]);

  const currentGovObj = kurdistanGovernorates.find(g => g.id === selectedGov) || kurdistanGovernorates[0];
  const availableDistricts = currentGovObj?.districts || [];
  const currentDistObj = availableDistricts.find(d => d.id === selectedDistrict) || null;
  const availableSubDistricts = currentDistObj?.subDistricts || [];

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !skills.includes(s)) {
      setSkills(prev => [...prev, s]);
      setSkillInput('');
    }
  };

  const removeSkill = (s) => {
    setSkills(prev => prev.filter(x => x !== s));
  };

  const basicsDone = Boolean(title.trim() && category && sector);
  const locationDone = Boolean(selectedGov);
  const deadlineDone = Boolean(deadline);

  const handleSubmit = async () => {
    if (!title.trim()) {
      setErrorMsg('ناونیشانی کار پێویستە.');
      return;
    }
    if (!category) {
      setErrorMsg('بوار پێویستە.');
      return;
    }
    if (!sector) {
      setErrorMsg('جۆری کەرت هەڵبژێرە (حکوومی، تایبەت، بازرگانی ...).');
      return;
    }
    if (!sec.summary.trim()) {
      setErrorMsg('کورتەی کارەکە پێویستە (لە بەشی وردەکاری کار).');
      return;
    }
    if (!token) {
      setErrorMsg('تکایە پێشتر بچۆ ژوورەوە.');
      return;
    }

    setIsSubmitting(true);
    soundService.playTick?.();

    try {
      const payload = {
        title_ku: title.trim(),
        title: title.trim(),
        category: category,
        sector,
        job_type: jobType,
        workplace_type: workplaceType,
        governorate_id: selectedGov,
        district_id: selectedDistrict,
        sub_district_id: selectedSubDistrict,
        location_detail: [currentDistObj?.name_ku, availableSubDistricts.find(s => s.id === selectedSubDistrict)?.name_ku].filter(Boolean).join('، '),
        location_name: pin?.locationName || '',
        lat: pin?.lat ?? null,
        lng: pin?.lng ?? null,
        salary_min: Math.min(parseInt(salaryMin) || 500000, parseInt(salaryMax) || 1200000),
        salary_max: Math.max(parseInt(salaryMin) || 500000, parseInt(salaryMax) || 1200000),
        salary_period: 'monthly',
        description: composeDescription(),
        required_skills: JSON.stringify(skills),
        company_name: companyName.trim(),
        deadline: deadline || null,
        positions,
        company_reg: companyReg.trim(),
        company_industry: companyIndustry.trim(),
        // fee_amount intentionally omitted — the backend falls back to the
        // real admin-configured cv_fee_amount setting when it's absent;
        // hardcoding a value here would silently override that setting for
        // every job posted through this form regardless of what admin set.
        status: 'active',
      };

      const res = await apiService.createJob(payload, token);
      if (res && res.success) {
        soundService.playSuccess?.();
        addToast?.({ title: 'نێردرا', message: 'کارەکەت لە چاوەڕوانی پێداچوونەوەی بەڕێوەبەرە — دوای پەسەندکردن بڵاودەکرێتەوە.', type: 'success' });
        onSuccess?.();
      } else {
        setErrorMsg(res?.message || 'کێشەیەک ڕوویدا.');
      }
    } catch {
      setErrorMsg('پەیوەندی ئینتەرنێت بپشکنە.');
    }
    setIsSubmitting(false);
  };

  const initialMonogram = companyName.trim().charAt(0) || 'ت';

  return (
    <div
      dir="rtl"
      className="min-h-screen pb-32 select-none"
      style={{ background: '#f5f4f7', fontFamily: NK }}
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 pt-4 sm:pt-6 space-y-6">

        {/* ── Top Bar ───────────────────────── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-[#7b8e88]">
            <span className="w-2 h-2 rounded-full bg-[#641bd9]" />
            <span>ڕەشنووس پاشەکەوتکرا</span>
          </div>

          <button
            onClick={onBack}
            className="w-10 h-10 rounded-2xl bg-white border border-[#eae8ee] flex items-center justify-center text-[#16111d] shadow-2xs hover:bg-[#f9f8fa] active:scale-95 transition"
            aria-label="گەڕانەوە"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        {/* ── Page Header ─────────────────────────────────────── */}
        <div className="text-right space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black text-[#16111d] tracking-tight">
            بڵاوکردنەوەی کار
          </h1>
          <p className="text-xs text-[#7b8e88] font-bold">
            هەر خانەیەک بە ناونیشانی ڕوون خۆی ڕوونکردووەتەوە — تەنها ناونیشان و بوار پێویستن، ئەوانی تر ئارەزوومەندانەن.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* ──── LEFT COLUMN: Preview + real progress ──── */}
          <div className="lg:col-span-4 space-y-5 order-2 lg:order-1 lg:sticky lg:top-6">

            <div className="space-y-2">
              <span className="text-xs font-black text-[#16111d] block text-right">
                ئەمە وایە کارەکەت دەردەکەوێت
              </span>

              <div className="bg-white rounded-[24px] border border-[#eae8ee] p-5 shadow-sm space-y-3.5 text-right">
                <div className="flex items-start justify-between gap-3">
                  <span className="px-2 py-0.5 rounded-full bg-[#dcfce7] text-[#166534] text-[9px] font-black shrink-0">
                    نوێ
                  </span>
                  <div className="text-right flex-1 min-w-0">
                    <h4 className="text-xs sm:text-sm font-black text-[#16111d] truncate">
                      {title || 'پەرەپێدەری وێب'}
                    </h4>
                    <p className="text-[11px] text-[#7b8e88] font-bold mt-0.5 truncate">
                      {companyName} · {[currentGovObj?.name_ku, currentDistObj?.name_ku].filter(Boolean).join('، ')}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-[#eeeaf5] border border-[#dcd1ee] flex items-center justify-center text-[#641bd9] font-black text-sm shrink-0">
                    {initialMonogram}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 justify-end flex-wrap">
                  <span className="px-2.5 py-1 rounded-xl bg-[#f5f4f7] text-[#4a5854] text-[10px] font-bold">
                    {WORKPLACE_TYPES.find(w => w.id === workplaceType)?.label}
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-[#f5f4f7] text-[#4a5854] text-[10px] font-bold">
                    {liveWorkTypes.find(t => t.id === jobType)?.name_ku || '—'}
                  </span>
                </div>

                <div className="pt-3 border-t border-[#f5f4f7] flex items-center justify-between text-xs">
                  <span className="font-mono font-black text-[#16111d]">
                    {Number(salaryMin).toLocaleString()} — {Number(salaryMax).toLocaleString()} IQD
                  </span>
                </div>
              </div>
            </div>

            {/* Real progress, tied to actual filled-in state */}
            <div className="bg-white rounded-3xl p-5 border border-[#eae8ee] shadow-sm space-y-3 text-right">
              <span className="text-xs font-black text-[#16111d] block">پێشکەوتنی داواکارییەکە</span>
              <div className="space-y-2 text-xs font-bold text-[#4a5854]">
                <div className={`flex items-center justify-end gap-2 ${basicsDone ? 'text-[#641bd9]' : 'text-[#8a9e98]'}`}>
                  <span>ناونیشان و بوار</span>
                  {basicsDone
                    ? <CheckCircle2 className="w-4 h-4 fill-[#641bd9] text-white" />
                    : <span className="w-4 h-4 rounded-full border border-[#cfcbd5]" />}
                </div>
                <div className={`flex items-center justify-end gap-2 ${locationDone ? 'text-[#641bd9]' : 'text-[#8a9e98]'}`}>
                  <span>شوێن و مووچە</span>
                  {locationDone
                    ? <CheckCircle2 className="w-4 h-4 fill-[#641bd9] text-white" />
                    : <span className="w-4 h-4 rounded-full border border-[#cfcbd5]" />}
                </div>
                <div className={`flex items-center justify-end gap-2 ${deadlineDone ? 'text-[#641bd9]' : 'text-[#8a9e98]'}`}>
                  <span>کۆتا وادەی داواکاری (ئارەزوومەندانە)</span>
                  {deadlineDone
                    ? <CheckCircle2 className="w-4 h-4 fill-[#641bd9] text-white" />
                    : <span className="w-4 h-4 rounded-full border border-[#cfcbd5]" />}
                </div>
              </div>
            </div>

          </div>

          {/* ──── RIGHT COLUMN: the actual form, split into clear steps ──── */}
          <div className="lg:col-span-8 space-y-5 order-1 lg:order-2">

            <SectionCard title="١. زانیاری سەرەکی کارەکە" hint="ناوی کار و بوارەکەی بنووسە">
              <Field label="ناونیشانی کار">
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="نموونە: پەرەپێدەری وێب"
                  className={inputClass + ' border-2 !border-[#641bd9]'}
                />
              </Field>

              <Field label="بوار">
                <div className="relative">
                  <select value={category} onChange={e => setCategory(e.target.value)} className={selectClass}>
                    <option value="" disabled>بوارێک هەڵبژێرە</option>
                    {liveCategories.map(c => (
                      <option key={c.id} value={c.id}>{c.name_ku}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#8a9e98] pointer-events-none" />
                </div>
              </Field>

              <Field label="جۆری کەرت">
                <div className="flex flex-wrap gap-2">
                  {JOB_SECTORS.map(sec => (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => setSector(sec.id)}
                      aria-pressed={sector === sec.id}
                      className={`px-4 py-2.5 rounded-xl text-xs font-black border transition-all ${
                        sector === sec.id
                          ? 'bg-[#641bd9] border-[#641bd9] text-white shadow-xs'
                          : 'bg-white border-[#e6e4ea] text-[#62736e] hover:border-[#641bd9]/40 hover:text-[#16111d]'
                      }`}
                    >
                      {sec.label}
                    </button>
                  ))}
                </div>
                {!sector && <p className="mt-1.5 text-[10px] font-bold text-[#8a9e98]">پێویستە — ئەم هەلە کارە لە چ کەرتێکە؟</p>}
              </Field>

              <Field label="جۆری کات">
                <div className="p-1.5 bg-[#f2f0f4] rounded-2xl border border-[#eae8ee] grid gap-1" style={{ gridTemplateColumns: `repeat(${Math.max(liveWorkTypes.length, 1)}, minmax(0,1fr))` }}>
                  {liveWorkTypes.length === 0 && (
                    <span className="py-2.5 text-center text-[11px] text-[#8a9e98] font-bold">بارکردن...</span>
                  )}
                  {liveWorkTypes.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setJobType(t.id)}
                      className={`py-2.5 rounded-xl text-xs font-black transition-all ${
                        jobType === t.id ? 'bg-white text-[#16111d] shadow-xs' : 'text-[#62736e] hover:text-[#16111d]'
                      }`}
                    >
                      {t.name_ku}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="شێوازی کارکردن">
                <div className="p-1.5 bg-[#f2f0f4] rounded-2xl border border-[#eae8ee] grid grid-cols-3 gap-1">
                  {WORKPLACE_TYPES.map(w => (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => setWorkplaceType(w.id)}
                      className={`py-2.5 rounded-xl text-xs font-black transition-all ${
                        workplaceType === w.id ? 'bg-white text-[#16111d] shadow-xs' : 'text-[#62736e] hover:text-[#16111d]'
                      }`}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
              </Field>
            </SectionCard>

            <SectionCard title="٢. شوێنی کار" hint="شار و ناوچەکە هەڵبژێرە، پاشان شوێنی وردی کارەکە لەسەر نەخشەکە دیاری بکە">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="شار">
                  <div className="relative">
                    <select
                      value={selectedGov}
                      onChange={e => { setSelectedGov(e.target.value); setSelectedDistrict(''); setSelectedSubDistrict(''); }}
                      className={selectClass}
                    >
                      {kurdistanGovernorates.map(g => (
                        <option key={g.id} value={g.id}>{g.name_ku}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#8a9e98] pointer-events-none" />
                  </div>
                </Field>

                <Field label="قەزا">
                  <div className="relative">
                    <select
                      value={selectedDistrict}
                      onChange={e => { setSelectedDistrict(e.target.value); setSelectedSubDistrict(''); }}
                      className={selectClass}
                    >
                      <option value="">هەموو قەزاکان</option>
                      {availableDistricts.map(d => (
                        <option key={d.id} value={d.id}>{d.name_ku}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#8a9e98] pointer-events-none" />
                  </div>
                </Field>

                <Field label="ناحیە">
                  <div className="relative">
                    <select
                      value={selectedSubDistrict}
                      onChange={e => setSelectedSubDistrict(e.target.value)}
                      disabled={availableSubDistricts.length === 0}
                      className={selectClass + ' disabled:opacity-50'}
                    >
                      <option value="">{availableSubDistricts.length === 0 ? 'ناحیە نییە' : 'هەموو ناحیەکان'}</option>
                      {availableSubDistricts.map(s => (
                        <option key={s.id} value={s.id}>{s.name_ku}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#8a9e98] pointer-events-none" />
                  </div>
                </Field>
              </div>

              <Field label="شوێنی وردی کارەکە لەسەر نەخشە (ئارەزوومەندانە)" help="ناونیشان بگەڕێ، لەسەر نەخشەکە کرتە بکە، یان GPS بەکاربهێنە">
                <JobLocationPicker
                  lat={pin?.lat}
                  lng={pin?.lng}
                  locationName={pin?.locationName}
                  governorateId={selectedGov}
                  onChange={setPin}
                />
              </Field>
            </SectionCard>

            <SectionCard title="٣. مووچە" hint="مووچەی مانگانە بە دیناری عێراقی">
              <div className="grid grid-cols-2 gap-3">
                <Field label="بەلایەنی کەمەوە">
                  <input
                    type="number"
                    value={salaryMin}
                    onChange={e => setSalaryMin(e.target.value)}
                    placeholder="1,200,000"
                    className={inputClass + ' text-center'}
                  />
                </Field>
                <Field label="بەلایەنی زۆرەوە">
                  <input
                    type="number"
                    value={salaryMax}
                    onChange={e => setSalaryMax(e.target.value)}
                    placeholder="1,800,000"
                    className={inputClass + ' text-center'}
                  />
                </Field>
              </div>
            </SectionCard>

            <SectionCard title="٤. وردەکاری کار" hint="هەموو ئەم بەشانە لەسەر پەڕەی کارەکە وەک لیستی کراوە پیشان دەدرێن">
              <div className="flex items-center justify-between text-[11px] font-bold text-[#7b8e88]">
                <span>هەر بەشێک وەک لیستێکی جیا لەسەر پەڕەی کارەکە پیشان دەدرێت</span>
                <span className="font-mono">{descriptionLength}/3000</span>
              </div>
              {JOB_SECTIONS.map(({ key, label, hint, placeholder, required }, idx) => (
                <Field key={key} label={`${idx + 1}. ${label}${required ? ' *' : ''}`}>
                  <div className="mb-1 flex items-center justify-between text-[10px] font-bold text-[#a0afa9]">
                    <span>{hint}</span>
                    <span className="font-mono">{sec[key].length}/{SECTION_MAX}</span>
                  </div>
                  <textarea
                    rows={key === 'about' || key === 'summary' ? 3 : 4}
                    maxLength={SECTION_MAX}
                    value={sec[key]}
                    onChange={e => setSec(prev => ({ ...prev, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className={inputClass + ' leading-relaxed resize-none'}
                  />
                </Field>
              ))}

              <Field label="ژمارەی کارخوازی پێویست">
                <div className="flex items-center justify-between rounded-2xl border border-[#dad7e0] bg-white p-2">
                  <button type="button" onClick={() => setPositions(n => Math.min(100, n + 1))} aria-label="زیادکردن" className="grid h-11 w-11 place-items-center rounded-xl bg-[#641bd9] text-xl font-black text-white active:scale-95">+</button>
                  <div className="text-center">
                    <div className="text-2xl font-black text-[#16111d]">{positions}</div>
                    <div className="text-[10px] font-bold text-[#8a9e98]">کارخواز</div>
                  </div>
                  <button type="button" onClick={() => setPositions(n => Math.max(1, n - 1))} aria-label="کەمکردنەوە" className="grid h-11 w-11 place-items-center rounded-xl bg-[#ece7f4] text-xl font-black text-[#4b13a5] active:scale-95">−</button>
                </div>
                <p className="mt-1.5 text-[11px] font-medium text-[#8a9e98]">کاتێک ئەم ژمارەیە کارخواز وەردەگیرێت، کارەکە خۆکارانە دەوەستێت.</p>
              </Field>

              <Field label="کۆتا وادەی وەرگرتنی داواکاری">
                <input
                  type="date"
                  value={deadline}
                  onChange={e => setDeadline(e.target.value)}
                  min={new Date().toISOString().slice(0, 10)}
                  className={inputClass}
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="ژمارەی تۆمارکردنی کۆمپانیا">
                  <input
                    value={companyReg}
                    onChange={e => setCompanyReg(e.target.value)}
                    placeholder="نموونە: ١٢٣٤٥"
                    className={inputClass}
                  />
                </Field>
                <Field label="بواری کۆمپانیا">
                  <input
                    value={companyIndustry}
                    onChange={e => setCompanyIndustry(e.target.value)}
                    placeholder="نموونە: تەکنەلۆجیا، بازرگانی..."
                    className={inputClass}
                  />
                </Field>
              </div>

              <Field label="شارەزاییە پێویستەکان">
                <div className="flex flex-wrap gap-2 justify-end">
                  <div className="flex items-center gap-1.5">
                    <input
                      value={skillInput}
                      onChange={e => setSkillInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
                      placeholder="شارەزایی نوێ..."
                      className="bg-[#f5f4f7] border border-[#eae8ee] rounded-xl px-3 py-1.5 text-xs font-bold outline-none text-[#16111d]"
                    />
                    <button
                      type="button"
                      onClick={addSkill}
                      className="px-3 py-1.5 rounded-xl bg-[#641bd9] text-white text-xs font-bold hover:bg-[#4b13a5] transition"
                    >
                      + زیادکردن
                    </button>
                  </div>
                  {skills.map(s => (
                    <span
                      key={s}
                      className="px-3 py-1.5 rounded-xl bg-[#eeeaf5] border border-[#cfbded] text-[#641bd9] text-xs font-bold flex items-center gap-1.5"
                    >
                      {s}
                      <button type="button" onClick={() => removeSkill(s)} className="text-[#8a9e98] hover:text-red-500">
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </Field>
            </SectionCard>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-2xl text-right">
                {errorMsg}
              </div>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full py-4 rounded-2xl bg-[#641bd9] hover:bg-[#4b13a5] text-white text-sm font-black shadow-md active:scale-95 transition flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>بڵاوکردنەوەی هەلی کار</span>
            </button>

          </div>

        </div>

      </div>
    </div>
  );
};
