import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { soundService } from '../../services/soundService';
import { Eye, EyeOff, AlertCircle, Phone, Lock, LogIn } from 'lucide-react';

// Brand teal — matches the logo mark.
const TEAL = '#12796b';
const TEAL_DEEP = '#0d5c50';

export const LoginPage = ({ onBack, onNavigateRegister, onLoginSuccess }) => {
  const { login } = useAuth();
  const { addToast } = useStore();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [shake, setShake] = useState(false);

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
    addToast({ title: 'بەم زووانە 🛠️', message: 'گەڕاندنەوەی وشەی نهێنی بەم زووانە چالاک دەبێت.', type: 'info' });
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
