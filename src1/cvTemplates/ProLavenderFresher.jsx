import React from 'react';
import { Mail, Phone, MapPin, Globe, Linkedin, User, Briefcase, GraduationCap, Heart, Code2, Award } from 'lucide-react';
import { getResumeLabels } from './shared/resumeLabels.js';
import { getPlaceholders } from './shared/placeholderText.js';
import { formatRange } from './shared/formatRange.js';

export default function ProLavenderFresher({ resume }) {
  const { personalInfo: p = {}, sections = {}, sectionOrder, visibleSections, direction, fontFamily, accentColor = '#8b5cf6' } = resume;
  const L = getResumeLabels(resume.language);
  const ph = getPlaceholders(resume.language);
  const fontCls = fontFamily === 'latin' ? 'font-latin' : 'font-arabic';

  const sidebarKeys = ['skills', 'languages'];
  const mainKeys = (sectionOrder || []).filter((k) => !sidebarKeys.includes(k));

  return (
    <div
      dir={direction}
      className={`bg-white text-slate-900 relative overflow-hidden flex flex-col justify-between ${fontCls}`}
      style={{ width: 794, minHeight: 1123, boxSizing: 'border-box' }}
    >
      {/* Top Lavender Full-Width Header */}
      <div className="relative pt-6 pb-16 px-8 text-white" style={{ background: accentColor }}>
        {/* Contact Pill Row in Header */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-[11px] text-white/95 mb-4">
          <div className="flex items-center gap-1.5 bg-black/10 px-3 py-1 rounded-full">
            <Phone className="w-3 h-3 text-white/80 shrink-0" />
            <span>{p.phone || ph.phone}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-black/10 px-3 py-1 rounded-full">
            <Mail className="w-3 h-3 text-white/80 shrink-0" />
            <span>{p.email || ph.email}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-black/10 px-3 py-1 rounded-full">
            <MapPin className="w-3 h-3 text-white/80 shrink-0" />
            <span>{[p.city, p.country].filter(Boolean).join(', ') || ph.location}</span>
          </div>
        </div>
      </div>

      {/* Floating Centered Photo Overlap */}
      <div className="-mt-14 relative z-10 flex justify-center">
        <div className="w-28 h-28 rounded-full border-4 border-white shadow-xl overflow-hidden bg-slate-100 flex items-center justify-center">
          {p.photo ? (
            <img src={p.photo} alt="" className="w-full h-full object-cover" />
          ) : (
            <User className="w-12 h-12 text-slate-400" />
          )}
        </div>
      </div>

      {/* Centered Name & Subtitle */}
      <div className="text-center pt-3 pb-2 px-8">
        <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900">
          {p.fullName || <span className="opacity-40">{ph.fullName}</span>}
        </h1>
        <p className="text-sm font-bold tracking-widest uppercase mt-0.5" style={{ color: accentColor }}>
          {p.jobTitle || <span className="opacity-40">{ph.jobTitle}</span>}
        </p>

        {/* Career Objective / Summary */}
        <div className="max-w-xl mx-auto mt-3">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 mb-1">
            {L.summary}
          </h2>
          <p className={`text-[11px] leading-relaxed whitespace-pre-line ${p.summary ? 'text-slate-600' : 'text-slate-400 italic'}`}>
            {p.summary || ph.summary}
          </p>
        </div>
      </div>

      <div className="w-full border-b border-slate-200 my-2" />

      {/* 2-Column Body Content */}
      <div className="px-10 py-4 flex gap-10 flex-1">
        {/* Left Column (Technical & Personal Skills, Languages) */}
        <div className="w-60 shrink-0 space-y-6">
          {/* Skills */}
          {visibleSections?.skills && (
            <div>
              <h3
                className="text-xs font-black uppercase tracking-wider mb-3 pb-1 border-b-2"
                style={{ borderColor: accentColor, color: accentColor }}
              >
                {L.skills}
              </h3>
              {(sections?.skills || []).length > 0 ? (
                <ul className="space-y-2 text-[11px] text-slate-700">
                  {sections.skills.map((s) => (
                    <li key={s.id} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: accentColor }} />
                      <span className="font-semibold">{s.name}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-xs text-slate-400 italic">+ Skill item...</div>
              )}
            </div>
          )}

          {/* Languages */}
          {visibleSections?.languages && (
            <div>
              <h3
                className="text-xs font-black uppercase tracking-wider mb-3 pb-1 border-b-2"
                style={{ borderColor: accentColor, color: accentColor }}
              >
                {L.languages}
              </h3>
              {(sections?.languages || []).length > 0 ? (
                <ul className="space-y-1.5 text-[11px] text-slate-700">
                  {sections.languages.map((l) => (
                    <li key={l.id} className="flex items-center justify-between">
                      <span className="font-semibold">{l.name}</span>
                      {l.level && <span className="text-[10px] text-slate-400">{l.level}</span>}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-xs text-slate-400 italic">+ Language...</div>
              )}
            </div>
          )}

          {/* Certifications */}
          {visibleSections?.certifications && (sections?.certifications || []).length > 0 && (
            <div>
              <h3
                className="text-xs font-black uppercase tracking-wider mb-3 pb-1 border-b-2"
                style={{ borderColor: accentColor, color: accentColor }}
              >
                {L.certifications}
              </h3>
              <div className="space-y-2 text-[11px]">
                {sections.certifications.map((c) => (
                  <div key={c.id}>
                    <div className="font-bold text-slate-900">{c.name}</div>
                    <div className="text-[10px] text-slate-500">{c.issuer}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Main Column (Education, Experience, Projects, Hobbies/References) */}
        <div className="flex-1 min-w-0 space-y-6">
          {mainKeys.map((key) => {
            if (!visibleSections?.[key]) return null;
            const items = sections?.[key] || [];

            if (key === 'education') {
              return (
                <div key={key}>
                  <h3
                    className="text-xs font-black uppercase tracking-wider mb-3 pb-1 border-b-2"
                    style={{ borderColor: accentColor, color: accentColor }}
                  >
                    {L.education}
                  </h3>
                  {items.length > 0 ? (
                    <div className="space-y-3.5 text-[11.5px]">
                      {items.map((ed) => (
                        <div key={ed.id} className="flex justify-between items-start">
                          <div>
                            <div className="font-black text-slate-900">{ed.degree} {ed.field ? `in ${ed.field}` : ''}</div>
                            <div className="text-slate-600 text-[11px]">{ed.institution}</div>
                          </div>
                          <span className="text-[10px] font-bold text-slate-500 shrink-0 text-end">
                            {formatRange(ed.startDate, ed.endDate, ed.current, L.present)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-2.5 border border-dashed border-slate-200 rounded text-slate-400 text-xs italic">
                      + Add education...
                    </div>
                  )}
                </div>
              );
            }

            if (key === 'experience') {
              return (
                <div key={key}>
                  <h3
                    className="text-xs font-black uppercase tracking-wider mb-3 pb-1 border-b-2"
                    style={{ borderColor: accentColor, color: accentColor }}
                  >
                    {L.experience}
                  </h3>
                  {items.length > 0 ? (
                    <div className="space-y-3.5 text-[11.5px]">
                      {items.map((exp) => (
                        <div key={exp.id}>
                          <div className="flex justify-between items-baseline mb-0.5">
                            <h4 className="font-black text-slate-900">{exp.role}</h4>
                            <span className="text-[10px] font-bold text-slate-500">
                              {formatRange(exp.startDate, exp.endDate, exp.current, L.present)}
                            </span>
                          </div>
                          <div className="text-[11px] font-bold" style={{ color: accentColor }}>
                            {exp.company}
                          </div>
                          {exp.description && (
                            <p className="text-[11px] text-slate-600 mt-1 leading-relaxed whitespace-pre-line">
                              {exp.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-2.5 border border-dashed border-slate-200 rounded text-slate-400 text-xs italic">
                      + Add experience...
                    </div>
                  )}
                </div>
              );
            }

            if (key === 'projects' && items.length > 0) {
              return (
                <div key={key}>
                  <h3
                    className="text-xs font-black uppercase tracking-wider mb-2.5 pb-1 border-b-2"
                    style={{ borderColor: accentColor, color: accentColor }}
                  >
                    {L.projects}
                  </h3>
                  <div className="space-y-2 text-[11.5px]">
                    {items.map((pr) => (
                      <div key={pr.id}>
                        <div className="font-bold text-slate-900">{pr.name}</div>
                        {pr.description && <p className="text-[11px] text-slate-600">{pr.description}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            }

            if (key === 'references' && items.length > 0) {
              return (
                <div key={key}>
                  <h3
                    className="text-xs font-black uppercase tracking-wider mb-2.5 pb-1 border-b-2"
                    style={{ borderColor: accentColor, color: accentColor }}
                  >
                    {L.references}
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-[11px]">
                    {items.map((ref) => (
                      <div key={ref.id} className="p-2 rounded bg-slate-50 border border-slate-100">
                        <div className="font-bold text-slate-900">{ref.name}</div>
                        <div className="text-slate-500 text-[10px]">{ref.relation}</div>
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

      {/* Bottom Accent Strip */}
      <div className="h-4 w-full" style={{ background: accentColor }} />
    </div>
  );
}
