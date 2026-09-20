import React, { useEffect, useMemo, useRef, useState } from 'react';
import { apiService } from '../../services/api';
import { soundService } from '../../services/soundService';
import {
  ArrowRight,
  Phone,
  AlertCircle,
  CheckCircle2,
  Send,
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  RotateCcw,
  LockKeyhole,
} from 'lucide-react';

const TEAL = '#12796b';
const TEAL_DEEP = '#0d5c50';
const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

const cleanPhoneNumber = (value) => value.trim().replace(/\D/g, '').replace(/^0+/, '');

const getResetToken = (response) =>
  response?.reset_token ||
  response?.resetToken ||
  response?.token ||
  response?.data?.reset_token ||
  response?.data?.resetToken ||
  response?.data?.token ||
  '';

const getMessage = (response, fallback) =>
  response?.message || response?.error || response?.data?.message || fallback;

export const ForgotPasswordPage = ({ onBack }) => {
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [resendSeconds, setResendSeconds] = useState(RESEND_SECONDS);

  const otpRefs = useRef([]);

  const otpValue = useMemo(() => otp.join(''), [otp]);

  useEffect(() => {
    if (step !== 'otp' || resendSeconds <= 0) return undefined;
    const timer = window.setInterval(() => {
      setResendSeconds((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [step, resendSeconds]);

  const resetMessages = () => {
    setErrorMsg('');
    setInfoMsg('');
    setSuccessMsg('');
  };

  const goBack = () => {
    soundService.playTick?.();
    if (step === 'phone') {
      onBack?.();
      return;
    }
    resetMessages();
    if (step === 'otp') {
      setStep('phone');
      setOtp(Array(OTP_LENGTH).fill(''));
      setResendSeconds(RESEND_SECONDS);
      return;
    }
    if (step === 'password') {
      setStep('otp');
      return;
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    soundService.playTick?.();
    resetMessages();

    const cleanPhone = cleanPhoneNumber(phone);
    if (!cleanPhone) {
      setErrorMsg('تکایە ژمارەی مۆبایلەکەت بنووسە.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Existing endpoint starts the recovery process and sends the OTP
      // to the email attached to the account.
      const res = await apiService.forgotPassword(cleanPhone);

      if (res?.success) {
        soundService.playSuccess?.();
        setPhone(cleanPhone);
        setInfoMsg(
          res.message ||
          'کۆدی ٦ ژمارەیی بۆ ئیمەیلی هەژمارەکەت نێردرا. تکایە کۆدەکە لێرە بنووسە.'
        );
        setOtp(Array(OTP_LENGTH).fill(''));
        setResendSeconds(RESEND_SECONDS);
        setStep('otp');
        window.setTimeout(() => otpRefs.current[0]?.focus(), 80);
      } else {
        setErrorMsg(getMessage(res, 'ناردنی کۆدی پشتڕاستکردنەوە سەرکەوتوو نەبوو.'));
      }
    } catch {
      setErrorMsg('کێشەیەک لە پەیوەندی بە سێرڤەرەوە ڕوویدا.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpChange = (index, value) => {
    const digits = value.replace(/\D/g, '');
    if (!digits) {
      setOtp((current) => {
        const next = [...current];
        next[index] = '';
        return next;
      });
      return;
    }

    // Supports pasting the complete 6-digit OTP.
    if (digits.length > 1) {
      const pasted = digits.slice(0, OTP_LENGTH).split('');
      setOtp((current) => {
        const next = [...current];
        pasted.forEach((digit, offset) => {
          if (index + offset < OTP_LENGTH) next[index + offset] = digit;
        });
        return next;
      });
      window.setTimeout(() => {
        const nextIndex = Math.min(index + pasted.length, OTP_LENGTH - 1);
        otpRefs.current[nextIndex]?.focus();
      }, 0);
      return;
    }

    setOtp((current) => {
      const next = [...current];
      next[index] = digits;
      return next;
    });

    if (index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, event) => {
    if (event.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
    if (event.key === 'ArrowLeft' && index > 0) otpRefs.current[index - 1]?.focus();
    if (event.key === 'ArrowRight' && index < OTP_LENGTH - 1) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpPaste = (event) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;

    setOtp(() => {
      const next = Array(OTP_LENGTH).fill('');
      pasted.split('').forEach((digit, index) => {
        next[index] = digit;
      });
      return next;
    });

    window.setTimeout(() => {
      otpRefs.current[Math.min(pasted.length, OTP_LENGTH) - 1]?.focus();
    }, 0);
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    soundService.playTick?.();
    resetMessages();

    if (otpValue.length !== OTP_LENGTH) {
      setErrorMsg('تکایە هەموو ٦ ژمارەکەی کۆدەکە بنووسە.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (typeof apiService.verifyResetOtp !== 'function') {
        setErrorMsg('پشتیوانی پشتڕاستکردنەوەی OTP لە API ـەکەتدا زیاد نەکراوە.');
        return;
      }

      const res = await apiService.verifyResetOtp(phone, otpValue);
      const token = getResetToken(res);

      if (res?.success && token) {
        soundService.playSuccess?.();
        setResetToken(token);
        setInfoMsg('کۆدەکە دروستە. ئێستا دەتوانیت وشەی نهێنی نوێ دابنێیت.');
        setStep('password');
      } else if (res?.success) {
        setErrorMsg(
          'کۆدەکە پشتڕاست کرا، بەڵام سێرڤەر reset token ـی گەڕاندنەوە نەگەڕاندەوە.'
        );
      } else {
        setErrorMsg(getMessage(res, 'کۆدی پشتڕاستکردنەوە هەڵەیە یان بەسەرچووە.'));
      }
    } catch {
      setErrorMsg('پشتڕاستکردنەوەی کۆدەکە سەرکەوتوو نەبوو.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendSeconds > 0 || isSubmitting) return;

    soundService.playTick?.();
    resetMessages();
    setIsSubmitting(true);

    try {
      const res = await apiService.forgotPassword(phone);
      if (res?.success) {
        soundService.playSuccess?.();
        setOtp(Array(OTP_LENGTH).fill(''));
        setResendSeconds(RESEND_SECONDS);
        setInfoMsg(res.message || 'کۆدەکە دووبارە بۆ ئیمەیلەکەت نێردرا.');
        window.setTimeout(() => otpRefs.current[0]?.focus(), 80);
      } else {
        setErrorMsg(getMessage(res, 'ناردنەوەی کۆدەکە سەرکەوتوو نەبوو.'));
      }
    } catch {
      setErrorMsg('ناردنەوەی کۆدەکە سەرکەوتوو نەبوو.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const passwordValid = newPassword.length >= 8;
  const passwordsMatch =
    newPassword.length > 0 &&
    confirmPassword.length > 0 &&
    newPassword === confirmPassword;

  const handleChangePassword = async (e) => {
    e.preventDefault();
    soundService.playTick?.();
    resetMessages();

    if (!passwordValid) {
      setErrorMsg('وشەی نهێنی دەبێت لانیکەم ٨ پیت بێت.');
      return;
    }

    if (!passwordsMatch) {
      setErrorMsg('دوو وشەی نهێنی یەکسان نین.');
      return;
    }

    if (!resetToken) {
      setErrorMsg('کۆدی پشتڕاستکردنەوە بەسەرچووە. تکایە دووبارە داوای کۆد بکە.');
      setStep('phone');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiService.resetPassword(resetToken, newPassword);

      if (res?.success) {
        soundService.playSuccess?.();
        setSuccessMsg(res.message || 'وشەی نهێنیت بە سەرکەوتوویی گۆڕدرا.');
        setStep('success');
      } else {
        setErrorMsg(getMessage(res, 'گۆڕینی وشەی نهێنی سەرکەوتوو نەبوو.'));
      }
    } catch {
      setErrorMsg('کێشەیەک لە گۆڕینی وشەی نهێنی ڕوویدا.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepIndex = step === 'phone' ? 0 : step === 'otp' ? 1 : step === 'password' ? 2 : 3;
  const title =
    step === 'phone'
      ? 'وشەی نهێنیت لەبیرچووە؟'
      : step === 'otp'
        ? 'کۆدی پشتڕاستکردنەوە'
        : step === 'password'
          ? 'وشەی نهێنی نوێ'
          : 'بە سەرکەوتوویی تەواو بوو';

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-40 min-h-[100dvh] overflow-y-auto bg-white font-vazirmatn select-none"
      style={{
        backgroundColor: '#f4f7f6',
        backgroundImage:
          'radial-gradient(120% 45% at 50% 0%, #dcefeb 0%, #f4f7f6 62%)',
        paddingTop: 'max(1.25rem, env(safe-area-inset-top))',
        paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))',
      }}
    >
      <div className="mx-auto flex min-h-[calc(100dvh-2.5rem)] w-full max-w-xl items-center justify-center px-4 py-6 sm:px-6">
        <div className="w-full">
          <div className="mb-5 flex items-center justify-between">
            <button
              type="button"
              onClick={goBack}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-90"
              style={{ borderColor: '#d7e0dd' }}
              aria-label="گەڕانەوە"
            >
              <ArrowRight className="h-5 w-5" style={{ color: '#111' }} />
            </button>

            {step !== 'success' && (
              <div className="flex items-center gap-1.5" aria-label="قۆناغەکانی گەڕاندنەوە">
                {[0, 1, 2].map((item) => (
                  <span
                    key={item}
                    className="h-1.5 rounded-full transition-all duration-500"
                    style={{
                      width: item <= stepIndex ? 34 : 12,
                      background: item <= stepIndex ? TEAL : '#d9e2df',
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-[30px] border border-white/80 bg-white/90 p-5 shadow-[0_24px_80px_rgba(13,92,80,0.10)] backdrop-blur-xl sm:p-8">
            <div className="mb-7 text-center">
              <div
                className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[22px] text-white shadow-lg"
                style={{
                  background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DEEP})`,
                  boxShadow: `0 14px 34px ${TEAL}35`,
                }}
              >
                {step === 'phone' && <Phone className="h-7 w-7" />}
                {step === 'otp' && <ShieldCheck className="h-7 w-7" />}
                {step === 'password' && <KeyRound className="h-7 w-7" />}
                {step === 'success' && <CheckCircle2 className="h-7 w-7" />}
              </div>

              <h1 className="text-[24px] font-black tracking-tight text-[#111] sm:text-[28px]">
                {title}
              </h1>

              <p className="mx-auto mt-2 max-w-md text-sm font-bold leading-7 text-[#7b8e88]">
                {step === 'phone' &&
                  'ژمارەی مۆبایلەکەت بنووسە. کۆدی پشتڕاستکردنەوە بۆ ئیمەیلی هەژمارەکەت دەنێرین.'}
                {step === 'otp' &&
                  'کۆدی ٦ ژمارەیی کە بۆ ئیمەیلی هەژمارەکەت نێردراوە بنووسە.'}
                {step === 'password' &&
                  'کۆدی پشتڕاست کرا. ئێستا وشەی نهێنی نوێی خۆت دابنێ.'}
                {step === 'success' &&
                  'وشەی نهێنی نوێکەت دانرا. ئێستا دەتوانیت بە هەژمارەکەت بچیتە ژوورەوە.'}
              </p>
            </div>

            {(errorMsg || infoMsg || successMsg) && (
              <div
                className="mb-5 flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-sm font-bold leading-6"
                style={{
                  borderColor: errorMsg ? '#fecaca' : '#cde6df',
                  background: errorMsg ? '#fff7f7' : '#f0faf7',
                  color: errorMsg ? '#c43c3c' : TEAL_DEEP,
                }}
              >
                {errorMsg ? (
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                ) : (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                )}
                <span>{errorMsg || infoMsg || successMsg}</span>
              </div>
            )}

            {step === 'phone' && (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-black text-[#626f6b]">
                    ژمارەی مۆبایل
                  </label>
                  <div className="relative">
                    <Phone
                      className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2"
                      style={{ color: '#9aa1a0' }}
                    />
                    <span className="pointer-events-none absolute right-11 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-[#9aa1a0]">
                      +964
                    </span>
                    <input
                      type="tel"
                      required
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="770 123 4567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full rounded-[20px] border bg-white py-4 pl-4 pr-[5.4rem] text-sm font-mono font-bold text-[#111] outline-none transition focus:ring-4"
                      style={{
                        borderColor: errorMsg ? '#fca5a5' : '#d7e0dd',
                        '--tw-ring-color': `${TEAL}18`,
                      }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex w-full items-center justify-center gap-2 rounded-full py-4 text-sm font-black text-white shadow-lg transition-all hover:-translate-y-0.5 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  style={{
                    background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DEEP})`,
                    boxShadow: `0 12px 28px ${TEAL}38`,
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      خەریکی ناردنە...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      ناردنی کۆدی پشتڕاستکردنەوە
                    </>
                  )}
                </button>
              </form>
            )}

            {step === 'otp' && (
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div
                  dir="ltr"
                  className="flex justify-center gap-2 sm:gap-3"
                  onPaste={handleOtpPaste}
                >
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(element) => {
                        otpRefs.current[index] = element;
                      }}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      inputMode="numeric"
                      autoComplete={index === 0 ? 'one-time-code' : 'off'}
                      maxLength={OTP_LENGTH}
                      aria-label={`OTP ${index + 1}`}
                      className="h-12 w-11 rounded-2xl border bg-white text-center text-lg font-black text-[#111] outline-none transition focus:-translate-y-0.5 focus:ring-4 sm:h-14 sm:w-14"
                      style={{
                        borderColor: digit ? TEAL : '#d7e0dd',
                        '--tw-ring-color': `${TEAL}18`,
                      }}
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || otpValue.length !== OTP_LENGTH}
                  className="flex w-full items-center justify-center gap-2 rounded-full py-4 text-sm font-black text-white shadow-lg transition-all hover:-translate-y-0.5 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DEEP})`,
                    boxShadow: `0 12px 28px ${TEAL}38`,
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      خەریکی پشتڕاستکردنەوەیە...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      پشتڕاستکردنەوەی کۆد
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center">
                  <button
                    type="button"
                    disabled={resendSeconds > 0 || isSubmitting}
                    onClick={handleResend}
                    className="flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black transition disabled:opacity-45"
                    style={{ color: TEAL_DEEP }}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    {resendSeconds > 0
                      ? `دووبارە ناردنەوە لە ${resendSeconds} چرکە`
                      : 'دووبارە ناردنەوەی کۆد'}
                  </button>
                </div>
              </form>
            )}

            {step === 'password' && (
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-black text-[#626f6b]">
                    وشەی نهێنی نوێ
                  </label>
                  <div className="relative">
                    <LockKeyhole
                      className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2"
                      style={{ color: '#9aa1a0' }}
                    />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="لانیکەم ٨ پیت"
                      className="w-full rounded-[20px] border bg-white py-4 pl-12 pr-11 text-sm font-bold text-[#111] outline-none transition focus:ring-4"
                      style={{ borderColor: '#d7e0dd', '--tw-ring-color': `${TEAL}18` }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 rounded-xl p-2 text-[#87918d] transition hover:bg-[#f1f5f4]"
                      aria-label="پیشاندانی وشەی نهێنی"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-[11px] font-bold">
                    <span
                      className="h-1.5 flex-1 rounded-full"
                      style={{ background: passwordValid ? TEAL : '#e3e9e7' }}
                    />
                    <span style={{ color: passwordValid ? TEAL_DEEP : '#8b9490' }}>
                      {passwordValid ? 'باشە' : 'لانیکەم ٨ پیت'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-black text-[#626f6b]">
                    دووبارە وشەی نهێنی
                  </label>
                  <div className="relative">
                    <LockKeyhole
                      className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2"
                      style={{ color: '#9aa1a0' }}
                    />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="وشەی نهێنی دووبارە بنووسە"
                      className="w-full rounded-[20px] border bg-white py-4 pl-12 pr-11 text-sm font-bold text-[#111] outline-none transition focus:ring-4"
                      style={{
                        borderColor:
                          confirmPassword && !passwordsMatch ? '#fca5a5' : '#d7e0dd',
                        '--tw-ring-color': `${TEAL}18`,
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((value) => !value)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 rounded-xl p-2 text-[#87918d] transition hover:bg-[#f1f5f4]"
                      aria-label="پیشاندانی وشەی نهێنی"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-full py-4 text-sm font-black text-white shadow-lg transition-all hover:-translate-y-0.5 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  style={{
                    background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DEEP})`,
                    boxShadow: `0 12px 28px ${TEAL}38`,
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      خەریکی گۆڕینە...
                    </>
                  ) : (
                    <>
                      <KeyRound className="h-4 w-4" />
                      گۆڕینی وشەی نهێنی
                    </>
                  )}
                </button>
              </form>
            )}

            {step === 'success' && (
              <div className="text-center">
                <div className="mb-6 rounded-2xl border border-[#cde6df] bg-[#f0faf7] p-4 text-sm font-bold leading-7 text-[#0d5c50]">
                  {successMsg || 'وشەی نهێنیت بە سەرکەوتوویی گۆڕدرا.'}
                </div>

                <button
                  type="button"
                  onClick={() => onBack?.()}
                  className="flex w-full items-center justify-center gap-2 rounded-full py-4 text-sm font-black text-white shadow-lg transition-all hover:-translate-y-0.5 active:scale-[0.98]"
                  style={{
                    background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DEEP})`,
                    boxShadow: `0 12px 28px ${TEAL}38`,
                  }}
                >
                  <ArrowRight className="h-4 w-4" />
                  گەڕانەوە بۆ چوونەژوورەوە
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
