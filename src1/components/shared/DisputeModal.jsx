import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api';
import { soundService } from '../../services/soundService';
import { ink, gold, muted, line, surface, font } from '../../styles/editorial';

const OUTCOME = {
  resolved_refunded: { label: 'پارە گەڕێنرایەوە بۆ جزدانەکەت', icon: 'ph-fill ph-wallet', color: 'oklch(0.42 0.09 155)' },
  resolved_approved: { label: 'داواکارییەکەت پەسەندکرا', icon: 'ph-fill ph-check-circle', color: 'oklch(0.42 0.09 155)' },
  resolved_denied: { label: 'شکایەتەکە ڕەتکرایەوە', icon: 'ph-fill ph-x-circle', color: 'oklch(0.42 0.13 25)' },
};

// A real path from "پارەدانم ڕەتکرایەوە" to an actual admin conversation —
// files a dispute if none exists yet for this target, or opens the real
// thread (and lets you keep replying) if one already does.
export const DisputeModal = ({ isOpen, onClose, targetType, targetId, title, existingDispute, onChanged }) => {
  const { token } = useAuth();
  const [dispute, setDispute] = useState(existingDispute || null);
  const [reason, setReason] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { setDispute(existingDispute || null); }, [existingDispute, isOpen]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [dispute?.messages?.length]);

  if (!isOpen) return null;

  const handleFile = async () => {
    const body = reason.trim();
    if (body.length < 5 || busy) return;
    setBusy(true);
    const res = await apiService.fileDispute({ targetType, targetId, reason: body }, token);
    setBusy(false);
    if (res?.success) {
      soundService.playSuccess?.();
      setDispute(res.dispute);
      onChanged?.(res.dispute);
    } else {
      alert(res?.message || 'شکایەتەکە نەنێردرا — تکایە دووبارە هەوڵبدەوە.');
    }
  };

  const handleReply = async () => {
    const body = text.trim();
    if (!body || busy || !dispute) return;
    setBusy(true);
    const res = await apiService.sendDisputeMessage(dispute.id, body, token);
    setBusy(false);
    if (res?.success) {
      soundService.playTick?.();
      setText('');
      const updated = { ...dispute, messages: res.messages };
      setDispute(updated);
      onChanged?.(updated);
    }
  };

  const resolved = dispute && dispute.status !== 'open';
  const outcome = resolved ? OUTCOME[dispute.status] : null;

  return createPortal(
    <div dir="rtl" className="fixed inset-0 z-[9999] flex flex-col animate-fadeIn" style={{ background: surface.page, fontFamily: "'Noto Kufi Arabic', 'Segoe UI', sans-serif" }}>
      <div
        className="shrink-0 flex items-center gap-3 px-3 backdrop-blur-xl"
        style={{ paddingTop: 'max(14px, env(safe-area-inset-top))', paddingBottom: 12, borderBottom: `1px solid ${line[1]}`, background: 'oklch(0.98 0.005 85 / 0.95)' }}
      >
        <button onClick={onClose} className="p-2 -m-1 rounded-full transition-colors shrink-0" style={{ color: muted[3] }}>
          <i className="ph ph-arrow-right text-[18px]" />
        </button>
        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: 'oklch(0.985 0.012 25)', border: '1px solid oklch(0.88 0.06 25)' }}>
          <i className="ph-fill ph-warning text-[17px]" style={{ color: 'oklch(0.55 0.14 25)' }} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-black truncate" style={{ fontFamily: font.headline, color: ink.base }}>شکایەت — پارەدانی ڕەتکراوە</h3>
          <p className="text-[11px] font-bold truncate" style={{ color: muted[6] }}>{title}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {!dispute ? (
          <div className="space-y-4 max-w-md mx-auto pt-6 text-right">
            <p className="text-xs leading-relaxed" style={{ color: muted[3] }}>
              پارەدانەکەت ڕەتکرایەوە. ئەگەر پێت وایە ئەمە هەڵەیە، هۆکارەکەت بنووسە — ڕاستەوخۆ بۆ سەرپەرشتیار دەنێردرێت و لێرەدا وەڵامت دەداتەوە.
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={5}
              placeholder="بۆ نموونە: وەسڵی FastPay-م بارکرد بەڵام پەسەند نەکرا، تکایە پێداچوونەوە بکرێتەوە..."
              className="w-full p-4 text-xs outline-none resize-none"
              style={{ borderRadius: 14, background: surface.card, border: `1px solid ${line[1]}`, color: ink.base }}
            />
            <button
              onClick={handleFile}
              disabled={busy || reason.trim().length < 5}
              className="w-full py-3.5 font-black text-xs transition-all disabled:opacity-40"
              style={{ borderRadius: 14, background: gold.gradient, color: gold.onGradient }}
            >
              {busy ? '...' : 'ناردنی شکایەت'}
            </button>
          </div>
        ) : (
          <>
            {resolved && outcome && (
              <div className="p-4 flex items-center gap-3" style={{ borderRadius: 14, background: surface.card, border: `1px solid ${line[1]}` }}>
                <i className={`${outcome.icon} text-[19px] shrink-0`} style={{ color: outcome.color }} />
                <span className="text-xs font-bold" style={{ color: outcome.color }}>{outcome.label}</span>
              </div>
            )}
            {(dispute.messages || []).map((m) => {
              const mine = m.sender_role === 'user';
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-start' : 'justify-end'}`}>
                  <div className="max-w-[80%] px-4 py-2.5 text-xs font-bold leading-relaxed"
                    style={mine
                      ? { borderRadius: '16px 16px 16px 5px', background: surface.card, border: `1px solid ${line[1]}`, color: ink.base }
                      : { borderRadius: '16px 16px 5px 16px', background: gold.gradient, color: gold.onGradient }}>
                    {!mine && <span className="block text-[9px] font-black opacity-70 mb-1">سەرپەرشتیار</span>}
                    {m.body}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {dispute && !resolved && (
        <div className="shrink-0 p-3 flex items-center gap-2" style={{ borderTop: `1px solid ${line[1]}`, paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleReply(); }}
            placeholder="وەڵامێک بنووسە..."
            className="flex-1 px-4 py-3 text-xs outline-none"
            style={{ borderRadius: 14, background: surface.input, border: `1px solid ${line[1]}`, color: ink.base }}
          />
          <button onClick={handleReply} disabled={busy || !text.trim()} className="w-11 h-11 flex items-center justify-center shrink-0 transition-all active:scale-90 disabled:opacity-40"
            style={{ borderRadius: 14, background: gold.gradient, color: gold.onGradient }}>
            <i className="ph-fill ph-paper-plane-right text-[17px]" style={{ transform: 'scaleX(-1)' }} />
          </button>
        </div>
      )}
    </div>,
    document.body
  );
};
