import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { X, Send, Phone, CheckCheck } from 'lucide-react';

export const ChatModal = ({ application, onClose }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    { id: 1, sender: 'company', text: `سڵاو ${application?.freelancerName}، CV ەکەت لەلایەن کۆمپانیا پەسەندکرا. کەی دەتوانیت سەردانمان بکەیت بۆ چاوپێکەوتن؟`, time: '10:30' }
  ]);
  const [inputMsg, setInputMsg] = useState('');

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;
    setMessages(prev => [
      ...prev,
      { id: Date.now(), sender: user?.role === 'employer' ? 'company' : 'freelancer', text: inputMsg, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    ]);
    setInputMsg('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 font-vazirmatn overflow-y-auto animate-fade-in">
      
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[520px] my-auto">
        
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={application?.freelancerAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
              alt="Avatar"
              className="w-10 h-10 rounded-xl object-cover ring-2 ring-lime-500/40"
            />
            <div>
              <h4 className="text-sm font-black text-slate-100">{application?.freelancerName}</h4>
              <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>ئۆنلاینە بۆ چات</span>
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Feed */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-950/40">
          {messages.map((m) => {
            const isMe = (user?.role === 'employer' && m.sender === 'company') || (user?.role === 'freelancer' && m.sender === 'freelancer');
            return (
              <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl text-xs font-medium ${
                  isMe ? 'bg-lime-600 text-slate-950 font-bold rounded-br-none' : 'bg-slate-800 text-slate-100 rounded-bl-none'
                }`}>
                  {m.text}
                </div>
                <span className="text-[9px] text-slate-500 mt-1 font-mono">{m.time}</span>
              </div>
            );
          })}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
          <input
            type="text"
            value={inputMsg}
            onChange={(e) => setInputMsg(e.target.value)}
            placeholder="نامەکەت بنووسە..."
            className="flex-1 py-2.5 px-4 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-lime-500"
          />
          <button
            type="submit"
            className="py-2.5 px-4 rounded-xl bg-lime-500 hover:bg-lime-400 text-slate-950 font-black text-xs transition flex items-center gap-1"
          >
            <Send className="w-4 h-4 text-slate-950" />
          </button>
        </form>

      </div>

    </div>
  );
};
