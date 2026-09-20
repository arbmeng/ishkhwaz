import { useEffect } from 'react';

// Freezes the page behind an open dialog. Pinning <body> with position:fixed (and restoring the
// exact scroll offset afterwards) also stops the iOS/Android "rubber-band" scroll chaining that
// plain overflow:hidden doesn't, so the background can't move while the dialog is up.
export const useScrollLock = (active) => {
  useEffect(() => {
    if (!active || typeof document === 'undefined') return undefined;
    const y = window.scrollY;
    const { style } = document.body;
    const prev = { position: style.position, top: style.top, left: style.left, right: style.right, width: style.width, overflow: style.overflow };
    style.position = 'fixed';
    style.top = `-${y}px`;
    style.left = '0';
    style.right = '0';
    style.width = '100%';
    style.overflow = 'hidden';
    return () => {
      Object.assign(style, prev);
      window.scrollTo(0, y);
    };
  }, [active]);
};
