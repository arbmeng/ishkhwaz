import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { soundService } from '../../services/soundService';
import { compressImageFile } from '../../utils/image';
import { signInWithProvider } from '../../services/supabaseClient';

// No brand-logo icon in lucide-react — real Google "G" mark, standard 4-color SVG.
const GoogleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"/>
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
    <path fill="#4CAF50" d="M24 44c5.5 0 10.5-2.1 14.3-5.6l-6.6-5.6C29.6 34.7 27 35.5 24 35.5c-5.2 0-9.6-3.5-11.2-8.2l-6.5 5C9.6 39.6 16.3 44 24 44z"/>
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.6 5.6C40.7 36.6 44 30.9 44 24c0-1.3-.1-2.7-.4-3.5z"/>
  </svg>
);
import {
  ArrowLeft,
  User,
  Building2,
  Check,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Briefcase,
  Sparkles,
  Rocket,
  Wallet,
  Bell,
  Camera,
  Users,
  GraduationCap,
  Clock,
  Plus,
  X,
  Languages,
  DollarSign
} from 'lucide-react';

// Brand teal — matches the logo mark and the rest of the light auth screens.
const TEAL = '#12796b';
const TEAL_DEEP = '#0d5c50';
const TEAL_SOFT = '#e7f4f1';

export const RegisterProfileChoicePage = ({ onBack, onSelectOption, onRegistrationComplete, isCompletingProfile = false }) => {
  const { register, login, user, updateUserProfile } = useAuth();
  const { addToast, categories: liveCategories = [] } = useStore();
  const fileInputRef = useRef(null);

  // Steps: 1 | 2 | 3 | 4 | 5 (Completion)
  const [step, setStep] = useState(1);

  // Step 1: Choice ('job_seeker' | 'recruiter')
  const [selectedOption, setSelectedOption] = useState('job_seeker');

  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const handleGoogleSignup = async () => {
    soundService.playTick();
    setIsGoogleSubmitting(true);
    try {
      // Redirects to Google's consent screen — AuthContext's onAuthStateChange
      // listener picks the session back up here, hands the token to
      // /auth/social, and (for a genuinely new person) routes straight into
      // this same page's isCompletingProfile branch to finish role/location.
      const { error } = await signInWithProvider('google');
      if (error) throw error;
    } catch (err) {
      setIsGoogleSubmitting(false);
      addToast({ title: 'سەرنەکەوت', message: 'تۆمارکردن بە گووگڵ سەرکەوتوو نەبوو.', type: 'error' });
    }
  };

  // Recruiters get one extra step (company details, its own page instead of
  // being crammed into step 2) — so the total step count and the numbering
  // of everything after step 2 depends on the chosen role:
  //   job_seeker: 1 choice, 2 personal, 3 desired jobs/bio, 4 gender/photo, 5 complete
  //   recruiter:  1 choice, 2 personal, 3 company details, 4 hiring prefs, 5 gender/photo/logo, 6 complete
  const isRecruiter = selectedOption === 'recruiter';
  const TOTAL_STEPS = isRecruiter ? 5 : 4;
  const COMPLETE_STEP = TOTAL_STEPS + 1;

  // Step 2: Personal Info — already known for a social sign-up (name/email
  // came from Google/Facebook/Apple, no password to collect), so this step
  // is skipped entirely for a completing freelancer and reduced to just the
  // company fields for a completing employer.
  const [fullName, setFullName] = useState(() => isCompletingProfile ? (user?.name || '') : '');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(() => isCompletingProfile ? (user?.email || '') : '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Step 2 (Recruiter only): Company Info
  const [companyName, setCompanyName] = useState('');
  const [companyReg, setCompanyReg] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyIndustry, setCompanyIndustry] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [companyType, setCompanyType] = useState('');

  // Step 3: Desired Jobs & Bio (job seeker) / Hiring preferences (recruiter)
  // Job seekers can pick several fields of interest — recruiters keep a
  // single "what role am I hiring for" (desiredCategory, further down).
  const [desiredCategories, setDesiredCategories] = useState([]);
  const [desiredCategory, setDesiredCategory] = useState('');
  const [preferredGov, setPreferredGov] = useState('سلێمانی');
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');

  // Step 3 (Recruiter only): what they generally look for in a hire —
  // informational, not tied to any single job post (see PostJobPage for
  // per-job requirements). All optional.
  const [reqEducation, setReqEducation] = useState('');
  const [reqMinExperience, setReqMinExperience] = useState('');
  const [reqSkills, setReqSkills] = useState([]);
  const [reqSkillInput, setReqSkillInput] = useState('');
  const [reqLanguages, setReqLanguages] = useState([]);
  const [reqLanguageInput, setReqLanguageInput] = useState('');
  const [reqJobType, setReqJobType] = useState('');
  const [reqSalaryMin, setReqSalaryMin] = useState('');
  const [reqSalaryMax, setReqSalaryMax] = useState('');

  // Step 4: Gender & Profile Photo / Logo
  const [gender, setGender] = useState('male');
  const [avatar, setAvatar] = useState(() => isCompletingProfile ? (user?.avatar || null) : null);
  // Recruiter-only: the business's own logo — kept separate from `avatar`
  // above, which is the account holder's own personal photo.
  const [companyLogo, setCompanyLogo] = useState(() => isCompletingProfile ? (user?.company_logo || null) : null);
  const companyLogoInputRef = useRef(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Modals
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const handleOptionClick = (optionId) => {
    soundService.playTick();
    setSelectedOption(optionId);
  };

  useEffect(() => {
    if (!desiredCategory && liveCategories.length > 0) setDesiredCategory(liveCategories[0].id);
  }, [liveCategories.length]);

  const toggleDesiredCategory = (id) => {
    soundService.playTick();
    setDesiredCategories(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };
  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !skills.includes(s)) setSkills(prev => [...prev, s]);
    setSkillInput('');
  };

  const addReqSkill = () => {
    const s = reqSkillInput.trim();
    if (s && !reqSkills.includes(s)) setReqSkills(prev => [...prev, s]);
    setReqSkillInput('');
  };
  const addReqLanguage = () => {
    const l = reqLanguageInput.trim();
    if (l && !reqLanguages.includes(l)) setReqLanguages(prev => [...prev, l]);
    setReqLanguageInput('');
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const compressed = await compressImageFile(file, 480, 0.82);
        setAvatar(compressed);
      } catch {
        addToast({ title: 'کێشە', message: 'وێنە بار نەکرا', type: 'error' });
      }
    }
  };

  const handleCompanyLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const compressed = await compressImageFile(file, 480, 0.82);
        setCompanyLogo(compressed);
      } catch {
        addToast({ title: 'کێشە', message: 'وێنە بار نەکرا', type: 'error' });
      }
    }
  };

  // Step Navigations
  const handleStep1Next = () => {
    soundService.playSuccess();
    // A completing freelancer has nothing left to give us in step 2 (name,
    // email, avatar all already came from the social provider, and there's
    // no password on a social account) — skip straight to step 3. A
    // completing employer still needs to give us their company info.
    if (isCompletingProfile && selectedOption === 'job_seeker') {
      setStep(3);
    } else {
      setStep(2);
    }
  };

  const handleStep2Next = (e) => {
    e.preventDefault();
    soundService.playTick();
    setErrorMsg(null);
    if (!isCompletingProfile) {
      if (!fullName.trim()) { setErrorMsg('تکایە ناوی تەواوت بنووسە.'); return; }
      if (!phone.trim()) { setErrorMsg('تکایە ژمارەی مۆبایل بنووسە.'); return; }
      if (!password) { setErrorMsg('تکایە وشەی نهێنی بنووسە.'); return; }
      if (password.length < 8) { setErrorMsg('وشەی نهێنی دەبێت لانیکم ٨ پیت بێت.'); return; }
      if (password !== confirmPassword) { setErrorMsg('وشەی نهێنی و دووبارەکردنەوەکەی یەکناگرنەوە!'); return; }
    }
    setStep(3);
  };

  // Recruiter-only step 3: company details, now its own page instead of
  // being crammed into step 2's personal-info form.
  const handleCompanyDetailsNext = (e) => {
    e.preventDefault();
    soundService.playTick();
    setErrorMsg(null);
    if (!companyName.trim()) { setErrorMsg('ناوی کۆمپانیا پێویستە.'); return; }
    if (!companyPhone.trim()) { setErrorMsg('ژمارەی تەلەفۆنی کۆمپانیا پێویستە.'); return; }
    setStep(4);
  };

  const handleStep3Next = (e) => {
    e.preventDefault();
    soundService.playTick();
    setStep(4);
  };

  // Recruiter-only step 4: hiring preferences — moves on to step 5
  // (gender/photo/logo) instead of finishing directly, since recruiters have
  // one more step than job seekers.
  const handleHiringPrefsNext = (e) => {
    e.preventDefault();
    soundService.playTick();
    setStep(5);
  };

  const handleStep4Next = (e) => {
    e.preventDefault();
    handleFinalSubmit();
  };

  const handleFinalSubmit = async () => {
    soundService.playTick();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const role = selectedOption === 'recruiter' ? 'employer' : 'freelancer';

      // "Who we're generally hiring" — employer-only, entirely optional,
      // not tied to any single job post (see PostJobPage for per-job specifics).
      const hiringPreferences = role === 'employer' ? {
        category: desiredCategory || undefined,
        education: reqEducation || undefined,
        minExperience: reqMinExperience !== '' ? Number(reqMinExperience) : undefined,
        skills: reqSkills,
        languages: reqLanguages,
        jobType: reqJobType || undefined,
        salaryMin: reqSalaryMin !== '' ? Number(reqSalaryMin) : undefined,
        salaryMax: reqSalaryMax !== '' ? Number(reqSalaryMax) : undefined,
      } : undefined;

      if (isCompletingProfile) {
        // Already has an account (created the moment they signed in with
        // Google/Facebook/Apple) — this just fills in what social sign-in
        // couldn't give us: role, location, category, and company info.
        const res = await updateUserProfile({
          role,
          gender,
          avatar,
          bio,
          governorate: preferredGov,
          favorite_categories: role === 'employer' ? (desiredCategory ? [desiredCategory] : []) : desiredCategories,
          skills: role === 'freelancer' ? skills : undefined,
          company_name: role === 'employer' ? companyName.trim() : '',
          company_reg: role === 'employer' ? companyReg.trim() : '',
          company_phone: role === 'employer' ? companyPhone.trim() : '',
          company_email: role === 'employer' ? companyEmail.trim() : '',
          industry: role === 'employer' ? companyIndustry.trim() : '',
          company_size: role === 'employer' ? (companySize || undefined) : undefined,
          company_type: role === 'employer' ? (companyType || undefined) : undefined,
          company_logo: role === 'employer' ? (companyLogo || undefined) : undefined,
          hiring_preferences: hiringPreferences,
        });
        if (!res.success) throw new Error(res.message);
      } else {
        await register({
          name: fullName,
          phone: phone,
          email: email,
          password: password,
          role: role,
          gender: gender,
          avatar: avatar,
          bio: bio,
          favGov: preferredGov,
          category: role === 'employer' ? desiredCategory : desiredCategories,
          skills: role === 'freelancer' ? skills : undefined,
          // Company fields (employer only)
          company_name: role === 'employer' ? companyName.trim() : undefined,
          company_reg: role === 'employer' ? companyReg.trim() : undefined,
          company_phone: role === 'employer' ? companyPhone.trim() : undefined,
          company_email: role === 'employer' ? companyEmail.trim() : undefined,
          company_industry: role === 'employer' ? companyIndustry.trim() : undefined,
          company_size: role === 'employer' ? (companySize || undefined) : undefined,
          company_type: role === 'employer' ? (companyType || undefined) : undefined,
          company_logo: role === 'employer' ? (companyLogo || undefined) : undefined,
          hiring_preferences: hiringPreferences,
        });
      }
      soundService.playSuccess();
      setStep(COMPLETE_STEP);
    } catch (err) {
      const message = err?.message || 'تۆمارکردن سەرکەوتوو نەبوو. تکایە دووبارە هەوڵبدەرەوە.';
      setErrorMsg(message);
      addToast({ title: 'تۆمارکردن سەرکەوتوو نەبوو', message, type: 'error' });
      setStep(isCompletingProfile && selectedOption === 'job_seeker' ? 1 : 2);
    } finally {
      setIsSubmitting(false);
    }
  };

  const governorates = ['سلێمانی', 'هەولێر', 'دهۆک', 'هەڵەبجە', 'کەرکووک'];

  const inputCls = "w-full rounded-2xl bg-slate-50 border border-slate-200 focus:border-[#12796b] focus:bg-white outline-none transition-all text-xs text-slate-900 placeholder:text-slate-400";
  const labelCls = "text-xs font-bold text-slate-700 block mb-1.5";
  const primaryBtnCls = "w-full py-4 rounded-2xl text-white font-black text-sm active:scale-[0.97] transition-all disabled:opacity-60";
  const primaryBtnStyle = { background: TEAL, boxShadow: `0 8px 20px ${TEAL}40` };
  const chipActiveCls = (active) => `border transition-all ${active ? 'text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'}`;
  const chipActiveStyle = (active) => active ? { background: TEAL, borderColor: TEAL } : undefined;

  const goBack = () => {
    soundService.playTick();
    if (step > 1) {
      // Step 2 was skipped on the way in for a completing
      // freelancer — skip it on the way back out too.
      const skippingStep2 = isCompletingProfile && step === 3 && selectedOption === 'job_seeker';
      setStep(skippingStep2 ? 1 : step - 1);
    } else if (onBack) onBack('login');
  };

  return (
    <div dir="rtl" className="min-h-screen font-vazirmatn flex flex-col justify-between p-4 sm:p-6 select-none relative" style={{ background: '#f7faf9', color: '#111' }}>

      {/* 1. TOP HEADER — icon-only back button, segmented step progress (Hidden on Completion) */}
      {step <= TOTAL_STEPS && (
        <header
          className="max-w-md mx-auto w-full flex items-center gap-3 pb-3"
          style={{ paddingTop: 'max(1.5rem, calc(env(safe-area-inset-top) + 1rem))' }}
        >
          <button
            onClick={goBack}
            className="w-9 h-9 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-700 shrink-0 active:scale-95 transition-all"
          >
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          </button>

          <div className="flex-1 flex items-center gap-1.5">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className="h-1.5 flex-1 rounded-full transition-all duration-500"
                style={{ background: i < step ? TEAL : '#e2e8e5' }}
              />
            ))}
          </div>

          <span className="text-xs font-mono font-bold text-slate-400 shrink-0">
            {step}/{TOTAL_STEPS}
          </span>
        </header>
      )}

      {/* 2. MAIN BODY CONTENT */}
      <main className="max-w-md mx-auto w-full my-auto py-4 space-y-6">

        {/* STEP 1: CHOOSE PROFILE */}
        {step === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="space-y-1.5">
              <h2 className="text-2xl font-black tracking-tight" style={{ color: '#111' }}>
                تۆ کێیت؟
              </h2>
              <p className="text-xs font-bold text-slate-500">
                جۆری هەژمارەکەت هەڵبژێرە. دواتر دەتوانیت بگۆڕیت.
              </p>
            </div>

            <div className="space-y-3">
              {[
                { id: 'job_seeker', Icon: User, title: 'کارجۆ / کارخواز', desc: 'بەدوای کار بگەڕێ، داواکاری بنێرە و CV دروست بکە.' },
                { id: 'recruiter', Icon: Building2, title: 'کۆمپانیا / خاوەنکار', desc: 'کار بڵاوبکەرەوە و داواکارییەکان بەڕێوە ببە.' },
              ].map(({ id, Icon, title, desc }) => {
                const active = selectedOption === id;
                return (
                  <div
                    key={id}
                    onClick={() => handleOptionClick(id)}
                    className="relative p-4 rounded-3xl transition-all cursor-pointer border-2"
                    style={active
                      ? { background: TEAL_SOFT, borderColor: TEAL }
                      : { background: '#fff', borderColor: '#e5e9e7' }
                    }
                  >
                    {active && (
                      <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center shadow-md" style={{ background: TEAL }}>
                        <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-1 text-right">
                        <h3 className="font-black text-sm" style={{ color: '#111' }}>{title}</h3>
                        <p className="text-[11px] font-medium leading-relaxed" style={{ color: '#6b7280' }}>{desc}</p>
                      </div>
                      <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                        style={active ? { background: TEAL, color: '#fff' } : { background: '#f1f4f3', color: '#8b938d' }}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-[10.5px] text-center leading-relaxed" style={{ color: '#9aa1a0' }}>
              بە بەردەوامبوون، ڕەزامەندی دەدەیت بە{' '}
              <button type="button" onClick={() => setShowTermsModal(true)} className="underline font-bold" style={{ color: '#6b7280' }}>مەرجەکانی بەکارهێنان</button>
              {' '}و{' '}
              <button type="button" onClick={() => setShowPrivacyModal(true)} className="underline font-bold" style={{ color: '#6b7280' }}>سیاسەتی تایبەتمەندی</button>.
            </p>

            <button onClick={handleStep1Next} className={primaryBtnCls} style={primaryBtnStyle}>
              بەردەوام بە
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: '#e2e8e5' }} />
              <span className="text-[11px] font-bold" style={{ color: '#9aa1a0' }}>یان</span>
              <div className="flex-1 h-px" style={{ background: '#e2e8e5' }} />
            </div>

            <button
              type="button"
              onClick={handleGoogleSignup}
              disabled={isGoogleSubmitting}
              className="w-full flex items-center justify-center gap-2.5 rounded-full bg-white border font-bold text-sm py-3.5 transition-all active:scale-[0.97] disabled:opacity-60"
              style={{ borderColor: '#d7e0dd', color: '#111' }}
            >
              <GoogleIcon />
              {isGoogleSubmitting ? 'خەریکی تۆمارکردنە...' : 'تۆمارکردن بە گووگڵ'}
            </button>

            <button
              type="button"
              onClick={() => { soundService.playTick(); if (onBack) onBack('login'); }}
              className="w-full text-center text-xs font-bold"
              style={{ color: '#6b7280' }}
            >
              هەژمارت هەیە؟{' '}
              <span style={{ color: TEAL }}>بچۆ ژوورەوە</span>
            </button>
          </div>
        )}

        {/* STEP 2: PERSONAL DETAILS */}
        {step === 2 && (
          <div className="space-y-5 animate-fadeIn">
            <div className="space-y-1">
              <h2 className="text-2xl font-black tracking-tight" style={{ color: '#111' }}>زانیاری کەسی</h2>
              <p className="text-xs font-bold text-slate-500">تکایە زانیارییەکانت بنووسە بۆ دروستکردنی هه‌ژمار</p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleStep2Next} className="space-y-3.5">
              <div className="relative flex items-center">
                <User className="w-4 h-4 absolute right-4 text-slate-400 pointer-events-none" />
                <input
                  type="text" required placeholder="ناوی تەواو" value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={`${inputCls} pr-11 pl-4 py-3.5 font-semibold`}
                />
              </div>

              <div className="relative flex items-center">
                <Phone className="w-4 h-4 absolute right-4 text-slate-400 pointer-events-none" />
                <span className="absolute right-9 text-xs font-mono font-bold text-slate-400 pointer-events-none">+964</span>
                <input
                  type="tel" required placeholder="0750 123 4567" value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/^0+/, ''))}
                  className={`${inputCls} pr-[4.6rem] pl-4 py-3.5 font-mono font-semibold`}
                />
              </div>

              <div className="relative flex items-center">
                <Mail className="w-4 h-4 absolute right-4 text-slate-400 pointer-events-none" />
                <input
                  type="email" placeholder="ئیمەیڵ (ئارەزوومەندانە)" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`${inputCls} pr-11 pl-4 py-3.5 font-mono`}
                />
              </div>

              <div className="relative flex items-center">
                <Lock className="w-4 h-4 absolute right-4 text-slate-400 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'} required minLength={8} placeholder="وشەی نهێنی (لانیکم ٨ پیت)" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputCls} pr-11 pl-11 py-3.5 font-mono`}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-4 text-slate-400 hover:text-slate-700">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="relative flex items-center">
                <Lock className="w-4 h-4 absolute right-4 text-slate-400 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'} required placeholder="دووبارەکردنەوەی وشەی نهێنی" value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`${inputCls} pr-11 pl-4 py-3.5 font-mono`}
                />
              </div>

              <button type="submit" className={`${primaryBtnCls} mt-1`} style={primaryBtnStyle}>
                بەردەوام بە
              </button>
            </form>
          </div>
        )}

        {/* STEP 3 (RECRUITER ONLY): COMPANY DETAILS — its own page now */}
        {step === 3 && isRecruiter && (
          <div className="space-y-5 animate-fadeIn">
            <div className="space-y-1">
              <h2 className="text-2xl font-black tracking-tight" style={{ color: '#111' }}>زانیاری کۆمپانیا</h2>
              <p className="text-xs font-bold text-slate-500">زانیاری کۆمپانیا / بزنسەکەت بنووسە</p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCompanyDetailsNext} className="space-y-3.5">
              <div className="relative flex items-center">
                <Building2 className="w-4 h-4 absolute right-4 text-slate-400 pointer-events-none" />
                <input type="text" required value={companyName} onChange={e => setCompanyName(e.target.value)}
                  placeholder="ناوی کۆمپانیا / بزنس"
                  className={`${inputCls} pr-11 pl-4 py-3.5 font-semibold`} />
              </div>

              <div className="relative flex items-center">
                <Phone className="w-4 h-4 absolute right-4 text-slate-400 pointer-events-none" />
                <input type="tel" required value={companyPhone} onChange={e => setCompanyPhone(e.target.value.replace(/^0+/, ''))}
                  placeholder="ژمارەی تەلەفۆنی کۆمپانیا"
                  className={`${inputCls} pr-11 pl-4 py-3.5 font-mono`} />
              </div>

              <input type="text" value={companyReg} onChange={e => setCompanyReg(e.target.value)}
                placeholder="ژمارەی تۆمارکردنی بازرگانی (ئارەزوومەندانە)"
                className={`${inputCls} px-4 py-3.5 font-mono`} />

              <input type="email" value={companyEmail} onChange={e => setCompanyEmail(e.target.value)}
                placeholder="ئیمەیڵی کۆمپانیا (ئارەزوومەندانە)"
                className={`${inputCls} px-4 py-3.5 font-mono`} />

              <select value={companyIndustry} onChange={e => setCompanyIndustry(e.target.value)}
                className={`${inputCls} px-4 py-3.5`}>
                <option value="">خانەوی کار / بازرگانی...</option>
                {liveCategories.map(c => <option key={c.id} value={c.name_ku}>{c.name_ku}</option>)}
              </select>

              {/* Company size & type */}
              <div className="pt-1 space-y-2.5">
                <div>
                  <label className={labelCls}>ژمارەی کارمەندان</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'small', label: 'بچووک' },
                      { id: 'medium', label: 'ناوەند' },
                      { id: 'large', label: 'گەورە' },
                    ].map(s => (
                      <button key={s.id} type="button" onClick={() => { soundService.playTick(); setCompanySize(s.id); }}
                        className={`py-2.5 rounded-full text-[11px] font-extrabold ${chipActiveCls(companySize === s.id)}`}
                        style={chipActiveStyle(companySize === s.id)}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={labelCls}>جۆری کۆمپانیا</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: 'sole_proprietor', label: 'تاک کەسی' },
                      { id: 'partnership', label: 'هاوبەشی' },
                      { id: 'government', label: 'فەرمی حکومی' },
                      { id: 'private', label: 'تایبەت' },
                    ].map(t => (
                      <button key={t.id} type="button" onClick={() => { soundService.playTick(); setCompanyType(t.id); }}
                        className={`py-2.5 rounded-full text-[11px] font-extrabold ${chipActiveCls(companyType === t.id)}`}
                        style={chipActiveStyle(companyType === t.id)}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button type="submit" className={`${primaryBtnCls} mt-1`} style={primaryBtnStyle}>
                بەردەوام بە
              </button>
            </form>
          </div>
        )}

        {/* STEP 3: DESIRED JOBS & BIO (job seeker) / HIRING PREFERENCES (recruiter) */}
        {step === 3 && selectedOption === 'job_seeker' && (
          <div className="space-y-5 animate-fadeIn">
            <div className="space-y-1">
              <h2 className="text-2xl font-black tracking-tight" style={{ color: '#111' }}>ئارەزووەکانی کار</h2>
              <p className="text-xs font-bold text-slate-500">حەز و لێهاتوویییەکانت هەڵبژێرە بۆ ئاسانکاری دۆزینەوەی کار</p>
            </div>

            <form onSubmit={handleStep3Next} className="space-y-3.5">
              <div>
                <label className={labelCls}>بوارە کاریەکان (دەتوانیت چەند بوارێک هەڵبژێریت)</label>
                <div className="flex flex-wrap gap-2">
                  {liveCategories.map(c => {
                    const active = desiredCategories.includes(c.id);
                    return (
                      <button key={c.id} type="button" onClick={() => toggleDesiredCategory(c.id)}
                        className={`px-3.5 py-2 rounded-full text-xs font-bold ${chipActiveCls(active)}`}
                        style={chipActiveStyle(active)}>
                        {c.icon} {c.name_ku}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className={labelCls}>پارێزگای دڵخواز</label>
                <div className="flex flex-wrap gap-2">
                  {governorates.map(gov => {
                    const active = preferredGov === gov;
                    return (
                      <button key={gov} type="button" onClick={() => { soundService.playTick(); setPreferredGov(gov); }}
                        className={`px-4 py-2.5 rounded-full text-xs font-bold ${chipActiveCls(active)}`}
                        style={chipActiveStyle(active)}>
                        {gov}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className={labelCls}>شارەزاییەکانت</label>
                <div className="flex gap-2">
                  <input value={skillInput} onChange={e => setSkillInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
                    placeholder="نموونە: Excel, فرۆشتن، دیزاین..." className={`${inputCls} px-4 py-3 flex-1`} />
                  <button type="button" onClick={addSkill} className="px-4 py-3 rounded-2xl text-white shrink-0" style={{ background: TEAL }}>
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {skills.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {skills.map(s => (
                      <span key={s} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold" style={{ background: TEAL_SOFT, border: `1px solid ${TEAL}33`, color: TEAL_DEEP }}>
                        {s}
                        <button type="button" onClick={() => setSkills(prev => prev.filter(x => x !== s))} className="hover:text-rose-500" style={{ color: TEAL }}><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className={labelCls}>تێبینی کورت دەربارەی خۆت</label>
                <textarea
                  rows={3}
                  placeholder="باسێک لە ئەزموون، ئامراز و حەزەکانت بنووسە..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full rounded-3xl bg-slate-50 border border-slate-200 focus:border-[#12796b] focus:bg-white outline-none p-4 text-xs text-slate-900 placeholder:text-slate-400 font-medium transition-all"
                />
              </div>

              <button type="submit" className={primaryBtnCls} style={primaryBtnStyle}>
                بەردەوام بە
              </button>
            </form>
          </div>
        )}

        {step === 4 && isRecruiter && (
          <div className="space-y-5 animate-fadeIn">
            <div className="space-y-1">
              <h2 className="text-2xl font-black tracking-tight" style={{ color: '#111' }}>حەز و ئارەزووەکان</h2>
              <p className="text-xs font-bold text-slate-500">ئەم زانیارییانە دەتوانن دواتریش بگۆڕدرێن — پێویستی کارخواز لە کارمەند</p>
            </div>

            <form onSubmit={handleHiringPrefsNext} className="space-y-3.5">
              <div>
                <label className={labelCls}>بواری پیشەیی داواکراو</label>
                <select
                  value={desiredCategory}
                  onChange={(e) => setDesiredCategory(e.target.value)}
                  className={`${inputCls} px-4 py-3.5 font-bold`}
                >
                  {liveCategories.map(c => <option key={c.id} value={c.id}>{c.name_ku}</option>)}
                </select>
              </div>

              <div>
                <label className={labelCls}>ئاستی خوێندنی داواکراو</label>
                <select
                  value={reqEducation}
                  onChange={(e) => setReqEducation(e.target.value)}
                  className={`${inputCls} px-4 py-3.5 font-bold`}
                >
                  <option value="">هیچ پێویستی نییە</option>
                  <option value="high_school">ئامادەیی</option>
                  <option value="diploma">دیپلۆم</option>
                  <option value="bachelor">بەکالۆریۆس</option>
                  <option value="master_plus">ماستەر یان بەرزتر</option>
                </select>
              </div>

              <div>
                <label className={labelCls}>کەمترین ساڵانی ئەزموونی داواکراو</label>
                <div className="relative flex items-center">
                  <Clock className="w-4 h-4 absolute right-4 text-slate-400 pointer-events-none" />
                  <input
                    type="number" min="0" placeholder="0" value={reqMinExperience}
                    onChange={(e) => setReqMinExperience(e.target.value)}
                    className={`${inputCls} pr-11 pl-4 py-3.5 font-mono font-semibold`}
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>شارەزاییە تایبەتەکانی داواکراو</label>
                <div className="flex gap-2">
                  <input value={reqSkillInput} onChange={e => setReqSkillInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addReqSkill(); } }}
                    placeholder="نموونە: Excel, فرۆشتن..." className={`${inputCls} px-4 py-3 flex-1`} />
                  <button type="button" onClick={addReqSkill} className="px-4 py-3 rounded-2xl text-white shrink-0" style={{ background: TEAL }}>
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {reqSkills.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {reqSkills.map(s => (
                      <span key={s} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold" style={{ background: TEAL_SOFT, border: `1px solid ${TEAL}33`, color: TEAL_DEEP }}>
                        {s}
                        <button type="button" onClick={() => setReqSkills(prev => prev.filter(x => x !== s))} className="hover:text-rose-500" style={{ color: TEAL }}><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className={labelCls}>زمانەکانی داواکراو</label>
                <div className="flex gap-2">
                  <input value={reqLanguageInput} onChange={e => setReqLanguageInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addReqLanguage(); } }}
                    placeholder="نموونە: کوردی، ئینگلیزی..." className={`${inputCls} px-4 py-3 flex-1`} />
                  <button type="button" onClick={addReqLanguage} className="px-4 py-3 rounded-2xl text-white shrink-0" style={{ background: TEAL }}>
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {reqLanguages.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {reqLanguages.map(l => (
                      <span key={l} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-xs font-bold text-sky-800">
                        {l}
                        <button type="button" onClick={() => setReqLanguages(prev => prev.filter(x => x !== l))} className="text-sky-600 hover:text-rose-500"><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className={labelCls}>جۆری کار</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'fullTime', label: 'کاتژمێری تەواو' },
                    { id: 'partTime', label: 'بەشی' },
                    { id: 'remote', label: 'ڕیمۆت' },
                  ].map(t => (
                    <button key={t.id} type="button" onClick={() => { soundService.playTick(); setReqJobType(t.id); }}
                      className={`py-2.5 rounded-full text-[11px] font-extrabold ${chipActiveCls(reqJobType === t.id)}`}
                      style={chipActiveStyle(reqJobType === t.id)}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelCls}>مووچەی پێشکەشکراو (د.ع / مانگ)</label>
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" min="0" step="50000" placeholder="کەمترین" value={reqSalaryMin}
                    onChange={e => setReqSalaryMin(e.target.value)} className={`${inputCls} px-4 py-3.5 font-mono`} />
                  <input type="number" min="0" step="50000" placeholder="زۆرترین" value={reqSalaryMax}
                    onChange={e => setReqSalaryMax(e.target.value)} className={`${inputCls} px-4 py-3.5 font-mono`} />
                </div>
              </div>

              <button type="submit" className={primaryBtnCls} style={primaryBtnStyle}>
                بەردەوام بە
              </button>
            </form>
          </div>
        )}

        {/* GENDER & PROFILE PHOTO / COMPANY LOGO — step 4 for job seekers, step 5 for recruiters */}
        {((step === 4 && !isRecruiter) || (step === 5 && isRecruiter)) && (
          <div className="space-y-5 animate-fadeIn">
            <div className="space-y-1">
              <h2 className="text-2xl font-black tracking-tight" style={{ color: '#111' }}>
                {selectedOption === 'recruiter' ? 'ڕەگەز، وێنە & لۆگۆ' : 'ڕەگەز & وێنەی پڕۆفایل'}
              </h2>
              <p className="text-xs font-bold text-slate-500">
                {selectedOption === 'recruiter' ? 'ئەمانە دواتریش لە پرۆفایلەکەت دیاریبکە' : 'وێنەی پرۆفایل دواتریش لە پرۆفایلەکەت دیاریبکە'}
              </p>
            </div>

            <form onSubmit={handleStep4Next} className="space-y-5">

              <div>
                <label className={labelCls}>ڕەگەز</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'male', label: 'پیاو' },
                    { id: 'female', label: 'ئافرەت' },
                  ].map(g => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => { soundService.playTick(); setGender(g.id); }}
                      className={`py-3 rounded-full text-xs font-extrabold ${chipActiveCls(gender === g.id)}`}
                      style={chipActiveStyle(gender === g.id)}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-5 rounded-3xl bg-slate-50 border-2 border-dashed border-slate-200 text-center space-y-3">
                {selectedOption === 'recruiter' && (
                  <p className="text-[11px] font-bold text-slate-400 -mt-1">وێنەی کەسی خۆت (وەک بەڕێوەبەر)</p>
                )}
                {avatar ? (
                  <div className="w-20 h-20 rounded-full overflow-hidden mx-auto ring-4 shadow-md" style={{ '--tw-ring-color': TEAL }}>
                    <img src={avatar} alt="Uploaded Avatar" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-16 h-16 rounded-full bg-white border border-slate-200 flex items-center justify-center mx-auto cursor-pointer hover:scale-105 transition-all"
                    style={{ color: TEAL }}
                  >
                    <Camera className="w-6 h-6" />
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-full text-white text-xs font-bold"
                  style={{ background: TEAL }}
                >
                  بارکردنی وێنە
                </button>
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
              </div>

              {selectedOption === 'recruiter' && (
                <div className="p-5 rounded-3xl bg-slate-50 border-2 border-dashed border-slate-200 text-center space-y-3">
                  <p className="text-[11px] font-bold text-slate-400 -mt-1">لۆگۆی کۆمپانیا (جیاواز لە وێنەی کەسیت)</p>
                  {companyLogo ? (
                    <div className="w-20 h-20 rounded-2xl overflow-hidden mx-auto ring-4 shadow-md" style={{ '--tw-ring-color': TEAL }}>
                      <img src={companyLogo} alt="Company Logo" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div
                      onClick={() => companyLogoInputRef.current?.click()}
                      className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mx-auto cursor-pointer hover:scale-105 transition-all"
                      style={{ color: TEAL }}
                    >
                      <Building2 className="w-6 h-6" />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => companyLogoInputRef.current?.click()}
                    className="px-4 py-2 rounded-full text-white text-xs font-bold"
                    style={{ background: TEAL }}
                  >
                    بارکردنی لۆگۆ
                  </button>
                  <input type="file" ref={companyLogoInputRef} onChange={handleCompanyLogoUpload} accept="image/*" className="hidden" />
                </div>
              )}

              <button type="submit" disabled={isSubmitting} className={primaryBtnCls} style={primaryBtnStyle}>
                {isSubmitting ? 'خەریکی دروستکردنە...' : 'تەواوکردنی تۆمارکردن'}
              </button>
            </form>
          </div>
        )}

        {/* WELCOME COMPLETION SCREEN */}
        {step === COMPLETE_STEP && (
          <div className="text-center space-y-6 animate-fadeIn">

            <div className="w-20 h-20 rounded-full border-4 flex items-center justify-center mx-auto" style={{ background: TEAL_SOFT, borderColor: TEAL, color: TEAL }}>
              <Sparkles className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full text-xs font-black inline-block" style={{ background: TEAL_SOFT, border: `1px solid ${TEAL}33`, color: TEAL_DEEP }}>
                پڕۆفایلەکەت بە سەرکەوتوویی تەواو کرا!
              </span>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: '#111' }}>
                بەخێربێیت بۆ ئیش خواز
              </h2>
              <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto">
                ئێستا بە تەواوی ئامادەیت بۆ سوود وه‌رگرتن لە هەموو تایبەتمەندییەکانی ئیش خواز.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2.5 text-right pt-2">
              {[
                { Icon: Briefcase, title: 'گەڕان بۆ کار' },
                { Icon: Wallet, title: 'ناردنی سیڤی' },
                { Icon: Bell, title: 'ئاگادارکردنەوە' },
              ].map(({ Icon, title }) => (
                <div key={title} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-1.5">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center mx-auto" style={{ background: TEAL, color: '#fff' }}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-[11px]">{title}</h4>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                soundService.playSuccess();
                if (onRegistrationComplete) onRegistrationComplete();
                else if (onBack) onBack('home_guest');
              }}
              className={`${primaryBtnCls} flex items-center justify-center gap-2`}
              style={primaryBtnStyle}
            >
              <span>دەستپێکردن</span>
              <Rocket className="w-4 h-4" />
            </button>

          </div>
        )}

      </main>

      {/* 3. FOOTER WITH TERMS AND PRIVACY POLICY — step 1 has its own inline
          terms line + sign-in link above, so this only covers steps 2+ */}
      {step > 1 && step <= TOTAL_STEPS && (
        <footer className="max-w-md mx-auto w-full text-center pt-4">
          <p className="text-[10px] text-slate-400 leading-relaxed">
            بە بەردەوامبوونت، ڕازی دەبیت بە{' '}
            <button onClick={() => setShowTermsModal(true)} className="underline text-slate-500 font-bold">مەرجەکان</button>
            {' '}و{' '}
            <button onClick={() => setShowPrivacyModal(true)} className="underline text-slate-500 font-bold">تایبەتمەندی</button>
          </p>
        </footer>
      )}

      {/* Terms of Service Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 space-y-4 text-right shadow-2xl">
            <h3 className="text-base font-black text-slate-900">📄 مەرجەکانی بەکارهێنانی ئیش خواز</h3>
            <div className="text-xs text-slate-600 space-y-2 max-h-60 overflow-y-auto leading-relaxed">
              <p>١. بەکارهێنانی سەکۆی ئیش خواز دەبێت بەپێی یاساکانی هەرێمی کوردستان بێت.</p>
              <p>٢. بڵاوکردنەوەی هەلی کاری ناڕاست یان وێنەی نەشیاو قەدەغەیە و ئەژمێرەکە ڕاستەوخۆ دەبەسترێت.</p>
              <p>٣. گواستنەوەی سیڤی تەنها لەڕێگەی جزدانی فەرمی ئیش خواز ئەنجام دەدرێت.</p>
            </div>
            <button onClick={() => setShowTermsModal(false)} className="w-full py-3 rounded-2xl text-white font-black text-sm" style={{ background: TEAL }}>
              تێگەیشتم ✓
            </button>
          </div>
        </div>
      )}

      {/* Privacy Policy Modal */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 space-y-4 text-right shadow-2xl">
            <h3 className="text-base font-black text-slate-900">🔒 سیاسەتی تایبەتمەندی زانیارییەکان</h3>
            <div className="text-xs text-slate-600 space-y-2 max-h-60 overflow-y-auto leading-relaxed">
              <p>١. زانیارییە کەسییەکانت (ژمارەی مۆبایل و سیڤی) 100% پارێزراون.</p>
              <p>٢. تەنها ئەو کۆمپانیایانەی کار بڵاودەکەنەوە مافی بینینی سیڤییەکەت هەیە بەپێی داواکاری.</p>
              <p>٣. هیچ زانیارییەک بە لایەنی سێیەم نادرێت.</p>
            </div>
            <button onClick={() => setShowPrivacyModal(false)} className="w-full py-3 rounded-2xl text-white font-black text-sm" style={{ background: TEAL }}>
              تێگەیشتم ✓
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
