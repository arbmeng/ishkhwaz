import React, { useRef, useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { soundService } from '../../services/soundService';

const PULL_TRIGGER = 64;
const PULL_MAX = 96;

// A small, bare, single-tone spinner — modeled on Mobile Safari's own
// pull-to-refresh indicator (a thin gray partial ring, no card/bubble behind
// it, no color change on release) rather than a bold two-tone app spinner.
const PullSpinner = ({ progress, refreshing }) => {
  const size = 15;
  const stroke = 1.6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const arc = refreshing ? c * 0.24 : c * Math.min(Math.max(progress, 0.06), 1);
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={refreshing ? 'animate-spin' : ''}
      style={{
        transform: refreshing ? undefined : `rotate(${-90 + progress * 360}deg)`,
        transition: refreshing ? 'none' : 'transform 0.1s linear',
      }}
    >
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={`${arc} ${c - arc}`}
      />
    </svg>
  );
};

// App-wide pull-to-refresh: drag down from the top of any page and release
// to re-sync live data (jobs, applications, notifications, categories,
// settings, plan tiers — everything StoreContext's syncBackendData covers).
// Wraps the whole <main> content area in App.jsx so every page gets it,
// not just one. A page that needs to refresh something extra of its own
// (e.g. UserProfilePage's viewers/purchases) still does that itself via its
// own effects — this only owns the shared gesture + the shared data sync.
export const PullToRefresh = ({ children }) => {
  const { syncBackendData } = useStore();
  const touchStartY = useRef(0);
  const pulling = useRef(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const handleTouchStart = (e) => {
    if (window.scrollY <= 0 && !refreshing) {
      touchStartY.current = e.touches[0].clientY;
      pulling.current = true;
    }
  };

  const handleTouchMove = (e) => {
    if (!pulling.current || refreshing) return;
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 0 && window.scrollY <= 0) {
      setPullDistance(Math.min(delta * 0.5, PULL_MAX));
    } else {
      pulling.current = false;
      setPullDistance(0);
    }
  };

  const finishPull = async () => {
    pulling.current = false;
    if (pullDistance >= PULL_TRIGGER) {
      soundService.playTick?.();
      setRefreshing(true);
      setPullDistance(PULL_TRIGGER);
      try {
        await syncBackendData?.();
        soundService.playSuccess?.();
      } finally {
        setRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  };

  const handleTouchEnd = () => {
    if (pulling.current) finishPull();
  };

  // If the browser cancels the touch instead of ending it normally (it
  // decides mid-drag this is a native scroll), handleTouchEnd never runs
  // and the indicator is left stuck on-screen. This is the reset for that.
  const handleTouchCancel = () => {
    pulling.current = false;
    setPullDistance(0);
  };

  return (
    <div onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} onTouchCancel={handleTouchCancel}>
      <div
        aria-hidden={pullDistance === 0}
        style={{
          height: pullDistance,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          transition: pulling.current ? 'none' : 'height 0.28s ease',
        }}
      >
        <div style={{ color: '#9aa39d', opacity: Math.min(pullDistance / PULL_TRIGGER, 1) }}>
          <PullSpinner progress={pullDistance / PULL_TRIGGER} refreshing={refreshing} />
        </div>
      </div>
      {children}
    </div>
  );
};
