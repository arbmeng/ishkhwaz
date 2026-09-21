import React from 'react';
import { ArrowRight } from 'lucide-react';

// Floating back / action buttons that sit on top of a page's own hero image (company, job pages),
// instead of a separate header bar above it.
const BTN = 'grid h-11 w-11 place-items-center rounded-2xl border border-white/25 bg-black/30 text-white backdrop-blur-md transition active:scale-95 hover:bg-black/45';

export const HeroControls = ({ onBack, actions = [] }) => (
  <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 sm:px-6 lg:px-10" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
    {onBack ? (
      <button type="button" onClick={onBack} aria-label="گەڕانەوە" className={BTN}><ArrowRight className="h-5 w-5" /></button>
    ) : <span />}
    <div className="flex items-center gap-2">
      {actions.map(({ icon: Icon, label, onClick, active }, i) => (
        <button key={i} type="button" onClick={onClick} aria-label={label} className={`${BTN} ${active ? '!bg-white !text-[#0d5c50]' : ''}`}><Icon className="h-[18px] w-[18px]" /></button>
      ))}
    </div>
  </div>
);
