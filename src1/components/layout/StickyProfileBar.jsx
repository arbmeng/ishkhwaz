import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Share2 } from 'lucide-react';

// Compact bar (back button, avatar, name, share) that slides in once the page's hero has scrolled away.
// Place it as the first child of the scrolling page; it finds its own scroll container.
const scrollParentOf = (el) => {
  for (let a = el?.parentElement; a; a = a.parentElement) {
    if (/(auto|scroll)/.test(getComputedStyle(a).overflowY)) return a;
  }
  return window;
};

export const StickyProfileBar = ({ title, subtitle, avatar, onBack, onShare, gradient = 'linear-gradient(155deg,#7229e8 0%,#5513bf 48%,#1d0740 100%)', threshold = 190 }) => {
  const mark = useRef(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const sp = scrollParentOf(mark.current);
    const top = () => (sp === window ? window.scrollY : sp.scrollTop);
    const on = () => setShow(s => (s ? top() > threshold - 50 : top() > threshold));
    on();
    sp.addEventListener('scroll', on, { passive: true });
    return () => sp.removeEventListener('scroll', on);
  }, [threshold]);

  const btn = 'grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/15 text-white transition active:scale-95 hover:bg-white/25';
  return (
    <div ref={mark} className="sticky top-0 z-[45] h-0" dir="rtl" style={{ pointerEvents: show ? 'auto' : 'none' }}>
      <div
        className="absolute inset-x-0 top-0 rounded-b-[24px] text-white shadow-[0_12px_30px_rgba(29,7,64,.28)]"
        style={{
          background: gradient,
          paddingTop: 'env(safe-area-inset-top)',
          transform: show ? 'translate3d(0,0,0)' : 'translate3d(0,-110%,0)',
          opacity: show ? 1 : 0,
          transition: 'transform .28s cubic-bezier(.4,0,.2,1), opacity .2s ease',
          willChange: 'transform',
        }}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-2.5 px-3 sm:px-6">
          {onBack && <button type="button" onClick={onBack} aria-label="گەڕانەوە" className={btn}><ArrowRight className="h-5 w-5" /></button>}
          {avatar && <img src={avatar} alt="" className="h-9 w-9 shrink-0 rounded-xl border border-white/30 object-cover" />}
          <div className="min-w-0 flex-1 text-right">
            <div className="truncate text-[14px] font-black leading-tight">{title}</div>
            {subtitle && <div className="truncate text-[11px] font-medium text-white/70">{subtitle}</div>}
          </div>
          {onShare && <button type="button" onClick={onShare} aria-label="هاوبەشکردن" className={btn}><Share2 className="h-[18px] w-[18px]" /></button>}
        </div>
      </div>
    </div>
  );
};
