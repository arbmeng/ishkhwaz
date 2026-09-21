import React from 'react';
import { ArrowRight } from 'lucide-react';

// The one page header used by every inner page: a green card with a rounded bottom edge
// (same look as the About / Plans hero), holding the back button, the title and any action buttons.
//
//  - Phone / tablet: compact and sticky, the back button lives inside the card.
//  - Desktop (lg+): the site-wide DesktopHeaderNav is already above, so no back button here
//    (pages that cover the site header pass `desktop` to keep it); the card is taller and static.
//  - Notch / status bar: the card starts under env(safe-area-inset-top). App's <main> already adds
//    that padding above pages, so with `insideMain` (default) the card pulls itself up by that
//    amount and uses it as its own top padding. Overlays with no such padding pass insideMain={false}.
export const HEADER_BTN = 'w-11 h-11 rounded-2xl bg-white/15 backdrop-blur text-white flex items-center justify-center hover:bg-white/25 active:scale-95 transition shrink-0';
const GRAD = 'linear-gradient(155deg,#7229e8 0%,#5513bf 48%,#1d0740 100%)';
const btnCls = (active, mobileOnly) => `${HEADER_BTN} ${active ? '!bg-white !text-[#4b13a5]' : ''} ${mobileOnly ? 'lg:hidden' : ''}`;

export const PageHeader = ({ title, subtitle, onBack, actions = [], desktop = false, insideMain = true, children }) => (
  <div
    className="sticky top-0 z-30 lg:relative overflow-hidden text-white rounded-b-[30px] lg:rounded-b-[36px] shadow-[0_14px_34px_rgba(29,7,64,.22)]"
    style={{
      background: GRAD,
      paddingTop: 'env(safe-area-inset-top)',
      marginTop: insideMain ? 'calc(-1 * env(safe-area-inset-top))' : undefined,
    }}
  >
    <div className="pointer-events-none absolute -left-20 -top-20 h-56 w-56 rounded-full bg-[#9d74e0]/25 blur-3xl" />
    <div className="pointer-events-none absolute inset-0 opacity-[.07]"
      style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.9) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.9) 1px,transparent 1px)', backgroundSize: '36px 36px' }} />

    <div className="relative mx-auto flex h-16 max-w-7xl items-center gap-2.5 px-3 sm:px-6 lg:h-auto lg:min-h-[120px] lg:px-8 lg:py-8">
      {onBack && (
        <button type="button" onClick={onBack} aria-label="گەڕانەوە" className={`${HEADER_BTN}${desktop ? '' : ' lg:hidden'}`}>
          <ArrowRight className="h-5 w-5" />
        </button>
      )}
      <div className="min-w-0 flex-1 text-right">
        <h1 className="truncate text-[15px] font-bold lg:text-[30px] lg:leading-[1.4]">{title}</h1>
        {subtitle && <p className="mt-1 hidden truncate text-[13px] font-medium text-white/70 lg:block">{subtitle}</p>}
      </div>
      {actions.map(({ icon: Icon, label, onClick, active, mobileOnly }, i) => (
        <button key={i} type="button" onClick={onClick} aria-label={label} className={btnCls(active, mobileOnly)}>
          <Icon className="h-[18px] w-[18px]" />
        </button>
      ))}
    </div>
    {children && <div className="relative mx-auto max-w-7xl px-3 pb-5 sm:px-6 lg:px-8">{children}</div>}
  </div>
);
