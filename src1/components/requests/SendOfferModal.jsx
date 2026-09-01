import React, { useState } from 'react';
import { soundService } from '../../services/soundService';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { X, Send, Building2, Briefcase, DollarSign, FileText, CheckCircle2, Loader2, Sparkles } from 'lucide-react';

const TEAL = '#12796b';
const TEAL_SOFT = '#e7f4f1';

export const SendOfferModal = ({ freelancer, isOpen, onClose, onSendOffer }) => {
  const { user } = useAuth();
  const { sendInvitation, addToast } = useStore();
  const [jobTitle, setJobTitle] = useState('');
  const [salary, setSalary] = useState(freelancer?.rate || '');
  const [notes, setNotes] = useState('');
  const [isSending, setIsSending] = useState(false);

  if (!isOpen || !freelancer) return null;

  const companyName = user?.company_name || user?.name || 'کۆمپانیا';
  const name = freelancer.name || freelancer.full_name || 'کارخواز';
  const initial = name.trim().charAt(0) || 'ئ';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!jobTitle.trim()) {
      addToast?.({ title: 'تایتڵ داواکراوە', message: 'تکایە تایتڵی کارەکە بنووسە.', type: 'warning' });
      return;
    }

    setIsSending(true);
    const ok = await sendInvitation({
      freelancer_id: freelancer.id,
      job_title: jobTitle.trim(),
      salary_offer: salary.trim(),
      message: notes.trim(),
    });
    setIsSending(false);

    if (ok) {
      soundService.playSuccess?.();
      addToast?.({ title: 'ئۆفەر نێردرا ✓', message: `ئۆفەری کار بە سەرکەوتوویی بۆ ${name} نێردرا.`, type: 'success' });
      if (onSendOffer) onSendOffer({ freelancerId: freelancer.id, title: jobTitle });
      onClose();
    }
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 font-vazirmatn select-none overflow-y-auto"
      style={{
        paddingTop: 'max(16px, calc(env(safe-area-inset-top) + 16px))',
        paddingBottom: 'max(16px, calc(env(safe-area-inset-bottom) + 16px))',
      }}
    >
      <div className="bg-white border border-stone-200 rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl text-right animate-fadeIn max-h-[90vh] overflow-y-auto">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-base shadow-xs" style={{ background: TEAL_SOFT, color: TEAL }}>
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-stone-900 text-base">ناردنی ئۆفەری کار بۆ کارخواز</h3>
              <p className="text-xs text-stone-400 font-semibold">پێشکەشکردنی داواکاری دامەزراندن / پڕۆژە</p>
            </div>
          </div>

          <button
            onClick={() => {
              soundService.playTick?.();
              onClose();
            }}
            className="p-2 rounded-xl bg-stone-100 text-stone-500 hover:text-stone-900 transition active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Freelancer Target Card */}
        <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl overflow-hidden bg-white border border-stone-200 shadow-sm flex items-center justify-center text-stone-900 font-black text-base shrink-0">
            {freelancer.avatar ? (
              <img src={freelancer.avatar} alt={name} className="w-full h-full object-cover" />
            ) : (
              <span>{initial}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-black text-stone-900 block truncate">{name}</span>
            <span className="text-[11px] text-stone-500 font-bold block truncate">{freelancer.profession || freelancer.title || 'کارخواز'}</span>
            <span className="text-[10px] font-bold block" style={{ color: TEAL }}>📍 {freelancer.governorate || freelancer.location || 'سلێمانی'}</span>
          </div>
        </div>

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Company Name — from your account, not editable here */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" style={{ color: TEAL }} />
              <span>دەنێردرێت لەلایەن:</span>
            </label>
            <div className="w-full bg-stone-100 border border-stone-200 rounded-2xl px-4 py-2.5 text-xs font-bold text-stone-700">
              {companyName}
            </div>
          </div>

          {/* Job Title */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700 flex items-center gap-1">
              <Briefcase className="w-3.5 h-3.5" style={{ color: TEAL }} />
              <span>تایتڵ یان ناونیشانی کار (Job Title) *</span>
            </label>
            <input
              type="text"
              placeholder="نموونە: پەرەپێدەری وێب / دیزاینەری گرافیک"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              required
              className="w-full bg-stone-50 border border-stone-200 focus:border-[#12796b] focus:bg-white rounded-2xl px-4 py-3 text-xs font-bold text-stone-900 focus:outline-none transition"
            />
          </div>

          {/* Salary / Rate */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700 flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5" style={{ color: TEAL }} />
              <span>مووچە / باڵانسی پێشنیارکراو (Offered Salary)</span>
            </label>
            <input
              type="text"
              placeholder="نموونە: 1,200,000 IQD یان گفتوگۆکراو"
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 focus:border-[#12796b] focus:bg-white rounded-2xl px-4 py-3 text-xs font-bold text-stone-900 focus:outline-none font-mono transition"
            />
          </div>

          {/* Notes & Special Instructions */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" style={{ color: TEAL }} />
              <span>تێبینی و پەیامی ئۆفەرەکە</span>
            </label>
            <textarea
              rows={3}
              placeholder="تێبینییەکانت یان مەرجەکانی دەستپێکردنی کار بنووسە..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 focus:border-[#12796b] focus:bg-white rounded-2xl p-4 text-xs font-medium leading-relaxed text-stone-900 focus:outline-none resize-none transition"
            />
          </div>

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={isSending}
            className="w-full py-3.5 rounded-2xl text-white font-black text-xs transition flex items-center justify-center gap-2 shadow-md active:scale-95 disabled:opacity-60"
            style={{ background: TEAL }}
          >
            {isSending ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Send className="w-4 h-4 text-white" />}
            <span>{isSending ? 'دەنێردرێت...' : 'ناردنی ئۆفەری فەرمی بۆ فریلانسەر'}</span>
          </button>

        </form>

      </div>
    </div>
  );
};
