import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api';
import { soundService } from '../../services/soundService';
import { realtimeService } from '../../services/realtimeService';
import { ArrowRight, ArrowLeft, MessageCircle, MoreVertical, Briefcase, CheckCheck, Clock, AlertCircle } from 'lucide-react';

const NK = "'Noto Kufi Arabic', 'Vazirmatn', system-ui, sans-serif";

const formatClock = (isoOrText) => {
  if (!isoOrText) return '';
  const d = new Date(String(isoOrText).replace(' ', 'T'));
  if (isNaN(d.getTime())) return isoOrText;
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

export const MessageThreadModal = ({
  applicationId,
  title = 'هەلی کار',
  jobStatus = 'داواکاری کار',
  counterpart = 'کۆمپانیا',
  avatar,
  isSupport = false,
  onClose
}) => {
  const { user, token } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // 100% Real API Fetch for Messages in Thread
  const loadMessages = async () => {
    if (!token || !applicationId) {
      setLoading(false);
      return;
    }

    try {
      const res = await apiService.getMessageThread(applicationId, token);
      setMessages(Array.isArray(res) ? res : []);
    } catch (e) {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, [applicationId, token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Lock background body scroll
  useEffect(() => {
    const scrollY = window.scrollY;
    const { style } = document.body;
    const prev = {
      position: style.position,
      top: style.top,
      width: style.width,
      overflow: style.overflow
    };
    style.position = 'fixed';
    style.top = `-${scrollY}px`;
    style.width = '100%';
    style.overflow = 'hidden';
    return () => {
      Object.assign(style, prev);
      window.scrollTo(0, scrollY);
    };
  }, []);

  // Pin the sheet to the visible area above the on-screen keyboard — same
  // technique Telegram Web/WhatsApp Web use. Without this, mobile browsers
  // resize the whole `fixed inset-0` box as the layout viewport, so the
  // header drifts along with everything else when the keyboard opens.
  // Resizing just the container's height keeps the header (first flex
  // child) anchored at the top; only the flexible message list shrinks,
  // which naturally leaves the input bar sitting right above the keyboard.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const applyViewport = () => {
      const el = containerRef.current;
      if (!el) return;
      el.style.height = `${vv.height}px`;
      el.style.top = `${vv.offsetTop}px`;
    };
    applyViewport();
    vv.addEventListener('resize', applyViewport);
    vv.addEventListener('scroll', applyViewport);
    return () => {
      vv.removeEventListener('resize', applyViewport);
      vv.removeEventListener('scroll', applyViewport);
    };
  }, []);

  // Realtime subscription
  useEffect(() => {
    const off = realtimeService.on?.('new-message', (data) => {
      if (String(data?.application_id) !== String(applicationId)) return;
      if (data?.message) {
        setMessages(prev => prev.some(m => m.id === data.message.id) ? prev : [...prev, data.message]);
      } else {
        loadMessages();
      }
    });
    return off;
  }, [applicationId]);

  // Optimistic send — the bubble appears and the input clears immediately,
  // same as Telegram, instead of waiting on the full server round-trip
  // before anything visible happens (that wait was the "why is it so slow
  // sometimes" feeling, not actual send failure). Reconciled with the real
  // message once the request resolves; marked failed + retryable if it
  // doesn't go through.
  const handleSend = async (overrideBody) => {
    const body = (overrideBody ?? text).trim();
    if (!body || !token) return;
    soundService.playTick?.();

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setMessages(prev => [...prev, {
      id: tempId,
      sender_id: user?.id,
      body,
      created_at: new Date().toISOString(),
      read_at: null,
      _pending: true,
    }]);
    if (!overrideBody) setText('');
    inputRef.current?.focus();

    try {
      const res = await apiService.sendMessage(applicationId, body, token);
      if (res?.success && res?.message) {
        setMessages(prev => prev.map(m => m.id === tempId ? res.message : m));
      } else if (res?.success) {
        await loadMessages();
      } else {
        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, _pending: false, _failed: true } : m));
      }
    } catch (e) {
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, _pending: false, _failed: true } : m));
    }
  };

  const handleRetry = (msg) => {
    setMessages(prev => prev.filter(m => m.id !== msg.id));
    handleSend(msg.body);
  };

  const hasText = text.trim().length > 0;
  const initialChar = counterpart.trim().charAt(0) || 'ک';

  return createPortal(
    <div
      ref={containerRef}
      dir="rtl"
      className="fixed inset-x-0 top-0 z-[9999] bg-[#f4f7f6] flex flex-col font-vazirmatn select-none animate-fadeIn"
      style={{ fontFamily: NK, height: '100dvh' }}
    >
      {/* ── Chat Top Header ───────────────────────────────────── */}
      <div
        className="shrink-0 bg-white border-b border-[#e8eeed] px-4 pb-3 flex items-center justify-between shadow-2xs"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}
      >
        {/* Right side in RTL: Back button + Avatar + Name & Online Status */}
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Back button */}
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-2xl bg-white border border-[#e8eeed] flex items-center justify-center text-[#111d1a] shrink-0 active:scale-90 transition-transform shadow-2xs"
            aria-label="گەڕانەوە"
          >
            <ArrowRight className="w-5 h-5 text-[#111d1a]" />
          </button>

          {/* User/Company Avatar */}
          <div className="w-10 h-10 rounded-full bg-white border border-[#e4eae7] flex items-center justify-center text-[#111d1a] font-black text-sm shrink-0 shadow-2xs overflow-hidden">
            {avatar ? (
              <img src={avatar} alt={counterpart} className="w-full h-full object-cover" />
            ) : (
              <span>{initialChar}</span>
            )}
          </div>

          {/* Name */}
          <div className="text-right min-w-0">
            <h3 className="text-sm font-black text-[#111d1a] truncate leading-tight">
              {counterpart}
            </h3>
          </div>
        </div>

        {/* Left side in RTL: Three dots options menu */}
        <button
          className="w-10 h-10 rounded-2xl bg-white border border-[#e8eeed] flex items-center justify-center text-[#62736e] shrink-0 active:scale-90 transition-transform shadow-2xs"
          aria-label="هەڵبژاردنەکان"
        >
          <MoreVertical className="w-4 h-4 text-[#62736e]" />
        </button>
      </div>

      {/* ── Chat Messages Body ─────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5"
        style={{ background: '#f4f7f6' }}
      >
        {/* Date capsule badge: TODAY */}
        <div className="flex justify-center my-1">
          <span className="px-3.5 py-1 rounded-full bg-[#e6eeec] text-[#7a8e88] text-[10px] font-black tracking-widest uppercase shadow-2xs">
            TODAY
          </span>
        </div>

        {/* Job Reference / Application Context Card */}
        <div className="w-full bg-[#f0faf7] border border-[#cce8e0] rounded-2xl p-3.5 flex items-center justify-between shadow-2xs">
          <div className="text-right flex-1 min-w-0">
            <h4 className="text-xs sm:text-sm font-black text-[#111d1a] truncate leading-tight">
              {title}
            </h4>
            <p className="text-[11px] text-[#3a7c73] font-bold mt-0.5">
              {jobStatus}
            </p>
          </div>

          <div className="w-9 h-9 rounded-xl bg-[#d5ede6] flex items-center justify-center shrink-0 mr-3 text-[#12796b]">
            <Briefcase className="w-4 h-4" />
          </div>
        </div>

        {/* Messages List */}
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-6 h-6 border-2 border-[#12796b] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
            <div className="w-14 h-14 rounded-full bg-[#e7f4f1] flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-[#12796b]" />
            </div>
            <p className="text-xs text-[#8a9e98] font-bold">
              هێشتا هیچ پەیامێک نییە. یەکەم پەیام بنێرە.
            </p>
          </div>
        ) : (
          messages.map((m, idx) => {
            const isMine = String(m.sender_id) === String(user?.id);

            return (
              <div
                key={m.id || idx}
                className={`flex flex-col ${isMine ? 'items-start' : 'items-end'} transition-all`}
              >
                {/* Message Bubble Container */}
                <div
                  className={`max-w-[82%] px-4 py-3 text-xs sm:text-[13px] font-bold leading-relaxed ${
                    isMine
                      ? 'bg-[#c2eae1] text-[#113d36] rounded-2xl rounded-tl-xs shadow-2xs'
                      : 'bg-white text-[#111d1a] border border-[#e8eeec] rounded-2xl rounded-tr-xs shadow-[0_1px_4px_rgba(0,0,0,0.03)]'
                  } ${m._pending ? 'opacity-60' : ''}`}
                  style={{ fontFamily: NK }}
                >
                  {m.body}
                </div>

                {/* Timestamp / send-status */}
                <div className="flex items-center gap-1.5 mt-1 px-1">
                  {m._failed ? (
                    <button
                      onClick={() => handleRetry(m)}
                      className="flex items-center gap-1 text-[10px] text-rose-600 font-bold"
                    >
                      <AlertCircle className="w-3 h-3" />
                      دووبارە هەوڵبدەرەوە
                    </button>
                  ) : m._pending ? (
                    <Clock className="w-3 h-3 text-[#9faea9]" />
                  ) : (
                    <>
                      {isMine && (
                        <CheckCheck className={`w-3.5 h-3.5 ${m.read_at ? 'text-[#12796b]' : 'text-[#9faea9]'}`} />
                      )}
                      <span dir="ltr" className="text-[10px] text-[#9faea9] font-bold font-mono">
                        {formatClock(m.created_at)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}

        <div ref={bottomRef} className="h-1" />
      </div>

      {/* ── Chat Bottom Input Bar ──────────────────────────────── */}
      <div
        className="shrink-0 bg-white border-t border-[#eef2f0] px-3.5 py-2.5 flex items-center gap-2.5 shadow-sm"
        style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}
      >
        {/* Send Button: Solid Teal Circle on Left in RTL */}
        <button
          onClick={() => handleSend()}
          disabled={!hasText}
          className={`w-11 h-11 rounded-full flex items-center justify-center text-white shrink-0 transition-all active:scale-90 shadow-sm ${
            hasText
              ? 'bg-[#1a6b62] hover:bg-[#12796b] shadow-[0_4px_12px_rgba(26,107,98,0.3)]'
              : 'bg-[#1a6b62] opacity-70'
          }`}
          aria-label="ناردن"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>

        {/* Input Pill */}
        <input
          ref={inputRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="پەیامێک بنووسە..."
          className="flex-1 bg-white border border-[#e8eeed] rounded-full px-4 py-3 text-xs sm:text-sm text-[#111d1a] font-bold placeholder-[#9faea9] outline-none focus:border-[#12796b] focus:ring-2 focus:ring-[#12796b]/10 transition-all"
          style={{ fontFamily: NK }}
        />
      </div>
    </div>,
    document.body
  );
};
