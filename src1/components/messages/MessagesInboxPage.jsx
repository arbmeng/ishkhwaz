import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { apiService } from '../../services/api';
import { soundService } from '../../services/soundService';
import { realtimeService } from '../../services/realtimeService';
import { MessageThreadModal } from './MessageThreadModal';
import { KarnamaAiChatModal } from './KarnamaAiChatModal';
import { AppGuideChatModal } from './AppGuideChatModal';
import { PageHeader } from '../layout/PageHeader';
import { MessageSquare, Loader2, Search, X, Headphones, Briefcase, Sparkles, Lock, HelpCircle } from 'lucide-react';

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

// Karnama AI + app-guide rows are hidden for now; flip to true to bring them back.
const SHOW_PINNED_ASSISTANTS = false;

export const MessagesInboxPage = ({ onNavigate, onEditResumeStyle }) => {
  const { user, token } = useAuth();
  const { addToast } = useStore();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openThread, setOpenThread] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [karnamaAccess, setKarnamaAccess] = useState(null);
  const [showKarnamaAi, setShowKarnamaAi] = useState(false);
  const [showAppGuide, setShowAppGuide] = useState(false);

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
      style={{ background: '#f5f4f7', fontFamily: NK }}
    >
      <PageHeader title="پەیامەکان" subtitle="گفتوگۆکانت لەگەڵ کۆمپانیا و کارخوازان" />

      <div className="max-w-2xl mx-auto px-4 pt-5 sm:pt-6 space-y-4">

        {SHOW_PINNED_ASSISTANTS && (<>
        {/* ── Pinned: Karnama AI (VIP-only conversational CV builder) ── */}
        <button
          type="button"
          onClick={openKarnamaAi}
          className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-4 text-right bg-white rounded-[24px] border shadow-[0_2px_16px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_20px_rgba(100,27,217,0.1)] active:scale-[0.99] transition-all cursor-pointer"
          style={{ borderColor: '#d2c0ee' }}
        >
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <div
              className="w-12 h-12 rounded-[18px] flex items-center justify-center text-white shrink-0 shadow-sm relative"
              style={{ background: 'linear-gradient(135deg, #641bd9, #4b13a5)' }}
            >
              <Sparkles className="w-6 h-6" />
              {karnamaAccess === false && (
                <span className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full bg-white border border-[#e6e4ea] flex items-center justify-center shadow-2xs">
                  <Lock className="w-2.5 h-2.5 text-[#7b8e88]" />
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1 text-right">
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-black text-[#16111d] truncate leading-tight">کارنامە AI</span>
                <span className="shrink-0 text-[9.5px] font-black px-1.5 py-0.5 rounded-full text-white" style={{ background: '#641bd9' }}>VIP</span>
              </div>
              <p className="text-xs text-[#7a8e88] font-bold truncate m-0 mt-1 leading-normal">
                قسەم لەگەڵ بکە، سیڤیەکەت بۆ دروست دەکەم
              </p>
            </div>
          </div>
        </button>

        {/* ── Pinned: App Guide (general FAQ assistant, open to everyone) ── */}
        <button
          type="button"
          onClick={() => { soundService.playTick?.(); setShowAppGuide(true); }}
          className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-4 text-right bg-white rounded-[24px] border border-[#eae8ee] shadow-[0_2px_16px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] active:scale-[0.99] transition-all cursor-pointer"
        >
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <div className="w-12 h-12 rounded-[18px] bg-[#16111d] flex items-center justify-center text-white shrink-0 shadow-sm">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1 text-right">
              <span className="text-[15px] font-black text-[#16111d] truncate leading-tight block">ڕێبەری ئەپ</span>
              <p className="text-xs text-[#7a8e88] font-bold truncate m-0 mt-1 leading-normal">
                پرسیار دەربارەی چۆنیەتی بەکارهێنانی ئیش خواز بکە
              </p>
            </div>
          </div>
        </button>
        </>)}

        {/* ── Real Conversation List Card ──────────────────────── */}
        <section
          className="bg-white rounded-[28px] border border-[#eae8ee] shadow-[0_2px_16px_rgba(0,0,0,0.04)] overflow-hidden divide-y divide-[#f4f2f6]"
        >
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-[#641bd9]" />
            </div>
          ) : filteredThreads.length === 0 ? (
            <div className="flex flex-col items-center text-center gap-2 py-12 px-6">
              <p className="text-sm font-black text-[#16111d] m-0">هیچ پەیامێک نەدۆزرایەوە</p>
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
                  className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-4 text-right hover:bg-[#faf9fb] active:bg-[#f2f0f6] transition-all cursor-pointer group"
                >
                  {/* Right side: Avatar + Text content */}
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    {/* Avatar */}
                    {isSupport ? (
                      <div className="w-12 h-12 rounded-[18px] bg-[#6c2ad5] flex items-center justify-center text-white shrink-0 shadow-sm">
                        <Headphones className="w-6 h-6" />
                      </div>
                    ) : cp.avatar ? (
                      <img
                        src={cp.avatar}
                        alt={cp.name}
                        className="w-12 h-12 rounded-full object-cover border border-[#e6e4ea] shrink-0 shadow-2xs group-hover:border-[#641bd9]/40 transition-colors"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-white border border-[#e6e4ea] flex items-center justify-center text-[#16111d] font-black text-base shrink-0 shadow-2xs group-hover:border-[#641bd9]/40 transition-colors">
                        {cp.name ? cp.name.trim().charAt(0) : 'ئ'}
                      </div>
                    )}

                    {/* Titles */}
                    <div className="min-w-0 flex-1 text-right">
                      <div className="flex items-center gap-2">
                        <span className="text-[15px] font-black text-[#16111d] truncate leading-tight">
                          {cp.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-1 min-w-0">
                        <p className={`text-xs truncate m-0 leading-normal ${unread > 0 ? 'text-[#584f67] font-bold' : 'text-[#7a8e88] font-medium'}`}>
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

      {/* ── App Guide Chat ──────────────────────────────────────── */}
      {showAppGuide && (
        <AppGuideChatModal onClose={() => setShowAppGuide(false)} />
      )}
    </div>
  );
};
