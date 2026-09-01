import React, { useState, useRef, useEffect } from 'react';

export const OTPInput = ({ onComplete }) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(30);
  const inputRefs = useRef([]);

  useEffect(() => {
    const countdown = setInterval(() => {
      setTimer(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(countdown);
  }, []);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto-advance to next box
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newOtp.every(val => val !== '')) {
      if (onComplete) onComplete(newOtp.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6).split('');
    if (pastedData.every(char => /^\d$/.test(char))) {
      const newOtp = [...otp];
      pastedData.forEach((char, idx) => {
        newOtp[idx] = char;
      });
      setOtp(newOtp);
      if (newOtp.every(val => val !== '')) {
        if (onComplete) onComplete(newOtp.join(''));
      }
    }
  };

  return (
    <div className="space-y-4 text-center">
      <div className="flex items-center justify-center gap-2" onPaste={handlePaste} dir="ltr">
        {otp.map((digit, idx) => (
          <input
            key={idx}
            ref={el => inputRefs.current[idx] = el}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(idx, e.target.value)}
            onKeyDown={(e) => handleKeyDown(idx, e)}
            className="w-11 h-13 sm:w-12 sm:h-14 bg-[#0D0D0D] border border-[#2A2A2A] focus:border-[#C4E538] focus:ring-4 focus:ring-[#C4E538]/20 rounded-xl text-center text-lg font-mono font-black text-[#C4E538] outline-none transition-all shadow-inner"
          />
        ))}
      </div>

      <div className="text-xs text-[#8A8A8A] font-mono flex items-center justify-center gap-2">
        {timer > 0 ? (
          <span>دووبارە ناردنەوە پاش {timer < 10 ? `00:0${timer}` : `00:${timer}`} داهاتوو</span>
        ) : (
          <button
            onClick={() => setTimer(30)}
            className="text-[#C4E538] font-bold hover:underline"
          >
            دووبارە ناردنەوەی کۆد
          </button>
        )}
      </div>
    </div>
  );
};
