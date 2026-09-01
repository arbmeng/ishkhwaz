import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { apiService } from '../../services/api';
import { soundService } from '../../services/soundService';
import {
  Building2, MapPin, DollarSign, Briefcase, Plus, CheckCircle2,
  AlertCircle, X, Search, ChevronLeft, ChevronDown, Check, Rocket,
  Sparkles, Eye, ArrowRight, Heart
} from 'lucide-react';

const NK = "'Noto Kufi Arabic', 'Vazirmatn', system-ui, sans-serif";
const TEAL = '#12796b';

const GOVS = [
  { id: 'sulaymaniyah', name: 'سلێمانی', districts: ['بەکرەجۆ', 'تووی مەلیك', 'ڕاپەڕین', 'چوارچرا', 'سەرچنار', 'قڕگە'] },
  { id: 'erbil',        name: 'هەولێر',  districts: ['عەنکاوە', 'بەختیاری', 'ڕاستی', 'ئیسکان', 'شۆڕش'] },
  { id: 'duhok',        name: 'دهۆک',    districts: ['شاخکێ', 'ماسیکێ', 'ماڵتا', 'نزارکێ'] },
  { id: 'kirkuk',       name: 'کەرکووک', districts: ['ڕەحیماوا', 'شۆڕیجە', 'ئیسکان', 'ئازادی'] },
  { id: 'halabja',      name: 'هەڵەبجە', districts: ['سیروان', 'خورماڵ', 'بەیان'] },
];

