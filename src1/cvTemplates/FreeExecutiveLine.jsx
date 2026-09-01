import React from 'react';
import { Mail, Phone, MapPin, Globe, Linkedin, Briefcase, GraduationCap, Award, Heart } from 'lucide-react';
import { getResumeLabels } from './shared/resumeLabels.js';
import { getPlaceholders } from './shared/placeholderText.js';
import { formatRange } from './shared/formatRange.js';

export default function FreeExecutiveLine({ resume }) {
  const { personalInfo: p = {}, sections = {}, sectionOrder, visibleSections, direction, fontFamily, accentColor = '#334155' } = resume;
  const L = getResumeLabels(resume.language);
  const ph = getPlaceholders(resume.language);
  const fontCls = fontFamily === 'latin' ? 'font-latin' : 'font-arabic';

  return (
    <div
      dir={direction}
      className={`bg-white text-slate-900 px-12 py-10 flex flex-col justify-between ${fontCls}`}
      style={{ width: 794, minHeight: 1123, boxSizing: 'border-box' }}
    >
      <div className="space-y-6">
        {/* Top Executive Header */}
        <div className="text-center pb-5 border-b-2" style={{ borderColor: accentColor }}>
          <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900">
            {p.fullName || <span className="opacity-40">{ph.fullName}</span>}
          </h1>
          <p className="text-xs font-black uppercase tracking-widest mt-1 text-slate-600">
            {p.jobTitle || <span className="opacity-40">{ph.jobTitle}</span>}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 mt-3 text-[11px] text-slate-600">
            <span>{p.phone || ph.phone}</span>
            <span>•</span>
            <span>{p.email || ph.email}</span>
            <span>•</span>
            <span>{[p.city, p.country].filter(Boolean).join(', ') || ph.location}</span>
          </div>
        </div>

        {/* Summary */}
        <div>
          <h2 className="text-xs font-black uppercase tracking-wider mb-1.5 pb-1 border-b border-slate-200" style={{ color: accentColor }}>
            {L.summary}
          </h2>
          <p className={`text-[11.5px] text-slate-700 leading-relaxed whitespace-pre-line ${p.summary ? '' : 'opacity-40 italic'}`}>
            {p.summary || ph.summary}
          </p>
        </div>

        {/* Experience */}
        {visibleSections?.experience && (
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider mb-3 pb-1 border-b border-slate-200" style={{ color: accentColor }}>
              {L.experience}
            </h3>
            {(sections?.experience || []).length > 0 ? (
              <div className="space-y-4 text-[11.5px]">
                {sections.experience.map((exp) => (
                  <div key={exp.id}>
                    <div className="flex justify-between items-baseline mb-0.5">
                      <span className="font-black text-slate-900">{exp.role}</span>
                      <span className="text-[10px] font-bold text-slate-500">
                        {formatRange(exp.startDate, exp.endDate, exp.current, L.present)}
                      </span>
                    </div>
                    <div className="text-slate-600 font-bold text-[11px] mb-1">{exp.company}</div>
                    {exp.description && (
                      <p className="text-[11px] text-slate-600 leading-relaxed whitespace-pre-line">
                        {exp.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-slate-400 text-xs italic">+ Work experience...</div>
            )}
          </div>
        )}

        {/* Education */}
        {visibleSections?.education && (
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider mb-3 pb-1 border-b border-slate-200" style={{ color: accentColor }}>
              {L.education}
            </h3>
            {(sections?.education || []).length > 0 ? (
              <div className="space-y-3 text-[11.5px]">
                {sections.education.map((ed) => (
                  <div key={ed.id} className="flex justify-between items-start">
                    <div>
                      <div className="font-black text-slate-900">{ed.degree} {ed.field ? `in ${ed.field}` : ''}</div>
                      <div className="text-slate-600 text-[11px]">{ed.institution}</div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500">
                      {formatRange(ed.startDate, ed.endDate, ed.current, L.present)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-slate-400 text-xs italic">+ Education...</div>
            )}
          </div>
        )}

        {/* Skills */}
        {visibleSections?.skills && (
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider mb-2 pb-1 border-b border-slate-200" style={{ color: accentColor }}>
              {L.skills}
            </h3>
            {(sections?.skills || []).length > 0 ? (
              <p className="text-[11.5px] text-slate-700 leading-relaxed">
                {sections.skills.map((s) => s.name).join('  |  ')}
              </p>
            ) : (
              <div className="text-slate-400 text-xs italic">+ Skills...</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
