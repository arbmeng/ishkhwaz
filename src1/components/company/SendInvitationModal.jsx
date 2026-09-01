import React, { useState } from 'react';
import { X, ArrowRight, ArrowLeft, Send, DollarSign, CheckCircle2, Loader2 } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { soundService } from '../../services/soundService';

// Shared light theme — matches DesktopHeaderNav, UserProfilePage, DirectoryPage.
const TEAL = '#12796b';
const TEAL_DEEP = '#0d5c50';

export const SendInvitationModal = ({ freelancer, isOpen, onClose, onSendSuccess }) => {
  const { sendInvitation } = useStore();
  const [step, setStep] = useState(1);
  const [projectTitle, setProjectTitle] = useState('');
  const [category, setCategory] = useState('tech_dev');
  const [budget, setBudget] = useState('500000');
  const [timeline, setTimeline] = useState('1 week');
  const [note, setNote] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !freelancer) return null;

  const handleNext = () => {
    soundService.playTick();
    if (step < 4) setStep(prev => prev + 1);
  };

  const handleBack = () => {
    soundService.playTick();
    if (step > 1) setStep(prev => prev - 1);
  };

  const resetAndClose = () => {
    setIsSent(false);
    setStep(1);
    onClose();
  };

  const handleSubmit = async () => {
    setError('');
    setIsSending(true);
    const ok = await sendInvitation({
      freelancer_id: freelancer.id,
      job_title: projectTitle.trim() || 'دیزاینی پڕۆژە',
      salary_offer: budget ? `${Number(budget).toLocaleString()} IQD` : '',
      message: note.trim(),
    });
    setIsSending(false);
    if (ok) {
      soundService.playSuccess();
      setIsSent(true);
      onSendSuccess?.();
      setTimeout(resetAndClose, 2000);
    } else {
      setError('ناردنی داواکارییەکە سەرکەوتوو نەبوو. تکایە دووبارە هەوڵبدەرەوە.');
    }
  };

  return (
    <div dir="rtl" className="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 font-vazirmatn select-none animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white border border-[#e8eeec] rounded-3xl p-6 sm:p-8 shadow-2xl text-right space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#f0f4f2] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl text-white font-black text-sm flex items-center justify-center shadow-sm" style={{ background: TEAL }}>
              {freelancer.name?.charAt(0) || 'ک'}
            </div>
            <div>
              <h3 className="font-black text-[#111d1a] text-base">ناردنی داواکاری کار</h3>
              <p className="text-xs text-[#7b8e88]">بۆ: <span className="font-bold" style={{ color: TEAL }}>{freelancer.name}</span> {freelancer.title ? `(${freelancer.title})` : ''}</p>
            </div>
          </div>
          <button
            onClick={() => { soundService.playTick(); resetAndClose(); }}
            className="p-2 rounded-xl bg-[#f4f7f6] border border-[#e8eeed] text-[#7b8e88] hover:text-[#111d1a] transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper */}
        {!isSent && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-[#7b8e88] font-mono">
              <span>قۆناغی {step} لە ٤</span>
              <span className="font-bold" style={{ color: TEAL }}>
                {step === 1 && '١. زانیاری پڕۆژە'}
                {step === 2 && '٢. بودجە & کات'}
                {step === 3 && '٣. تێبینی کەسی'}
                {step === 4 && '٤. پێداچوونەوە & ناردن'}
              </span>
            </div>
            <div className="h-2 w-full bg-[#f4f7f6] rounded-full overflow-hidden flex">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(step / 4) * 100}%`, background: TEAL }} />
            </div>
          </div>
        )}

        {isSent ? (
          <div className="py-12 text-center space-y-4 animate-scaleUp">
            <div className="w-20 h-20 rounded-full text-white flex items-center justify-center mx-auto shadow-lg" style={{ background: TEAL }}>
              <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
            </div>
            <h3 className="text-xl font-black text-[#111d1a]">داواکارییەکە بە سەرکەوتوویی نێردرا! 🎉</h3>
            <p className="text-xs text-[#7b8e88]">داواکاری کارەکەت گەیشتە {freelancer.name}. وەڵامەکەی لە نۆتیفیکەیشن بەدەستت دەگات.</p>
          </div>
        ) : (
          <div className="space-y-4">

            {step === 1 && (
              <div className="space-y-4 animate-fadeIn">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#111d1a] block">ناونیشانی پڕۆژە یان کارەکە *</label>
                  <input
                    type="text"
                    placeholder="بۆ نموونە: دیزاینی ئەپڵیکەیشنی وێب یان گەشەپێدانی React"
                    value={projectTitle}
                    onChange={(e) => setProjectTitle(e.target.value)}
                    className="w-full bg-white border border-[#e8eeec] focus:border-[#12796b] rounded-xl px-4 py-3 text-xs text-[#111d1a] placeholder:text-[#9faea9] outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#111d1a] block">پۆلێنی پڕۆژە</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-white border border-[#e8eeec] focus:border-[#12796b] rounded-xl px-4 py-3 text-xs text-[#111d1a] outline-none"
                  >
                    <option value="tech_dev">تەکنەلۆژیا & سۆفتوێر</option>
                    <option value="sales_mkt">فرۆشتن & مارکێتینگ</option>
                    <option value="media_design">میدیا & دیزاین</option>
                    <option value="construction">بیناسازی & ئەندازیاری</option>
                  </select>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 animate-fadeIn">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#111d1a] block">بودجەی پێشنیارکراو (IQD) *</label>
                  <input
                    type="number"
                    placeholder="500000"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="w-full bg-white border border-[#e8eeec] focus:border-[#12796b] rounded-xl px-4 py-3 text-xs text-[#111d1a] outline-none font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#111d1a] block">ماوەی جێبەجێکردن (Timeline)</label>
                  <select
                    value={timeline}
                    onChange={(e) => setTimeline(e.target.value)}
                    className="w-full bg-white border border-[#e8eeec] focus:border-[#12796b] rounded-xl px-4 py-3 text-xs text-[#111d1a] outline-none"
                  >
                    <option value="3 days">٣ ڕۆژ</option>
                    <option value="1 week">١ هەفتە</option>
                    <option value="2 weeks">٢ هەفتە</option>
                    <option value="1 month">١ مانگ</option>
                  </select>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4 animate-fadeIn">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#111d1a] block">تێبینی یان نامەی دەستپێک بۆ کاندید</label>
                  <textarea
                    rows={4}
                    placeholder="سڵاو، ئێمە سەرسام بووین بە لێهاتووییت. حەزدەکەین کار لەسەر ئەم پڕۆژەیە بکەین..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full bg-white border border-[#e8eeec] focus:border-[#12796b] rounded-xl p-4 text-xs text-[#111d1a] placeholder:text-[#9faea9] outline-none leading-relaxed"
                  />
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-3 bg-[#f4f7f6] border border-[#e8eeec] p-4 rounded-2xl text-xs text-[#4a5854] animate-fadeIn">
                <h4 className="font-black text-[#111d1a] text-sm border-b border-[#e8eeed] pb-2">پێداچوونەوەی داواکارییەکە:</h4>
                <p>پڕۆژە: <span className="font-bold text-[#111d1a]">{projectTitle || 'دیزاینی پڕۆژە'}</span></p>
                <p>بودجە: <span className="font-bold font-mono" style={{ color: TEAL_DEEP }}>{Number(budget).toLocaleString()} IQD</span></p>
                <p>ماوە: <span className="font-bold text-[#111d1a]">{timeline}</span></p>
                {note && <p className="italic text-[#7b8e88]">« {note} »</p>}
                {error && <p className="text-rose-600 font-bold pt-1">{error}</p>}
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-[#f0f4f2]">
              {step > 1 ? (
                <button
                  onClick={handleBack}
                  className="px-4 py-2.5 rounded-xl bg-[#f4f7f6] text-[#111d1a] font-bold text-xs hover:bg-[#eaf5f2] transition-all flex items-center gap-1"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>گەڕانەوە</span>
                </button>
              ) : <div />}

              {step < 4 ? (
                <button
                  onClick={handleNext}
                  disabled={step === 1 && !projectTitle.trim()}
                  className="px-5 py-2.5 rounded-xl text-white font-black text-xs shadow-sm transition-all flex items-center gap-1 disabled:opacity-50"
                  style={{ background: TEAL }}
                >
                  <span>دواتر</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={isSending}
                  className="px-6 py-2.5 rounded-xl text-white font-black text-xs shadow-sm transition-all flex items-center gap-2 disabled:opacity-60"
                  style={{ background: TEAL }}
                >
                  {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>ناردنی فەرمی داواکاری</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
