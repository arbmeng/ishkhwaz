import React, { useState } from 'react';
import { Star } from 'lucide-react';

const TEAL = '#12796b';

// Read-only display: a row of filled/empty stars plus the numeric average
// and count, e.g. "★★★★☆ 4.2 (13)". Renders nothing (not a fabricated
// "no ratings yet" placeholder) when count is 0, since a page listing a
// real 0.0/5 next to "(0)" reads as broken, not honest.
export const StarRatingDisplay = ({ average = 0, count = 0, size = 'sm' }) => {
  if (!count) return null;
  const starCls = size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5';
  return (
    <div className="flex items-center gap-1.5" dir="ltr">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={starCls}
            style={{ color: i < Math.round(average) ? '#f5a524' : '#d9e2df' }}
            fill={i < Math.round(average) ? '#f5a524' : 'none'}
          />
        ))}
      </div>
      <span className="text-xs font-black text-[#111d1a] font-mono">{average}</span>
      <span className="text-[11px] text-[#7b8e88] font-bold">({count})</span>
    </div>
  );
};

// Interactive 1-5 star picker + optional comment, for submitting a new
// rating. Controlled by the parent via onSubmit — this component owns only
// its own transient input state.
export const StarRatingInput = ({ onSubmit, submitting = false, label = 'هەڵسەنگاندنی ئەم کارە' }) => {
  const [value, setValue] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');

  return (
    <div className="p-4 rounded-2xl bg-[#f8faf9] border border-[#e8eeec] space-y-3">
      <span className="text-xs font-black text-[#111d1a] block">{label}</span>
      <div className="flex items-center gap-1.5" dir="ltr">
        {Array.from({ length: 5 }).map((_, i) => {
          const n = i + 1;
          const active = n <= (hovered || value);
          return (
            <button
              key={n}
              type="button"
              onClick={() => setValue(n)}
              onMouseEnter={() => setHovered(n)}
              onMouseLeave={() => setHovered(0)}
              className="active:scale-90 transition-transform"
            >
              <Star className="w-6 h-6" style={{ color: active ? '#f5a524' : '#d9e2df' }} fill={active ? '#f5a524' : 'none'} />
            </button>
          );
        })}
      </div>
      <textarea
        value={comment}
        onChange={e => setComment(e.target.value)}
        placeholder="بۆچوونێک بنووسە (ئارەزوومەندانە)..."
        rows={2}
        className="w-full bg-white border border-[#e8eeec] rounded-xl px-3 py-2.5 text-xs text-[#111d1a] placeholder-[#a0afa9] outline-none focus:border-[#12796b] resize-none"
      />
      <button
        type="button"
        disabled={!value || submitting}
        onClick={() => onSubmit(value, comment)}
        className="w-full py-2.5 rounded-xl text-white text-xs font-black disabled:opacity-50 transition active:scale-95"
        style={{ background: TEAL }}
      >
        {submitting ? 'دەنێردرێت...' : 'ناردنی هەڵسەنگاندن'}
      </button>
    </div>
  );
};
