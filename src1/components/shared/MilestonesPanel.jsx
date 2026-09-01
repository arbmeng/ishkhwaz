import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api';
import { soundService } from '../../services/soundService';
import { Plus, Clock, CheckCircle2, Send, Trash2, Layers } from 'lucide-react';

const STATUS_META = {
  pending: { label: 'چاوەڕوان', bg: 'bg-slate-800/60', fg: 'text-slate-300' },
  submitted: { label: 'ئامادەیە بۆ پێداچوونەوە', bg: 'bg-amber-500/15', fg: 'text-amber-300' },
  confirmed_paid: { label: 'پارەدراوە ✓', bg: 'bg-emerald-500/15', fg: 'text-emerald-300' },
};

// Real project-tracking + payment-confirmation for an accepted application —
// NOT escrow (Ishkhwaz never holds the money; it still moves employer ->
// freelancer directly, same as today). Just a structured, notified,
// paper-trailed record instead of the pipeline going quiet after "accepted".
export const MilestonesPanel = ({ applicationId, role /* 'freelancer' | 'employer' */ }) => {
  const { token } = useAuth();
  const [milestones, setMilestones] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = async () => setMilestones(await apiService.getMilestones(applicationId, token));
  useEffect(() => { load(); }, [applicationId]);

  const add = async (e) => {
    e.preventDefault();
    const amt = parseInt(amount, 10);
    if (!title.trim() || !amt || amt <= 0) return;
    setBusyId('add');
    const res = await apiService.createMilestone({ applicationId, title: title.trim(), amount: amt }, token);
    setBusyId(null);
    if (res?.success) {
      soundService.playSuccess?.();
      setTitle(''); setAmount(''); setShowAdd(false);
      load();
    }
  };

  const submit = async (id) => {
    setBusyId(id);
    const res = await apiService.submitMilestone(id, '', token);
    setBusyId(null);
    if (res?.success) { soundService.playTick?.(); load(); }
  };
  const confirmPaid = async (id) => {
    setBusyId(id);
    const res = await apiService.confirmMilestone(id, '', token);
    setBusyId(null);
    if (res?.success) { soundService.playSuccess?.(); load(); }
  };
  const remove = async (id) => {
    if (!window.confirm('دڵنیایت لە سڕینەوەی ئەم قۆناغە؟')) return;
    setBusyId(id);
    const res = await apiService.deleteMilestone(id, token);
    setBusyId(null);
    if (res?.success) load();
  };

  if (milestones === null) return null;

  const total = milestones.reduce((s, m) => s + m.amount, 0);
  const paid = milestones.filter((m) => m.status === 'confirmed_paid').reduce((s, m) => s + m.amount, 0);

  return (
    <div className="mt-3 p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-black text-lime-400 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5" />
          <span>قۆناغەکانی پڕۆژە</span>
        </span>
        {milestones.length > 0 && (
          <span className="text-[10px] font-mono text-slate-400">{paid.toLocaleString()} / {total.toLocaleString()} IQD دراوە</span>
        )}
      </div>

      {milestones.length === 0 && !showAdd && (
        <p className="text-[11px] text-slate-500">هێشتا هیچ قۆناغێک زیاد نەکراوە.</p>
      )}

      <div className="space-y-2">
        {milestones.map((m) => {
          const meta = STATUS_META[m.status] || STATUS_META.pending;
          return (
            <div key={m.id} className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[oklch(0.24_0.012_60)] border border-[oklch(0.32_0.02_62)]">
              <div className="min-w-0">
                <span className="text-xs font-bold text-white block truncate">{m.title}</span>
                <span className="text-[10px] font-mono text-lime-400">{m.amount.toLocaleString()} IQD</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className={`px-2 py-1 rounded-lg text-[9.5px] font-black ${meta.bg} ${meta.fg}`}>{meta.label}</span>
                {role === 'freelancer' && m.status === 'pending' && (
                  <button onClick={() => submit(m.id)} disabled={busyId === m.id} className="p-1.5 rounded-lg bg-lime-400 text-slate-950" title="نیشانکردن وەک تەواوبوو">
                    <Send className="w-3 h-3" />
                  </button>
                )}
                {role === 'employer' && m.status === 'submitted' && (
                  <button onClick={() => confirmPaid(m.id)} disabled={busyId === m.id} className="p-1.5 rounded-lg bg-emerald-400 text-slate-950" title="پشتڕاستکردنەوەی پارەدان">
                    <CheckCircle2 className="w-3 h-3" />
                  </button>
                )}
                {role === 'employer' && m.status === 'pending' && (
                  <button onClick={() => remove(m.id)} disabled={busyId === m.id} className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400" title="سڕینەوە">
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {role === 'employer' && (
        showAdd ? (
          <form onSubmit={add} className="flex items-center gap-1.5 pt-1">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ناونیشانی قۆناغ" className="flex-1 min-w-0 bg-[oklch(0.24_0.012_60)] border border-[oklch(0.32_0.02_62)] rounded-xl px-2.5 py-2 text-[11px] text-white placeholder:text-slate-600 outline-none focus:border-lime-400" />
            <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" min="1" placeholder="بڕ (IQD)" className="w-24 bg-[oklch(0.24_0.012_60)] border border-[oklch(0.32_0.02_62)] rounded-xl px-2.5 py-2 text-[11px] text-white placeholder:text-slate-600 outline-none focus:border-lime-400" />
            <button type="submit" disabled={busyId === 'add'} className="px-3 py-2 rounded-xl bg-lime-400 text-slate-950 text-[11px] font-black shrink-0">زیادکردن</button>
          </form>
        ) : (
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 text-[11px] font-bold text-lime-400 hover:text-lime-300">
            <Plus className="w-3.5 h-3.5" />
            <span>زیادکردنی قۆناغ</span>
          </button>
        )
      )}
    </div>
  );
};
