import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { soundService } from '../../services/soundService';
import { apiService } from '../../services/api';
import { realtimeService } from '../../services/realtimeService';
import { Search, Bell, MessageSquare, Briefcase } from 'lucide-react';

const NK = "'Noto Kufi Arabic', 'Vazirmatn', system-ui, sans-serif";
const TEAL = '#12796b';

export const DesktopHeaderNav = ({ activeTab, setActiveTab }) => {
  const { user, token, logout } = useAuth();
  const { unreadNotifCount = 0 } = useStore();
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [headerSearch, setHeaderSearch] = useState('');

  const isEmployer = user?.role === 'employer' || user?.role === 'owner' || user?.role === 'admin';

  // Live unread message count
  useEffect(() => {
    if (!token) return;
    const fetchUnread = async () => {
      try {
        const threads = await apiService.getMessageThreads?.(token);
        if (Array.isArray(threads)) {
          setUnreadMessageCount(threads.reduce((sum, t) => sum + (Number(t.unread_count) || 0), 0));
        }
      } catch (e) {}
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    const off = realtimeService.on?.('new-message', fetchUnread);
    return () => {
      clearInterval(interval);
      off?.();
    };
  }, [token]);

  const handleNav = (tabId) => {
    soundService.playTick?.();
    setActiveTab(tabId);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (headerSearch.trim()) {
      soundService.playTick?.();
      setActiveTab('search');
    }
  };

  const displayName = user?.name || user?.full_name || 'هەڵمەت';
  const initialChar = displayName.trim().charAt(0) || 'هـ';

  return (
    <header
      dir="rtl"
      className="hidden lg:block w-full bg-white/95 backdrop-blur-md border-b border-[#e8eeec] sticky top-0 z-50 select-none shadow-[0_2px_12px_rgba(0,0,0,0.03)]"
      style={{ fontFamily: NK }}
    >
      <div className="max-w-[1440px] mx-auto px-6 h-[72px] flex items-center justify-between gap-6">

        {/* ── 1. Right Side: Logo & Main Navigation ───────────── */}
        <div className="flex items-center gap-8">
          {/* Brand Logo */}
          <div
            onClick={() => handleNav('home')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-2xl bg-[#12796b] flex items-center justify-center text-white font-black text-xl shadow-sm group-hover:scale-105 transition-transform">
              ئ
            </div>
            <span className="text-xl font-black text-[#111d1a] tracking-tight">
              ئیش خواز
            </span>
          </div>

          {/* Navigation Links with Active Underlines */}
          <nav className="flex items-center gap-1 text-[13px] font-bold">
            <button
              onClick={() => handleNav('home')}
              className={`px-3.5 py-2 rounded-xl transition-all relative ${
                activeTab === 'home'
                  ? 'text-[#12796b] font-black'
                  : 'text-[#5a6b65] hover:text-[#111d1a]'
              }`}
            >
              ماڵەوە
              {activeTab === 'home' && (
                <span className="absolute -bottom-2.5 left-3.5 right-3.5 h-[2.5px] bg-[#12796b] rounded-full" />
              )}
            </button>

            <button
              onClick={() => handleNav('search')}
              className={`px-3.5 py-2 rounded-xl transition-all relative ${
                activeTab === 'search'
                  ? 'text-[#12796b] font-black'
                  : 'text-[#5a6b65] hover:text-[#111d1a]'
              }`}
            >
              گەڕان
              {activeTab === 'search' && (
                <span className="absolute -bottom-2.5 left-3.5 right-3.5 h-[2.5px] bg-[#12796b] rounded-full" />
              )}
            </button>

            <button
              onClick={() => handleNav('companies')}
              className={`px-3.5 py-2 rounded-xl transition-all relative ${
                activeTab === 'companies'
                  ? 'text-[#12796b] font-black'
                  : 'text-[#5a6b65] hover:text-[#111d1a]'
              }`}
            >
              کۆمپانیاکان
              {activeTab === 'companies' && (
                <span className="absolute -bottom-2.5 left-3.5 right-3.5 h-[2.5px] bg-[#12796b] rounded-full" />
              )}
            </button>

            <button
              onClick={() => handleNav('freelancers')}
              className={`px-3.5 py-2 rounded-xl transition-all relative ${
                activeTab === 'freelancers'
                  ? 'text-[#12796b] font-black'
                  : 'text-[#5a6b65] hover:text-[#111d1a]'
              }`}
            >
              کارخوازان
              {activeTab === 'freelancers' && (
                <span className="absolute -bottom-2.5 left-3.5 right-3.5 h-[2.5px] bg-[#12796b] rounded-full" />
              )}
            </button>

            <button
              onClick={() => handleNav('map')}
              className={`px-3.5 py-2 rounded-xl transition-all relative ${
                activeTab === 'map'
                  ? 'text-[#12796b] font-black'
                  : 'text-[#5a6b65] hover:text-[#111d1a]'
              }`}
            >
              نەخشە
              {activeTab === 'map' && (
                <span className="absolute -bottom-2.5 left-3.5 right-3.5 h-[2.5px] bg-[#12796b] rounded-full" />
              )}
            </button>

            <button
              onClick={() => handleNav('plans')}
              className={`px-3.5 py-2 rounded-xl transition-all relative ${
                activeTab === 'plans'
                  ? 'text-[#12796b] font-black'
                  : 'text-[#5a6b65] hover:text-[#111d1a]'
              }`}
            >
              پلانەکان
              {activeTab === 'plans' && (
                <span className="absolute -bottom-2.5 left-3.5 right-3.5 h-[2.5px] bg-[#12796b] rounded-full" />
              )}
            </button>

            <button
              onClick={() => handleNav(isEmployer ? 'my_company_dashboard' : 'my_applications')}
              className={`px-3.5 py-2 rounded-xl transition-all relative flex items-center gap-1.5 ${
                activeTab === 'my_company_dashboard' || activeTab === 'my_applications'
                  ? 'text-[#12796b] font-black'
                  : 'text-[#5a6b65] hover:text-[#111d1a]'
              }`}
            >
              <span>داشبۆرد</span>
              {isEmployer && (
                <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-black">
                  خاوەنکار
                </span>
              )}
              {(activeTab === 'my_company_dashboard' || activeTab === 'my_applications') && (
                <span className="absolute -bottom-2.5 left-3.5 right-3.5 h-[2.5px] bg-[#12796b] rounded-full" />
              )}
            </button>
          </nav>
        </div>

        {/* ── 2. Middle Search Input ──────────────────────────── */}
        <form
          onSubmit={handleSearchSubmit}
          className="flex-1 max-w-xs relative"
        >
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9faea9] pointer-events-none" />
          <input
            value={headerSearch}
            onChange={e => setHeaderSearch(e.target.value)}
            placeholder="گەڕان..."
            className="w-full bg-[#f4f7f6] rounded-full pr-10 pl-4 py-2 text-xs font-bold text-[#111d1a] placeholder-[#9faea9] outline-none border border-[#e8eeed] focus:bg-white focus:border-[#12796b] transition-all"
            style={{ fontFamily: NK }}
          />
        </form>

        {/* ── 3. Left Side: Actions & Profile Pill ─────────────── */}
        <div className="flex items-center gap-3">
          {/* Messages Icon */}
          <button
            onClick={() => handleNav('messages')}
            className="w-10 h-10 rounded-2xl bg-[#f4f7f6] border border-[#e8eeed] flex items-center justify-center text-[#4a5854] hover:bg-[#eaf5f2] active:scale-95 transition relative"
            title="پەیامەکان"
          >
            <MessageSquare className="w-4.5 h-4.5" />
            {unreadMessageCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#e03131] text-white text-[9px] font-black flex items-center justify-center">
                {unreadMessageCount}
              </span>
            )}
          </button>

          {/* Notification Bell */}
          <button
            onClick={() => handleNav('notifications')}
            className="w-10 h-10 rounded-2xl bg-[#f4f7f6] border border-[#e8eeed] flex items-center justify-center text-[#4a5854] hover:bg-[#eaf5f2] active:scale-95 transition relative"
            title="ئاگادارکردنەوەکان"
          >
            <Bell className="w-4.5 h-4.5" />
            {unreadNotifCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#e03131]" />
            )}
          </button>

          {/* User Profile Pill Button */}
          {user ? (
            <button
              onClick={() => handleNav('profile')}
              className="flex items-center gap-2.5 py-1.5 px-3 rounded-full bg-[#f4f7f6] hover:bg-[#eaf5f2] border border-[#e8eeed] transition active:scale-95 cursor-pointer"
            >
              <span className="text-xs font-black text-[#111d1a]">
                {displayName}
              </span>
              <div className="w-8 h-8 rounded-full bg-[#c8eee6] flex items-center justify-center text-[#12796b] font-black text-xs shrink-0 overflow-hidden border border-white">
                {user.avatar ? (
                  <img src={user.avatar} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <span>{initialChar}</span>
                )}
              </div>
            </button>
          ) : (
            <button
              onClick={() => handleNav('login')}
              className="px-5 py-2 rounded-xl bg-[#12796b] text-white text-xs font-black hover:bg-[#0d5c50] transition shadow-sm"
            >
              چوونەژوورەوە
            </button>
          )}
        </div>

      </div>
    </header>
  );
};
