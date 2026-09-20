import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { soundService } from '../../services/soundService';
import { signInWithProvider } from '../../services/supabaseClient';
import { Eye, EyeOff, AlertCircle, Phone, Lock, LogIn, Loader2, ArrowLeft, Compass, ShieldCheck } from 'lucide-react';
import { AuthBrandPanel, AuthAssistant, AuthMobileHero, AUTH_PAD_LG } from './AuthBrandPanel';

// No brand-logo icon in lucide-react — real Google "G" mark, standard 4-color SVG.
const GoogleIcon = () => (
  <svg className="w-[18px] h-[18px]" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19-7.7 19-19 0-1.3-.1-2.7-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.5 0 10.5-2.1 14.3-5.6l-6.6-5.6C29.6 34.7 27 35.5 24 35.5c-5.2 0-9.6-3.5-11.2-8.2l-6.5 5C9.6 39.6 16.3 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.6 5.6C40.7 36.6 44 30.9 44 24c0-1.3-.1-2.7-.4-3.5z" />
  </svg>
);

// Brand teal — matches the logo mark.
const TEAL = '#12796b';
const TEAL_DEEP = '#0d5c50';
const LAST_PHONE_KEY = 'ishkhwaz_last_phone';

// "0770 123 4567" / "770 123 4567" — groups digits as they're typed and accepts a pasted +964 number.
const formatPhone = (value) => {
  let d = String(value || '').replace(/\D/g, '');
  if (d.startsWith('964')) d = d.slice(3);
  d = d.slice(0, d.startsWith('0') ? 11 : 10);
  const lead = d.startsWith('0') ? 4 : 3;
  return [d.slice(0, lead), d.slice(lead, lead + 3), d.slice(lead + 3)].filter(Boolean).join(' ');
};
const cleanPhone = (value) => String(value || '').replace(/\D/g, '').replace(/^0+/, '');

