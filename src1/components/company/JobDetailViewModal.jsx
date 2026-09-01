import React from 'react';
import { createPortal } from 'react-dom';
import { soundService } from '../../services/soundService';
import { X, MapPin, Briefcase, Wallet, Calendar, Edit, Trash2, ImageIcon, Tag, Clock } from 'lucide-react';

const JOB_TYPE_LABELS = { fullTime: 'دەوامی تەواو', partTime: 'دەوامی پارچە', contract: 'قەرارداد', internship: 'ستاژ', remote: 'کاتی ئازاد' };
const WORKPLACE_LABELS = { onSite: 'لەسەر شوێن', remote: 'کاتی ئازاد', hybrid: 'تێکەڵ' };
const GOV_LABELS = { sulaymaniyah: 'سلێمانی', erbil: 'هەولێر', duhok: 'دهۆک', kirkuk: 'کەرکووک', halabja: 'هەڵەبجە' };

const formatSalary = (job) => {
  const min = Number(job?.salary_min) || 0;
  const max = Number(job?.salary_max) || 0;
  if (!min && !max) return 'وەک گفتوگۆ';
  if (min && max && min !== max) return `${min.toLocaleString()} - ${max.toLocaleString()} IQD`;
  return `${(max || min).toLocaleString()} IQD`;
};

export const JobDetailViewModal = ({ job, isOpen, onClose, onEdit, onDelete }) => {
  if (!isOpen || !job) return null;

  const raw = job.required_skills;
  const skills = Array.isArray(raw) ? raw : (() => { try { return JSON.parse(raw || '[]'); } catch { return []; } })();

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn overflow-y-auto font-vazirmatn">
      <div className="relative w-full max-w-xl max-h-[92vh] flex flex-col bg-white rounded-3xl shadow-2xl my-auto text-right overflow-hidden">

        {/* Cover / Photo Banner */}
        <div className="relative h-40 sm:h-52 w-full shrink-0 bg-slate-950 overflow-hidden">
          {job.company_logo ? (
            <img src={job.company_logo} alt={job.title_ku} className="w-full h-full object-cover opacity-90" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-12 h-12 text-white/15" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/10 to-transparent" />

          <button
            onClick={() => { soundService.playTick(); onClose(); }}
            className="absolute top-4 left-4 p-2 rounded-2xl bg-black/40 hover:bg-black/60 text-white border border-white/10 backdrop-blur-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="absolute bottom-4 right-5 left-5">
            <span className="px-2.5 py-0.5 rounded-full bg-lime-400/15 border border-lime-400/40 text-lime-400 text-[10px] font-black inline-flex items-center gap-1 mb-1.5 backdrop-blur-md">
              <MapPin className="w-3 h-3" />
              {GOV_LABELS[job.governorate_id] || 'کوردستان'}
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white leading-tight drop-shadow-lg">
              {job.title_ku || job.title}
            </h2>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 custom-scrollbar">

          {/* Quick Stat Chips */}
          <div className="flex flex-wrap gap-2">
            <div className="px-3.5 py-2 rounded-2xl bg-slate-950 text-lime-400 font-mono text-xs font-black flex items-center gap-1.5 shadow-sm">
              <Wallet className="w-3.5 h-3.5" />
              {formatSalary(job)}
            </div>
            <div className="px-3.5 py-2 rounded-2xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-lime-600" />
              {JOB_TYPE_LABELS[job.job_type] || 'دەوامی تەواو'}
            </div>
            <div className="px-3.5 py-2 rounded-2xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-lime-600" />
              {WORKPLACE_LABELS[job.workplace_type] || 'لەسەر شوێن'}
            </div>
            {job.deadline && (
              <div className="px-3.5 py-2 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                دوا وادە: {job.deadline}
              </div>
            )}
          </div>

          {job.location_detail && (
            <div className="flex items-start gap-2 text-xs text-slate-600 font-bold">
              <MapPin className="w-3.5 h-3.5 text-lime-600 shrink-0 mt-0.5" />
              <span>{job.location_detail}</span>
            </div>
          )}

          {/* Description */}
          <div className="space-y-1.5">
            <span className="text-xs font-black text-slate-900 block">وەسفی هەلی کارەکە</span>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line bg-slate-50 border border-slate-100 rounded-2xl p-4">
              {job.description || 'هیچ وەسفێک زیاد نەکراوە.'}
            </p>
          </div>

          {/* Skills */}
          {skills.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-lime-600" />
                بەهرە پێویستەکان
              </span>
              <div className="flex flex-wrap gap-1.5">
                {skills.map((sk, i) => (
                  <span key={i} className="px-3 py-1 rounded-xl bg-lime-50 border border-lime-200 text-lime-800 text-xs font-bold">
                    {sk}
                  </span>
                ))}
              </div>
            </div>
          )}

          {job.created_at && (
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono pt-1">
              <Calendar className="w-3.5 h-3.5" />
              بڵاوکراوەتەوە لە: {new Date(job.created_at).toLocaleDateString('en-GB')}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 flex items-center gap-2 shrink-0 bg-white">
          <button
            onClick={() => { soundService.playTick(); onDelete?.(job); }}
            className="p-3.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition flex items-center gap-1.5"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
            <span className="hidden sm:inline">سڕینەوە</span>
          </button>
          <button
            onClick={() => { soundService.playTick(); onEdit?.(job); }}
            className="flex-1 py-3.5 rounded-2xl bg-slate-950 hover:bg-slate-900 text-white font-black text-xs shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <Edit className="w-4 h-4 text-lime-400" />
            <span>دەستکاریکردنی ئەم هەلە</span>
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};
