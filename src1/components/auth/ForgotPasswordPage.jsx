import React, { useState } from 'react';
import { apiService } from '../../services/api';
import { soundService } from '../../services/soundService';
import { ArrowRight, Phone, AlertCircle, CheckCircle2, Send } from 'lucide-react';

const TEAL = '#12796b';
const TEAL_DEEP = '#0d5c50';

// Reached from LoginPage's "وشەی نهێنیت لەبیرچووە؟" link. Takes the same
// phone number the person logs in with (familiar, not a new field to learn)
// and — if that account has a real email on file — sends a reset link
// there, since email is the only real send channel this app has.
export const ForgotPasswordPage = ({ onBack }) => {
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [sent, setSent] = useState(false);
  const [sentMessage, setSentMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    soundService.playTick();
    setErrorMsg(null);
    const cleanPhone = phone.trim().replace(/^0+/, '');
    if (!cleanPhone) { setErrorMsg('تکایە ژمارەی مۆبایلەکەت بنووسە.'); return; }

    setIsSubmitting(true);
    const res = await apiService.forgotPassword(cleanPhone);
    setIsSubmitting(false);
    if (res?.success) {
      soundService.playSuccess?.();
      setSentMessage(res.message || '');
      setSent(true);
    } else {
      setErrorMsg(res?.message || 'کێشەیەک ڕوویدا.');
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
        <button onClick={() => { soundService.playTick?.(); onBack?.(); }} className="mb-6 w-10 h-10 rounded-2xl bg-white border flex items-center justify-center active:scale-90 transition" style={{ borderColor: '#d7e0dd' }}>
          <ArrowRight className="w-4.5 h-4.5" style={{ color: '#111' }} />
        </button>

        {sent ? (
          <div className="text-center">
            <div className="w-16 h-16 rounded-3xl mx-auto flex items-center justify-center shadow-md mb-6" style={{ background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DEEP})` }}>
              <CheckCircle2 className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-lg font-black mb-2" style={{ color: '#111' }}>ئیمەیلەکەت بپشکنە</h1>
            <p className="text-sm font-bold leading-relaxed" style={{ color: '#7b8e88' }}>{sentMessage}</p>
          </div>
        ) : (
          <>
            <h1 className="relative text-[26px] font-black mb-1.5" style={{ color: '#111' }}>وشەی نهێنیت لەبیرچووە؟</h1>
            <p className="relative text-xs font-bold mb-7" style={{ color: '#8b9490' }}>ژمارە مۆبایلەکەت بنووسە — بەستەری گەڕاندنەوە بۆ ئیمەیلەکەت دەنێرین</p>

            <form onSubmit={handleSubmit} className="relative space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: '#6b7280' }}>ژمارەی مۆبایل</label>
                <div className="relative flex items-center">
                  <Phone className="w-4 h-4 absolute right-4 pointer-events-none" style={{ color: '#a8b0ac' }} />
                  <span className="absolute right-10 text-xs font-mono font-bold pointer-events-none" style={{ color: '#9aa1a0' }}>+964</span>
                  <input
                    type="tel" required placeholder="770 123 4567" value={phone}
                    onChange={e => setPhone(e.target.value)} autoComplete="tel"
                    className="w-full rounded-[20px] bg-white border outline-none transition-all text-sm font-mono py-3.5 pr-[5.2rem] pl-4"
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
                className="relative w-full overflow-hidden rounded-full text-white font-black text-sm transition-all active:scale-[0.97] disabled:opacity-60 py-4 mt-1 flex items-center justify-center gap-2"
                style={{ background: `linear-gradient(135deg, ${TEAL} 0%, ${TEAL_DEEP} 100%)`, boxShadow: `0 10px 24px ${TEAL}4d` }}
              >
                {isSubmitting ? 'خەریکی ناردنە...' : (<><Send className="w-4 h-4" />ناردنی بەستەری گەڕاندنەوە</>)}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
