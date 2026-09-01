import React from 'react';

// A single-series day-by-day trend — small multiples, not dual-axis, so two
// measures of different scale (views vs. applications) each get their own
// correctly-scaled chart instead of flattening one against the other on a
// shared y-axis. Real data only: an all-zero series renders an honest empty
// state, never a fabricated flat line.
export const TrendChart = ({ title, icon: Icon, color, data = [], total = 0 }) => {
  const width = 320;
  const height = 88;
  const padX = 4;
  const padY = 10;

  const max = Math.max(1, ...data.map(d => d.value));
  const n = data.length;
  const stepX = n > 1 ? (width - padX * 2) / (n - 1) : 0;

  const points = data.map((d, i) => {
    const x = padX + i * stepX;
    const y = height - padY - (d.value / max) * (height - padY * 2);
    return { x, y, ...d };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaPath = points.length
    ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${height - padY} L ${points[0].x.toFixed(1)} ${height - padY} Z`
    : '';

  const hasActivity = total > 0;
  const firstLabel = data[0]?.date ? new Date(data[0].date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '';
  const lastLabel = data[n - 1]?.date ? new Date(data[n - 1].date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '';

  return (
    <div className="p-4 rounded-2xl bg-white border border-[#e8eeec] shadow-2xs">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}18`, color }}>
            <Icon className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-[#7b8e88]">{title}</span>
        </div>
        <span className="text-xl font-black text-[#111d1a] font-mono">{total}</span>
      </div>

      {hasActivity ? (
        <>
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto mt-2" preserveAspectRatio="none">
            <path d={areaPath} fill={color} opacity="0.08" />
            <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            {points.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={p.value > 0 ? 2.5 : 1.5} fill={p.value > 0 ? color : '#d9e2df'}>
                <title>{`${new Date(p.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}: ${p.value}`}</title>
              </circle>
            ))}
          </svg>
          <div className="flex items-center justify-between text-[10px] text-[#a0afa9] font-mono mt-0.5">
            <span>{firstLabel}</span>
            <span>{lastLabel}</span>
          </div>
        </>
      ) : (
        <div className="h-[88px] flex items-center justify-center">
          <span className="text-[11px] text-[#a0afa9] font-bold">هێشتا هیچ چالاکییەک نییە لەم ماوەیەدا</span>
        </div>
      )}
    </div>
  );
};
