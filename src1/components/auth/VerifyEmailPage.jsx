import React, { useEffect, useState } from 'react';
import { apiService } from '../../services/api';
import { soundService } from '../../services/soundService';
import { CheckCircle2, XCircle, Loader2, MailCheck } from 'lucide-react';

const TEAL = '#12796b';
const TEAL_DEEP = '#0d5c50';

// Landing spot for the link inside the verification email — GET
// /verify-email?token=... does the actual work server-side; this page just
// reads the token from the URL, calls it once on mount, and shows the result.
export const VerifyEmailPage = ({ onDone }) => {
  const [status, setStatus] = useState('checking'); // 'checking' | 'success' | 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) {
      setStatus('error');
      setMessage('بەستەری دڵنیاکردنەوە نادروستە.');
      return;
    }
    apiService.verifyEmail(token).then(res => {
      if (res?.success) {
        soundService.playSuccess?.();
        setStatus('success');
        setMessage(res.message || 'ئیمەیلەکەت بە سەرکەوتوویی دڵنیاکرایەوە.');
      } else {
        setStatus('error');
        setMessage(res?.message || 'ئەم بەستەرە بەسەرچووە یان پێشتر بەکارهاتووە.');
      }
    });
  }, []);

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-40 bg-white font-vazirmatn select-none overflow-y-auto flex flex-col items-center"
      style={{
        backgroundColor: '#f4f7f6',
        backgroundImage: 'radial-gradient(120% 45% at 50% 0%, #dcefeb, #f4f7f6 62%)',
        paddingTop: 'max(2.5rem, calc(env(safe-area-inset-top) + 2rem))',
      }}
    >
      <div className="relative w-full max-w-sm px-6 pb-12 my-auto text-center">
        <div
          className="w-16 h-16 rounded-3xl mx-auto flex items-center justify-center shadow-md mb-6"
          style={{ background: status === 'error' ? '#fee2e2' : 'linear-gradient(135deg, #12796b, #0d5c50)' }}
        >
          {status === 'checking' && <Loader2 className="w-7 h-7 text-white animate-spin" />}
          {status === 'success' && <CheckCircle2 className="w-7 h-7 text-white" />}
          {status === 'error' && <XCircle className="w-7 h-7" style={{ color: '#dc2626' }} />}
        </div>

        <h1 className="text-lg font-black text-[#111d1a] mb-2">
          {status === 'checking' && 'خەریکی پشکنینە...'}
          {status === 'success' && 'دڵنیاکرایەوە!'}
          {status === 'error' && 'دڵنیاکردنەوە سەرنەکەوت'}
        </h1>
        <p className="text-sm text-[#7b8e88] font-bold leading-relaxed">{message}</p>

        {status !== 'checking' && (
          <button
            onClick={() => { soundService.playTick?.(); onDone?.(); }}
            className="mt-8 w-full py-3.5 rounded-2xl text-white font-black text-sm shadow-md active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
            style={{ background: TEAL }}
          >
            <MailCheck className="w-4 h-4" />
            بەردەوامبوون
          </button>
        )}
      </div>
    </div>
  );
};