export const PostJobPage = ({ onBack, onSuccess }) => {
  const { user, token } = useAuth();
  const { addToast, categories: liveCategories = [] } = useStore();

  const [companyName] = useState(user?.company_name || user?.name || 'تیشک تێک');
  const [title, setTitle] = useState('پەرەپێدەری وێب — React');
  const [category, setCategory] = useState('تەکنەلۆژیا');
  const [jobType, setJobType] = useState('fullTime'); // fullTime | partTime | contract
  const [workplaceType, setWorkplaceType] = useState('onSite'); // onSite | remote | hybrid
  const [salaryMin, setSalaryMin] = useState(1200000);
  const [salaryMax, setSalaryMax] = useState(1800000);
  const [selectedGov, setSelectedGov] = useState('sulaymaniyah');
  const [selectedDistrict, setSelectedDistrict] = useState('بەکرەجۆ');
  const [description, setDescription] = useState(
    'بەدوای پەرەپێدەرێکی وێبدا دەگەڕێین کە ئەزموونی دوو ساڵی لە ئەزموونی React و Node.js هەبێت. کار لە ئۆفیسی سلێمانی، لەگەڵ تیمێکی چوار کەسی.'
  );
  const [skills, setSkills] = useState(['React', 'Node.js', 'TypeScript']);
  const [skillInput, setSkillInput] = useState('');
  const [isBoosted, setIsBoosted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const currentGovObj = GOVS.find(g => g.id === selectedGov) || GOVS[0];

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

  const handleSubmit = async () => {
    if (!title.trim()) {
      setErrorMsg('ناونیشانی کار پێویستە.');
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
        job_type: jobType,
        workplace_type: workplaceType,
        governorate_id: selectedGov,
        location_detail: selectedDistrict,
        salary_min: parseInt(salaryMin) || 500000,
        salary_max: parseInt(salaryMax) || 1200000,
        salary_period: 'monthly',
        description: description.trim(),
        required_skills: JSON.stringify(skills),
        company_name: companyName.trim(),
        fee_amount: 2500,
        status: 'active',
      };

      const res = await apiService.createJob(payload, token);
      if (res && res.success) {
        soundService.playSuccess?.();
        addToast?.({ title: 'پیرۆزە! 🎉', message: 'ئیشەکەت بە سەرکەوتوویی بڵاوکرایەوە', type: 'success' });
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
      style={{ background: '#f4f7f6', fontFamily: NK }}
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 pt-4 sm:pt-6 space-y-6">

        {/* ── Top Bar with Draft Status ───────────────────────── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-[#7b8e88]">
            <span className="w-2 h-2 rounded-full bg-[#12796b]" />
            <span>ڕەشنووس پاشەکەوتکرا</span>
          </div>

          <button
            onClick={onBack}
            className="w-10 h-10 rounded-2xl bg-white border border-[#e8eeed] flex items-center justify-center text-[#111d1a] shadow-2xs hover:bg-[#f8faf9] active:scale-95 transition"
            aria-label="گەڕانەوە"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        {/* ── Page Header ─────────────────────────────────────── */}
        <div className="text-right space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black text-[#111d1a] tracking-tight">
            بڵاوکردنەوەی کار
          </h1>
          <p className="text-xs text-[#7b8e88] font-bold">
            هەموو خانەکان پێویستن، جگە لە شارەزاییەکان.
          </p>
        </div>

        {/* ── Main 2-Column Grid (Matching Image 1: POST A JOB - DESKTOP 1400) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* ──── LEFT COLUMN (Cols 1-4 on Desktop): Live Preview, Boost Card & Checklist ──── */}
          <div className="lg:col-span-4 space-y-5 order-2 lg:order-1">

            {/* Live Job Card Preview */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono font-black text-[#a0afa9] tracking-widest uppercase block text-right">
                PREVIEW
              </span>

              <div className="bg-white rounded-[24px] border border-[#e8eeec] p-5 shadow-sm space-y-3.5 text-right">
                <div className="flex items-start justify-between gap-3">
                  <span className="px-2 py-0.5 rounded-full bg-[#dcfce7] text-[#166534] text-[9px] font-black shrink-0">
                    نوێ
                  </span>
                  <div className="text-right flex-1 min-w-0">
                    <h4 className="text-xs sm:text-sm font-black text-[#111d1a] truncate">
                      {title || 'پەرەپێدەری وێب'}
                    </h4>
                    <p className="text-[11px] text-[#7b8e88] font-bold mt-0.5 truncate">
                      {companyName} · {currentGovObj.name}، {selectedDistrict}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-[#eaf5f2] border border-[#d2ede5] flex items-center justify-center text-[#12796b] font-black text-sm shrink-0">
                    {initialMonogram}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 justify-end">
                  <span className="px-2.5 py-1 rounded-xl bg-[#f4f7f6] text-[#4a5854] text-[10px] font-bold">
                    {workplaceType === 'onSite' ? 'لە شوێن' : workplaceType === 'remote' ? 'لە ماڵەوە' : 'تێکەڵ'}
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-[#f4f7f6] text-[#4a5854] text-[10px] font-bold">
                    {jobType === 'fullTime' ? 'کاتی تەواو' : jobType === 'partTime' ? 'کاتی بەشی' : 'پڕۆژەیی'}
                  </span>
                </div>

                <div className="pt-3 border-t border-[#f4f7f6] flex items-center justify-between text-xs">
                  <span className="font-mono font-black text-[#111d1a]">
                    {Number(salaryMin).toLocaleString()} — {Number(salaryMax).toLocaleString()} IQD
                  </span>
                </div>
              </div>
            </div>

            {/* Boost Card (Mint Gradient Card) */}
            <div className="bg-gradient-to-br from-[#d4f7ee] to-[#e4fcf6] border border-[#beece2] rounded-3xl p-5 shadow-sm space-y-3 text-right">
              <div className="flex items-center gap-1.5 justify-start text-xs font-black text-[#12796b]">
                <span>بەرزکردنەوەی کار</span>
                <Rocket className="w-4 h-4 text-[#12796b]" />
              </div>
              <p className="text-[11px] text-[#3a7c73] font-medium leading-relaxed">
                کارە بەرزکراوەکان لە سەرەوەی لیستەکان دەردەکەون و ٤ ئەوەندە زیاتر داواکاری وەردەگرن.
              </p>
              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsBoosted(b => !b)}
                  className={`px-5 py-2.5 rounded-2xl text-xs font-black transition active:scale-95 ${
                    isBoosted ? 'bg-[#12796b] text-white' : 'bg-[#111d1a] hover:bg-black text-white'
                  }`}
                >
                  {isBoosted ? 'زیادکرا ✓' : 'زیادکردن'}
                </button>
                <span className="font-mono font-black text-sm text-[#113d36]">
                  25,000 IQD
                </span>
              </div>
            </div>

            {/* Checklist Box */}
            <div className="bg-white rounded-3xl p-5 border border-[#e8eeec] shadow-sm space-y-3 text-right">
              <span className="text-[10px] font-mono font-black text-[#a0afa9] tracking-widest uppercase block">
                CHECKLIST
              </span>
              <div className="space-y-2 text-xs font-bold text-[#4a5854]">
                <div className="flex items-center justify-end gap-2 text-[#12796b]">
                  <span>ناونیشان و بوار</span>
                  <CheckCircle2 className="w-4 h-4 fill-[#12796b] text-white" />
                </div>
                <div className="flex items-center justify-end gap-2 text-[#12796b]">
                  <span>شوێن و مووچە</span>
                  <CheckCircle2 className="w-4 h-4 fill-[#12796b] text-white" />
                </div>
                <div className="flex items-center justify-end gap-2 text-[#8a9e98]">
                  <span>کۆتا وادەی داواکاری</span>
                  <span className="w-4 h-4 rounded-full border border-[#cbd5d1]" />
                </div>
              </div>
            </div>

          </div>

          {/* ──── RIGHT COLUMN (Cols 5-12 on Desktop): Form Fields ──── */}
          <div className="lg:col-span-8 bg-white rounded-[32px] p-6 sm:p-8 border border-[#e8eeec] shadow-sm space-y-6 order-1 lg:order-2">

            {/* Job Title */}
            <div className="space-y-1.5 text-right">
              <label className="text-xs font-bold text-[#111d1a]">ناونیشانی کار</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="پەرەپێدەری وێب — React"
                className="w-full bg-white border-2 border-[#12796b] rounded-2xl px-4 py-3.5 text-xs sm:text-sm font-bold text-[#111d1a] outline-none shadow-xs"
              />
            </div>

            {/* Category */}
            <div className="space-y-1.5 text-right">
              <label className="text-xs font-bold text-[#111d1a]">بوار</label>
              <div className="relative">
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full bg-[#f4f7f6] border border-[#e8eeed] rounded-2xl px-4 py-3.5 text-xs font-bold text-[#111d1a] outline-none appearance-none cursor-pointer"
                >
                  <option value="تەکنەلۆژیا">تەکنەلۆژیا</option>
                  <option value="بیناسازی">بیناسازی</option>
                  <option value="پزیشکی">پزیشکی</option>
                  <option value="فرۆشتن">فرۆشتن</option>
                  <option value="ژمێریاری">ژمێریاری</option>
                  <option value="گواستنەوە">گواستنەوە</option>
                </select>
                <ChevronDown className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#8a9e98] pointer-events-none" />
              </div>
            </div>

            {/* Job Type Segmented Tabs */}
            <div className="space-y-1.5 text-right">
              <label className="text-xs font-bold text-[#111d1a]">جۆری کار</label>
              <div className="p-1.5 bg-[#f0f4f2] rounded-2xl border border-[#e8eeed] grid grid-cols-3 gap-1">
                {[
                  { id: 'contract', label: 'پڕۆژەیی' },
                  { id: 'partTime', label: 'کاتی بەشی' },
                  { id: 'fullTime', label: 'کاتی تەواو' },
                ].map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setJobType(t.id)}
                    className={`py-2.5 rounded-xl text-xs font-black transition-all ${
                      jobType === t.id
                        ? 'bg-white text-[#111d1a] shadow-xs'
                        : 'text-[#62736e] hover:text-[#111d1a]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Workplace Type Segmented Tabs */}
            <div className="space-y-1.5 text-right">
              <label className="text-xs font-bold text-[#111d1a]">سنووری کار</label>
              <div className="p-1.5 bg-[#f0f4f2] rounded-2xl border border-[#e8eeed] grid grid-cols-3 gap-1">
                {[
                  { id: 'hybrid', label: 'تێکەڵ' },
                  { id: 'remote', label: 'لە ماڵەوە' },
                  { id: 'onSite', label: 'لە شوێن' },
                ].map(w => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => setWorkplaceType(w.id)}
                    className={`py-2.5 rounded-xl text-xs font-black transition-all ${
                      workplaceType === w.id
                        ? 'bg-white text-[#111d1a] shadow-xs'
                        : 'text-[#62736e] hover:text-[#111d1a]'
                    }`}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Salary Range (Min - Max) */}
            <div className="space-y-1.5 text-right">
              <label className="text-xs font-bold text-[#111d1a]">مووچەی مانگانە (IQD)</label>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  value={salaryMax}
                  onChange={e => setSalaryMax(e.target.value)}
                  placeholder="1,800,000"
                  className="w-full bg-[#f4f7f6] border border-[#e8eeed] rounded-2xl px-4 py-3 text-xs font-mono font-bold text-[#111d1a] text-center outline-none focus:border-[#12796b]"
                />
                <input
                  type="number"
                  value={salaryMin}
                  onChange={e => setSalaryMin(e.target.value)}
                  placeholder="1,200,000"
                  className="w-full bg-[#f4f7f6] border border-[#e8eeed] rounded-2xl px-4 py-3 text-xs font-mono font-bold text-[#111d1a] text-center outline-none focus:border-[#12796b]"
                />
              </div>
            </div>

            {/* Governorate & District */}
            <div className="grid grid-cols-2 gap-4">
              {/* District */}
              <div className="space-y-1.5 text-right">
                <label className="text-xs font-bold text-[#111d1a]">ناحیە</label>
                <div className="relative">
                  <select
                    value={selectedDistrict}
                    onChange={e => setSelectedDistrict(e.target.value)}
                    className="w-full bg-[#f4f7f6] border border-[#e8eeed] rounded-2xl px-4 py-3 text-xs font-bold text-[#111d1a] outline-none appearance-none cursor-pointer"
                  >
                    {currentGovObj.districts.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#8a9e98] pointer-events-none" />
                </div>
              </div>

              {/* Governorate */}
              <div className="space-y-1.5 text-right">
                <label className="text-xs font-bold text-[#111d1a]">پارێزگا</label>
                <div className="relative">
                  <select
                    value={selectedGov}
                    onChange={e => {
                      const g = e.target.value;
                      setSelectedGov(g);
                      const obj = GOVS.find(x => x.id === g);
                      setSelectedDistrict(obj?.districts?.[0] || '');
                    }}
                    className="w-full bg-[#f4f7f6] border border-[#e8eeed] rounded-2xl px-4 py-3 text-xs font-bold text-[#111d1a] outline-none appearance-none cursor-pointer"
                  >
                    {GOVS.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#8a9e98] pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5 text-right">
              <div className="flex items-center justify-between text-xs font-bold text-[#7b8e88]">
                <span className="font-mono">{description.length}/2000</span>
                <label className="text-[#111d1a]">وەسفی کار</label>
              </div>
              <textarea
                rows={4}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="مەرجەکان، بەرپرسیارێتییەکان و ئەرکەکانی کار..."
                className="w-full bg-[#f4f7f6] border border-[#e8eeed] rounded-2xl p-4 text-xs font-medium leading-relaxed text-[#111d1a] outline-none focus:border-[#12796b] resize-none"
              />
            </div>

            {/* Skills */}
            <div className="space-y-2 text-right">
              <label className="text-xs font-bold text-[#111d1a]">شارەزاییەکان</label>
              <div className="flex flex-wrap gap-2 justify-end">
                <div className="flex items-center gap-1.5">
                  <input
                    value={skillInput}
                    onChange={e => setSkillInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
                    placeholder="شارەزایی نوێ..."
                    className="bg-[#f4f7f6] border border-[#e8eeed] rounded-xl px-3 py-1.5 text-xs font-bold outline-none text-[#111d1a]"
                  />
                  <button
                    type="button"
                    onClick={addSkill}
                    className="px-3 py-1.5 rounded-xl bg-[#12796b] text-white text-xs font-bold hover:bg-[#0d5c50] transition"
                  >
                    + زیادکردن
                  </button>
                </div>
                {skills.map(s => (
                  <span
                    key={s}
                    className="px-3 py-1.5 rounded-xl bg-[#eaf5f2] border border-[#beece2] text-[#12796b] text-xs font-bold flex items-center gap-1.5"
                  >
                    {s}
                    <button type="button" onClick={() => removeSkill(s)} className="text-[#8a9e98] hover:text-red-500">
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-2xl text-right">
                {errorMsg}
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full py-4 rounded-2xl bg-[#12796b] hover:bg-[#0d5c50] text-white text-sm font-black shadow-md active:scale-95 transition flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>بڵاوکردنەوەی هەلی کار</span>
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
