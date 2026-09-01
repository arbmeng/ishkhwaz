import React from 'react';
import { Mail, Phone, MapPin, Globe, Linkedin, User, Briefcase, GraduationCap, Award, Heart } from 'lucide-react';
import { getResumeLabels } from './shared/resumeLabels.js';
import { getPlaceholders } from './shared/placeholderText.js';
import { formatRange } from './shared/formatRange.js';

export default function ProBronzeRibbon({ resume }) {
  const { personalInfo: p = {}, sections = {}, sectionOrder, visibleSections, direction, fontFamily, accentColor = '#c27803' } = resume;
  const L = getResumeLabels(resume.language);
  const ph = getPlaceholders(resume.language);
  const fontCls = fontFamily === 'latin' ? 'font-latin' : 'font-arabic';

  const sidebarKeys = ['skills'];
  const mainKeys = (sectionOrder || []).filter((k) => !sidebarKeys.includes(k));

  return (
    <div
      dir={direction}
      className={`bg-white text-slate-900 relative overflow-hidden flex flex-col justify-between ${fontCls}`}
      style={{ width: 794, minHeight: 1123, boxSizing: 'border-box' }}
    >
      {/* Top Folded Bronze Polygons */}
      <svg
        className="absolute top-0 inset-x-0 pointer-events-none"
        width="794"
        height="140"
        viewBox="0 0 794 140"
        fill="none"
      >
        <polygon points="0,0 794,0 794,50 397,130 0,60" fill={accentColor} opacity="0.85" />
        <polygon points="0,0 794,0 794,80 500,140 0,40" fill={accentColor} opacity="0.4" />
        <polygon points="200,0 794,0 794,120 400,60" fill={accentColor} opacity="0.9" />
      </svg>

      {/* Bottom Folded Bronze Polygons */}
      <svg
        className="absolute bottom-0 inset-x-0 pointer-events-none"
        width="794"
        height="120"
        viewBox="0 0 794 120"
        fill="none"
      >
        <polygon points="0,120 794,120 794,70 397,0 0,60" fill={accentColor} opacity="0.85" />
        <polygon points="0,120 794,120 794,40 500,0 0,80" fill={accentColor} opacity="0.4" />
      </svg>

      {/* Main Container */}
      <div className="relative z-10 px-8 pt-10 pb-16 flex gap-10 flex-1">
        {/* Left Column (Photo, Name, Summary, Contact, Skills) */}
        <div className="w-64 shrink-0 space-y-6">
          {/* Circular Photo with Bronze Frame */}
          <div className="w-36 h-36 rounded-full border-8 border-white p-1 shadow-xl mx-auto overflow-hidden bg-slate-100 flex items-center justify-center">
            <div
              className="w-full h-full rounded-full border-4 overflow-hidden flex items-center justify-center"
              style={{ borderColor: accentColor }}
            >
              {p.photo ? (
                <img src={p.photo} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-16 h-16 text-slate-400" />
              )}
            </div>
          </div>

          {/* Name & Subtitle */}
          <div className="text-center">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
              {p.fullName || <span className="opacity-40">{ph.fullName}</span>}
            </h1>
            <p className="text-xs font-bold tracking-widest uppercase mt-0.5" style={{ color: accentColor }}>
              {p.jobTitle || <span className="opacity-40">{ph.jobTitle}</span>}
            </p>
          </div>

          {/* Short Bio / Summary */}
          <div className={`text-[11px] text-center leading-relaxed whitespace-pre-line px-1 ${p.summary ? 'text-slate-600' : 'text-slate-400 italic'}`}>
            {p.summary || ph.summary}
          </div>

          {/* Contact Badges */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 text-center mb-3">
              {L.contact}
            </h3>
            <div className="space-y-2 text-[11px] text-slate-700">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm"
                  style={{ background: accentColor }}
                >
                  <Mail className="w-3.5 h-3.5" />
                </div>
                <span className={p.email ? 'truncate' : 'opacity-40 italic'}>{p.email || ph.email}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm"
                  style={{ background: accentColor }}
                >
                  <Phone className="w-3.5 h-3.5" />
                </div>
                <span className={p.phone ? 'truncate' : 'opacity-40 italic'}>{p.phone || ph.phone}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm"
                  style={{ background: accentColor }}
                >
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <span className={p.city || p.country ? 'truncate' : 'opacity-40 italic'}>
                  {[p.city, p.country].filter(Boolean).join(', ') || ph.location}
                </span>
              </div>
              {(p.website || !p.fullName) && (
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm"
                    style={{ background: accentColor }}
                  >
                    <Globe className="w-3.5 h-3.5" />
                  </div>
                  <span className={p.website ? 'truncate' : 'opacity-40 italic'}>{p.website || ph.website}</span>
                </div>
              )}
            </div>
          </div>

          {/* Skills with Horizontal Bars */}
          {visibleSections?.skills && (
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 text-center mb-3">
                {L.skills}
              </h3>
              {(sections?.skills || []).length > 0 ? (
                <div className="space-y-2.5">
                  {sections.skills.map((s) => {
                    const levelNum = Number(s.level) || 4;
                    const pct = Math.min(100, Math.max(20, levelNum * 20));
                    return (
                      <div key={s.id} className="text-[11px]">
                        <div className="flex justify-between font-bold text-slate-800 mb-1">
                          <span>{s.name}</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, background: accentColor }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-xs text-slate-400 italic text-center">+ Skill item...</div>
              )}
            </div>
          )}
        </div>

        {/* Right Main Column (Education, Experience, Languages with Ribbon Headers) */}
        <div className="flex-1 min-w-0 space-y-7">
          {mainKeys.map((key) => {
            if (!visibleSections?.[key]) return null;
            const items = sections?.[key] || [];

            if (key === 'education') {
              return (
                <div key={key}>
                  {/* Ribbon Header Badge */}
                  <div
                    className="inline-block px-8 py-1.5 rounded-full text-white font-black text-xs uppercase tracking-widest shadow-md mb-4"
                    style={{ background: accentColor }}
                  >
                    {L.education}
                  </div>
                  {items.length > 0 ? (
                    <div className="relative border-s-2 border-slate-300 ps-4 ms-2 space-y-4">
                      {items.map((ed) => (
                        <div key={ed.id} className="relative text-[11.5px]">
                          <span
                            className="absolute -start-[23px] top-1 w-3 h-3 rounded-full bg-white border-2"
                            style={{ borderColor: accentColor }}
                          />
                          <div className="flex justify-between items-baseline">
                            <span className="font-bold text-slate-500 text-[10px]">
                              {formatRange(ed.startDate, ed.endDate, ed.current, L.present)}
                            </span>
                            <span className="font-black text-slate-900">{ed.degree} {ed.field ? `in ${ed.field}` : ''}</span>
                          </div>
                          <div className="text-slate-600 text-[11px] mt-0.5">{ed.institution}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 border border-dashed border-slate-200 rounded-lg text-slate-400 text-xs italic">
                      + Add education history in editor...
                    </div>
                  )}
                </div>
              );
            }

            if (key === 'experience') {
              return (
                <div key={key}>
                  {/* Ribbon Header Badge */}
                  <div
                    className="inline-block px-8 py-1.5 rounded-full text-white font-black text-xs uppercase tracking-widest shadow-md mb-4"
                    style={{ background: accentColor }}
                  >
                    {L.experience}
                  </div>
                  {items.length > 0 ? (
                    <div className="relative border-s-2 border-slate-300 ps-4 ms-2 space-y-4.5">
                      {items.map((exp) => (
                        <div key={exp.id} className="relative text-[11.5px]">
                          <span
                            className="absolute -start-[23px] top-1 w-3 h-3 rounded-full bg-white border-2"
                            style={{ borderColor: accentColor }}
                          />
                          <div className="flex justify-between items-baseline">
                            <span className="font-bold text-slate-500 text-[10px]">
                              {formatRange(exp.startDate, exp.endDate, exp.current, L.present)}
                            </span>
                            <span className="font-black text-slate-900 text-xs">{exp.role}</span>
                          </div>
                          <div className="text-slate-600 font-bold text-[11px]" style={{ color: accentColor }}>
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
                    <div className="p-3 border border-dashed border-slate-200 rounded-lg text-slate-400 text-xs italic">
                      + Add work experience in editor...
                    </div>
                  )}
                </div>
              );
            }

            if (key === 'languages') {
              return (
                <div key={key}>
                  {/* Ribbon Header Badge */}
                  <div
                    className="inline-block px-8 py-1.5 rounded-full text-white font-black text-xs uppercase tracking-widest shadow-md mb-4"
                    style={{ background: accentColor }}
                  >
                    {L.languages}
                  </div>
                  {items.length > 0 ? (
                    <div className="flex items-center gap-6">
                      {items.map((l) => (
                        <div key={l.id} className="flex flex-col items-center">
                          <div
                            className="w-14 h-14 rounded-full border-4 flex flex-col items-center justify-center p-1 font-black text-[10px] text-slate-900"
                            style={{ borderColor: accentColor }}
                          >
                            <span className="truncate text-[9px] uppercase">{l.name}</span>
                            <span className="text-[9px] text-slate-500">{l.level || '100%'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 italic">+ Languages...</div>
                  )}
                </div>
              );
            }

            if (key === 'projects' && items.length > 0) {
              return (
                <div key={key}>
                  <div
                    className="inline-block px-8 py-1.5 rounded-full text-white font-black text-xs uppercase tracking-widest shadow-md mb-3"
                    style={{ background: accentColor }}
                  >
                    {L.projects}
                  </div>
                  <div className="space-y-2.5 text-[11.5px]">
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

            if (key === 'references' && items.length > 0) {
              return (
                <div key={key}>
                  <div
                    className="inline-block px-8 py-1.5 rounded-full text-white font-black text-xs uppercase tracking-widest shadow-md mb-3"
                    style={{ background: accentColor }}
                  >
                    {L.references}
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-[11px]">
                    {items.map((ref) => (
                      <div key={ref.id} className="p-2 rounded bg-slate-50 border border-slate-100">
                        <div className="font-black text-slate-900">{ref.name}</div>
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
    </div>
  );
}
