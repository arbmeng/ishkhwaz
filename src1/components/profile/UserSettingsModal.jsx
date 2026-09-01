import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { X, User, Phone, Mail, CheckCircle2, ShieldCheck } from 'lucide-react';

export const UserSettingsModal = ({ onClose }) => {
  const { user, updateUserProfile } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [isSaved, setIsSaved] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    updateUserProfile({ name, phone, email });
    setIsSaved(true);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 font-vazirmatn overflow-y-auto animate-fade-in">
      
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 space-y-5 my-auto">
        
        <button
          onClick={onClose}
          className="absolute top-5 left-5 ltr:left-5 ltr:right-auto rtl:right-5 rtl:left-auto p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {isSaved ? (
          <div className="text-center py-6 space-y-3">
            <CheckCircle2 className="w-16 h-16 text-lime-400 mx-auto animate-bounce" />
            <h3 className="text-xl font-black text-slate-100">پڕۆفایلەکەت بە سەرکەوتوویی نوێکرایەوە!</h3>
          </div>
        ) : (
          <>
            <div>
              <span className="text-xs font-bold text-lime-400">ڕێکخستنەکان</span>
              <h2 className="text-xl font-black text-slate-100 mt-0.5">دەستکاری زانیارییەکان</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">ناو *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full py-3 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">ژمارەی مۆبایل *</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full py-3 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">ئیمەیڵ *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full py-3 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 font-mono"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="py-3 px-4 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
                >
                  پاشگەزبوونەوە
                </button>

                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-lime-500 to-emerald-600 text-slate-950 font-black text-xs transition shadow-md shadow-lime-950"
                >
                  پاشەکەوتکردن ✨
                </button>
              </div>
            </form>
          </>
        )}

      </div>

    </div>
  );
};
