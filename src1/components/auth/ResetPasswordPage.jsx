import React, { useState } from 'react';
import { apiService } from '../../services/api';
import { soundService } from '../../services/soundService';
import { Eye, EyeOff, AlertCircle, Lock, CheckCircle2, XCircle } from 'lucide-react';

const TEAL = '#12796b';
const TEAL_DEEP = '#0d5c50';

// Landing spot for the link inside the password-reset email. Unlike
// VerifyEmailPage, this never fires anything automatically on mount (no
// GET side effect) — the token just sits captured from the URL until the
// person actually types a new password and submits, so there's no risk of
// this PWA's own service-worker reload silently burning it before they see
// the form (the reason /auth/verify-email had to be made idempotent).
export const ResetPasswordPage = ({ onDone }) => {
  const [token] = useState(() => new URLSearchParams(window.location.search).get('token') || '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div dir="rtl" className="fixed inset-0 z-40 bg-white font-vazirmatn flex flex-col items-center justify-center px-6 text-center" style={{ backgroundColor: '#f4f7f6' }}>
        <XCircle className="w-10 h-10 mb-4" style={{ color: '#dc2626' }} />
        <h1 className="text-lg font-black mb-2" style={{ color: '#111' }}>بەستەرەکە نادروستە</h1>
        <button onClick={() => onDone?.()} className="mt-6 px-6 py-3 rounded-2xl text-white font-black text-sm" style={{ background: TEAL }}>گەڕانەوە بۆ چوونەژوورەوە</button>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    soundService.playTick();
    setErrorMsg(null);
    if (password.length < 8) { setErrorMsg('وشەی نهێنی دەبێت لانیکەم ٨ پیت بێت.'); return; }
    if (password !== confirm) { setErrorMsg('دوو وشەی نهێنییەکە وەک یەک نین.'); return; }

    setIsSubmitting(true);
    const res = await apiService.resetPassword(token, password);
    setIsSubmitting(false);
    if (res?.success) {
      soundService.playSuccess?.();
      setDone(true);
    } else {
      setErrorMsg(res?.message || 'گۆڕینی وشەی نهێنی سەرکەوتوو نەبوو.');
    }
  };

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
      <div className="relative w-full max-w-sm px-6 pb-12 my-auto">
        {done ? (
          <div className="text-center">
            <div className="w-16 h-16 rounded-3xl mx-auto flex items-center justify-center shadow-md mb-6" style={{ background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DEEP})` }}>
              <CheckCircle2 className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-lg font-black mb-2" style={{ color: '#111' }}>گۆڕدرا!</h1>
            <p className="text-sm font-bold leading-relaxed mb-8" style={{ color: '#7b8e88' }}>وشەی نهێنیت بە سەرکەوتوویی گۆڕدرا.</p>
            <button onClick={() => onDone?.()} className="w-full py-3.5 rounded-2xl text-white font-black text-sm shadow-md active:scale-[0.98] transition-transform" style={{ background: TEAL }}>
              چوونە ژوورەوە
            </button>
          </div>
        ) : (
          <>
            <h1 className="relative text-[26px] font-black mb-1.5" style={{ color: '#111' }}>وشەی نهێنی نوێ</h1>
            <p className="relative text-xs font-bold mb-7" style={{ color: '#8b9490' }}>وشەی نهێنیەکی نوێ بۆ هەژمارەکەت دابنێ</p>

            <form onSubmit={handleSubmit} className="relative space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: '#6b7280' }}>وشەی نهێنی نوێ</label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 absolute right-4 pointer-events-none" style={{ color: '#a8b0ac' }} />
                  <input
                    type={showPassword ? 'text' : 'password'} required placeholder="••••••••" value={password}
                    onChange={e => setPassword(e.target.value)} autoComplete="new-password"
                    className="w-full rounded-[20px] bg-white border outline-none transition-all text-sm py-3.5 pr-11 pl-11"
                    style={{ color: '#111', borderColor: errorMsg ? '#fca5a5' : '#d7e0dd' }}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-4" style={{ color: '#9aa1a0' }}>
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: '#6b7280' }}>دووبارەکردنەوەی وشەی نهێنی</label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 absolute right-4 pointer-events-none" style={{ color: '#a8b0ac' }} />
                  <input
                    type={showPassword ? 'text' : 'password'} required placeholder="••••••••" value={confirm}
                    onChange={e => setConfirm(e.target.value)} autoComplete="new-password"
                    className="w-full rounded-[20px] bg-white border outline-none transition-all text-sm py-3.5 pr-11 pl-4"
                    style={{ color: '#111', borderColor: errorMsg ? '#fca5a5' : '#d7e0dd' }}
                  />
                </div>
                {errorMsg && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" style={{ color: '#d64545' }} />
                    <span className="text-xs font-bold" style={{ color: '#d64545' }}>{errorMsg}</span>
                  </div>
                )}
              </div>

              <button
                type="submit" disabled={isSubmitting}
                className="relative w-full overflow-hidden rounded-full text-white font-black text-sm transition-all active:scale-[0.97] disabled:opacity-60 py-4 mt-1"
                style={{ background: `linear-gradient(135deg, ${TEAL} 0%, ${TEAL_DEEP} 100%)`, boxShadow: `0 10px 24px ${TEAL}4d` }}
              >
                {isSubmitting ? 'خەریکی گۆڕینە...' : 'گۆڕینی وشەی نهێنی'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
