import React from 'react';
import { Mail, Phone, MapPin, Globe, Linkedin, GraduationCap, Award, Heart } from 'lucide-react';
import { getResumeLabels } from './shared/resumeLabels.js';
import { getPlaceholders } from './shared/placeholderText.js';
import { formatRange } from './shared/formatRange.js';

export default function FreeStudentClean({ resume }) {
  const { personalInfo: p = {}, sections = {}, sectionOrder, visibleSections, direction, fontFamily, accentColor = '#7c3aed' } = resume;
  const L = getResumeLabels(resume.language);
  const ph = getPlaceholders(resume.language);
  const fontCls = fontFamily === 'latin' ? 'font-latin' : 'font-arabic';

  return (
    <div
      dir={direction}
      className={`bg-white text-slate-900 px-10 py-10 flex flex-col justify-between ${fontCls}`}
      style={{ width: 794, minHeight: 1123, boxSizing: 'border-box' }}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="pb-4 border-b-2" style={{ borderColor: accentColor }}>
          <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900">
            {p.fullName || <span className="opacity-40">{ph.fullName}</span>}
          </h1>
          <p className="text-xs font-black uppercase tracking-widest mt-1" style={{ color: accentColor }}>
            {p.jobTitle || <span className="opacity-40">{ph.jobTitle}</span>}
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-2.5 text-[11px] text-slate-600">
            <div className="flex items-center gap-1.5">
              <Phone className="w-3 h-3 text-slate-400 shrink-0" />
              <span className={p.phone ? '' : 'opacity-40 italic'}>{p.phone || ph.phone}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Mail className="w-3 h-3 text-slate-400 shrink-0" />
              <span className={p.email ? '' : 'opacity-40 italic'}>{p.email || ph.email}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
              <span className={p.city || p.country ? '' : 'opacity-40 italic'}>
                {[p.city, p.country].filter(Boolean).join(', ') || ph.location}
              </span>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div>
          <h2 className="text-xs font-black uppercase tracking-wider mb-1.5" style={{ color: accentColor }}>
            {L.summary}
          </h2>
          <p className={`text-[11.5px] text-slate-700 leading-relaxed whitespace-pre-line ${p.summary ? '' : 'opacity-40 italic'}`}>
            {p.summary || ph.summary}
          </p>
        </div>

        {/* Education (Student Priority) */}
        {visibleSections?.education && (
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider mb-3 pb-1 border-b border-slate-200" style={{ color: accentColor }}>
              {L.education}
            </h3>
            {(sections?.education || []).length > 0 ? (
              <div className="space-y-3.5 text-[11.5px]">
                {sections.education.map((ed) => (
                  <div key={ed.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-black text-slate-900">{ed.degree} {ed.field ? `in ${ed.field}` : ''}</div>
                        <div className="text-slate-600 text-[11px] font-semibold">{ed.institution}</div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500">
                        {formatRange(ed.startDate, ed.endDate, ed.current, L.present)}
                      </span>
                    </div>
                    {ed.description && <p className="text-[11px] text-slate-600 mt-1.5">{ed.description}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-slate-400 text-xs italic">+ Education...</div>
            )}
          </div>
        )}

        {/* Skills Tags */}
        {visibleSections?.skills && (
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider mb-3 pb-1 border-b border-slate-200" style={{ color: accentColor }}>
              {L.skills}
            </h3>
            {(sections?.skills || []).length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {sections.skills.map((s) => (
                  <span key={s.id} className="px-3 py-1 rounded-lg text-[11px] font-bold text-slate-800 bg-purple-50 border border-purple-100">
                    {s.name}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-slate-400 text-xs italic">+ Skills...</div>
            )}
          </div>
        )}

        {/* Projects / Experience */}
        {visibleSections?.projects && (sections?.projects || []).length > 0 && (
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider mb-2.5 pb-1 border-b border-slate-200" style={{ color: accentColor }}>
              {L.projects}
            </h3>
            <div className="space-y-2.5 text-[11.5px]">
              {sections.projects.map((pr) => (
                <div key={pr.id}>
                  <div className="font-black text-slate-900">{pr.name}</div>
                  {pr.description && <p className="text-[11px] text-slate-600 mt-0.5">{pr.description}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {visibleSections?.experience && (sections?.experience || []).length > 0 && (
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider mb-3 pb-1 border-b border-slate-200" style={{ color: accentColor }}>
              {L.experience}
            </h3>
            <div className="space-y-3.5 text-[11.5px]">
              {sections.experience.map((exp) => (
                <div key={exp.id}>
                  <div className="flex justify-between items-baseline">
                    <span className="font-black text-slate-900">{exp.role}</span>
                    <span className="text-[10px] font-bold text-slate-400">
                      {formatRange(exp.startDate, exp.endDate, exp.current, L.present)}
                    </span>
                  </div>
                  <div className="text-[11px] font-bold" style={{ color: accentColor }}>{exp.company}</div>
                  {exp.description && <p className="text-[11px] text-slate-600 mt-1">{exp.description}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
