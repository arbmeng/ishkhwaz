import React from 'react';
import { Mail, Phone, MapPin, Globe, Linkedin, User, Briefcase, GraduationCap, Award, Heart, CheckCircle2 } from 'lucide-react';
import { getResumeLabels } from './shared/resumeLabels.js';
import { getPlaceholders } from './shared/placeholderText.js';
import { formatRange } from './shared/formatRange.js';

export default function ProExecutivePolygon({ resume }) {
  const { personalInfo: p = {}, sections = {}, sectionOrder, visibleSections, direction, fontFamily, accentColor = '#059669' } = resume;
  const L = getResumeLabels(resume.language);
  const ph = getPlaceholders(resume.language);
  const fontCls = fontFamily === 'latin' ? 'font-latin' : 'font-arabic';

  const sidebarKeys = ['skills', 'languages', 'certifications'];
  const mainKeys = (sectionOrder || []).filter((k) => !sidebarKeys.includes(k));

  return (
    <div
      dir={direction}
      className={`bg-white text-slate-900 relative overflow-hidden flex flex-col justify-between ${fontCls}`}
      style={{ width: 794, minHeight: 1123, boxSizing: 'border-box' }}
    >
      {/* Top Banner with Angled Polygons */}
      <div className="relative" style={{ background: accentColor, padding: '36px 36px 28px' }}>
        <div className="flex items-center gap-6">
          <div className="w-28 h-28 rounded-2xl bg-white/20 border-2 border-white/40 shadow-xl overflow-hidden flex items-center justify-center shrink-0">
            {p.photo ? (
              <img src={p.photo} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className="w-12 h-12 text-white/70" />
            )}
          </div>
          <div className="text-white flex-1 min-w-0">
            <h1 className="text-3xl font-black uppercase tracking-tight">
              {p.fullName || <span className="opacity-40">{ph.fullName}</span>}
            </h1>
            <p className="text-sm font-bold tracking-widest text-white/80 uppercase mt-0.5">
              {p.jobTitle || <span className="opacity-40">{ph.jobTitle}</span>}
            </p>
            <p className={`text-[11px] mt-2 leading-relaxed max-w-xl line-clamp-3 ${p.summary ? 'text-white/95' : 'text-white/50 italic'}`}>
              {p.summary || ph.summary}
            </p>
          </div>
        </div>

        {/* Contact Strip */}
        <div className="mt-4 pt-3 border-t border-white/20 flex flex-wrap gap-4 text-[11px] text-white/90">
          <div className="flex items-center gap-1.5">
            <Mail className="w-3 h-3 text-white/70 shrink-0" />
            <span className={p.email ? '' : 'opacity-40 italic'}>{p.email || ph.email}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Phone className="w-3 h-3 text-white/70 shrink-0" />
            <span className={p.phone ? '' : 'opacity-40 italic'}>{p.phone || ph.phone}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3 h-3 text-white/70 shrink-0" />
            <span className={p.city || p.country ? '' : 'opacity-40 italic'}>
              {[p.city, p.country].filter(Boolean).join(', ') || ph.location}
            </span>
          </div>
          {(p.website || !p.fullName) && (
            <div className="flex items-center gap-1.5">
              <Globe className="w-3 h-3 text-white/70 shrink-0" />
              <span className={p.website ? '' : 'opacity-40 italic'}>{p.website || ph.website}</span>
            </div>
          )}
        </div>
      </div>

      {/* 2-Column Content Body */}
      <div className="px-9 py-7 flex gap-9 flex-1">
        {/* Left Column (Skills, Languages, Certifications) */}
        <div className="w-60 shrink-0 space-y-6">
          {/* Skills with Badges */}
          {visibleSections?.skills && (
            <div>
              <h3
                className="text-xs font-black uppercase tracking-wider mb-3 pb-1 border-b-2"
                style={{ borderColor: accentColor, color: accentColor }}
              >
                {L.skills}
              </h3>
              {(sections?.skills || []).length > 0 ? (
                <div className="space-y-2">
                  {sections.skills.map((s) => (
                    <div key={s.id} className="p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-800">{s.name}</span>
                      <CheckCircle2 className="w-3.5 h-3.5" style={{ color: accentColor }} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2 opacity-40">
                  <div className="p-2 rounded-lg bg-slate-50 border border-dashed border-slate-200 text-[11px] text-slate-400">Skill item...</div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-dashed border-slate-200 text-[11px] text-slate-400">Skill item...</div>
                </div>
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
                <div className="space-y-1.5 text-[11px]">
                  {sections.languages.map((l) => (
                    <div key={l.id} className="flex items-center justify-between p-1.5 rounded bg-slate-50">
                      <span className="font-semibold text-slate-900">{l.name}</span>
                      <span className="text-[10px] text-slate-500 font-bold">{l.level}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-1.5 text-[11px] opacity-40">
                  <div className="p-1.5 rounded bg-slate-50 text-slate-400 text-[11px]">Language / Level...</div>
                </div>
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
                  <div key={c.id} className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="font-bold text-slate-900">{c.name}</div>
                    <div className="text-[10px] text-slate-500">{c.issuer} {c.date ? `(${c.date})` : ''}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Main Column */}
        <div className="flex-1 min-w-0 space-y-6">
          {mainKeys.map((key) => {
            if (!visibleSections?.[key]) return null;
            const items = sections?.[key] || [];

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
                    <div className="space-y-4">
                      {items.map((exp) => (
                        <div key={exp.id} className="text-[11.5px]">
                          <div className="flex justify-between items-baseline mb-0.5">
                            <h4 className="font-black text-slate-900 text-xs">{exp.role}</h4>
                            <span className="text-[10px] font-bold text-slate-400">
                              {formatRange(exp.startDate, exp.endDate, exp.current, L.present)}
                            </span>
                          </div>
                          <div className="font-bold text-[11px] mb-1" style={{ color: accentColor }}>
                            {exp.company}
                          </div>
                          {exp.description && (
                            <p className="text-[11px] text-slate-600 leading-relaxed whitespace-pre-line">
                              {exp.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 border border-dashed border-slate-200 rounded-lg text-slate-400 text-xs italic">
                      + Add your work experience in the editor...
                    </div>
                  )}
                </div>
              );
            }

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
                    <div className="space-y-3 text-[11.5px]">
                      {items.map((ed) => (
                        <div key={ed.id} className="flex justify-between items-start">
                          <div>
                            <div className="font-black text-slate-900">{ed.degree} {ed.field ? `in ${ed.field}` : ''}</div>
                            <div className="text-slate-600 text-[11px]">{ed.institution}</div>
                          </div>
                          <div className="text-[10px] font-bold text-slate-500 shrink-0 text-end">
                            {formatRange(ed.startDate, ed.endDate, ed.current, L.present)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 border border-dashed border-slate-200 rounded-lg text-slate-400 text-xs italic">
                      + Add your education history in the editor...
                    </div>
                  )}
                </div>
              );
            }

            if (key === 'projects' && items.length > 0) {
              return (
                <div key={key}>
                  <h3
                    className="text-xs font-black uppercase tracking-wider mb-3 pb-1 border-b-2"
                    style={{ borderColor: accentColor, color: accentColor }}
                  >
                    {L.projects}
                  </h3>
                  <div className="space-y-2.5 text-[11.5px]">
                    {items.map((pr) => (
                      <div key={pr.id}>
                        <div className="font-bold text-slate-900">{pr.name}</div>
                        {pr.description && <p className="text-[11px] text-slate-600 mt-0.5">{pr.description}</p>}
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
                    className="text-xs font-black uppercase tracking-wider mb-3 pb-1 border-b-2"
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
    </div>
  );
}
