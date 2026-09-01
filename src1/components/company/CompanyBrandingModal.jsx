import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { apiService } from '../../services/api';
import { compressImageFile } from '../../utils/image';
import { soundService } from '../../services/soundService';
import { Monogram } from '../ui/Monogram';
import { X, Upload, Loader2, Building2, CheckCircle2 } from 'lucide-react';

// Logo/cover live on each JOB row (denormalized, not on the company account),
// so setting them once here and looping /jobs/update across every job you own
// is the only way to keep branding consistent everywhere it's shown (search
// cards, map pins, your public company profile) without editing each job by hand.
export const CompanyBrandingModal = ({ isOpen, onClose, jobs = [] }) => {
  const { user, token } = useAuth();
  const { syncBackendData, addToast } = useStore();

  const [logo, setLogo] = useState('');
  const [cover, setCover] = useState('');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [progress, setProgress] = useState(0);
  const logoInputRef = useRef(null);
  const coverInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setLogo(jobs[0]?.company_logo || '');
      setCover(jobs[0]?.company_cover || '');
      setProgress(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingLogo(true);
    try {
      setLogo(await compressImageFile(file, 400, 0.85));
      soundService.playTick?.();
    } catch {
      addToast?.({ title: 'کێشە', message: 'وێنە بار نەکرا', type: 'error' });
    }
    setIsUploadingLogo(false);
  };

  const handleCoverChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingCover(true);
    try {
      setCover(await compressImageFile(file, 1000, 0.8));
      soundService.playTick?.();
    } catch {
      addToast?.({ title: 'کێشە', message: 'وێنە بار نەکرا', type: 'error' });
    }
    setIsUploadingCover(false);
  };

  const handleApplyToAll = async () => {
    if (jobs.length === 0) { onClose(); return; }
    soundService.playTick();
    setIsApplying(true);
    setProgress(0);
    let okCount = 0;
    for (let i = 0; i < jobs.length; i++) {
      const res = await apiService.updateJob(jobs[i].id, { company_logo: logo, company_cover: cover }, token);
      if (res?.success) okCount++;
      setProgress(i + 1);
    }
    await syncBackendData?.();
    setIsApplying(false);
    if (okCount === jobs.length) {
      soundService.playSuccess?.();
      addToast?.({ title: '✓ نوێکرایەوە', message: `لۆگۆ و وێنەی پاشبنەما بۆ هەموو ${okCount} کارەکەت جێبەجێکرا.`, type: 'success' });
      onClose();
    } else {
      addToast?.({ title: 'بەشێکی جێبەجێکرا', message: `${okCount} لە ${jobs.length} کار نوێکرایەوە.`, type: 'warning' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-2xl text-right overflow-hidden">

        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-slate-900">براندی کۆمپانیا</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">لۆگۆ و وێنەی پاشبنەما بۆ هەموو {jobs.length} کارە بڵاوکراوەکەت</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          {/* Cover preview + upload */}
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-2">وێنەی پاشبنەما (Cover)</label>
            <div className="relative h-32 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
              {cover ? (
                <img src={cover} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300">
                  <Building2 className="w-8 h-8" />
                </div>
              )}
              <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverChange} className="hidden" />
              <button
                onClick={() => coverInputRef.current?.click()}
                disabled={isUploadingCover}
                className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/40 text-transparent hover:text-white transition-all text-xs font-bold gap-1.5"
              >
                {isUploadingCover ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Upload className="w-4 h-4" />گۆڕینی وێنە</>}
              </button>
            </div>
          </div>

          {/* Logo preview + upload */}
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              {logo ? (
                <img src={logo} alt="" className="w-16 h-16 rounded-2xl object-cover border border-slate-200" />
              ) : (
                <Monogram name={user?.companyName || user?.name} className="w-16 h-16 rounded-2xl" />
              )}
              <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
            </div>
            <div className="flex-1">
              <label className="text-xs font-bold text-slate-600 block mb-1.5">لۆگۆی کۆمپانیا</label>
              <button
                onClick={() => logoInputRef.current?.click()}
                disabled={isUploadingLogo}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-bold text-slate-700 transition flex items-center gap-1.5"
              >
                {isUploadingLogo ? <Loader2 className="w-3.5 h-3.5 animate-spin text-lime-600" /> : <Upload className="w-3.5 h-3.5 text-lime-600" />}
                <span>{logo ? 'گۆڕینی لۆگۆ' : 'زیادکردنی لۆگۆ'}</span>
              </button>
            </div>
          </div>

          {isApplying && (
            <div className="space-y-1.5">
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-lime-400 transition-all duration-300" style={{ width: `${(progress / jobs.length) * 100}%` }} />
              </div>
              <p className="text-[10px] text-slate-400 font-mono">{progress} / {jobs.length}</p>
            </div>
          )}

          <button
            onClick={handleApplyToAll}
            disabled={isApplying || (!logo && !cover)}
            className="w-full py-3.5 rounded-2xl bg-slate-950 hover:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            {isApplying
              ? <><Loader2 className="w-4 h-4 animate-spin text-lime-400" />جێبەجێکردن...</>
              : <><CheckCircle2 className="w-4 h-4 text-lime-400" />جێبەجێکردن بۆ هەموو کارەکان</>}
          </button>
        </div>
      </div>
    </div>
  );
};
