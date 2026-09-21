import React, { useEffect, useState } from 'react';
import { apiService } from '../../services/api';
import { soundService } from '../../services/soundService';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  MailCheck,
  ArrowLeft,
  ShieldCheck,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

const TEAL = '#641bd9';
const TEAL_DEEP = '#4b13a5';

export const VerifyEmailPage = ({ onDone }) => {
  const [status, setStatus] = useState('checking');
  const [message, setMessage] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      setStatus('checking');
      setMessage('');

      const token = new URLSearchParams(window.location.search).get('token');

      if (!token) {
        if (cancelled) return;
        setStatus('error');
        setMessage('بەستەری دڵنیاکردنەوە نادروستە یان توکەنەکەی تێدا نییە.');
        return;
      }

      try {
        const res = await apiService.verifyEmail(token);
        if (cancelled) return;

        if (res?.success) {
          soundService.playSuccess?.();
          setStatus('success');
          setMessage(res.message || 'ئیمەیلەکەت بە سەرکەوتوویی دڵنیاکرایەوە.');
        } else {
          setStatus('error');
          setMessage(res?.message || 'ئەم بەستەرە بەسەرچووە یان پێشتر بەکارهاتووە.');
        }
      } catch (error) {
        if (cancelled) return;
        setStatus('error');
        setMessage('نەتوانرا دڵنیابوونەوە تەواو بکرێت. تکایە دووبارە هەوڵ بدەوە.');
      }
    };

    verify();
    return () => { cancelled = true; };
  }, [attempt]);

  const handleContinue = () => {
    soundService.playTick?.();
    onDone?.();
  };

  const handleRetry = () => {
    soundService.playTick?.();
    setAttempt(value => value + 1);
  };

  const isSuccess = status === 'success';
  const isError = status === 'error';

  return (
    <div
      dir="rtl"
      className="safe-top fixed inset-0 z-[9999] overflow-y-auto font-vazirmatn text-[#161020]"
      style={{
        background:
          'radial-gradient(80% 55% at 50% 0%, rgba(100,27,217,.16), transparent 65%), linear-gradient(180deg,#f9f7fb 0%,#f1eef5 100%)',
      }}
    >
      <div className="min-h-[100dvh] flex items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
        <div className="w-full max-w-[470px]">
          <div className="flex items-center justify-between mb-5 px-1">
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm"
                style={{ background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DEEP})` }}
              >
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div className="text-right">
                <div className="text-xs font-black text-[#221536]">ئیشخواز</div>
                <div className="text-[10px] font-bold text-[#81928d]">دڵنیابوونەوەی هەژمار</div>
              </div>
            </div>

            <div
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black"
              style={{
                background: 'rgba(100,27,217,.08)',
                color: TEAL,
                border: '1px solid rgba(100,27,217,.12)',
              }}
            >
              <Sparkles className="w-3 h-3" />
              پاراستنی هەژمار
            </div>
          </div>

          <main
            className="relative overflow-hidden rounded-[30px] border bg-white/90 shadow-[0_24px_80px_rgba(75,19,165,.12)] backdrop-blur-xl"
            style={{ borderColor: 'rgba(100,27,217,.10)' }}
          >
            <div
              className="absolute inset-x-0 top-0 h-1"
              style={{
                background: isError
                  ? 'linear-gradient(90deg,#ef4444,#fb7185)'
                  : `linear-gradient(90deg,${TEAL},#ac8ce0,${TEAL_DEEP})`,
              }}
            />

            <div className="px-5 py-8 sm:px-10 sm:py-11 text-center">
              <div className="relative mx-auto mb-6 w-[88px] h-[88px]">
                {status === 'checking' && (
                  <>
                    <div
                      className="absolute inset-0 rounded-[28px] animate-pulse"
                      style={{ background: 'rgba(100,27,217,.10)' }}
                    />
                    <div
                      className="relative w-full h-full rounded-[28px] flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(145deg,#eee9f7,#ffffff)',
                        border: '1px solid rgba(100,27,217,.14)',
                        boxShadow: '0 14px 35px rgba(100,27,217,.10)',
                      }}
                    >
                      <Loader2 className="w-9 h-9 animate-spin" style={{ color: TEAL }} />
                    </div>
                  </>
                )}

                {isSuccess && (
                  <>
                    <div
                      className="absolute inset-0 rounded-full animate-ping opacity-20"
                      style={{ background: '#22c55e' }}
                    />
                    <div
                      className="relative w-full h-full rounded-[28px] flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(145deg,#22c55e,#15803d)',
                        boxShadow: '0 18px 42px rgba(34,197,94,.25)',
                      }}
                    >
                      <CheckCircle2 className="w-10 h-10 text-white" strokeWidth={2.5} />
                    </div>
                  </>
                )}

                {isError && (
                  <div
                    className="relative w-full h-full rounded-[28px] flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(145deg,#fff1f2,#ffe4e6)',
                      border: '1px solid rgba(239,68,68,.16)',
                      boxShadow: '0 16px 38px rgba(239,68,68,.10)',
                    }}
                  >
                    <XCircle className="w-10 h-10 text-red-500" strokeWidth={2.2} />
                  </div>
                )}
              </div>

              <div className="mb-2">
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black"
                  style={{
                    background: isError ? 'rgba(239,68,68,.08)' : 'rgba(100,27,217,.08)',
                    color: isError ? '#dc2626' : TEAL,
                  }}
                >
                  {status === 'checking' ? 'خەریکی پشکنینە' : isSuccess ? 'هەژمارەکەت پارێزراوە' : 'پێویستی بە هەنگاوی تر هەیە'}
                </span>
              </div>

              <h1 className="text-[24px] sm:text-[28px] font-black tracking-tight text-[#161020]">
                {status === 'checking' && 'خەریکی دڵنیابوونەوەین...'}
                {isSuccess && 'دڵنیابوونەوە سەرکەوتوو بوو!'}
                {isError && 'دڵنیابوونەوە سەرنەکەوت'}
              </h1>

              <p className="mt-3 mx-auto max-w-[360px] text-sm sm:text-[15px] font-bold leading-7 text-[#73857f]">
                {message || 'تکایە چاوەڕێ بکە تا بەستەری ئیمەیلەکەت پشکنین بکرێت.'}
              </p>

              {status === 'checking' && (
                <div className="mt-7 space-y-2.5">
                  <div className="h-2 rounded-full overflow-hidden bg-[#efedf3]">
                    <div
                      className="h-full w-2/3 rounded-full animate-pulse"
                      style={{ background: `linear-gradient(90deg,${TEAL},#9b75d6)` }}
                    />
                  </div>
                  <p className="text-[10px] font-bold text-[#9aa9a5]">تکایە پەڕەکە مەداخە</p>
                </div>
              )}

              {isSuccess && (
                <button
                  onClick={handleContinue}
                  className="mt-8 w-full min-h-14 rounded-2xl text-white font-black text-sm flex items-center justify-center gap-2 transition-all duration-200 hover:-translate-y-0.5 active:scale-[.98] focus:outline-none focus:ring-4"
                  style={{
                    background: `linear-gradient(135deg,${TEAL},${TEAL_DEEP})`,
                    boxShadow: '0 12px 28px rgba(100,27,217,.22)',
                  }}
                >
                  <MailCheck className="w-5 h-5" />
                  بەردەوامبوون
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}

              {isError && (
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    onClick={handleRetry}
                    className="min-h-13 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all duration-200 hover:-translate-y-0.5 active:scale-[.98]"
                    style={{
                      color: TEAL,
                      background: 'rgba(100,27,217,.07)',
                      border: '1px solid rgba(100,27,217,.14)',
                    }}
                  >
                    <RefreshCw className="w-4 h-4" />
                    دووبارە پشکنین
                  </button>

                  <button
                    onClick={handleContinue}
                    className="min-h-13 rounded-2xl text-white font-black text-sm flex items-center justify-center gap-2 transition-all duration-200 hover:-translate-y-0.5 active:scale-[.98]"
                    style={{
                      background: `linear-gradient(135deg,${TEAL},${TEAL_DEEP})`,
                      boxShadow: '0 10px 24px rgba(100,27,217,.18)',
                    }}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    گەڕانەوە
                  </button>
                </div>
              )}
            </div>

            <div className="border-t bg-[#fcfbfd] px-5 py-4 sm:px-8">
              <p className="text-center text-[10px] sm:text-[11px] font-bold leading-5 text-[#9aa9a5]">
                ئەگەر بەستەرەکە بەسەرچووە، داواکارییەکی نوێی دڵنیابوونەوە دروست بکە.
              </p>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};
