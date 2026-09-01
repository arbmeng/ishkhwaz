import React, { useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export const ToastSystem = () => {
  const { toasts, removeToast } = useStore();

  return (
    <div className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-96 z-50 flex flex-col gap-3 pointer-events-none">
      {toasts.map(toast => (
        <SingleToast key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

const SingleToast = ({ toast, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, toast.duration || 4500);

    return () => clearTimeout(timer);
  }, [toast, onClose]);

  const getStyle = () => {
    switch (toast.type) {
      case 'success':
        return {
          bg: 'bg-emerald-950/90 border-emerald-500/40 text-emerald-100',
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
          bar: 'bg-emerald-400'
        };
      case 'error':
        return {
          bg: 'bg-rose-950/90 border-rose-500/40 text-rose-100',
          icon: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
          bar: 'bg-rose-400'
        };
      case 'warning':
        return {
          bg: 'bg-amber-950/90 border-amber-500/40 text-amber-100',
          icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
          bar: 'bg-amber-400'
        };
      default:
        return {
          bg: 'bg-slate-900/90 border-amber-500/30 text-slate-100',
          icon: <Info className="w-5 h-5 text-amber-400 shrink-0" />,
          bar: 'bg-amber-400'
        };
    }
  };

  const style = getStyle();

  return (
    <div className={`pointer-events-auto relative overflow-hidden rounded-xl border backdrop-blur-xl p-4 shadow-2xl transition-all duration-300 animate-slide-up ${style.bg}`}>
      <div className="flex items-start gap-3">
        {style.icon}
        <div className="flex-1 pr-1">
          <h4 className="font-semibold text-sm leading-tight text-white mb-1">{toast.title}</h4>
          <p className="text-xs opacity-90 text-slate-200 leading-relaxed">{toast.message}</p>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Auto dismiss progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
        <div
          className={`h-full ${style.bar} transition-all ease-linear`}
          style={{
            animation: `toastProgress ${toast.duration || 4500}ms linear forwards`
          }}
        />
      </div>

      <style>{`
        @keyframes toastProgress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};