export const LoginPage = ({ onBack, onNavigateRegister, onLoginSuccess, onForgotPassword, onGuest }) => {
  const { login } = useAuth();
  const { addToast } = useStore();

  const [phone, setPhone] = useState(() => {
    try { return formatPhone(localStorage.getItem(LAST_PHONE_KEY) || ''); } catch { return ''; }
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsOn, setCapsOn] = useState(false);
  const [touched, setTouched] = useState({ phone: false, password: false });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [shake, setShake] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  // Keyboard-first on desktop; on phones autofocus would pop the keyboard over the whole form.
  const canAutofocus = typeof window !== 'undefined' && window.matchMedia?.('(min-width:1024px)').matches;
  useEffect(() => { setErrorMsg(null); }, [phone, password]);

  const phoneDigits = cleanPhone(phone);
  const phoneError = touched.phone && phoneDigits.length < 9 ? (phoneDigits ? 'ژمارەی مۆبایل تەواو نییە.' : 'ژمارەی مۆبایلەکەت بنووسە.') : null;
  const passwordError = touched.password && !password ? 'وشەی نهێنی بنووسە.' : null;

  const handleGoogleLogin = async () => {
    soundService.playTick();
    setIsGoogleSubmitting(true);
    try {
      // Redirects the browser to Google's consent screen — AuthContext's own
      // onAuthStateChange listener picks the session back up here once the
      // browser returns, hands the token to /auth/social, and signs in.
      const { error } = await signInWithProvider('google');
      if (error) throw error;
    } catch (err) {
      setIsGoogleSubmitting(false);
      addToast({ title: 'سەرنەکەوت', message: 'چوونەژوورەوە بە گووگڵ سەرکەوتوو نەبوو.', type: 'error' });
    }
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    soundService.playTick();
    setErrorMsg(null);
    setTouched({ phone: true, password: true });

    // The leading 0 is only stripped here at submit time — never while typing —
    // so "0750 000 0000" can be typed naturally without a digit vanishing.
    const digits = cleanPhone(phone);
    if (digits.length < 9 || !password) { triggerShake(); return; }

    setIsSubmitting(true);
    try {
      await login(digits, password);
      try { localStorage.setItem(LAST_PHONE_KEY, digits); } catch { /* private mode */ }
      soundService.playSuccess();
      addToast({ title: 'بەخێربێیت! 👋', message: 'بە سەرکەوتوویی چوویتە ژوورەوە', type: 'success' });
      if (onLoginSuccess) onLoginSuccess('home');
      else if (onBack) onBack('home');
    } catch (err) {
      const message = err?.message || 'کێشەیەک ڕوویدا لە کاتی چوونە ژوورەوەدا.';
      setErrorMsg(message);
      triggerShake();
      addToast({ title: 'چوونە ژوورەوە سەرکەوتوو نەبوو', message, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldCls = (hasError) =>
    `w-full rounded-2xl bg-white border outline-none transition-all text-sm h-14 ${hasError
      ? 'border-rose-300 focus:border-rose-400 focus:ring-4 focus:ring-rose-400/10'
      : 'border-[#d7e0dd] hover:border-[#b9c9c4] focus:border-[#12796b] focus:ring-4 focus:ring-[#12796b]/12'
    }`;

  return (
    <div
      dir="rtl"
      className={`fixed inset-0 z-40 font-vazirmatn overflow-y-auto ${AUTH_PAD_LG}`}
      style={{ backgroundColor: '#f4f7f6' }}
    >
      <AuthBrandPanel variant="login" />
      <AuthAssistant variant="login" actions={{ register: onNavigateRegister, forgot: onForgotPassword }} />
      <AuthMobileHero />

      <div className="relative min-h-[calc(100dvh-7rem)] lg:min-h-full flex flex-col">
        <div className="flex-1 flex items-start lg:items-center justify-center">
          <div className={`relative w-full max-w-[480px] bg-[#f4f7f6] lg:bg-transparent -mt-8 lg:mt-0 rounded-t-[32px] lg:rounded-none px-5 sm:px-8 pt-8 lg:pt-12 pb-10 ${shake ? 'animate-[shake_0.4s_ease]' : ''}`}>

            <div className="mb-7">
              <h1 className="text-[clamp(28px,7vw,36px)] font-black text-[#111d1a]">بەخێربێیتەوە</h1>
              <p className="mt-1.5 text-sm font-bold leading-6 text-[#7b8e88]">بۆ بەردەوامبوون، زانیارییەکانت بنووسە</p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {errorMsg && (
                <div role="alert" className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                  <span className="text-xs font-bold leading-5 text-rose-600">{errorMsg}</span>
                </div>
              )}

              {/* Phone */}
              <div>
                <label htmlFor="login-phone" className="mb-1.5 block text-xs font-black text-[#4a5b55]">ژمارەی مۆبایل</label>
                <div className="relative flex items-center">
                  <Phone className="pointer-events-none absolute right-4 h-4 w-4 text-[#a8b0ac]" />
                  <span dir="ltr" className="pointer-events-none absolute right-11 font-mono text-xs font-bold text-[#9aa1a0]">+964</span>
                  <input
                    id="login-phone"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    dir="ltr"
                    autoFocus={canAutofocus}
                    autoComplete="username"
                    placeholder="770 123 4567"
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
                    aria-invalid={!!phoneError}
                    aria-describedby={phoneError ? 'login-phone-err' : undefined}
                    className={`${fieldCls(!!phoneError)} font-mono pr-[5.6rem] pl-4 text-left text-[#111d1a] shadow-[0_4px_20px_rgba(15,23,42,.025)]`}
                  />
                </div>
                {phoneError && <p id="login-phone-err" className="mt-1.5 text-xs font-bold text-rose-500">{phoneError}</p>}
              </div>

              {/* Password */}
              <div>
                <label htmlFor="login-password" className="mb-1.5 block text-xs font-black text-[#4a5b55]">وشەی نهێنی</label>
                <div className="relative flex items-center">
                  <Lock className={`pointer-events-none absolute right-4 h-4 w-4 ${errorMsg || passwordError ? 'text-rose-400' : 'text-[#a8b0ac]'}`} />
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyUp={(e) => setCapsOn(!!e.getModifierState?.('CapsLock'))}
                    onBlur={() => { setCapsOn(false); setTouched((t) => ({ ...t, password: true })); }}
                    aria-invalid={!!passwordError}
                    aria-describedby={passwordError ? 'login-password-err' : undefined}
                    className={`${fieldCls(!!errorMsg || !!passwordError)} pr-11 pl-12 text-[#111d1a] shadow-[0_4px_20px_rgba(15,23,42,.025)]`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'شاردنەوەی وشەی نهێنی' : 'پیشاندانی وشەی نهێنی'}
                    aria-pressed={showPassword}
                    className="absolute left-1.5 grid h-11 w-11 place-items-center rounded-xl text-[#9aa1a0] transition hover:bg-[#f0f5f3] hover:text-[#4a5b55]"
                  >
                    {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                  </button>
                </div>
                {passwordError && <p id="login-password-err" className="mt-1.5 text-xs font-bold text-rose-500">{passwordError}</p>}
                {capsOn && <p className="mt-1.5 text-xs font-bold text-amber-600">⚠ Caps Lock چالاکە</p>}
              </div>

              <div className="flex justify-end">
                <button type="button" onClick={() => { soundService.playTick(); onForgotPassword?.(); }}
                  className="rounded-lg px-1 py-1 text-xs font-black transition hover:underline" style={{ color: TEAL }}>
                  وشەی نهێنیت لەبیرچووە؟
                </button>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="group relative flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl text-sm font-black text-white transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.985] disabled:opacity-70 disabled:pointer-events-none"
                style={{ background: `linear-gradient(135deg, ${TEAL} 0%, ${TEAL_DEEP} 100%)`, boxShadow: `0 12px 26px ${TEAL}45, inset 0 1px 0 rgba(255,255,255,0.18)` }}
              >
                <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                {isSubmitting ? (<><Loader2 className="h-4 w-4 animate-spin" />خەریکی چوونەژوورەوەیە...</>) : (<><LogIn className="h-4 w-4" />چوونە ژوورەوە</>)}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-[#e2e8e5]" />
              <span className="text-[11px] font-bold text-[#9aa1a0]">یان</span>
              <div className="h-px flex-1 bg-[#e2e8e5]" />
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isGoogleSubmitting}
              className="flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl border border-[#d7e0dd] bg-white text-sm font-black text-[#111d1a] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(15,23,42,.08)] active:scale-[0.985] disabled:opacity-60"
            >
              {isGoogleSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
              {isGoogleSubmitting ? 'خەریکی چوونەژوورەوەیە...' : 'چوونەژوورەوە بە گووگڵ'}
            </button>

            <p className="mt-7 text-center text-xs font-bold text-[#6b7a75]">
              هەژمارت نییە؟{' '}
              <button type="button" onClick={() => { soundService.playTick(); onNavigateRegister?.(); }} className="font-black hover:underline" style={{ color: TEAL }}>
                تۆمار بکە
              </button>
            </p>

            {onGuest && (
              <button
                type="button"
                onClick={() => { soundService.playTick(); onGuest(); }}
                className="mx-auto mt-4 flex items-center gap-2 rounded-full border border-[#d7e0dd] bg-white/70 px-4 py-2.5 text-xs font-black text-[#4a5b55] transition hover:bg-white hover:border-[#b9c9c4]"
              >
                <Compass className="h-4 w-4" style={{ color: TEAL }} />
                بێ هەژمار هەلی کارەکان ببینە
                <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-0" />
              </button>
            )}

            <div className="mt-9 flex items-center justify-center gap-2 text-[10px] font-bold tracking-[0.18em] text-[#aab3ae]">
              <ShieldCheck className="h-3.5 w-3.5" />
              ZERA GROUP
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          15%      { transform: translateX(-6px); }
          30%      { transform: translateX(6px); }
          45%      { transform: translateX(-4px); }
          60%      { transform: translateX(4px); }
          75%      { transform: translateX(-2px); }
          90%      { transform: translateX(2px); }
        }
      `}</style>
    </div>
  );
};
