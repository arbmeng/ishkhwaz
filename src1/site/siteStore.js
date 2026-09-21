import { emptyContent, normalize } from './siteContent';

// Editor mode is switched on by ?studio=1 (and remembered for the tab, so moving between pages keeps it).
export const STUDIO = (() => {
  try {
    if (typeof window === 'undefined') return false;
    if (new URLSearchParams(window.location.search).get('studio') === '1') sessionStorage.setItem('ishkhwaz_studio', '1');
    return sessionStorage.getItem('ishkhwaz_studio') === '1' || window.name === 'ishkhwaz-studio';
  } catch { return false; }
})();

// The content being edited, per page. SiteRoot re-applies it whenever it changes.
const contents = {};
const listeners = new Set();
export const siteStore = {
  get: (page) => contents[page] || emptyContent(),
  set: (page, c) => { contents[page] = normalize(c); listeners.forEach((fn) => fn(page)); },
  subscribe: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
};
