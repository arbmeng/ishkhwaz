import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const TEAL = '#12796b';

// A horizontally scrolling row that tells you it scrolls and lets you drive it:
//  - round arrow buttons (desktop) that only show when there is more in that direction
//  - soft fades at the edges that still hide content
//  - a slim position bar under the row (click it to jump); `bar={false}` for chip rows
//  - mouse drag-to-scroll (touch keeps its native swipe), snapping to the cards
// Works in both LTR and RTL (arrows are physical: left button scrolls left).
// Drop-in for `<div className="flex gap-3 overflow-x-auto ...">`: `className` goes on the scroller.
export const HScroll = ({ children, className = '', bar = true, arrows = true, step = 0.85 }) => {
  const ref = useRef(null);
  const drag = useRef(null);
  const dragMoved = useRef(false);
  const [st, setSt] = useState({ left: false, right: false, thumb: 100, pos: 0, can: false });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    if (max <= 4) { setSt(s => (s.can ? { left: false, right: false, thumb: 100, pos: 0, can: false } : s)); return; }
    const rtl = getComputedStyle(el).direction === 'rtl';
    const sl = el.scrollLeft;
    const left = rtl ? sl > -max + 2 : sl > 2;
    const right = rtl ? sl < -2 : sl < max - 2;
    const thumb = Math.max(12, (el.clientWidth / el.scrollWidth) * 100);
    const pos = Math.min(1, Math.max(0, Math.abs(sl) / max));
    setSt(s => (s.left === left && s.right === right && Math.abs(s.thumb - thumb) < 0.5 && Math.abs(s.pos - pos) < 0.005 && s.can ? s : { left, right, thumb, pos, can: true }));
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    Array.from(el.children).forEach(c => ro.observe(c));
    return () => ro.disconnect();
  }, [measure, children]);

  const go = (dir) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * step, behavior: 'smooth' });

  const jump = (e) => {
    const el = ref.current;
    if (!el) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const rtl = getComputedStyle(el).direction === 'rtl';
    const frac = Math.min(1, Math.max(0, rtl ? (rect.right - e.clientX) / rect.width : (e.clientX - rect.left) / rect.width));
    const target = frac * (el.scrollWidth - el.clientWidth);
    el.scrollTo({ left: rtl ? -target : target, behavior: 'smooth' });
  };

  const onPointerDown = (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || !st.can) return;
    drag.current = { x: e.clientX, sl: ref.current.scrollLeft, active: false };
  };
  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (!d.active && Math.abs(dx) > 5) {
      d.active = true;
      dragMoved.current = true;
      ref.current.style.scrollSnapType = 'none';
      ref.current.style.scrollBehavior = 'auto';
      ref.current.style.userSelect = 'none';
      ref.current.setPointerCapture?.(e.pointerId);
    }
    if (d.active) ref.current.scrollLeft = d.sl - dx;
  };
  const endDrag = () => {
    const el = ref.current;
    if (drag.current?.active && el) {
      el.style.scrollSnapType = '';
      el.style.scrollBehavior = '';
      el.style.userSelect = '';
    }
    drag.current = null;
    setTimeout(() => { dragMoved.current = false; }, 0);
  };
  // A drag must not count as a click on the card under the cursor.
  const onClickCapture = (e) => { if (dragMoved.current) { e.preventDefault(); e.stopPropagation(); } };

  const arrowCls = 'absolute top-1/2 -translate-y-1/2 z-10 hidden sm:flex w-9 h-9 rounded-full bg-white border border-stone-100 shadow-[0_6px_18px_rgba(20,45,40,.16)] items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95';

  return (
    <div className="relative group/hs">
      <div
        ref={ref}
        onScroll={measure}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={onClickCapture}
        onKeyDown={(e) => { if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); } else if (e.key === 'ArrowRight') { e.preventDefault(); go(1); } }}
        tabIndex={st.can ? 0 : -1}
        className={`overflow-x-auto scrollbar-none scroll-smooth snap-x snap-proximity [&>*]:snap-start outline-none focus-visible:ring-2 focus-visible:ring-[#12796b]/30 rounded-2xl ${st.can ? 'sm:cursor-grab sm:active:cursor-grabbing' : ''} ${className}`}
      >
        {children}
      </div>

      {arrows && (
        <>
          <div aria-hidden="true" className={`pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-[#f6f8f7] to-transparent transition-opacity duration-200 ${st.left ? 'opacity-100' : 'opacity-0'}`} />
          <div aria-hidden="true" className={`pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[#f6f8f7] to-transparent transition-opacity duration-200 ${st.right ? 'opacity-100' : 'opacity-0'}`} />
          <button type="button" aria-label="بۆ لای چەپ" onClick={() => go(-1)} tabIndex={st.left ? 0 : -1}
            className={`${arrowCls} left-1 ${st.left ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <ChevronLeft className="w-4 h-4" style={{ color: TEAL }} />
          </button>
          <button type="button" aria-label="بۆ لای ڕاست" onClick={() => go(1)} tabIndex={st.right ? 0 : -1}
            className={`${arrowCls} right-1 ${st.right ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <ChevronRight className="w-4 h-4" style={{ color: TEAL }} />
          </button>
        </>
      )}

      {bar && st.can && (
        <div onClick={jump} className="mt-3 h-1.5 rounded-full bg-stone-200/70 relative cursor-pointer" role="presentation">
          <div className="absolute top-0 h-full rounded-full transition-[inset-inline-start] duration-150"
            style={{ width: `${st.thumb}%`, insetInlineStart: `${st.pos * (100 - st.thumb)}%`, background: `linear-gradient(90deg, ${TEAL}, #43bea4)` }} />
        </div>
      )}
    </div>
  );
};
