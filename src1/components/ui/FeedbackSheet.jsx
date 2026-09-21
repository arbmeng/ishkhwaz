import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Star, X, Loader2, Send, CheckCircle2 } from 'lucide-react';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const GRAD = 'linear-gradient(155deg,#7229e8 0%,#5513bf 48%,#1d0740 100%)';
const CATS = [['praise', '👍', 'ستایش'], ['idea', '💡', 'پێشنیار'], ['bug', '🐞', 'کێشە / هەڵە'], ['other', '💬', 'هی تر']];
const WORDS = ['', 'زۆر خراپ', 'خراپ', 'مامناوەند', 'باش', 'زۆر باش'];

// Rate the app + tell us what to fix or add. Saved in the database (app_feedback).
export const FeedbackSheet = ({ open, onClose, page = '' }) => {
  const { token } = useAuth();
  const [rating, setRating] = useState(0);
  const [cat, setCat] = useState('praise');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => { if (open) { setRating(0); setCat('praise'); setMsg(''); setErr(''); setDone(false); setBusy(false); } }, [open]);
  if (!open) return null;

  const send = async () => {
    if (!rating) { setErr('ئەستێرەیەک هەڵبژێرە.'); return; }
    setBusy(true); setErr('');
    const res = await apiService.sendFeedback({ rating, category: cat, message: msg.trim(), page }, token);
    setBusy(false);
    if (res?.success) setDone(true); else setErr(res?.message || 'نەنێردرا، دووبارە هەوڵبدەرەوە.');
  };

  return createPortal(
    <div dir="rtl" className="fixed inset-0 z-[9999] flex items-end justify-center bg-[#0b0711]/60 font-vazirmatn backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="max-h-[94dvh] w-full overflow-y-auto rounded-t-[30px] bg-[#f7f5fb] shadow-2xl sm:max-w-md sm:rounded-[30px]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="relative overflow-hidden px-5 pb-6 pt-5 text-white" style={{ background: GRAD }}>
          <button onClick={onClose} aria-label="داخستن" className="absolute left-4 top-4 grid h-10 w-10 place-items-center rounded-2xl bg-white/15 active:scale-95"><X className="h-5 w-5" /></button>
          <h3 className="pl-12 text-xl font-black">ڕات دەربارەی ئیش خواز</h3>
          <p className="mt-1 pl-12 text-[12px] font-medium text-white/75">ڕا و پێشنیارەکانت یارمەتیمان دەدەن ئەپەکە باشتر بکەین.</p>
        </div>

        {done ? (
          <div className="flex flex-col items-center px-6 py-10 text-center">
            <div className="grid h-20 w-20 place-items-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 className="h-10 w-10" /></div>
            <h4 className="mt-4 text-lg font-black text-[#16111d]">سوپاس بۆ ڕاکەت! 💜</h4>
            <p className="mt-2 max-w-xs text-[13px] font-medium leading-7 text-[#6b647d]">تیمی ئیش خواز ڕاکەت دەخوێنێتەوە.</p>
            <button onClick={onClose} className="mt-6 w-full rounded-2xl py-3.5 text-[13px] font-black text-white active:scale-[.98]" style={{ background: 'linear-gradient(135deg,#7229e8,#4b13a5)' }}>باشە</button>
          </div>
        ) : (
          <div className="space-y-5 p-5">
            <div className="rounded-2xl border border-[#e6e0f1] bg-white p-4 text-center">
              <div className="flex justify-center gap-1.5" dir="ltr">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n}`} className="p-1 transition active:scale-90">
                    <Star className={`h-9 w-9 transition-all duration-200 ${n <= rating ? 'scale-110 fill-amber-400 text-amber-400 drop-shadow-[0_4px_8px_rgba(245,158,11,.4)]' : 'text-[#d6d0e4]'}`} />
                  </button>
                ))}
              </div>
              <div className="mt-2 h-5 text-[12px] font-black text-[#4b13a5]">{WORDS[rating]}</div>
            </div>

            <div className="flex flex-wrap gap-2">
              {CATS.map(([id, emoji, label]) => (
                <button key={id} type="button" onClick={() => setCat(id)}
                  className={`rounded-full border px-3.5 py-2 text-[12px] font-black transition active:scale-95 ${cat === id ? 'border-transparent text-white shadow-[0_6px_16px_rgba(100,27,217,.28)]' : 'border-[#ddd6ec] bg-white text-[#4b4358]'}`}
                  style={cat === id ? { background: 'linear-gradient(135deg,#7229e8,#4b13a5)' } : undefined}>{emoji} {label}</button>
              ))}
            </div>

            <textarea value={msg} onChange={e => setMsg(e.target.value.slice(0, 1500))} rows={4} placeholder="چی باش بوو؟ چی دەبێت بگۆڕین یان زیاد بکرێت؟"
              className="w-full resize-none rounded-2xl border border-[#ddd6ec] bg-white px-4 py-3 text-[13px] font-medium leading-7 text-[#16111d] outline-none transition placeholder:text-[#a59fb3] focus:border-[#641bd9] focus:ring-4 focus:ring-[#641bd9]/10" />

            {err && <div className="rounded-xl bg-rose-50 px-3 py-2 text-center text-[12px] font-bold text-rose-700">{err}</div>}

            <button onClick={send} disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[13px] font-black text-white shadow-[0_12px_28px_rgba(100,27,217,.32)] transition active:scale-[.98] disabled:opacity-60" style={{ background: 'linear-gradient(135deg,#7229e8,#4b13a5)' }}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}ناردنی ڕا
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};
