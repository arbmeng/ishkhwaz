import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2 } from 'lucide-react';

const GRAD = 'linear-gradient(135deg,#f97066,#b42318)';

// Bottom sheet that asks WHY something is being turned down (offer or applicant).
// A reason is required: pick a ready-made one and/or write your own.
export const ReasonSheet = ({ open, title, subtitle, reasons = [], confirmText = 'ڕەتکردنەوە', onConfirm, onClose }) => {
  const [picked, setPicked] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (open) { setPicked(''); setText(''); setBusy(false); } }, [open]);
  if (!open) return null;

  const note = [picked, text.trim()].filter(Boolean).join(' — ');
  const submit = async () => {
    if (!note || busy) return;
    setBusy(true);
    try { await onConfirm(note); } finally { setBusy(false); }
  };

  return createPortal(
    <div dir="rtl" className="fixed inset-0 z-[9999] flex items-end justify-center bg-[#0b0711]/60 font-vazirmatn backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:max-w-md sm:rounded-[28px]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex items-start gap-3 border-b border-[#efedf2] p-5">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-black text-[#16111d]">{title}</h3>
            {subtitle && <p className="mt-1 text-[12px] font-medium leading-6 text-[#7b7390]">{subtitle}</p>}
          </div>
          <button onClick={onClose} aria-label="داخستن" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#f4f2f8] text-[#5b5470] active:scale-95"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-4 p-5">
          {reasons.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {reasons.map(r => (
                <button key={r} type="button" onClick={() => setPicked(picked === r ? '' : r)}
                  className={`rounded-full border px-3.5 py-2 text-[12px] font-black transition active:scale-95 ${picked === r ? 'border-transparent text-white' : 'border-[#e2dcef] bg-white text-[#4b4358]'}`}
                  style={picked === r ? { background: GRAD } : undefined}>{r}</button>
              ))}
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-[11px] font-black text-[#5b5470]">تێبینی (ئارەزوومەندانە)</label>
            <textarea value={text} onChange={e => setText(e.target.value.slice(0, 300))} rows={3} placeholder="هۆکارەکە بە کورتی بنووسە..."
              className="w-full resize-none rounded-2xl border border-[#ddd6ec] bg-white px-4 py-3 text-[13px] font-medium leading-7 text-[#16111d] outline-none transition placeholder:text-[#a59fb3] focus:border-[#641bd9] focus:ring-4 focus:ring-[#641bd9]/10" />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <button type="button" onClick={onClose} className="rounded-2xl border border-[#e2dcef] bg-white py-3.5 text-[12px] font-black text-[#5b5470] active:scale-[.98]">پاشگەزبوونەوە</button>
            <button type="button" onClick={submit} disabled={!note || busy}
              className="flex items-center justify-center gap-2 rounded-2xl py-3.5 text-[12px] font-black text-white shadow-[0_10px_24px_rgba(180,35,24,.25)] transition active:scale-[.98] disabled:opacity-45 disabled:shadow-none" style={{ background: GRAD }}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}{confirmText}
            </button>
          </div>
          {!note && <p className="text-center text-[10.5px] font-medium text-[#9a94aa]">هۆکارێک هەڵبژێرە یان بنووسە تا بتوانیت بەردەوام بیت.</p>}
        </div>
      </div>
    </div>,
    document.body,
  );
};
