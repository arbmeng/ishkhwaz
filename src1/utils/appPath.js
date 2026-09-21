// The website lives at "/" (landing page); the app itself lives under "/app/".
// Internal code keeps thinking in plain paths ("/search", "/jobs/12"); this module maps them.
export const APP_BASE = '/app';

const inApp = (p) => p === APP_BASE || p.startsWith(APP_BASE + '/') || p.startsWith(APP_BASE + '?') || p.startsWith(APP_BASE + '#');

// The current path as the app understands it: "/app/search" -> "/search". Old unprefixed links
// ("/search", "/login", emailed reset links...) keep working because they simply pass through.
export const getAppPath = () => {
  if (typeof window === 'undefined') return '/';
  const p = window.location.pathname;
  if (p === APP_BASE || p.startsWith(APP_BASE + '/')) return p.slice(APP_BASE.length) || '/';
  return p;
};

// True only for the bare website root (the landing page), not "/app/".
export const isSiteRoot = () => typeof window !== 'undefined' && window.location.pathname === '/';

export const withApp = (p) => (p === '/' ? APP_BASE + '/' : APP_BASE + p);

const prefixUrl = (u) => {
  if (typeof u !== 'string' || !u.startsWith('/') || u.startsWith('//')) return u;
  if (u === '/' || inApp(u) || u.startsWith('/share/') || u.startsWith('/api/')) return u;
  return APP_BASE + u;
};

// Every pushState/replaceState the app makes ("/search/freelancers/5", "/companies?...") gets the
// /app prefix automatically, so individual pages don't each have to know about it.
let installed = false;
export const installHistoryPrefix = () => {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  const wrap = (name) => {
    const orig = window.history[name].bind(window.history);
    window.history[name] = (state, title, url) => orig(state, title, url == null ? url : prefixUrl(String(url)));
  };
  wrap('pushState');
  wrap('replaceState');
};
