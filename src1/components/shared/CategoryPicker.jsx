import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronDown, Check, X } from 'lucide-react';

// Full-screen category picker — mains grouped with their subcategories,
// each row showing the Kurdish name bold with the English name small
// underneath. Portaled to document.body and body-scroll-locked, matching
// the app's established full-screen-takeover pattern (see JobDetailModal,
// FreelancerProfileModal) so it isn't trapped by an ancestor's transform.
export const CategoryPicker = ({ categories = [], value, onChange, onClose }) => {
  const mains = categories.filter(c => !c.parent_id).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const subsByParent = {};
  categories.filter(c => c.parent_id).forEach(c => {
    (subsByParent[c.parent_id] = subsByParent[c.parent_id] || []).push(c);
  });
  Object.values(subsByParent).forEach(list => list.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));

  const selectedMain = categories.find(c => c.id === value);
  const initialExpanded = selectedMain?.parent_id || (subsByParent[value] ? value : null);
  const [expanded, setExpanded] = useState(initialExpanded || null);

  // Same lock technique as KarnamaAiChatModal/MessageThreadModal — pinning
  // body via position:fixed instead of merely toggling overflow:hidden,
  // which has a known WebKit quirk: toggling overflow on html/body after
  // first paint can leave an already-mounted position:fixed descendant
  // using a stale, miscalculated viewport rect until the next reflow.
  useEffect(() => {
    const scrollY = window.scrollY;
    const { style } = document.body;
    const prev = { position: style.position, top: style.top, width: style.width, overflow: style.overflow };
    style.position = 'fixed'; style.top = `-${scrollY}px`; style.width = '100%'; style.overflow = 'hidden';
    return () => { Object.assign(style, prev); window.scrollTo(0, scrollY); };
  }, []);

  const pick = (id) => { onChange(id); onClose(); };

  return createPortal(
    <div dir="rtl" className="fixed inset-0 z-[60] bg-black/40 flex items-end sm:items-center sm:justify-center" onClick={onClose}>
      <div
        className="w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl bg-white flex flex-col max-h-[85vh]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <h2 className="text-sm font-black text-slate-900">بەش / پۆلی کارەکە هەڵبژێرە</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-3 py-2">
          {mains.map((m) => {
            const subs = subsByParent[m.id] || [];
            const isExpanded = expanded === m.id;
            const isSelected = value === m.id;
            return (
              <div key={m.id} className="mb-1">
                <button
                  type="button"
                  onClick={() => { if (subs.length) setExpanded(isExpanded ? null : m.id); else pick(m.id); }}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-right transition-colors ${isSelected ? 'bg-lime-50' : 'hover:bg-slate-50'}`}
                >
                  <span className="text-xl shrink-0">{m.icon || '💼'}</span>
                  <span className="flex-1 min-w-0 flex flex-col">
                    <span className="text-sm font-black text-slate-900 truncate">{m.name_ku}</span>
                    {m.name_en && <span className="text-[10px] font-bold text-slate-400 truncate">{m.name_en}</span>}
                  </span>
                  {isSelected && <Check className="w-4 h-4 text-lime-600 shrink-0" />}
                  {subs.length > 0 && (
                    isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronLeft className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>

                {isExpanded && subs.length > 0 && (
                  <div className="pr-6 flex flex-col gap-0.5 mt-0.5 mb-2">
                    {subs.map((s) => {
                      const subSelected = value === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => pick(s.id)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-right transition-colors ${subSelected ? 'bg-lime-50' : 'hover:bg-slate-50'}`}
                        >
                          <span className="flex-1 min-w-0 flex flex-col">
                            <span className="text-[13px] font-bold text-slate-800 truncate">{s.name_ku}</span>
                            {s.name_en && <span className="text-[9.5px] font-bold text-slate-400 truncate">{s.name_en}</span>}
                          </span>
                          {subSelected && <Check className="w-3.5 h-3.5 text-lime-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
};

// Trigger button matching the app's normal input styling — shows the chosen
// category's Kurdish name bold with its English name small underneath,
// opens the picker above on tap.
export const CategoryPickerField = ({ categories = [], value, onChange, className = '' }) => {
  const [open, setOpen] = useState(false);
  const selected = categories.find(c => c.id === value);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className={`w-full flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3 text-right ${className}`}>
        <span className="flex items-center gap-2 min-w-0">
          {selected?.icon && <span className="text-base shrink-0">{selected.icon}</span>}
          <span className="flex flex-col min-w-0">
            <span className="text-sm font-bold text-slate-900 truncate">{selected?.name_ku || 'هەڵبژاردنی بەش'}</span>
            {selected?.name_en && <span className="text-[10px] font-bold text-slate-400 truncate">{selected.name_en}</span>}
          </span>
        </span>
        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
      </button>
      {open && (
        <CategoryPicker
          categories={categories}
          value={value}
          onChange={onChange}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
};
