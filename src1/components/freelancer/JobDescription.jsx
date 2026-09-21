import React, { useMemo, useState } from 'react';
import {
  ChevronDown, Building2, FileText, ListChecks, ClipboardCheck, Sparkles, Clock, Gift, Send, AlignRight,
} from 'lucide-react';

const TEAL = '#641bd9';

// Section headings are "Title:" lines in the job text (that's how the description is written).
// Pick an icon from what the title says, so each dropdown reads at a glance.
const iconFor = (title) => {
  const t = title.toLowerCase();
  if (/دەربارەی|about/.test(t)) return Building2;
  if (/کورتە|summary/.test(t)) return FileText;
  if (/ئەرک|responsib/.test(t)) return ListChecks;
  if (/باشترە|نییە|نین|nice|prefer/.test(t)) return Sparkles;
  if (/مەرج|داواکاری پێویست|require|qualif/.test(t)) return ClipboardCheck;
  if (/کات|شوێن|hours|location/.test(t)) return Clock;
  if (/مووچە|بەرژەوەندی|salary|benefit/.test(t)) return Gift;
  if (/چۆن|apply/.test(t)) return Send;
  return AlignRight;
};

// "Title:\nline\nline" blocks separated by blank lines -> sections. Anything before the first
// titled block is a plain intro paragraph. Text with no "Title:" blocks stays one plain block.
const parse = (text) => {
  const blocks = String(text || '').replace(/\r/g, '').split(/\n{2,}/).map(b => b.trim()).filter(Boolean);
  const sections = [];
  const intro = [];
  for (const block of blocks) {
    const lines = block.split('\n');
    const head = lines[0].trim();
    if (lines.length > 1 && /[:：]$/.test(head) && head.length <= 60) {
      sections.push({ title: head.replace(/[:：]$/, ''), lines: lines.slice(1) });
    } else if (sections.length === 0) {
      intro.push(block);
    } else {
      // stray paragraph after sections: fold into the previous section
      sections[sections.length - 1].lines.push('', ...lines);
    }
  }
  return { intro, sections };
};

const Body = ({ lines }) => {
  const items = lines.map(l => l.trim()).filter((l, i, a) => l !== '' || (i > 0 && a[i - 1] !== ''));
  return (
    <div className="space-y-2.5">
      {items.map((l, i) => {
        if (l === '') return <div key={i} className="h-1" />;
        const bullet = /^[•\-–·*]\s*/.test(l);
        return bullet ? (
          <div key={i} className="flex items-start gap-3 text-sm font-medium leading-7 text-[#4a5b55]">
            <span className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: TEAL }} />
            <span>{l.replace(/^[•\-–·*]\s*/, '')}</span>
          </div>
        ) : (
          <p key={i} className="text-sm font-medium leading-7 text-[#4a5b55]">{l}</p>
        );
      })}
    </div>
  );
};

// The job description as dropdown sections (first one open), instead of one long wall of text.
export const JobDescription = ({ text }) => {
  const { intro, sections } = useMemo(() => parse(text), [text]);
  const [open, setOpen] = useState(() => new Set([0]));
  const allOpen = sections.length > 0 && open.size === sections.length;

  if (sections.length < 2) {
    // Short / unstructured text: keep it simple.
    return <div className="whitespace-pre-line text-sm font-medium leading-8 text-[#56655f] sm:text-[15px]">{text}</div>;
  }

  const toggle = (i) => setOpen(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });

  return (
    <div>
      {intro.length > 0 && (
        <p className="mb-4 whitespace-pre-line text-sm font-medium leading-8 text-[#56655f]">{intro.join('\n\n')}</p>
      )}

      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={() => setOpen(allOpen ? new Set() : new Set(sections.map((_, i) => i)))}
          className="rounded-lg px-2.5 py-1.5 text-[11px] font-black text-[#641bd9] transition hover:bg-[#f1edf8]"
        >
          {allOpen ? 'هەمووی بپێچەوە' : 'هەمووی بکەرەوە'}
        </button>
      </div>

      <div className="space-y-2.5">
        {sections.map((sec, i) => {
          const Icon = iconFor(sec.title);
          const isOpen = open.has(i);
          return (
            <div key={i} className={`overflow-hidden rounded-2xl border transition-colors ${isOpen ? 'border-[#d8cee9] bg-[#fcfbfe]' : 'border-[#e9e6ee] bg-white'}`}>
              <button
                type="button"
                onClick={() => toggle(i)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-right transition hover:bg-[#f7f5fa] sm:px-5"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#ece7f4]" style={{ color: TEAL }}>
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span className="min-w-0 flex-1 text-sm font-black text-[#16111d] sm:text-[15px]">{sec.title}</span>
                <ChevronDown className={`h-5 w-5 shrink-0 text-[#87948f] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
              </button>

              <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                <div className="overflow-hidden">
                  <div className="px-4 pb-5 pt-1 sm:px-5 sm:pr-[4.75rem]">
                    <Body lines={sec.lines} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
