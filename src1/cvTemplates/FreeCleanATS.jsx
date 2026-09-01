import React from 'react';
import { Mail, Phone, MapPin, Globe, Linkedin } from 'lucide-react';
import { getResumeLabels } from './shared/resumeLabels.js';
import { getPlaceholders } from './shared/placeholderText.js';
import { formatRange } from './shared/formatRange.js';

export default function FreeCleanATS({ resume }) {
  const { personalInfo: p = {}, sections = {}, sectionOrder, visibleSections, direction, fontFamily, accentColor = '#0f172a' } = resume;
  const L = getResumeLabels(resume.language);
  const ph = getPlaceholders(resume.language);
  const fontCls = fontFamily === 'latin' ? 'font-latin' : 'font-arabic';

  return (
    <div
      dir={direction}
      className={`bg-white text-slate-900 px-12 py-10 flex flex-col justify-between ${fontCls}`}
      style={{ width: 794, minHeight: 1123, boxSizing: 'border-box' }}
    >
      <div className="space-y-5">
        {/* Centered ATS Header */}
        <div className="text-center pb-4 border-b border-slate-900">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
            {p.fullName || <span className="opacity-40">{ph.fullName}</span>}
          </h1>
          <p className="text-xs font-bold text-slate-700 uppercase mt-0.5 tracking-wider">
            {p.jobTitle || <span className="opacity-40">{ph.jobTitle}</span>}
          </p>

          {/* Contact Line */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-2 text-[11px] text-slate-700 font-medium">
            <span>{p.phone || ph.phone}</span>
            <span>•</span>
            <span>{p.email || ph.email}</span>
            <span>•</span>
            <span>{[p.city, p.country].filter(Boolean).join(', ') || ph.location}</span>
            {p.linkedin && (
              <>
                <span>•</span>
                <span>{p.linkedin}</span>
              </>
            )}
          </div>
        </div>

        {/* Summary */}
        <div>
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5 mb-1.5">
            {L.summary}
          </h2>
          <p className={`text-[11.5px] text-slate-800 leading-relaxed whitespace-pre-line ${p.summary ? '' : 'opacity-40 italic'}`}>
            {p.summary || ph.summary}
          </p>
        </div>

        {/* Dynamic ATS Sections */}
        {(sectionOrder || []).map((key) => {
          if (!visibleSections?.[key]) return null;
          const items = sections?.[key] || [];

          if (key === 'experience') {
            return (
              <div key={key}>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5 mb-2.5">
                  {L.experience}
                </h3>
                {items.length > 0 ? (
                  <div className="space-y-3.5 text-[11.5px]">
                    {items.map((exp) => (
                      <div key={exp.id}>
                        <div className="flex justify-between items-baseline">
                          <span className="font-black text-slate-900">{exp.role}</span>
                          <span className="text-[10px] font-bold text-slate-600">
                            {formatRange(exp.startDate, exp.endDate, exp.current, L.present)}
                          </span>
                        </div>
                        <div className="font-bold text-slate-700 text-[11px] mb-1">{exp.company} {exp.location ? `— ${exp.location}` : ''}</div>
                        {exp.description && (
                          <p className="text-[11px] text-slate-700 leading-relaxed whitespace-pre-line">
                            {exp.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-slate-400 text-xs italic">+ Work Experience...</div>
                )}
              </div>
            );
          }

          if (key === 'education') {
            return (
              <div key={key}>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5 mb-2.5">
                  {L.education}
                </h3>
                {items.length > 0 ? (
                  <div className="space-y-2.5 text-[11.5px]">
                    {items.map((ed) => (
                      <div key={ed.id} className="flex justify-between items-start">
                        <div>
                          <span className="font-black text-slate-900">{ed.degree} {ed.field ? `in ${ed.field}` : ''}</span>
                          <span className="text-slate-700 text-[11px]"> — {ed.institution}</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-600 shrink-0">
                          {formatRange(ed.startDate, ed.endDate, ed.current, L.present)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-slate-400 text-xs italic">+ Education...</div>
                )}
              </div>
            );
          }

          if (key === 'skills') {
            return (
              <div key={key}>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5 mb-2">
                  {L.skills}
                </h3>
                {items.length > 0 ? (
                  <p className="text-[11.5px] text-slate-800 leading-relaxed">
                    {items.map((s) => s.name).join(' • ')}
                  </p>
                ) : (
                  <div className="text-slate-400 text-xs italic">+ Skills...</div>
                )}
              </div>
            );
          }

          if (key === 'languages') {
            return (
              <div key={key}>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5 mb-2">
                  {L.languages}
                </h3>
                {items.length > 0 ? (
                  <p className="text-[11.5px] text-slate-800">
                    {items.map((l) => `${l.name} (${l.level || 'Fluent'})`).join(' • ')}
                  </p>
                ) : (
                  <div className="text-slate-400 text-xs italic">+ Languages...</div>
                )}
              </div>
            );
          }

          if (key === 'certifications' && items.length > 0) {
            return (
              <div key={key}>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5 mb-2">
                  {L.certifications}
                </h3>
                <div className="space-y-1.5 text-[11px] text-slate-800">
                  {items.map((c) => (
                    <div key={c.id}>
                      <span className="font-bold">{c.name}</span> — {c.issuer} {c.date ? `(${c.date})` : ''}
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          if (key === 'projects' && items.length > 0) {
            return (
              <div key={key}>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5 mb-2">
                  {L.projects}
                </h3>
                <div className="space-y-2 text-[11.5px]">
                  {items.map((pr) => (
                    <div key={pr.id}>
                      <span className="font-bold text-slate-900">{pr.name}: </span>
                      <span className="text-slate-700">{pr.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          if (key === 'references' && items.length > 0) {
            return (
              <div key={key}>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5 mb-2">
                  {L.references}
                </h3>
                <div className="grid grid-cols-2 gap-3 text-[11px] text-slate-800">
                  {items.map((ref) => (
                    <div key={ref.id}>
                      <div className="font-bold">{ref.name}</div>
                      <div className="text-slate-600 text-[10px]">{ref.relation}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}
