import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { apiService } from '../../services/api';
import { SoundToggle } from '../ui/SoundToggle';
import { PlanBadge } from '../ui/PlanBadge';
import { soundService } from '../../services/soundService';
import { pushService } from '../../services/pushService';
import { getPlanColor } from '../../utils/planPresets';
import { realtimeService } from '../../services/realtimeService';
import {
  Bell,
  User,
  Home,
  Search,
  FileText,
  MapPin,
  LogOut,
  ShieldCheck,
  Crown,
  X,
  Sparkles,
  ChevronLeft,
  Building2,
  Briefcase,
  PlusCircle,
  ShieldAlert,
  MessageCircle
} from 'lucide-react';

export const HeaderNavbar = ({ activeTab, setActiveTab, showSidebarDrawer: propShowDrawer, setShowSidebarDrawer: propSetShowDrawer }) => {
  const { user, token, logout, openAuthModal } = useAuth();
  const { notifications = [], unreadNotifCount = 0, markAllRead, planTiers = [], applications = [], invitations = [] } = useStore();

  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [internalShowDrawer, setInternalShowDrawer] = useState(false);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const notifWrapperRef = useRef(null);

  // Same "things needing your attention" count as BottomNavbar's badge —
  // pending CVs to review for an employer, pending offers to answer for a
  // freelancer — kept in sync here too so the drawer's Requests row isn't
  // silently out of date with the bottom nav.
  const isEmployerRole = user?.role === 'employer' || user?.role === 'owner' || user?.role === 'admin';
  const requestsBadge = isEmployerRole
    ? applications.filter(a => (a.company_status || 'pending') === 'pending').length
    : invitations.filter(i => (i.status || 'pending') === 'pending').length;

  // Drawer open/close as a real transition, not an instant mount/unmount —
  // `rendered` keeps the DOM node around long enough for the close animation
  // to actually play, `mounted` is what the transform/opacity react to (set
  // one frame after mount so the browser has something to animate FROM).
  const [drawerRendered, setDrawerRendered] = useState(false);
  const [drawerMounted, setDrawerMounted] = useState(false);

  // Already on a paid plan — the VIP upsell button has nothing left to sell them.
  const currentPlanTier = planTiers.find(t => t.id === user?.plan);
  const isPaidPlan = !!currentPlanTier && Number(currentPlanTier.price) > 0;

  // Paid-plan avatar ring — whatever tier the account actually has (vip, pro,
  // or any other admin-defined paid plan) gets that tier's own gradient
  // border straight from its color preset, instead of a fixed lime ring.
  const avatarPlanColor = isPaidPlan ? getPlanColor(currentPlanTier.color) : null;

  // Click-outside closes the notification popup, same as any normal dropdown.
  useEffect(() => {
    if (!showNotifMenu) return;
    const handleOutside = (e) => {
      if (notifWrapperRef.current && !notifWrapperRef.current.contains(e.target)) {
        setShowNotifMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [showNotifMenu]);

  // Real server-side unread count (messages have true read_at state, unlike
  // notifications' client-only localStorage-timestamp trick). The 30s poll
  // is now just a safety net — realtimeService's 'new-message' listener
  // below updates the badge the instant a message actually arrives.
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
    const offNewMessage = realtimeService.on('new-message', fetchUnread);
    return () => { cancelled = true; clearInterval(interval); offNewMessage(); };
  }, [token]);

  const showSidebarDrawer = propShowDrawer !== undefined ? propShowDrawer : internalShowDrawer;
  const setShowSidebarDrawer = propSetShowDrawer || setInternalShowDrawer;

  useEffect(() => {
    if (showSidebarDrawer) {
      setDrawerRendered(true);
      const raf = requestAnimationFrame(() => requestAnimationFrame(() => setDrawerMounted(true)));
      return () => cancelAnimationFrame(raf);
    }
    setDrawerMounted(false);
    const t = setTimeout(() => setDrawerRendered(false), 320);
    return () => clearTimeout(t);
  }, [showSidebarDrawer]);

  const unreadCount = unreadNotifCount;

  const toggleNotifMenu = () => {
    const opening = !showNotifMenu;
    setShowNotifMenu(opening);
    // Seeing the list is enough — clear the badge automatically, no extra click needed.
    if (opening) markAllRead?.();
  };

  const handleTabClick = (tabId) => {
    soundService.playTick();
    setActiveTab(tabId);
    setShowSidebarDrawer(false);
  };

  return (
    <>
      {/* 1. TOP HEADER — safe-area-inset-top for PWA notch/camera fix */}
      <header
        className="sticky top-0 z-50 w-full border-b-2 border-lime-400/50 bg-white/95 backdrop-blur-xl shadow-[0_4px_25px_rgba(0,0,0,0.06)] select-none transition-all"
        style={{ paddingTop: 'max(12px, env(safe-area-inset-top))', paddingBottom: '12px', paddingLeft: '1rem', paddingRight: '1rem' }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">

          {/* RIGHT SIDE (RTL): USER AVATAR/ICON & NAME */}
          <div className="flex items-center gap-3">
            {user ? (
              <div
                onClick={() => handleTabClick('profile')}
                className="flex items-center gap-3 cursor-pointer group"
              >
                {user.avatar ? (
                  <div
                    className="w-10 h-10 rounded-2xl overflow-hidden shadow-md"
                    style={isPaidPlan
                      ? { padding: 2, background: avatarPlanColor.gradient || avatarPlanColor.accent, boxShadow: `0 4px 14px ${avatarPlanColor.accent}66` }
                      : { padding: 2, background: '#e2e8f0' }}
                  >
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover rounded-[10px]" />
                  </div>
                ) : (
                  <div
                    className="w-10 h-10 rounded-2xl shadow-md"
                    style={isPaidPlan
                      ? { padding: 2, background: avatarPlanColor.gradient || avatarPlanColor.accent, boxShadow: `0 4px 14px ${avatarPlanColor.accent}66` }
                      : { padding: 2, background: '#e2e8f0' }}
                  >
                    <div className="w-full h-full rounded-[10px] bg-slate-950 text-lime-400 font-bold flex items-center justify-center">
                      <User className="w-5 h-5" />
                    </div>
                  </div>
                )}

                <div className="text-right">
                  <span className="text-xs font-black text-slate-900 flex items-center gap-1.5 group-hover:text-lime-600 transition">
                    {user.name || 'بەکارهێنەر'}
                    <PlanBadge plan={user.plan} />
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 block">
                    {user.role === 'owner' ? '👑 بەڕێوەبەر (Owner)' : user.role === 'employer' ? '🏢 خاوەنکار (Employer)' : '👤 کارخواز (Candidate)'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2" onClick={() => handleTabClick('home')}>
                <div className="w-10 h-10 rounded-2xl bg-slate-950 p-1 border border-slate-800 shadow-md flex items-center justify-center">
                  <img src="/logo-v2.png" alt="Ishkhwaz Logo" className="w-full h-full object-contain" />
                </div>
                <div className="text-right">
                  <h1 className="text-base font-black text-slate-900 tracking-tight">ئیش خواز</h1>
                  <span className="text-[10px] font-semibold text-slate-500">ISHKHWAZ</span>
                </div>
              </div>
            )}
          </div>

          {/* DESKTOP CENTER NAVIGATION ITEMS */}
          <nav className="hidden md:flex items-center gap-1.5 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200">
            <button
              onClick={() => handleTabClick('home')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${activeTab === 'home'
                ? 'bg-slate-950 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <Home className="w-4 h-4" />
              <span>سەرەتا</span>
            </button>

            <button
              onClick={() => handleTabClick('search')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${activeTab === 'search'
                ? 'bg-slate-950 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <Search className="w-4 h-4" />
              <span>گەڕان</span>
            </button>

            {(user?.role === 'employer' || user?.role === 'owner' || user?.role === 'admin') ? (
              <button
                onClick={() => handleTabClick('my_company_dashboard')}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${activeTab === 'my_company_dashboard'
                  ? 'bg-slate-950 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                <Briefcase className="w-4 h-4" />
                <span>داشبۆردی کۆمپانیا</span>
              </button>
            ) : (
              <button
                onClick={() => handleTabClick('my_applications')}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${activeTab === 'my_applications'
                  ? 'bg-slate-950 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                <FileText className="w-4 h-4" />
                <span>داواکارییەکان</span>
              </button>
            )}

            <button
              onClick={() => handleTabClick('map')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${activeTab === 'map'
                ? 'bg-slate-950 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <MapPin className="w-4 h-4 text-lime-400" />
              <span>نەخشە</span>
            </button>
          </nav>

          {/* LEFT SIDE (RTL): MENU ICON & NOTIFICATION ICON */}
          <div className="flex items-center gap-2 sm:gap-3">

            {/* ADMIN/OWNER: full control now lives in the Zera Console, not here */}
            {(user?.role === 'owner' || user?.role === 'admin') && (
              <a
                href="https://zeraworld.com/console/ishkhwaz/"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => soundService.playTick()}
                className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all active:scale-95 shadow-md hover:shadow-lg border bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-950 hover:text-lime-400"
                title="کۆنترۆڵی تەواو لە Zera Console"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>{user.role === 'owner' ? 'سەنتەری خاوەن' : 'پانێڵی ئەدمین'}</span>
              </a>
            )}

            {/* EMPLOYER: Post Job Button */}
            {(user?.role === 'employer' || user?.role === 'owner' || user?.role === 'admin') && (
              <button
                onClick={() => { soundService.playTick(); setActiveTab('post_job'); }}
                className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all active:scale-95 shadow-md hover:shadow-lg"
                style={{ background: 'linear-gradient(135deg,#a3e635,#65a30d)', color: '#0d1117' }}
                title="بڵاوکردنی ئیشی نوێ"
              >
                <PlusCircle className="w-4 h-4" />
                <span>بڵاوکردنی ئیش</span>
              </button>
            )}

            {/* VIP / Plans shortcut — same chrome as the notification button, just
                gold. Hidden once the user already has a paid plan — nothing left
                to upsell them on. */}
            {!isPaidPlan && (
              <button
                onClick={() => { soundService.playTick(); handleTabClick('plans'); }}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2.5 rounded-2xl border text-xs font-black transition-all active:scale-95 hover:border-current"
                style={{ background: '#fdf6e3', borderColor: '#eaceA0', color: '#a16207' }}
                title="پلانەکان"
              >
                <Crown className="w-5 h-5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">VIP</span>
              </button>
            )}

            {/* Messages Icon */}
            <button
              onClick={() => { soundService.playTick(); handleTabClick('messages'); }}
              className="p-2.5 rounded-2xl border border-slate-200 bg-slate-100 text-slate-700 hover:text-slate-900 hover:border-slate-300 transition-all relative"
              title="پەیامەکان"
            >
              <MessageCircle className="w-5 h-5" />
              {unreadMessageCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-lime-500 text-slate-950 text-[10px] font-black flex items-center justify-center animate-pulse">
                  {unreadMessageCount}
                </span>
              )}
            </button>

            {/* Notification Icon */}
            <div className="relative" ref={notifWrapperRef}>
              <button
                onClick={() => { soundService.playTick(); toggleNotifMenu(); }}
                className="p-2.5 rounded-2xl border border-slate-200 bg-slate-100 text-slate-700 hover:text-slate-900 hover:border-slate-300 transition-all relative"
                title="ئاگادارکردنەوەکان"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-lime-500 text-slate-950 text-[10px] font-black flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Menu Popup */}
              {showNotifMenu && (
                <div className="absolute left-0 mt-3 w-80 bg-white border border-slate-200 rounded-3xl p-4 shadow-2xl z-50 animate-slide-up text-right">
                  <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                    <h4 className="text-xs font-bold text-slate-900">ئاگادارکردنەوەکان</h4>
                    <span className="text-[10px] text-slate-400 font-bold">هەموو خوێنراوە</span>
                  </div>

                  {notifications.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4 font-medium">هیچ ئاگادارکردنەوەیەکی نوێ نییە</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {notifications.map((n, i) => (
                        <div key={i} className="p-2.5 rounded-xl border text-xs space-y-1 transition-all bg-slate-50 border-slate-100">
                          <div className="flex items-start gap-1.5">
                            <span className="font-bold text-slate-900 block">{n.title}</span>
                          </div>
                          <p className="text-slate-600 text-[11px] leading-relaxed pr-3.5">{n.body || n.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Menu Drawer removed — navigation handled by sidebar drawer on profile click */}

          </div>

        </div>
      </header>

      {/* SIDEBAR DRAWER — a real open/close transition (see drawerRendered/
          drawerMounted above) instead of instantly popping in and out, plus
          each nav row staggers in on its own tiny delay for a smoother feel. */}
      {drawerRendered && (
        <div
          className="fixed inset-0 z-[9999] flex justify-start"
          style={{
            background: drawerMounted ? 'rgba(9,14,11,0.55)' : 'rgba(9,14,11,0)',
            backdropFilter: drawerMounted ? 'blur(6px)' : 'blur(0px)',
            WebkitBackdropFilter: drawerMounted ? 'blur(6px)' : 'blur(0px)',
            transition: 'background-color 0.32s cubic-bezier(.22,1,.36,1), backdrop-filter 0.32s cubic-bezier(.22,1,.36,1)',
          }}
          onClick={() => setShowSidebarDrawer(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-80 max-w-[85vw] h-full bg-white flex flex-col justify-between text-right overflow-hidden"
            style={{
              borderRadius: '0 28px 28px 0',
              boxShadow: '0 30px 80px -20px rgba(9,14,11,0.45)',
              transform: drawerMounted ? 'translateX(0)' : 'translateX(100%)',
              transition: 'transform 0.36s cubic-bezier(.22,1,.36,1)',
            }}
          >
            {/* Identity header — real user data, not just the app logo */}
            <div className="relative shrink-0 px-5" style={{ paddingTop: 'max(20px, calc(env(safe-area-inset-top) + 8px))', paddingBottom: 22, background: 'linear-gradient(160deg,#0c1512,#1d2c23)' }}>
              <button
                onClick={() => setShowSidebarDrawer(false)}
                className="absolute p-2 rounded-full bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition active:scale-90"
                style={{ top: 'max(16px, calc(env(safe-area-inset-top) + 4px))', insetInlineStart: 16 }}
              >
                <X className="w-4 h-4" />
              </button>

              {user ? (
                <div className="flex items-center gap-3 pt-1">
                  {user.avatar ? (
                    <div className="w-14 h-14 rounded-2xl overflow-hidden ring-2 ring-lime-400 shadow-lg shrink-0">
                      <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-white/10 text-lime-400 flex items-center justify-center shrink-0">
                      <User className="w-6 h-6" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-black text-white text-[15px] truncate">{user.name || 'بەکارهێنەر'}</h3>
                      <PlanBadge plan={user.plan} />
                    </div>
                    <p className="text-[11px] text-white/50 font-bold mt-0.5">
                      {user.role === 'owner' ? '👑 بەڕێوەبەر' : user.role === 'admin' ? '🛡️ ئەدمین' : user.role === 'employer' ? '🏢 خاوەنکار' : '👤 کارخواز'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 pt-1">
                  <div className="w-14 h-14 rounded-2xl bg-white/10 p-2 shrink-0">
                    <img src="/logo-v2.png" alt="Ishkhwaz Logo" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <h3 className="font-black text-white text-[15px]">ئیش خواز</h3>
                    <p className="text-[11px] text-white/50 font-bold">ISHKHWAZ</p>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation Links — data-driven so each row's stagger delay is
                just its index, instead of duplicating markup per item. */}
            <div className="flex-1 overflow-y-auto px-3.5 pt-4 pb-2 space-y-1.5">
              {[
                { id: 'home', label: 'سەرەتا', Icon: Home, color: '#65a30d', bg: '#f2f8e8' },
                { id: 'search', label: 'گەڕان', Icon: Search, color: '#0284c7', bg: '#eef8fd' },
                { id: 'my_applications', label: 'داواکارییەکان', Icon: FileText, color: '#059669', bg: '#ecfdf5', badge: requestsBadge },
                { id: 'messages', label: 'پەیامەکان', Icon: MessageCircle, color: '#6366f1', bg: '#eef2ff', badge: unreadMessageCount },
                { id: 'map', label: 'نەخشە', Icon: MapPin, color: '#d97706', bg: '#fffbeb' },
                { id: 'companies', label: 'کۆمپانیاکان', Icon: Building2, color: '#7c3aed', bg: '#f5f3ff' },
                { id: 'profile', label: 'پڕۆفایلەکەم', Icon: User, color: '#65a30d', bg: '#f2f8e8' },
                { id: 'plans', label: 'پلانەکان', Icon: Crown, color: '#d97706', bg: '#fffbeb', accent: !isPaidPlan },
              ].map((item, i) => {
                const active = activeTab === item.id;
                const Icon = item.Icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabClick(item.id)}
                    className="w-full rounded-2xl flex items-center justify-between transition-all active:scale-[0.98]"
                    style={{
                      padding: '10px 12px',
                      background: active ? '#0c1512' : item.accent ? '#fffbeb' : 'transparent',
                      border: `1px solid ${active ? '#0c1512' : item.accent ? '#fde8b8' : 'transparent'}`,
                      transitionDelay: drawerMounted ? `${Math.min(i, 8) * 35}ms` : '0ms',
                      transitionProperty: 'transform, opacity, background-color, border-color',
                      transitionDuration: '0.32s',
                      transitionTimingFunction: 'cubic-bezier(.22,1,.36,1)',
                      transform: drawerMounted ? 'translateX(0)' : 'translateX(24px)',
                      opacity: drawerMounted ? 1 : 0,
                    }}
                    onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = '#f7f9f6'; }}
                    onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = item.accent ? '#fffbeb' : 'transparent'; }}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: active ? 'rgba(255,255,255,0.1)' : item.bg, color: active ? '#c6f24e' : item.color }}
                      >
                        <Icon className="w-4 h-4" />
                      </span>
                      <span className="text-xs font-black" style={{ color: active ? '#fff' : item.accent ? '#92400e' : '#1e2a24' }}>{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.badge > 0 && (
                        <span className="min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[10px] font-black" style={{ background: active ? '#c6f24e' : '#ef4444', color: active ? '#0c1512' : '#fff' }}>
                          {item.badge}
                        </span>
                      )}
                      <ChevronLeft className="w-3.5 h-3.5" style={{ color: active ? 'rgba(255,255,255,0.4)' : '#a3ada7' }} />
                    </div>
                  </button>
                );
              })}

              {(user?.role === 'owner' || user?.role === 'admin') && (
                <a
                  href="https://zeraworld.com/console/ishkhwaz/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full rounded-2xl flex items-center justify-between transition-all"
                  style={{ padding: '10px 12px', background: '#f7f9f6', border: '1px solid #edf1ec' }}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#0c1512', color: '#c6f24e' }}>
                      <ShieldAlert className="w-4 h-4" />
                    </span>
                    <span className="text-xs font-black" style={{ color: '#1e2a24' }}>
                      {user.role === 'owner' ? 'سەنتەری خاوەن' : 'پانێڵی ئەدمین'}
                    </span>
                  </div>
                  <ChevronLeft className="w-3.5 h-3.5" style={{ color: '#a3ada7' }} />
                </a>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="shrink-0 p-4 pt-3" style={{ borderTop: '1px solid #edf1ec' }}>
              <button
                onClick={() => {
                  soundService.playTick();
                  logout();
                  setShowSidebarDrawer(false);
                }}
                className="w-full py-3 rounded-2xl font-extrabold text-xs flex items-center justify-center gap-2 transition active:scale-[0.98]"
                style={{ background: '#fdf6f5', border: '1px solid #f0dcda', color: '#b1352e' }}
              >
                <LogOut className="w-4 h-4" />
                <span>دەرچوون لە ئەژمێر</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
