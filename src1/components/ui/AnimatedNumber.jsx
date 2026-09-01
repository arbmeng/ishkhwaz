import React, { useEffect, useRef, useState } from 'react';

// Counts up from 0 to a real value once, on mount — the value itself is
// always real data passed in by the caller, this only animates how it's
// revealed.
export const AnimatedNumber = ({ value, duration = 900, format = (n) => n.toLocaleString() }) => {
  const [display, setDisplay] = useState(0);
  const startRef = useRef(null);
  const numericTarget = Number(value) || 0;

  useEffect(() => {
    startRef.current = null;
    let raf;
    const step = (ts) => {
      if (startRef.current === null) startRef.current = ts;
      const progress = Math.min(1, (ts - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(numericTarget * eased));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [numericTarget, duration]);

  return <>{format(display)}</>;
};
