import React from 'react';
import { createPortal } from 'react-dom';
import { soundService } from '../../services/soundService';
import { X, MapPin, Briefcase, Wallet, Calendar, Edit, Trash2, ImageIcon, Tag, Clock, Building2, Share2, Copy, Check, ExternalLink, Sparkles, ShieldCheck } from 'lucide-react';

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

const formatDate = (value) => {
  if (!value) return '';
  try { return new Date(value).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch { return value; }
};

const getCompanyName = (job) => job?.company_name || job?.company?.name || job?.employer_name || 'کۆمپانیا';

const getInitials = (value = '') => value.trim().split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase() || 'K';

export const JobDetailViewModal = ({ job, isOpen, onClose, onEdit, onDelete }) => {
  const [copied, setCopied] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);

  if (!isOpen || !job) return null;

  const raw = job.required_skills;
  const skills = Array.isArray(raw) ? raw : (() => { try { return JSON.parse(raw || '[]'); } catch { return []; } })();
  const companyName = getCompanyName(job);
  const title = job.title_ku || job.title || 'هەلی کار';
  const location = job.location_detail || GOV_LABELS[job.governorate_id] || 'کوردستان';
  const type = JOB_TYPE_LABELS[job.job_type] || 'دەوامی تەواو';
  const workplace = WORKPLACE_LABELS[job.workplace_type] || 'لەسەر شوێن';

  const handleCopy = async () => {
    try {
      await navigator.clipboard?.writeText(`${title} — ${companyName}\n${location}`);
      setCopied(true);
      soundService.playTick();
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };

  const handleShare = async () => {
    const text = `${title} — ${companyName}`;
    try {
      if (navigator.share) await navigator.share({ title, text });
      else await handleCopy();
    } catch {}
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-slate-950/75 backdrop-blur-xl animate-fadeIn overflow-y-auto font-vazirmatn">
      <div className="relative w-full max-w-2xl max-h-[94vh] flex flex-col bg-white rounded-[30px] shadow-[0_30px_100px_rgba(0,0,0,.35)] my-auto text-right overflow-hidden border border-white/20">

        {/* Premium cover */}
        <div className="relative h-52 sm:h-64 w-full shrink-0 bg-slate-950 overflow-hidden">
          {job.company_logo && !imageError ? (
            <img src={job.company_logo} alt="" onError={() => setImageError(true)} className="absolute inset-0 w-full h-full object-cover opacity-70 scale-105" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_70%_20%,rgba(163,230,53,.18),transparent_35%),linear-gradient(135deg,#020617,#0f172a)]">
              <div className="w-24 h-24 rounded-[28px] bg-white/10 border border-white/10 backdrop-blur flex items-center justify-center text-lime-300 text-3xl font-black">{getInitials(companyName)}</div>
            </div>
          )}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(163,230,53,.22),transparent_30%)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-transparent" />

          <button onClick={() => { soundService.playTick(); onClose(); }} className="absolute top-4 left-4 p-2.5 rounded-2xl bg-black/35 hover:bg-black/60 text-white border border-white/10 backdrop-blur-md transition active:scale-95" aria-label="داخستن">
            <X className="w-5 h-5" />
          </button>
          <div className="absolute top-4 right-4 flex gap-2">
            <button onClick={handleShare} className="p-2.5 rounded-2xl bg-black/35 hover:bg-black/60 text-white border border-white/10 backdrop-blur-md transition active:scale-95" aria-label="هاوبەشکردن"><Share2 className="w-4 h-4" /></button>
            <button onClick={handleCopy} className="p-2.5 rounded-2xl bg-black/35 hover:bg-black/60 text-white border border-white/10 backdrop-blur-md transition active:scale-95" aria-label="کۆپیکردن">{copied ? <Check className="w-4 h-4 text-lime-300" /> : <Copy className="w-4 h-4" />}</button>
          </div>

          <div className="absolute bottom-5 right-5 left-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 rounded-full bg-lime-400/15 border border-lime-400/30 text-lime-300 text-[10px] font-black inline-flex items-center gap-1.5 backdrop-blur"> <Sparkles className="w-3 h-3" /> هەلی کار</span>
              <span className="text-white/60 text-[10px] font-bold">{formatDate(job.created_at)}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight drop-shadow-lg">{title}</h2>
            <div className="mt-2 flex items-center gap-2 text-white/75 text-xs font-bold"><Building2 className="w-3.5 h-3.5 text-lime-300" /> {companyName}</div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 custom-scrollbar">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-slate-950 text-white shadow-sm">
              <Wallet className="w-4 h-4 text-lime-400 mb-2" /><div className="text-[10px] text-white/50 font-bold">مووچە</div><div className="text-xs font-black text-lime-300 mt-0.5">{formatSalary(job)}</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100"><Briefcase className="w-4 h-4 text-lime-600 mb-2" /><div className="text-[10px] text-slate-400 font-bold">جۆری کار</div><div className="text-xs font-black text-slate-800 mt-0.5">{type}</div></div>
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100"><MapPin className="w-4 h-4 text-lime-600 mb-2" /><div className="text-[10px] text-slate-400 font-bold">شێوازی کار</div><div className="text-xs font-black text-slate-800 mt-0.5">{workplace}</div></div>
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-100"><Clock className="w-4 h-4 text-amber-600 mb-2" /><div className="text-[10px] text-amber-600/70 font-bold">کۆتایی</div><div className="text-xs font-black text-amber-900 mt-0.5">{job.deadline || 'دیارینەکراوە'}</div></div>
          </div>

          <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs font-bold text-slate-700"><MapPin className="w-4 h-4 text-lime-600 shrink-0" /><span>{location}</span></div>

          <section className="space-y-2"><div className="flex items-center justify-between"><span className="text-sm font-black text-slate-900">وەسفی هەلی کارەکە</span><span className="text-[10px] text-slate-400 font-bold">JOB DESCRIPTION</span></div><p className="text-sm text-slate-600 leading-7 whitespace-pre-line bg-slate-50 border border-slate-100 rounded-2xl p-4.5">{job.description || 'هیچ وەسفێک زیاد نەکراوە.'}</p></section>

          {skills.length > 0 && <section className="space-y-2.5"><div className="flex items-center gap-2"><Tag className="w-4 h-4 text-lime-600" /><span className="text-sm font-black text-slate-900">بەهرە پێویستەکان</span></div><div className="flex flex-wrap gap-2">{skills.map((sk, i) => <span key={i} className="px-3.5 py-1.5 rounded-xl bg-lime-50 border border-lime-200 text-lime-800 text-xs font-bold">{sk}</span>)}</div></section>}

          <div className="flex items-start gap-2.5 p-4 rounded-2xl bg-slate-950 text-white"><ShieldCheck className="w-4 h-4 text-lime-400 shrink-0 mt-0.5" /><div><div className="text-xs font-black">زانیاری هەلی کار</div><div className="text-[10px] text-white/55 mt-1 leading-5">تکایە پێش ناردنی داواکاری، مەرج و زانیارییەکانی هەلی کارەکە بە وردی بخوێنەوە.</div></div></div>

          {job.created_at && <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono"><Calendar className="w-3.5 h-3.5" /> بڵاوکراوەتەوە لە: {formatDate(job.created_at)}</div>}
        </div>

        <div className="p-4 sm:p-5 border-t border-slate-100 flex items-center gap-2.5 shrink-0 bg-white/95 backdrop-blur">
          <button onClick={() => { soundService.playTick(); onDelete?.(job); }} className="p-3.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition active:scale-95" aria-label="سڕینەوە"><Trash2 className="w-4 h-4" /><span className="hidden sm:inline">سڕینەوە</span></button>
          <button onClick={() => { soundService.playTick(); onEdit?.(job); }} className="flex-1 py-3.5 rounded-2xl bg-slate-950 hover:bg-slate-900 text-white font-black text-xs shadow-[0_12px_28px_rgba(2,6,23,.18)] transition-all flex items-center justify-center gap-2 active:scale-[.98]"><Edit className="w-4 h-4 text-lime-400" /><span>دەستکاریکردنی ئەم هەلە</span><ExternalLink className="w-3.5 h-3.5 text-white/35" /></button>
        </div>
      </div>
    </div>,
    document.body
  );
};
