import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { soundService } from '../../services/soundService';
import { signInWithProvider } from '../../services/supabaseClient';
import { Eye, EyeOff, AlertCircle, Phone, Lock, LogIn } from 'lucide-react';

// No brand-logo icon in lucide-react — real Google "G" mark, standard 4-color SVG.
const GoogleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"/>
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
    <path fill="#4CAF50" d="M24 44c5.5 0 10.5-2.1 14.3-5.6l-6.6-5.6C29.6 34.7 27 35.5 24 35.5c-5.2 0-9.6-3.5-11.2-8.2l-6.5 5C9.6 39.6 16.3 44 24 44z"/>
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.6 5.6C40.7 36.6 44 30.9 44 24c0-1.3-.1-2.7-.4-3.5z"/>
  </svg>
);

// Brand teal — matches the logo mark.
const TEAL = '#12796b';
const TEAL_DEEP = '#0d5c50';

export const LoginPage = ({ onBack, onNavigateRegister, onLoginSuccess, onForgotPassword }) => {
  const { login } = useAuth();
  const { addToast } = useStore();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [shake, setShake] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

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
    soundService.playTick();
    setErrorMsg(null);

    // Strip the leading 0 (if any) at submit time — not while typing, so the user
    // can type "0750 000 0000" naturally without the digit disappearing under them.
    const cleanPhone = phone.trim().replace(/^0+/, '');

    if (!cleanPhone) {
      setErrorMsg('تکایە ژمارەی مۆبایلەکەت بنووسە.');
      triggerShake(); return;
    }
    if (!password) {
      setErrorMsg('تکایە وشەی نهێنی بنووسە.');
      triggerShake(); return;
    }

    setIsSubmitting(true);
    try {
      await login(cleanPhone, password);
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

  const handleForgotPassword = () => {
    soundService.playTick();
    onForgotPassword?.();
  };

  const fieldCls = (hasError) =>
    `w-full rounded-[20px] bg-white border outline-none transition-all text-sm ${
      hasError
        ? 'border-rose-300 focus:border-rose-400 focus:ring-4 focus:ring-rose-400/10'
        : 'border-[#d7e0dd] focus:border-[#12796b] focus:ring-4 focus:ring-[#12796b]/12'
    }`;

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-40 bg-white font-vazirmatn select-none overflow-y-auto flex flex-col items-center"
      style={{
        backgroundColor: '#f4f7f6',
        backgroundImage: 'radial-gradient(120% 45% at 50% 0%, #dcefeb, #f4f7f6 62%)',
        paddingTop: 'max(2.5rem, calc(env(safe-area-inset-top) + 2rem))',
      }}
    >
      <div className={`relative w-full max-w-sm px-6 pb-12 my-auto ${shake ? 'animate-[shake_0.4s_ease]' : ''}`}>

        {/* Ambient glow behind the mark — same motif as the splash screen */}
        <div
          aria-hidden="true"
          className="absolute rounded-full pointer-events-none"
          style={{
            top: -30, right: -40, width: 190, height: 190,
            background: `radial-gradient(circle, ${TEAL}30, transparent 70%)`,
            filter: 'blur(20px)',
          }}
        />

        {/* Logo — sits at the reading-start edge (right, in RTL) */}
        <div className="relative mb-6">
          <img src="/logo-flat.png" alt="ئیش خواز" className="h-16 w-auto drop-shadow-sm" />
        </div>

        <h1 className="relative text-[26px] font-black mb-1.5" style={{ color: '#111' }}>بەخێربێیتەوە</h1>
        <p className="relative text-xs font-bold mb-7" style={{ color: '#8b9490' }}>بۆ بەردەوامبوون زانیارییەکانت بنووسە</p>

        <form onSubmit={handleSubmit} className="relative space-y-4">

          {/* Phone field */}
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: '#6b7280' }}>ژمارەی مۆبایل</label>
            <div className="relative flex items-center">
              <Phone className="w-4 h-4 absolute right-4 pointer-events-none" style={{ color: '#a8b0ac' }} />
              <span className="absolute right-10 text-xs font-mono font-bold pointer-events-none" style={{ color: '#9aa1a0' }}>+964</span>
              <input
                type="tel"
                required
                placeholder="770 123 4567"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                autoComplete="tel"
                className={`${fieldCls(false)} font-mono py-3.5 pr-[5.2rem] pl-4`}
                style={{ color: '#111' }}
              />
            </div>
          </div>

          {/* Password field */}
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: '#6b7280' }}>وشەی نهێنی</label>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 absolute right-4 pointer-events-none" style={{ color: errorMsg ? '#d64545' : '#a8b0ac' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                className={`${fieldCls(!!errorMsg)} py-3.5 pr-11 pl-11`}
                style={{ color: '#111' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-4 transition-colors"
                style={{ color: '#9aa1a0' }}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errorMsg && (
              <div className="flex items-center gap-1.5 mt-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" style={{ color: '#d64545' }} />
                <span className="text-xs font-bold" style={{ color: '#d64545' }}>{errorMsg}</span>
              </div>
            )}
          </div>

          <div className="text-center">
            <button type="button" onClick={handleForgotPassword} className="text-xs font-bold" style={{ color: TEAL }}>
              وشەی نهێنیت لەبیرچووە؟
            </button>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="relative w-full overflow-hidden rounded-full text-white font-black text-sm transition-all active:scale-[0.97] disabled:opacity-60 py-4 mt-1 flex items-center justify-center gap-2"
            style={{
              background: `linear-gradient(135deg, ${TEAL} 0%, ${TEAL_DEEP} 100%)`,
              boxShadow: `0 10px 24px ${TEAL}4d, inset 0 1px 0 rgba(255,255,255,0.18)`,
            }}
          >
            {isSubmitting ? (
              'خەریکی چوونەژوورەوەیە...'
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                چوونە ژوورەوە
              </>
            )}
          </button>
        </form>

        <div className="relative flex items-center gap-3 my-5">
          <div className="flex-1 h-px" style={{ background: '#e2e8e5' }} />
          <span className="text-[11px] font-bold" style={{ color: '#9aa1a0' }}>یان</span>
          <div className="flex-1 h-px" style={{ background: '#e2e8e5' }} />
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isGoogleSubmitting}
          className="relative w-full flex items-center justify-center gap-2.5 rounded-full bg-white border font-bold text-sm py-3.5 transition-all active:scale-[0.97] disabled:opacity-60"
          style={{ borderColor: '#d7e0dd', color: '#111' }}
        >
          <GoogleIcon />
          {isGoogleSubmitting ? 'خەریکی چوونەژوورەوەیە...' : 'چوونەژوورەوە بە گووگڵ'}
        </button>

        <p className="text-center text-xs font-bold mt-7" style={{ color: '#6b7280' }}>
          هەژمارت نییە؟{' '}
          <button
            type="button"
            onClick={() => { soundService.playTick(); if (onNavigateRegister) onNavigateRegister(); }}
            className="font-black"
            style={{ color: TEAL }}
          >
            تۆمار بکە
          </button>
        </p>

        {/* Brand footer — same motif as the splash screen */}
        <div className="flex flex-col items-center gap-3 mt-10">
          <div className="w-8 h-px" style={{ background: '#d7e0dd' }} />
          <span className="text-[10px] font-bold tracking-[0.2em]" style={{ color: '#aab3ae' }}>ZERA GROUP</span>
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
