import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api';
import { soundService } from '../../services/soundService';
import { ArrowRight, ArrowLeft, Sparkles, CheckCircle2, RotateCcw } from 'lucide-react';

const NK = "'Noto Kufi Arabic', 'Vazirmatn', system-ui, sans-serif";
const TEAL = '#12796b';
const TEAL_DEEP = '#0d5c50';

const formatClock = (isoOrText) => {
  if (!isoOrText) return '';
  const d = new Date(String(isoOrText).replace(' ', 'T'));
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

// Chat with Karnama AI — a VIP-only assistant that interviews the user
// conversationally, then builds a real saved resume from what was actually
// said (see /ai-cv/* in the backend). Same visual language as the real
// MessageThreadModal, but its own independent data flow — no application
// thread, no milestones/dispute, just a chat plus a "build my CV" moment.
export const KarnamaAiChatModal = ({ onClose, onNavigate }) => {
  const { token } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [ready, setReady] = useState(false);
  const [building, setBuilding] = useState(false);
  const [built, setBuilt] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  const load = async () => {
    setLoading(true);
    const res = await apiService.getAiCvChat(token);
    if (res?.success) {
      setMessages(res.messages || []);
      const last = (res.messages || [])[res.messages.length - 1];
      // Ready state doesn't persist server-side — re-derive it defensively
      // only from a freshly-sent reply, not from history on reload.
      setReady(false);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [token]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length, building]);

  // Lock background scroll + pin above the on-screen keyboard, same
  // technique as the real MessageThreadModal.
  useEffect(() => {
    const scrollY = window.scrollY;
    const { style } = document.body;
    const prev = { position: style.position, top: style.top, width: style.width, overflow: style.overflow };
    style.position = 'fixed'; style.top = `-${scrollY}px`; style.width = '100%'; style.overflow = 'hidden';
    return () => { Object.assign(style, prev); window.scrollTo(0, scrollY); };
  }, []);

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
    return () => { vv.removeEventListener('resize', applyViewport); vv.removeEventListener('scroll', applyViewport); };
  }, []);

  const handleSend = async () => {
    const body = text.trim();
    if (!body || sending) return;
    soundService.playTick?.();
    setSending(true);
    setText('');
    setMessages(prev => [...prev, { id: `temp-${Date.now()}`, role: 'user', body, created_at: new Date().toISOString() }]);

    const res = await apiService.sendAiCvMessage(body, token);
    setSending(false);
    if (res?.success) {
      setMessages(prev => [...prev, { id: `reply-${Date.now()}`, role: 'assistant', body: res.reply, created_at: new Date().toISOString() }]);
      setReady(Boolean(res.ready));
      if (res.ready) soundService.playSuccess?.();
    } else {
      setMessages(prev => [...prev, { id: `err-${Date.now()}`, role: 'assistant', body: res?.message || 'هەڵەیەک ڕوویدا، تکایە دووبارە هەوڵبدەرەوە.', created_at: new Date().toISOString() }]);
    }
    inputRef.current?.focus();
  };

  const handleBuild = async () => {
    soundService.playTick?.();
    setBuilding(true);
    const res = await apiService.buildAiCvResume(token);
    setBuilding(false);
    if (res?.success) {
      soundService.playSuccess?.();
      setBuilt(true);
    } else {
      setMessages(prev => [...prev, { id: `builderr-${Date.now()}`, role: 'assistant', body: res?.message || 'دروستکردنی سیڤی سەرکەوتوو نەبوو.', created_at: new Date().toISOString() }]);
    }
  };

  const handleRestart = async () => {
    soundService.playTick?.();
    await apiService.resetAiCvChat(token);
    setMessages([]);
    setReady(false);
    setBuilt(false);
  };

  const hasText = text.trim().length > 0;

  return createPortal(
    <div
      ref={containerRef}
      dir="rtl"
      className="fixed inset-x-0 top-0 z-[9999] bg-[#f4f7f6] flex flex-col font-vazirmatn select-none animate-fadeIn"
      style={{ fontFamily: NK, height: '100dvh' }}
    >
      {/* ── Header ── */}
      <div
        className="shrink-0 bg-white border-b border-[#e8eeed] px-4 pb-3 flex items-center justify-between shadow-2xs"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <button onClick={onClose} className="w-10 h-10 rounded-2xl bg-white border border-[#e8eeed] flex items-center justify-center text-[#111d1a] shrink-0 active:scale-90 transition-transform shadow-2xs" aria-label="گەڕانەوە">
            <ArrowRight className="w-5 h-5 text-[#111d1a]" />
          </button>
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm" style={{ background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DEEP})` }}>
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="text-right min-w-0">
            <h3 className="text-sm font-black text-[#111d1a] truncate leading-tight">کارنامە AI</h3>
            <p className="text-[10.5px] font-bold truncate" style={{ color: TEAL }}>یاریدەدەری دروستکردنی سیڤی</p>
          </div>
        </div>

        {messages.length > 0 && (
          <button onClick={handleRestart} className="w-10 h-10 rounded-2xl bg-white border border-[#e8eeed] flex items-center justify-center text-[#62736e] shrink-0 active:scale-90 transition-transform shadow-2xs" aria-label="دەستپێکردنەوە">
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5" style={{ background: '#f4f7f6' }}>
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-6 h-6 border-2 border-[#12796b] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: '#e7f4f1' }}>
              <Sparkles className="w-6 h-6" style={{ color: TEAL }} />
            </div>
            <div className="max-w-[280px] space-y-1">
              <p className="text-sm font-black" style={{ color: '#111d1a' }}>سڵاو! من کارنامە AI ـم</p>
              <p className="text-xs font-bold" style={{ color: '#8a9e98' }}>
                لەگەڵم قسە بکە دەربارەی خۆت، ئەزموون و شارەزاییەکانت — من سیڤیەکی ڕاستەقینەت بۆ دروست دەکەم. با دەست پێبکەین: پیشەکەت چییە؟
              </p>
            </div>
          </div>
        ) : (
          messages.map((m, idx) => {
            const isMine = m.role === 'user';
            return (
              <div key={m.id || idx} className={`flex flex-col ${isMine ? 'items-start' : 'items-end'} transition-all`}>
                <div
                  className={`max-w-[82%] px-4 py-3 text-xs sm:text-[13px] font-bold leading-relaxed whitespace-pre-line ${
                    isMine
                      ? 'bg-[#c2eae1] text-[#113d36] rounded-2xl rounded-tl-xs shadow-2xs'
                      : 'bg-white text-[#111d1a] border border-[#e8eeec] rounded-2xl rounded-tr-xs shadow-[0_1px_4px_rgba(0,0,0,0.03)]'
                  }`}
                  style={{ fontFamily: NK }}
                >
                  {m.body}
                </div>
                <div className="flex items-center gap-1.5 mt-1 px-1">
                  <span dir="ltr" className="text-[10px] text-[#9faea9] font-bold font-mono">{formatClock(m.created_at)}</span>
                </div>
              </div>
            );
          })
        )}

        {sending && (
          <div className="flex flex-col items-end">
            <div className="bg-white border border-[#e8eeec] rounded-2xl rounded-tr-xs px-4 py-3 shadow-2xs flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#9faea9] animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[#9faea9] animate-bounce" style={{ animationDelay: '120ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[#9faea9] animate-bounce" style={{ animationDelay: '240ms' }} />
            </div>
          </div>
        )}

        {/* ── Ready-to-build CTA ── */}
        {ready && !built && (
          <div className="w-full rounded-2xl p-4 space-y-2.5 shadow-sm" style={{ background: '#e8f7f4', border: '1px solid #c1ede3' }}>
            <div className="flex items-center gap-2 font-black text-sm" style={{ color: TEAL_DEEP }}>
              <Sparkles className="w-4.5 h-4.5" />
              سیڤیەکەت ئامادەیە بۆ دروستکردن
            </div>
            <button
              onClick={handleBuild}
              disabled={building}
              className="w-full py-3 rounded-xl text-white text-xs font-black shadow-sm transition active:scale-95 flex items-center justify-center gap-2"
              style={{ background: TEAL }}
            >
              {building ? 'خەریکی دروستکردن...' : 'دروستکردنی سیڤی ئێستا'}
            </button>
          </div>
        )}

        {/* ── Built success ── */}
        {built && (
          <div className="w-full rounded-2xl p-4 space-y-3 shadow-sm text-center" style={{ background: '#e8f7f4', border: '1px solid #c1ede3' }}>
            <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center" style={{ background: TEAL }}>
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <p className="text-sm font-black" style={{ color: TEAL_DEEP }}>سیڤیەکەت بە سەرکەوتوویی دروستکرا!</p>
            <p className="text-xs font-bold" style={{ color: '#3a7c73' }}>دەتوانیت لە بەشی سیڤیەکانت ببینیت، شێوازی دیزاینی بۆ هەڵبژێریت و بیکەیت بە ئامادە بۆ ناردن.</p>
            <button
              onClick={() => { onClose?.(); onNavigate?.('resumes'); }}
              className="w-full py-3 rounded-xl text-white text-xs font-black shadow-sm transition active:scale-95"
              style={{ background: TEAL }}
            >
              چوون بۆ سیڤیەکانم ←
            </button>
          </div>
        )}

        <div ref={bottomRef} className="h-1" />
      </div>

      {/* ── Input bar ── */}
      {!built && (
        <div
          className="shrink-0 bg-white border-t border-[#eef2f0] px-3.5 py-2.5 flex items-center gap-2.5 shadow-sm"
          style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}
        >
          <button
            onClick={handleSend}
            disabled={!hasText || sending}
            className={`w-11 h-11 rounded-full flex items-center justify-center text-white shrink-0 transition-all active:scale-90 shadow-sm ${
              hasText && !sending ? 'bg-[#1a6b62] hover:bg-[#12796b] shadow-[0_4px_12px_rgba(26,107,98,0.3)]' : 'bg-[#1a6b62] opacity-70'
            }`}
            aria-label="ناردن"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <input
            ref={inputRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="وەڵام بدەرەوە..."
            disabled={sending}
            className="flex-1 bg-white border border-[#e8eeed] rounded-full px-4 py-3 text-xs sm:text-sm text-[#111d1a] font-bold placeholder-[#9faea9] outline-none focus:border-[#12796b] focus:ring-2 focus:ring-[#12796b]/10 transition-all"
            style={{ fontFamily: NK }}
          />
        </div>
      )}
    </div>,
    document.body
  );
};
