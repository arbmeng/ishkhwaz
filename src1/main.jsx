import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Required for real installability (Android's "Install App" prompt needs an active
// service worker) and for push notifications to ever be receivable at all.
//
// This also makes deploys reach already-open sessions automatically and
// silently — no visible "update available" prompt (that turned into a
// second, redundant refresh icon alongside the profile page's own
// pull-to-refresh). sw.js calls skipWaiting() + clients.claim() on its own,
// so once it's fetched a new build, that new worker takes control on its
// own. Browsers only *check* for a new service worker on real navigation,
// which a long-lived open PWA tab may never do, so we also poke
// registration.update() on focus/visibility and every 5 minutes.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      const checkForUpdate = () => registration.update().catch(() => {});
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') checkForUpdate();
      });
      window.addEventListener('focus', checkForUpdate);
      setInterval(checkForUpdate, 5 * 60 * 1000);

      let reloaded = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloaded) return;
        reloaded = true;
        window.location.reload();
      });
    }).catch(() => {});
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
