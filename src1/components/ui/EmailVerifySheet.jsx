import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, MailCheck, CheckCircle2 } from 'lucide-react';
import { apiService } from '../../services/api';

const GRAD = 'linear-gradient(155deg,#7229e8 0%,#5513bf 48%,#1d0740 100%)';

// Bottom sheet that confirms the account email with the 6-digit code we email. Opening it sends a fresh code.
export const EmailVerifySheet = ({ open, email, token, onClose, onVerified }) => {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sentNote, setSentNote] = useState('');
  const [wait, setWait] = useState(0);
  const [done, setDone] = useState(false);
  const refs = useRef([]);
  const started = useRef(false);

  const send = async () => {
    setSending(true); setError('');
    const res = await apiService.resendVerificationEmail(token);
    setSending(false);
    if (res?.success) { setSentNote('کۆدەکە نێردرا بۆ ' + email); setWait(60); }
    else setError(res?.message || 'ناردنی کۆد سەرکەوتوو نەبوو.');
  };

  useEffect(() => {
    if (!open) { started.current = false; return; }
    setDigits(['', '', '', '', '', '']); setDone(false); setError(''); setSentNote('');
    if (!started.current) { started.current = true; send(); }
    setTimeout(() => refs.current[0]?.focus(), 250);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (wait <= 0) return undefined;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const submit = async (code) => {
    if (busy) return;
    setBusy(true); setError('');
    const res = await apiService.verifyEmailOtp(code, token);
    setBusy(false);
    if (res?.success) { setDone(true); onVerified?.(); setTimeout(() => onClose?.(), 1400); }
    else { setError(res?.message || 'کۆدەکە هەڵەیە.'); setDigits(['', '', '', '', '', '']); refs.current[0]?.focus(); }
  };

  const setAt = (i, v) => {
    const only = v.replace(/\D/g, '');
    if (only.length > 1) { // pasted the whole code
      const next = only.slice(0, 6).split('');
      setDigits([...next, ...Array(6 - next.length).fill('')]);
      if (next.length === 6) submit(next.join(''));
      else refs.current[next.length]?.focus();
      return;
    }
    const next = [...digits]; next[i] = only; setDigits(next);
    if (only && i < 5) refs.current[i + 1]?.focus();
    if (next.every(Boolean)) submit(next.join(''));
  };

  if (!open) return null;
  return createPortal(
    <div dir="rtl" className="fixed inset-0 z-[9999] flex items-end justify-center bg-[#0b0711]/60 font-vazirmatn backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:max-w-md sm:rounded-[28px]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="relative px-5 pb-5 pt-5 text-white" style={{ background: GRAD }}>
          <button onClick={onClose} aria-label="داخستن" className="absolute left-4 top-4 grid h-9 w-9 place-items-center rounded-xl bg-white/15 active:scale-95"><X className="h-4 w-4" /></button>
          <div className="mb-2 grid h-11 w-11 place-items-center rounded-2xl bg-white/15"><MailCheck className="h-5 w-5" /></div>
          <h3 className="text-lg font-black">پشتڕاستکردنەوەی ئیمەیل</h3>
          <p className="mt-1 text-[12px] font-medium text-white/75" dir="auto">{email}</p>
        </div>

        {done ? (
          <div className="flex flex-col items-center px-6 py-10 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 className="h-8 w-8" /></div>
            <div className="mt-3 text-base font-black text-[#16111d]">ئیمەیلەکەت پشتڕاستکرایەوە ✓</div>
          </div>
        ) : (
          <div className="space-y-4 p-5">
            <p className="text-center text-[12px] font-medium leading-6 text-[#6b647d]">{sending ? 'کۆدەکە دەنێردرێت...' : sentNote || 'کۆدی ٦ ژمارەیی بنووسە.'}</p>
            <div className="flex justify-center gap-2" dir="ltr">
              {digits.map((d, i) => (
                <input key={i} ref={(el) => (refs.current[i] = el)} value={d} inputMode="numeric" autoComplete={i === 0 ? 'one-time-code' : 'off'} maxLength={6}
                  onChange={(e) => setAt(i, e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Backspace' && !d && i > 0) refs.current[i - 1]?.focus(); }}
                  className={`h-14 w-11 rounded-2xl border bg-[#f8f6fc] text-center text-xl font-black outline-none transition focus:border-[#641bd9] focus:bg-white focus:ring-4 focus:ring-[#641bd9]/10 ${error ? 'border-rose-300' : 'border-[#ddd6ec]'}`} />
              ))}
            </div>
            {error && <div className="rounded-xl bg-rose-50 px-3 py-2 text-center text-[12px] font-bold text-rose-700">{error}</div>}
            <button type="button" onClick={() => submit(digits.join(''))} disabled={busy || digits.some((x) => !x)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[13px] font-black text-white shadow-[0_10px_24px_rgba(100,27,217,.3)] transition active:scale-[.98] disabled:opacity-50 disabled:shadow-none" style={{ background: 'linear-gradient(135deg,#7229e8,#4b13a5)' }}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}پشتڕاستکردنەوە
            </button>
            <button type="button" onClick={send} disabled={wait > 0 || sending} className="w-full py-2 text-[12px] font-black text-[#641bd9] disabled:text-stone-400">
              {wait > 0 ? `ناردنەوەی کۆد لە ${wait} چرکەدا` : 'ناردنەوەی کۆد'}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};
