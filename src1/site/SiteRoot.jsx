import React, { useEffect, useRef } from 'react';
import { applyContent, clearApplied, normalize } from './siteContent';
import { API_BASE_URL } from '../services/api';
import { siteStore, STUDIO } from './siteStore';

const cacheKey = (page) => `ishkhwaz_site_${page}`;

// Wraps one public page. Visitors see the PUBLISHED content; inside the visual editor the draft is shown live.
// The wrapper has no box of its own (display: contents), so the page layout is exactly what it always was.
export const SiteRoot = ({ page, children }) => {
  const ref = useRef(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return undefined;
    let timer = null;
    const run = () => applyContent(root, STUDIO ? siteStore.get(page) : contentRef.current);
    const contentRef = { current: null };

    if (!STUDIO) {
      // show the last known content immediately (no flash on repeat visits), then refresh it from the server
      try { const c = localStorage.getItem(cacheKey(page)); if (c) contentRef.current = normalize(JSON.parse(c)); } catch { /* ignore */ }
      run();
      fetch(`${API_BASE_URL}/site-content?page=${page}`).then((r) => r.json()).then((d) => {
        if (!d?.success) return;
        contentRef.current = normalize(d.content);
        try { localStorage.setItem(cacheKey(page), JSON.stringify(contentRef.current)); } catch { /* ignore */ }
        run();
      }).catch(() => { });
    }

    const schedule = () => { clearTimeout(timer); timer = setTimeout(run, 120); };
    // React re-renders (accordions, menus, route changes inside the page) may create new elements: re-apply
    const mo = new MutationObserver(schedule);
    mo.observe(root, { childList: true, subtree: true });
    const off = siteStore.subscribe((p) => { if (STUDIO && p === page) run(); });
    if (STUDIO) run();

    return () => { clearTimeout(timer); mo.disconnect(); off(); clearApplied(root); };
  }, [page]);

  return <div ref={ref} data-site-root={page} style={{ display: 'contents' }}>{children}</div>;
};
