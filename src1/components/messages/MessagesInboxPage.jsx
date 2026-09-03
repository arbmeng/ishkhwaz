import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { apiService } from '../../services/api';
import { soundService } from '../../services/soundService';
import { realtimeService } from '../../services/realtimeService';
import { MessageThreadModal } from './MessageThreadModal';
import { KarnamaAiChatModal } from './KarnamaAiChatModal';
import { MessageSquare, Loader2, Search, X, Headphones, Briefcase, Sparkles, Lock } from 'lucide-react';

const NK = "'Noto Kufi Arabic', 'Vazirmatn', system-ui, sans-serif";

const formatTimeAgo = (isoOrText) => {
  if (!isoOrText) return '';
  const date = new Date(String(isoOrText).replace(' ', 'T'));
  if (isNaN(date.getTime())) return isoOrText;
  const now = new Date();
  const diffMs = now - date;
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'ئێستا';
  if (min < 60) return `${min} خولەک`;
  const isSameDay = date.toDateString() === now.toDateString();
  if (isSameDay) return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'دوێنێ';
  const day = Math.floor(diffMs / 86400000);
  if (day < 7) return `${day} ڕۆژ`;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

const counterpartFor = (thread, currentUserId) => {
  const iAmFreelancer = String(thread.freelancer_id) === String(currentUserId);
  return {
    name: iAmFreelancer
      ? (thread.company_name || 'کۆمپانیا')
      : (thread.freelancer_name || 'کاندید'),
    avatar: iAmFreelancer ? thread.company_avatar : thread.freelancer_avatar,
    isFreelancerView: iAmFreelancer,
  };
};

export const MessagesInboxPage = ({ onNavigate, onEditResumeStyle }) => {
  const { user, token } = useAuth();
  const { addToast } = useStore();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openThread, setOpenThread] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [karnamaAccess, setKarnamaAccess] = useState(null);
  const [showKarnamaAi, setShowKarnamaAi] = useState(false);

  // 100% Real Live Fetch from Database
  const loadThreads = async () => {
    if (!token) {
      setThreads([]);
      setLoading(false);
      return;
    }

    try {
      const res = await apiService.getMessageThreads(token);
      setThreads(Array.isArray(res) ? res : []);
    } catch (e) {
      setThreads([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadThreads();
  }, [token, user?.id]);

  // Real per-plan check (plan_tiers.has_ai_cv_assistant) — decides whether
  // the pinned Karnama AI row opens the chat or a VIP upsell nudge.
  useEffect(() => {
    if (!token) { setKarnamaAccess(false); return; }
    apiService.getAiCvChat(token).then(res => setKarnamaAccess(Boolean(res?.has_access)));
  }, [token]);

  const openKarnamaAi = () => {
    soundService.playTick?.();
    if (karnamaAccess) {
      setShowKarnamaAi(true);
    } else {
      addToast?.({ title: 'تایبەتە بۆ VIP', message: 'کارنامە AI تەنها بۆ ئەندامانی پلانی VIP بەردەستە.', type: 'warning' });
      onNavigate?.('plans');
    }
  };

  // Live real-time update when a new message arrives
  useEffect(() => {
    if (!token) return;
    const off = realtimeService.on?.('new-message', () => loadThreads());
    return off;
  }, [token]);

  const openConversation = (thread) => {
    soundService.playTick?.();
    const cp = counterpartFor(thread, user?.id);
    setOpenThread({
      id: thread.application_id,
      title: thread.job_title || 'هەلی کار',
      jobStatus: thread.job_status === 'accepted' ? 'داواکاری پەسەندکراو' : (thread.job_status === 'rejected' ? 'داواکاری ڕەتکرایەوە' : 'داواکاری چاوەڕوانکراو'),
      counterpart: cp.name,
      avatar: cp.avatar,
      isSupport: Boolean(cp.name?.includes('پشتیگری')),
    });
  };

  const closeConversation = () => {
    setOpenThread(null);
    loadThreads();
  };

  const q = searchTerm.trim().toLowerCase();
  const filteredThreads = !q
    ? threads
    : threads.filter(t => {
        const cp = counterpartFor(t, user?.id);
        return (cp.name || '').toLowerCase().includes(q)
          || (t.job_title || '').toLowerCase().includes(q)
          || (t.last_message || '').toLowerCase().includes(q);
      });

  return (
    <div
      dir="rtl"
      className="min-h-screen pb-28 select-none"
      style={{ background: '#f4f7f6', fontFamily: NK }}
    >
      <div className="max-w-2xl mx-auto px-4 pt-4 sm:pt-6 space-y-4">

        {/* ── Header Title: پەیامەکان ─────────────────────── */}
        <div className="flex items-center justify-between pt-1">
          <h1
            className="text-[26px] sm:text-[28px] font-black text-[#111d1a] tracking-tight text-right leading-none"
          >
            پەیامەکان
          </h1>
        </div>

        {/* ── Search Bar: گەڕان لە پەیامەکان ─────────────────── */}
        <div className="relative">
          <Search
            className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: '#9faea9' }}
          />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="گەڕان لە پەیامەکان"
            className="w-full bg-white rounded-2xl pr-11 pl-9 py-3 text-sm text-[#111d1a] font-bold placeholder-[#9faea9] outline-none border border-[#e8eeed] shadow-[0_2px_12px_rgba(0,0,0,0.03)] focus:border-[#12796b] focus:ring-2 focus:ring-[#12796b]/10 transition-all"
            style={{ fontFamily: NK }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#f0f4f2] flex items-center justify-center active:scale-90 transition-transform"
              aria-label="سڕینەوە"
            >
              <X className="w-3 h-3 text-[#62736e]" />
            </button>
          )}
        </div>

        {/* ── Pinned: Karnama AI (VIP-only conversational CV builder) ── */}
        <button
          type="button"
          onClick={openKarnamaAi}
          className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-4 text-right bg-white rounded-[24px] border shadow-[0_2px_16px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_20px_rgba(18,121,107,0.1)] active:scale-[0.99] transition-all cursor-pointer"
          style={{ borderColor: '#c1ede3' }}
        >
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <div
              className="w-12 h-12 rounded-[18px] flex items-center justify-center text-white shrink-0 shadow-sm relative"
              style={{ background: 'linear-gradient(135deg, #12796b, #0d5c50)' }}
            >
              <Sparkles className="w-6 h-6" />
              {karnamaAccess === false && (
                <span className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full bg-white border border-[#e4eae7] flex items-center justify-center shadow-2xs">
                  <Lock className="w-2.5 h-2.5 text-[#7b8e88]" />
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1 text-right">
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-black text-[#111d1a] truncate leading-tight">کارنامە AI</span>
                <span className="shrink-0 text-[9.5px] font-black px-1.5 py-0.5 rounded-full text-white" style={{ background: '#12796b' }}>VIP</span>
              </div>
              <p className="text-xs text-[#7a8e88] font-bold truncate m-0 mt-1 leading-normal">
                قسەم لەگەڵ بکە، سیڤیەکەت بۆ دروست دەکەم
              </p>
            </div>
          </div>
        </button>

        {/* ── Real Conversation List Card ──────────────────────── */}
        <section
          className="bg-white rounded-[28px] border border-[#e8eeec] shadow-[0_2px_16px_rgba(0,0,0,0.04)] overflow-hidden divide-y divide-[#f2f6f4]"
        >
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-[#12796b]" />
            </div>
          ) : filteredThreads.length === 0 ? (
            <div className="flex flex-col items-center text-center gap-2 py-12 px-6">
              <p className="text-sm font-black text-[#111d1a] m-0">هیچ پەیامێک نەدۆزرایەوە</p>
              <p className="text-xs text-[#8a9e98] font-bold m-0">
                {searchTerm ? 'وشەیەکی تر تاقی بکەرەوە.' : 'کاتێک لەگەڵ کۆمپانیایەک یان فریلانسەرێک گفتوگۆ بکەیت، لێرەدا دەردەکەوێت.'}
              </p>
            </div>
          ) : (
            filteredThreads.map((t, i) => {
              const cp = counterpartFor(t, user?.id);
              const unread = Number(t.unread_count) || 0;
              const isSupport = cp.name?.includes('پشتیگری');

              return (
                <button
                  key={t.application_id || i}
                  type="button"
                  onClick={() => openConversation(t)}
                  className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-4 text-right hover:bg-[#f9fbfb] active:bg-[#f0f6f4] transition-all cursor-pointer group"
                >
                  {/* Right side: Avatar + Text content */}
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    {/* Avatar */}
                    {isSupport ? (
                      <div className="w-12 h-12 rounded-[18px] bg-[#1a776a] flex items-center justify-center text-white shrink-0 shadow-sm">
                        <Headphones className="w-6 h-6" />
                      </div>
                    ) : cp.avatar ? (
                      <img
                        src={cp.avatar}
                        alt={cp.name}
                        className="w-12 h-12 rounded-full object-cover border border-[#e4eae7] shrink-0 shadow-2xs group-hover:border-[#12796b]/40 transition-colors"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-white border border-[#e4eae7] flex items-center justify-center text-[#111d1a] font-black text-base shrink-0 shadow-2xs group-hover:border-[#12796b]/40 transition-colors">
                        {cp.name ? cp.name.trim().charAt(0) : 'ئ'}
                      </div>
                    )}

                    {/* Titles */}
                    <div className="min-w-0 flex-1 text-right">
                      <div className="flex items-center gap-2">
                        <span className="text-[15px] font-black text-[#111d1a] truncate leading-tight">
                          {cp.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-1 min-w-0">
                        <p className={`text-xs truncate m-0 leading-normal ${unread > 0 ? 'text-[#2d3a36] font-bold' : 'text-[#7a8e88] font-medium'}`}>
                          {t.last_message || '—'}
                        </p>
                        {unread > 0 && (
                          <span className="shrink-0 w-5 h-5 rounded-full bg-[#e03131] text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                            {unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Left side: Timestamp */}
                  <div className="shrink-0 text-left">
                    <span dir="ltr" className="text-[11px] text-[#9faea9] font-bold font-mono">
                      {formatTimeAgo(t.last_message_at)}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </section>

        {/* ── Empty Thread Note at bottom ── */}
        <div className="flex flex-col items-center text-center gap-3 pt-8 pb-10 px-6">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xs"
            style={{ background: '#eaf5f2' }}
          >
            <MessageSquare className="w-6 h-6 text-[#12796b]" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-black text-[#111d1a] m-0">
              هیچ پەیامێکی تر نییە
            </h4>
            <p className="text-xs text-[#8a9e98] font-medium leading-relaxed max-w-[280px] m-0">
              کاتێک کۆمپانیایەک وەڵامی داواکاریت دەداتەوە، لێرە دەردەکەوێت.
            </p>
          </div>
        </div>

      </div>

      {/* ── Real Message Thread Modal ─────────────────────────── */}
      {openThread && (
        <MessageThreadModal
          applicationId={openThread.id}
          title={openThread.title}
          jobStatus={openThread.jobStatus}
          counterpart={openThread.counterpart}
          avatar={openThread.avatar}
          isSupport={openThread.isSupport}
          onClose={closeConversation}
        />
      )}

      {/* ── Karnama AI Chat ─────────────────────────────────────── */}
      {showKarnamaAi && (
        <KarnamaAiChatModal onClose={() => setShowKarnamaAi(false)} onNavigate={onNavigate} onEditResumeStyle={onEditResumeStyle} />
      )}
    </div>
  );
};
