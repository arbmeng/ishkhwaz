import React from 'react';
import { ArrowRight } from 'lucide-react';

// The one page header used by every inner page, so they all share the same height,
// padding, buttons and tone.
//
//  - Phone / tablet: a sticky bar (back, title, action buttons).
//  - Desktop (lg+): the site-wide DesktopHeaderNav is already the header, so no second bar.
//    Back / action buttons (if the page has any) appear as a small plain toolbar row in the
//    page flow instead. Pages that cover the site header (full-screen overlays) pass
//    `desktop` to get the same bar on desktop too, so they still have exactly one header.
//  - Notch / status bar: the bar sits below env(safe-area-inset-top) rather than under the
//    camera and battery icons in the installed PWA. App's <main> already adds that padding
//    above pages, so with `insideMain` (default) the bar pulls itself up by that amount and
//    puts it back as its own padding — flush to the top when it sticks. Overlays that have
//    no such padding pass insideMain={false}.
export const HEADER_BTN = 'w-11 h-11 rounded-2xl bg-white border border-[#e8eeec] flex items-center justify-center text-[#4a5b55] hover:bg-[#f0f7f5] active:scale-95 transition shrink-0';
const btnCls = (active) => `${HEADER_BTN} ${active ? '!bg-[#e7f4f1] !border-[#cfe8e2] !text-[#12796b]' : ''}`;

export const PageHeader = ({ title, onBack, actions = [], desktop = false, insideMain = true }) => (
  <>
    <div
      className={`${desktop ? '' : 'lg:hidden '}sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-[#e8eeec]`}
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        marginTop: insideMain ? 'calc(-1 * env(safe-area-inset-top))' : undefined,
      }}
    >
      <div className="h-14 px-3 sm:px-6 flex items-center gap-2.5 max-w-7xl mx-auto">
        {onBack && (
          <button type="button" onClick={onBack} aria-label="گەڕانەوە" className={HEADER_BTN}>
            <ArrowRight className="w-5 h-5" />
          </button>
        )}
        <span className="flex-1 min-w-0 text-sm font-black text-[#111d1a] truncate text-right">{title}</span>
        {actions.map(({ icon: Icon, label, onClick, active }, i) => (
          <button key={i} type="button" onClick={onClick} aria-label={label} className={btnCls(active)}>
            <Icon className="w-[18px] h-[18px]" />
          </button>
        ))}
      </div>
    </div>

    {!desktop && (onBack || actions.length > 0) && (
      <div className="hidden lg:flex items-center gap-2.5 max-w-7xl mx-auto px-8 pt-5">
        {onBack && (
          <button type="button" onClick={onBack} aria-label="گەڕانەوە" className={HEADER_BTN}>
            <ArrowRight className="w-5 h-5" />
          </button>
        )}
        <div className="flex-1" />
        {actions.map(({ icon: Icon, label, onClick, active }, i) => (
          <button key={i} type="button" onClick={onClick} aria-label={label} className={btnCls(active)}>
            <Icon className="w-[18px] h-[18px]" />
          </button>
        ))}
      </div>
    )}
  </>
);
