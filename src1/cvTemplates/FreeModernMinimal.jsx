import React from 'react';
import { Mail, Phone, MapPin, Globe, Linkedin, User, Briefcase, GraduationCap, Award, Heart } from 'lucide-react';
import { getResumeLabels } from './shared/resumeLabels.js';
import { getPlaceholders } from './shared/placeholderText.js';
import { formatRange } from './shared/formatRange.js';

export default function FreeModernMinimal({ resume }) {
  const { personalInfo: p = {}, sections = {}, sectionOrder, visibleSections, direction, fontFamily, accentColor = '#2563eb' } = resume;
  const L = getResumeLabels(resume.language);
  const ph = getPlaceholders(resume.language);
  const fontCls = fontFamily === 'latin' ? 'font-latin' : 'font-arabic';

  const sidebarKeys = ['skills', 'languages', 'certifications'];
  const mainKeys = (sectionOrder || []).filter((k) => !sidebarKeys.includes(k));

  return (
    <div
      dir={direction}
      className={`bg-white text-slate-900 px-10 py-10 flex flex-col justify-between ${fontCls}`}
      style={{ width: 794, minHeight: 1123, boxSizing: 'border-box' }}
    >
      <div className="space-y-6">
        {/* Header with Photo & Name */}
        <div className="flex items-center gap-6 pb-5 border-b-2" style={{ borderColor: accentColor }}>
          {p.photo ? (
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-slate-200 shrink-0">
              <img src={p.photo} alt="" className="w-full h-full object-cover" />
            </div>
          ) : null}

          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">
              {p.fullName || <span className="opacity-40">{ph.fullName}</span>}
            </h1>
            <p className="text-sm font-bold tracking-wider mt-0.5" style={{ color: accentColor }}>
              {p.jobTitle || <span className="opacity-40">{ph.jobTitle}</span>}
            </p>

            {/* Contact Strip */}
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

        {/* 2-Column Content */}
        <div className="grid grid-cols-12 gap-8">
          {/* Main Experience & Education (8 cols) */}
          <div className="col-span-8 space-y-6">
            {mainKeys.map((key) => {
              if (!visibleSections?.[key]) return null;
              const items = sections?.[key] || [];

              if (key === 'experience') {
                return (
                  <div key={key}>
                    <h3 className="text-xs font-black uppercase tracking-wider mb-3 pb-1 border-b border-slate-200" style={{ color: accentColor }}>
                      {L.experience}
                    </h3>
                    {items.length > 0 ? (
                      <div className="space-y-3.5 text-[11.5px]">
                        {items.map((exp) => (
                          <div key={exp.id}>
                            <div className="flex justify-between items-baseline mb-0.5">
                              <span className="font-black text-slate-900">{exp.role}</span>
                              <span className="text-[10px] font-bold text-slate-400">
                                {formatRange(exp.startDate, exp.endDate, exp.current, L.present)}
                              </span>
                            </div>
                            <div className="text-slate-600 font-bold text-[11px]">{exp.company}</div>
                            {exp.description && (
                              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed whitespace-pre-line">
                                {exp.description}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-slate-400 text-xs italic">+ Experience...</div>
                    )}
                  </div>
                );
              }

              if (key === 'education') {
                return (
                  <div key={key}>
                    <h3 className="text-xs font-black uppercase tracking-wider mb-3 pb-1 border-b border-slate-200" style={{ color: accentColor }}>
                      {L.education}
                    </h3>
                    {items.length > 0 ? (
                      <div className="space-y-3 text-[11.5px]">
                        {items.map((ed) => (
                          <div key={ed.id} className="flex justify-between items-start">
                            <div>
                              <div className="font-black text-slate-900">{ed.degree} {ed.field ? `in ${ed.field}` : ''}</div>
                              <div className="text-slate-600 text-[11px]">{ed.institution}</div>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 shrink-0 text-end">
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

              if (key === 'projects' && items.length > 0) {
                return (
                  <div key={key}>
                    <h3 className="text-xs font-black uppercase tracking-wider mb-2.5 pb-1 border-b border-slate-200" style={{ color: accentColor }}>
                      {L.projects}
                    </h3>
                    <div className="space-y-2 text-[11.5px]">
                      {items.map((pr) => (
                        <div key={pr.id}>
                          <div className="font-black text-slate-900">{pr.name}</div>
                          {pr.description && <p className="text-[11px] text-slate-600 mt-0.5">{pr.description}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }

              return null;
            })}
          </div>

          {/* Sidebar Skills, Languages, Certs (4 cols) */}
          <div className="col-span-4 space-y-6">
            {/* Skills */}
            {visibleSections?.skills && (
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider mb-3 pb-1 border-b border-slate-200" style={{ color: accentColor }}>
                  {L.skills}
                </h3>
                {(sections?.skills || []).length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {sections.skills.map((s) => (
                      <span key={s.id} className="px-2.5 py-1 rounded-md text-[10.5px] font-semibold bg-slate-100 text-slate-800">
                        {s.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-slate-400 text-xs italic">+ Skills...</div>
                )}
              </div>
            )}

            {/* Languages */}
            {visibleSections?.languages && (
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider mb-2 pb-1 border-b border-slate-200" style={{ color: accentColor }}>
                  {L.languages}
                </h3>
                <div className="space-y-1 text-[11px] text-slate-700">
                  {sections.languages?.map((l) => (
                    <div key={l.id} className="flex items-center justify-between">
                      <span className="font-semibold">{l.name}</span>
                      <span className="text-slate-500 text-[10px]">{l.level}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Certifications */}
            {visibleSections?.certifications && (sections?.certifications || []).length > 0 && (
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider mb-2 pb-1 border-b border-slate-200" style={{ color: accentColor }}>
                  {L.certifications}
                </h3>
                <div className="space-y-2 text-[11px] text-slate-700">
                  {sections.certifications.map((c) => (
                    <div key={c.id}>
                      <div className="font-black text-slate-900">{c.name}</div>
                      <div className="text-[10px] text-slate-500">{c.issuer}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
