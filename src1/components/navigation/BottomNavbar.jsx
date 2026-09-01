import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { soundService } from '../../services/soundService';
import { apiService } from '../../services/api';
import { Home, Search, FileText, MessageCircle, User, Briefcase } from 'lucide-react';

// Hides the bar on scroll-down, brings it back on scroll-up — the standard
// mobile pattern for giving content more room while still reading. Ignored
// near the very top so it doesn't flicker away on a tiny first scroll, and
// always shown again once you're basically back at the top.
const useHideOnScroll = () => {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    lastY.current = window.scrollY;
    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        // A short page (content shorter than the viewport) has nothing to
        // actually scroll — any movement here is just iOS Safari's rubber-band
        // overscroll bounce, not a real scroll gesture, so it must never hide
        // the bar (there'd be no way to get it back without real content to
        // scroll up through).
        const isScrollable = document.documentElement.scrollHeight > window.innerHeight + 20;
        if (!isScrollable) {
          setHidden(false);
          lastY.current = window.scrollY;
          ticking.current = false;
          return;
        }
        const y = window.scrollY;
        const delta = y - lastY.current;
        if (y < 40) {
          setHidden(false);
        } else if (Math.abs(delta) > 6) {
          setHidden(delta > 0);
        }
        lastY.current = y;
        ticking.current = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return hidden;
};

export const BottomNavbar = ({ activeTab, setActiveTab }) => {
  const { user, token } = useAuth();
  const { applications = [], invitations = [] } = useStore();
  const hidden = useHideOnScroll();
  const isEmployer = user?.role === 'employer' || user?.role === 'owner' || user?.role === 'admin';

  // "Things needing your attention" badge — already role-scoped by the
  // backend (an employer's `applications` are only their own jobs' CVs,
  // a freelancer's `invitations` are only offers sent to them).
  const requestsBadge = isEmployer
    ? applications.filter(a => (a.company_status || 'pending') === 'pending').length
    : invitations.filter(i => (i.status || 'pending') === 'pending').length;

  // Real unread-message count for the nav badge — now that the header bar
  // (which used to own this) is gone, the bottom nav is the only place left
  // to surface it.
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const fetchUnread = async () => {
      const threads = await apiService.getMessageThreads(token);
      if (!cancelled && Array.isArray(threads)) {
        setUnreadMessageCount(threads.reduce((sum, t) => sum + (Number(t.unread_count) || 0), 0));
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [token]);

  const handleTabSelect = (tabId) => {
    soundService.playTick();
    setActiveTab(tabId);
  };

  const navItem = (id, Icon, label, iconColor = 'text-[#12796b]', badge = 0) => (
    <div key={id} className="relative flex-1">
      <button
        onClick={() => handleTabSelect(id)}
        className={`w-full flex flex-col items-center justify-center py-1.5 px-2 rounded-2xl transition-all duration-200 relative ${
          activeTab === id ? 'text-slate-900 font-black scale-105' : 'text-slate-500 hover:text-slate-900 font-medium'
        }`}
      >
        {activeTab === id && <span className="absolute -top-1.5 w-7 h-1 rounded-full shadow-sm" style={{ background: '#12796b' }} />}
        <span className="relative">
          <Icon className={`w-5 h-5 mb-0.5 transition-colors ${activeTab === id ? iconColor : 'text-slate-400'}`} />
          {badge > 0 && (
            <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">
              {badge}
            </span>
          )}
        </span>
        <span className="text-[10px] tracking-tight">{label}</span>
      </button>
    </div>
  );

  return createPortal(
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t-2 border-[#12796b]/30 px-3 flex items-center justify-around shadow-[0_-5px_25px_rgba(0,0,0,0.06)] select-none md:hidden"
      style={{
        paddingTop: '10px',
        paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
        transform: hidden ? 'translateY(110%)' : 'translateY(0)',
        transition: 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
      }}>
      {navItem('home',   Home,   'ماڵەوە')}
      {navItem('search', Search, 'گەڕان')}
      {isEmployer
        ? navItem('my_company_dashboard', Briefcase, 'داواکاری', 'text-[#12796b]', requestsBadge)
        : navItem('my_applications',      FileText,  'داواکاری', 'text-[#12796b]', requestsBadge)}
      {navItem('messages', MessageCircle, 'پەیام', 'text-[#12796b]', unreadMessageCount)}
      {navItem('profile',  User,          'پرۆفایل')}
    </nav>,
    document.body
  );
};
