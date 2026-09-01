import React from 'react';
import { Mail, Phone, MapPin, Globe, Linkedin, User, Briefcase, GraduationCap, Code2, Heart, Award } from 'lucide-react';
import { getResumeLabels } from './shared/resumeLabels.js';
import { getPlaceholders } from './shared/placeholderText.js';
import { formatRange } from './shared/formatRange.js';

export default function ProFresherCurve({ resume }) {
  const { personalInfo: p = {}, sections = {}, sectionOrder, visibleSections, direction, fontFamily, accentColor = '#0f172a' } = resume;
  const L = getResumeLabels(resume.language);
  const ph = getPlaceholders(resume.language);
  const fontCls = fontFamily === 'latin' ? 'font-latin' : 'font-arabic';
  const isRtl = direction === 'rtl';

  const sidebarKeys = ['skills', 'languages'];
  const mainKeys = (sectionOrder || []).filter((k) => !sidebarKeys.includes(k));

  return (
    <div
      dir={direction}
      className={`bg-white text-slate-900 relative overflow-hidden flex flex-col ${fontCls}`}
      style={{ width: 794, minHeight: 1123, boxSizing: 'border-box' }}
    >
      {/* Top Header Organic Wave */}
      <div
        className="absolute top-0 start-0 pointer-events-none"
        style={{
          width: 320,
          height: 240,
          background: accentColor,
          borderBottomRightRadius: isRtl ? '0px' : '160px',
          borderBottomLeftRadius: isRtl ? '160px' : '0px',
          zIndex: 1,
        }}
      />

      {/* Bottom Right Wave Accent */}
      <div
        className="absolute bottom-0 end-0 pointer-events-none opacity-90"
        style={{
          width: 160,
          height: 120,
          background: accentColor,
          borderTopLeftRadius: isRtl ? '0px' : '120px',
          borderTopRightRadius: isRtl ? '120px' : '0px',
          zIndex: 1,
        }}
      />

      {/* Header Area */}
      <div className="relative z-10 px-10 pt-8 pb-4 flex items-center gap-8">
        {/* Photo Container */}
        <div
          className="w-36 h-36 rounded-full bg-white p-1.5 shadow-xl shrink-0 overflow-hidden flex items-center justify-center border-4 border-white"
          style={{ zIndex: 2 }}
        >
          {p.photo ? (
            <img src={p.photo} alt="" className="w-full h-full rounded-full object-cover" />
          ) : (
            <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center">
              <User className="w-14 h-14 text-slate-400" />
            </div>
          )}
        </div>

        {/* Name & Title */}
        <div className="flex-1 min-w-0 pt-2">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">
            {p.fullName || <span className="opacity-40">{ph.fullName}</span>}
          </h1>
          <p className="text-base font-bold tracking-wide mt-1" style={{ color: accentColor }}>
            {p.jobTitle || <span className="opacity-40">{ph.jobTitle}</span>}
          </p>
        </div>
      </div>

      {/* 2-Column Body Layout */}
      <div className="flex-1 px-10 py-6 flex gap-10 relative z-10">
        {/* Left Column (Contact, Personal Skills, Languages) */}
        <div className="w-60 shrink-0 space-y-6">
          {/* Contact Section */}
          <div>
            <h3
              className="text-xs font-black uppercase tracking-wider mb-3 flex items-center gap-2 pb-1 border-b-2"
              style={{ borderColor: accentColor, color: accentColor }}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>{L.contact}</span>
            </h3>
            <div className="space-y-2 text-[11px] text-slate-700">
              <div className="flex items-center gap-2">
                <Phone className="w-3 h-3 shrink-0 text-slate-400" />
                <span className={p.phone ? 'truncate' : 'opacity-40 italic'}>{p.phone || ph.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3 h-3 shrink-0 text-slate-400" />
                <span className={p.email ? 'truncate' : 'opacity-40 italic'}>{p.email || ph.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-3 h-3 shrink-0 text-slate-400" />
                <span className={p.city || p.country ? 'truncate' : 'opacity-40 italic'}>
                  {[p.city, p.country].filter(Boolean).join(', ') || ph.location}
                </span>
              </div>
              {(p.website || !p.fullName) && (
                <div className="flex items-center gap-2">
                  <Globe className="w-3 h-3 shrink-0 text-slate-400" />
                  <span className={p.website ? 'truncate' : 'opacity-40 italic'}>{p.website || ph.website}</span>
                </div>
              )}
            </div>
          </div>

          {/* Personal Skills */}
          {visibleSections?.skills && (
            <div>
              <h3
                className="text-xs font-black uppercase tracking-wider mb-3 flex items-center gap-2 pb-1 border-b-2"
                style={{ borderColor: accentColor, color: accentColor }}
              >
                <User className="w-3.5 h-3.5" />
                <span>{L.skills}</span>
              </h3>
              {(sections?.skills || []).length > 0 ? (
                <ul className="space-y-1.5 text-[11px] text-slate-700">
                  {sections.skills.map((s) => (
                    <li key={s.id} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: accentColor }} />
                      <span className="font-semibold">{s.name}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-xs text-slate-400 italic">Skill item...</div>
              )}
            </div>
          )}

          {/* Languages */}
          {visibleSections?.languages && (
            <div>
              <h3
                className="text-xs font-black uppercase tracking-wider mb-3 flex items-center gap-2 pb-1 border-b-2"
                style={{ borderColor: accentColor, color: accentColor }}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{L.languages}</span>
              </h3>
              {(sections?.languages || []).length > 0 ? (
                <ul className="space-y-1.5 text-[11px] text-slate-700">
                  {sections.languages.map((l) => (
                    <li key={l.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: accentColor }} />
                        <span className="font-semibold">{l.name}</span>
                      </div>
                      {l.level && <span className="text-[10px] text-slate-400">{l.level}</span>}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-xs text-slate-400 italic">Language...</div>
              )}
            </div>
          )}
        </div>

        {/* Right Main Column */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Summary / Objective */}
          <div>
            <h3
              className="text-xs font-black uppercase tracking-wider mb-2 flex items-center gap-2 pb-1 border-b-2"
              style={{ borderColor: accentColor, color: accentColor }}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>{L.summary}</span>
            </h3>
            <p className={`text-[11.5px] leading-relaxed whitespace-pre-line ${p.summary ? 'text-slate-700' : 'text-slate-400 italic'}`}>
              {p.summary || ph.summary}
            </p>
          </div>

          {/* Dynamic Sections */}
          {mainKeys.map((key) => {
            if (!visibleSections?.[key]) return null;
            const items = sections?.[key] || [];

            if (key === 'education') {
              return (
                <div key={key}>
                  <h3
                    className="text-xs font-black uppercase tracking-wider mb-3 flex items-center gap-2 pb-1 border-b-2"
                    style={{ borderColor: accentColor, color: accentColor }}
                  >
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>{L.education}</span>
                  </h3>
                  {items.length > 0 ? (
                    <div className="space-y-3">
                      {items.map((ed) => (
                        <div key={ed.id} className="flex justify-between items-start text-[11.5px]">
                          <div>
                            <div className="font-black text-slate-900">{ed.degree} {ed.field ? `in ${ed.field}` : ''}</div>
                            <div className="text-slate-600">{ed.institution}</div>
                          </div>
                          <div className="text-[10px] font-bold text-slate-500 shrink-0 text-end">
                            {formatRange(ed.startDate, ed.endDate, ed.current, L.present)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 border border-dashed border-slate-200 rounded-lg text-slate-400 text-xs italic">
                      + Add your education in the editor...
                    </div>
                  )}
                </div>
              );
            }

            if (key === 'experience') {
              return (
                <div key={key}>
                  <h3
                    className="text-xs font-black uppercase tracking-wider mb-3 flex items-center gap-2 pb-1 border-b-2"
                    style={{ borderColor: accentColor, color: accentColor }}
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>{L.experience}</span>
                  </h3>
                  {items.length > 0 ? (
                    <div className="space-y-3.5">
                      {items.map((exp) => (
                        <div key={exp.id} className="text-[11.5px]">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-black text-slate-900">{exp.role}</span>
                              <span className="text-slate-500"> — {exp.company}</span>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 shrink-0">
                              {formatRange(exp.startDate, exp.endDate, exp.current, L.present)}
                            </span>
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
                    <div className="p-3 border border-dashed border-slate-200 rounded-lg text-slate-400 text-xs italic">
                      + Add your work experience in the editor...
                    </div>
                  )}
                </div>
              );
            }

            if (key === 'projects' && items.length > 0) {
              return (
                <div key={key}>
                  <h3
                    className="text-xs font-black uppercase tracking-wider mb-3 flex items-center gap-2 pb-1 border-b-2"
                    style={{ borderColor: accentColor, color: accentColor }}
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    <span>{L.projects}</span>
                  </h3>
                  <div className="space-y-2.5">
                    {items.map((pr) => (
                      <div key={pr.id} className="text-[11.5px]">
                        <div className="font-bold text-slate-900">{pr.name}</div>
                        {pr.description && <p className="text-[11px] text-slate-600 mt-0.5">{pr.description}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            }

            if (key === 'certifications' && items.length > 0) {
              return (
                <div key={key}>
                  <h3
                    className="text-xs font-black uppercase tracking-wider mb-3 flex items-center gap-2 pb-1 border-b-2"
                    style={{ borderColor: accentColor, color: accentColor }}
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>{L.certifications}</span>
                  </h3>
                  <div className="space-y-2">
                    {items.map((c) => (
                      <div key={c.id} className="text-[11px]">
                        <span className="font-bold text-slate-900">{c.name}</span>
                        <span className="text-slate-500"> — {c.issuer}</span>
                        {c.date && <span className="text-[10px] text-slate-400 ms-2">({c.date})</span>}
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
                    className="text-xs font-black uppercase tracking-wider mb-3 flex items-center gap-2 pb-1 border-b-2"
                    style={{ borderColor: accentColor, color: accentColor }}
                  >
                    <Heart className="w-3.5 h-3.5" />
                    <span>{L.references}</span>
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
