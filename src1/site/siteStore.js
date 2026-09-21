import { emptyContent, normalize } from './siteContent';

// Editor mode exists ONLY inside the Zera console's frame (the iframe there is named "ishkhwaz-studio", and the site's
// Content-Security-Policy lets only zeraworld.com frame it). Opening the normal website, with any URL, never turns it on.
export const STUDIO = (() => {
  try { return typeof window !== 'undefined' && window.parent !== window && window.name === 'ishkhwaz-studio'; } catch { return false; }
})();

// The content being edited, per page. SiteRoot re-applies it whenever it changes.
const contents = {};
const listeners = new Set();
export const siteStore = {
  get: (page) => contents[page] || emptyContent(),
  set: (page, c) => { contents[page] = normalize(c); listeners.forEach((fn) => fn(page)); },
  subscribe: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
};
