import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { X, User, Phone, Mail, CheckCircle2, ShieldCheck, Sparkles, ArrowLeft, Loader2, LockKeyhole, AtSign } from 'lucide-react';

export const UserSettingsModal = ({ onClose }) => {
  const { user, updateUserProfile } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    setError('');
    setIsSaving(true);
    try {
      const res = await updateUserProfile({ name: name.trim(), phone: phone.trim(), email: email.trim() });
      if (res?.success === false) {
        setError(res.message || 'نوێکردنەوەی زانیاری سەرکەوتوو نەبوو.');
        setIsSaving(false);
        return;
      }
      setIsSaved(true);
      setTimeout(() => onClose(), 1200);
    } catch {
      setError('هەڵەیەک ڕوویدا. تکایە دووبارە هەوڵ بدەرەوە.');
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-[#06100e]/75 backdrop-blur-xl flex items-center justify-center p-0 sm:p-4 font-vazirmatn overflow-y-auto animate-fade-in" dir="rtl">
      <style>{`
        @keyframes settingsIn{from{opacity:0;transform:translateY(14px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes settingsGlow{0%,100%{opacity:.45}50%{opacity:.8}}
        .settings-shell{animation:settingsIn .35s cubic-bezier(.22,1,.36,1) both}
        @media (prefers-reduced-motion:reduce){.settings-shell{animation:none}}
      `}</style>

      <div className="settings-shell relative w-full max-w-2xl bg-[#f8faf9] border border-white/15 rounded-none sm:rounded-[30px] shadow-[0_30px_100px_rgba(0,0,0,.42)] overflow-hidden min-h-screen sm:min-h-0 sm:max-h-[92vh] flex flex-col my-0 sm:my-auto">
        <div className="absolute -top-28 -left-20 w-72 h-72 rounded-full bg-teal-500/20 blur-3xl pointer-events-none" style={{ animation:'settingsGlow 5s ease-in-out infinite' }} />

        <header className="relative shrink-0 overflow-hidden px-5 sm:px-7 pt-5 pb-6 text-white"
          style={{ background:'linear-gradient(135deg,#063b34 0%,#0f6b5f 55%,#174f48 100%)' }}>
          <div className="absolute inset-0 opacity-[.08] pointer-events-none"
            style={{ backgroundImage:'radial-gradient(circle at 20% 30%,#fff 0 1px,transparent 1.5px),radial-gradient(circle at 80% 70%,#fff 0 1px,transparent 1.5px)',backgroundSize:'22px 22px' }} />
          <div className="relative flex items-start justify-between gap-4">
            <button type="button" onClick={onClose} aria-label="داخستن"
              className="w-10 h-10 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center transition active:scale-95">
              <X className="w-5 h-5" />
            </button>
            <div className="text-right">
              <div className="inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full bg-white/10 border border-white/10">
                <Sparkles className="w-3 h-3" /> KARNAMA
              </div>
              <h2 className="text-xl sm:text-2xl font-black mt-2">ڕێکخستنەکانی هەژمار</h2>
              <p className="text-[11px] text-white/70 mt-1">زانیارییە سەرەکییەکانت لێرە بە ئاسانی نوێ بکەرەوە.</p>
            </div>
          </div>
        </header>

        {isSaved ? (
          <div className="flex-1 flex items-center justify-center p-8 text-center bg-white">
            <div className="max-w-sm space-y-4">
              <div className="mx-auto w-20 h-20 rounded-[28px] flex items-center justify-center"
                style={{ background:'linear-gradient(135deg,#e5f7f2,#d3eee7)' }}>
                <CheckCircle2 className="w-10 h-10 text-[#0f6b5f]" />
              </div>
              <h3 className="text-xl font-black text-slate-900">نوێکردنەوەکە سەرکەوتوو بوو</h3>
              <p className="text-xs font-bold text-slate-500 leading-6">زانیارییەکانی هەژمارەکەت پاشەکەوت کران. دەگەڕێیتەوە بۆ پڕۆفایلەکەت.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="relative flex-1 overflow-y-auto p-4 sm:p-7">
              <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-5" dir="rtl">
                <form onSubmit={handleSubmit} className="space-y-4 order-2 md:order-1">
                  <div className="bg-white rounded-[24px] border border-slate-200/80 p-4 sm:p-5 shadow-sm">
                    <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-[#eaf5f2] text-[#0f6b5f]"><User className="w-5 h-5" /></div>
                      <div className="text-right">
                        <h3 className="text-sm font-black text-slate-900">زانیاری کەسی</h3>
                        <p className="text-[10px] font-bold text-slate-400 mt-0.5">ئەم زانیارییە بۆ ناسینەوەی پڕۆفایلەکەت بەکاردێت.</p>
                      </div>
                    </div>

                    <div className="space-y-4 mt-5">
                      <div>
                        <label className="flex items-center gap-1.5 text-[11px] font-black text-slate-700 mb-2"><User className="w-3.5 h-3.5 text-[#0f6b5f]" /> ناوی تەواو *</label>
                        <input type="text" required value={name} onChange={e=>setName(e.target.value)}
                          className="w-full py-3.5 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-[#0f6b5f] focus:ring-4 focus:ring-[#0f6b5f]/10 transition"
                          placeholder="ناوی تەواو" />
                      </div>

                      <div>
                        <label className="flex items-center gap-1.5 text-[11px] font-black text-slate-700 mb-2"><Phone className="w-3.5 h-3.5 text-[#0f6b5f]" /> ژمارەی مۆبایل *</label>
                        <input type="tel" required value={phone} onChange={e=>setPhone(e.target.value)} dir="ltr"
                          className="w-full py-3.5 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono font-bold text-slate-900 outline-none focus:bg-white focus:border-[#0f6b5f] focus:ring-4 focus:ring-[#0f6b5f]/10 transition text-right"
                          placeholder="+964 770 000 0000" />
                      </div>

                      <div>
                        <label className="flex items-center gap-1.5 text-[11px] font-black text-slate-700 mb-2"><AtSign className="w-3.5 h-3.5 text-[#0f6b5f]" /> ئیمەیڵ *</label>
                        <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} dir="ltr"
                          className="w-full py-3.5 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono font-bold text-slate-900 outline-none focus:bg-white focus:border-[#0f6b5f] focus:ring-4 focus:ring-[#0f6b5f]/10 transition text-right"
                          placeholder="you@example.com" />
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-right">
                      <p className="text-[11px] font-black text-rose-700">{error}</p>
                    </div>
                  )}

                  <div className="rounded-[22px] border border-[#dcebe7] bg-[#eef8f5] p-4 flex items-start gap-3 text-right">
                    <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0 text-[#0f6b5f] shadow-sm"><LockKeyhole className="w-4 h-4" /></div>
                    <div>
                      <div className="text-[11px] font-black text-[#124b43]">زانیارییەکانت پارێزراون</div>
                      <p className="text-[10px] font-bold text-[#46736c] leading-5 mt-0.5">ئەم پەڕەیە تەنها بۆ نوێکردنەوەی زانیاریی هەژمارەکەتە.</p>
                    </div>
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row gap-2.5 pt-1">
                    <button type="button" onClick={onClose} disabled={isSaving}
                      className="flex-1 py-3.5 px-4 rounded-2xl bg-white border border-slate-200 text-slate-600 font-black text-xs hover:bg-slate-50 transition disabled:opacity-50">
                      پاشگەزبوونەوە
                    </button>
                    <button type="submit" disabled={isSaving}
                      className="flex-[1.5] py-3.5 px-4 rounded-2xl text-white font-black text-xs transition shadow-[0_10px_25px_rgba(15,107,95,.22)] hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0 flex items-center justify-center gap-2"
                      style={{ background:'linear-gradient(135deg,#0f6b5f,#0a4a41)' }}>
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      {isSaving ? 'پاشەکەوتکردن...' : 'پاشەکەوتکردنی گۆڕانکاری'}
                    </button>
                  </div>
                </form>

                <aside className="order-1 md:order-2">
                  <div className="bg-slate-900 rounded-[24px] p-5 text-white sticky top-0 overflow-hidden">
                    <div className="absolute -left-10 -top-10 w-32 h-32 rounded-full bg-teal-400/20 blur-2xl" />
                    <div className="relative">
                      <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center mb-4">
                        <ShieldCheck className="w-6 h-6 text-teal-300" />
                      </div>
                      <h3 className="text-sm font-black">پڕۆفایلێکی ئامادە</h3>
                      <p className="text-[10px] leading-5 font-bold text-slate-400 mt-2">ناو، ژمارە و ئیمەیڵی دروست یارمەتیدەرن بۆ پەیوەندی و پشتڕاستکردنەوە.</p>
                      <div className="mt-5 space-y-2.5 text-[10px] font-bold text-slate-300">
                        <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-teal-300" /> زانیاری ڕوون</div>
                        <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-teal-300" /> پەیوەندی ئاسان</div>
                        <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-teal-300" /> پڕۆفایلی پیشەیی</div>
                      </div>
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );

};
