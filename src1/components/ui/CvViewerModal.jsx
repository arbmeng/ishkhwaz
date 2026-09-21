import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ExternalLink, Loader2 } from 'lucide-react';

const GRAD = 'linear-gradient(155deg,#7229e8 0%,#5513bf 48%,#1d0740 100%)';

// Shows a hosted (Karnama) CV full screen. The hosted page has its own template switcher and "Download PDF".
export const CvViewerModal = ({ open, title, embedUrl, viewUrl, onClose }) => {
  const [loading, setLoading] = useState(true);
  useEffect(() => { if (open) setLoading(true); }, [open, embedUrl]);
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);
  if (!open || !embedUrl) return null;

  return createPortal(
    <div dir="rtl" className="fixed inset-0 z-[10000] flex flex-col bg-[#f5f4f7] font-vazirmatn">
      <div className="flex shrink-0 items-center gap-2.5 px-3 text-white" style={{ background: GRAD, paddingTop: 'max(10px, env(safe-area-inset-top))', paddingBottom: 10 }}>
        <button onClick={onClose} aria-label="داخستن" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/15 active:scale-95"><X className="h-5 w-5" /></button>
        <div className="min-w-0 flex-1 truncate text-sm font-black">{title || 'CV'}</div>
        {viewUrl && (
          <a href={viewUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-2 text-[11px] font-black active:scale-95">
            <ExternalLink className="h-3.5 w-3.5" />کردنەوە لە پەڕەیەکی نوێ
          </a>
        )}
      </div>
      <div className="relative flex-1">
        {loading && <div className="absolute inset-0 grid place-items-center"><Loader2 className="h-7 w-7 animate-spin text-[#641bd9]" /></div>}
        <iframe src={embedUrl} title={title || 'CV'} onLoad={() => setLoading(false)} className="h-full w-full border-0" allow="clipboard-write; fullscreen" />
      </div>
    </div>,
    document.body,
  );
};
