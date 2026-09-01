import React from 'react';
import { Mail, Phone, MapPin, Globe, Linkedin, User, Briefcase, GraduationCap, Award, Heart, CheckCircle, Activity } from 'lucide-react';
import { getResumeLabels } from './shared/resumeLabels.js';
import { getPlaceholders } from './shared/placeholderText.js';
import { formatRange } from './shared/formatRange.js';

export default function ProTealClinical({ resume }) {
  const { personalInfo: p = {}, sections = {}, sectionOrder, visibleSections, direction, fontFamily, accentColor = '#0d9488' } = resume;
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
      {/* 2-Column Split */}
      <div className="flex flex-1">
        {/* Soft Mint / Teal Sidebar */}
        <aside
          className="w-64 shrink-0 px-6 py-8 flex flex-col justify-between"
          style={{ background: '#f0fdfa' }}
        >
          <div className="space-y-6">
            {/* Circular Photo with Teal Frame */}
            <div
              className="w-36 h-36 rounded-full border-4 shadow-md mx-auto overflow-hidden bg-white flex items-center justify-center"
              style={{ borderColor: accentColor }}
            >
              {p.photo ? (
                <img src={p.photo} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-16 h-16 text-slate-400" />
              )}
            </div>

            {/* Contact Section */}
            <div>
              <h3
                className="text-xs font-black uppercase tracking-wider mb-3 pb-1 border-b-2 flex items-center justify-between"
                style={{ borderColor: accentColor, color: accentColor }}
              >
                <span>{L.contact}</span>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: accentColor }} />
              </h3>
              <div className="space-y-2.5 text-[11px] text-slate-700">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white shrink-0 shadow-xs"
                    style={{ background: accentColor }}
                  >
                    <Phone className="w-3 h-3" />
                  </div>
                  <span className={p.phone ? 'truncate' : 'opacity-40 italic'}>{p.phone || ph.phone}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white shrink-0 shadow-xs"
                    style={{ background: accentColor }}
                  >
                    <Mail className="w-3 h-3" />
                  </div>
                  <span className={p.email ? 'truncate' : 'opacity-40 italic'}>{p.email || ph.email}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white shrink-0 shadow-xs"
                    style={{ background: accentColor }}
                  >
                    <MapPin className="w-3 h-3" />
                  </div>
                  <span className={p.city || p.country ? 'truncate' : 'opacity-40 italic'}>
                    {[p.city, p.country].filter(Boolean).join(', ') || ph.location}
                  </span>
                </div>
                {(p.website || !p.fullName) && (
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white shrink-0 shadow-xs"
                      style={{ background: accentColor }}
                    >
                      <Globe className="w-3 h-3" />
                    </div>
                    <span className={p.website ? 'truncate' : 'opacity-40 italic'}>{p.website || ph.website}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Certifications */}
            {visibleSections?.certifications && (sections?.certifications || []).length > 0 && (
              <div>
                <h3
                  className="text-xs font-black uppercase tracking-wider mb-3 pb-1 border-b-2 flex items-center justify-between"
                  style={{ borderColor: accentColor, color: accentColor }}
                >
                  <span>{L.certifications}</span>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: accentColor }} />
                </h3>
                <div className="space-y-2 text-[11px] text-slate-700">
                  {sections.certifications.map((c) => (
                    <div key={c.id}>
                      <div className="font-black text-slate-900">{c.name}</div>
                      <div className="text-[10px] text-slate-500">{c.issuer} {c.date ? `| ${c.date}` : ''}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Skills with Horizontal Bars */}
            {visibleSections?.skills && (
              <div>
                <h3
                  className="text-xs font-black uppercase tracking-wider mb-3 pb-1 border-b-2 flex items-center justify-between"
                  style={{ borderColor: accentColor, color: accentColor }}
                >
                  <span>{L.skills}</span>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: accentColor }} />
                </h3>
                {(sections?.skills || []).length > 0 ? (
                  <div className="space-y-2.5">
                    {sections.skills.map((s) => {
                      const levelNum = Number(s.level) || 4;
                      const pct = Math.min(100, Math.max(20, levelNum * 20));
                      return (
                        <div key={s.id} className="text-[11px]">
                          <div className="font-bold text-slate-800 mb-1">{s.name}</div>
                          <div className="h-1.5 rounded-full bg-teal-100 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${pct}%`, background: accentColor }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic">+ Skills...</div>
                )}
              </div>
            )}

            {/* Languages */}
            {visibleSections?.languages && (sections?.languages || []).length > 0 && (
              <div>
                <h3
                  className="text-xs font-black uppercase tracking-wider mb-2 pb-1 border-b-2 flex items-center justify-between"
                  style={{ borderColor: accentColor, color: accentColor }}
                >
                  <span>{L.languages}</span>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: accentColor }} />
                </h3>
                <div className="space-y-1 text-[11px] text-slate-700">
                  {sections.languages.map((l) => (
                    <div key={l.id} className="flex items-center justify-between">
                      <span className="font-semibold">{l.name}</span>
                      <span className="text-slate-500 text-[10px]">{l.level}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Right Main Column */}
        <main className="flex-1 px-8 py-8 flex flex-col justify-between space-y-6">
          <div className="space-y-6">
            {/* Header with Serif Name & Medical/Pulse Accent */}
            <div className="pb-3 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-serif font-black tracking-tight text-slate-900">
                    {p.fullName || <span className="opacity-40">{ph.fullName}</span>}
                  </h1>
                  <p className="text-xs font-black uppercase tracking-widest mt-1" style={{ color: accentColor }}>
                    {p.jobTitle || <span className="opacity-40">{ph.jobTitle}</span>}
                  </p>
                </div>
                {/* Clean Pulse/Activity Icon Line */}
                <div className="opacity-60 hidden sm:block" style={{ color: accentColor }}>
                  <Activity className="w-8 h-8" />
                </div>
              </div>
            </div>

            {/* Professional Summary */}
            <div>
              <h3
                className="text-xs font-black uppercase tracking-wider mb-2 pb-1 border-b-2 flex items-center justify-between"
                style={{ borderColor: accentColor, color: accentColor }}
              >
                <span>{L.summary}</span>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: accentColor }} />
              </h3>
              <p className={`text-[11.5px] leading-relaxed whitespace-pre-line ${p.summary ? 'text-slate-700' : 'text-slate-400 italic'}`}>
                {p.summary || ph.summary}
              </p>
            </div>

            {/* Experience with Connected Timeline Dots */}
            {visibleSections?.experience && (
              <div>
                <h3
                  className="text-xs font-black uppercase tracking-wider mb-4 pb-1 border-b-2 flex items-center justify-between"
                  style={{ borderColor: accentColor, color: accentColor }}
                >
                  <span>{L.experience}</span>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: accentColor }} />
                </h3>
                {(sections?.experience || []).length > 0 ? (
                  <div className="relative border-s-2 border-teal-200 ps-4 ms-2 space-y-4.5">
                    {sections.experience.map((exp) => (
                      <div key={exp.id} className="relative text-[11.5px]">
                        {/* Timeline Node */}
                        <span
                          className="absolute -start-[23px] top-1 w-3 h-3 rounded-full bg-white border-2 shrink-0"
                          style={{ borderColor: accentColor }}
                        />
                        <div className="flex justify-between items-baseline mb-0.5">
                          <h4 className="font-black text-slate-900 text-xs">{exp.role}</h4>
                          <span className="text-[10px] font-bold text-slate-400">
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
                  <div className="text-slate-400 text-xs italic">+ Work experience...</div>
                )}
              </div>
            )}

            {/* Education */}
            {visibleSections?.education && (
              <div>
                <h3
                  className="text-xs font-black uppercase tracking-wider mb-3 pb-1 border-b-2 flex items-center justify-between"
                  style={{ borderColor: accentColor, color: accentColor }}
                >
                  <span>{L.education}</span>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: accentColor }} />
                </h3>
                {(sections?.education || []).length > 0 ? (
                  <div className="space-y-3 text-[11.5px]">
                    {sections.education.map((ed) => (
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
            )}

            {/* Projects / Key Achievements Boxes */}
            {visibleSections?.projects && (sections?.projects || []).length > 0 && (
              <div>
                <h3
                  className="text-xs font-black uppercase tracking-wider mb-2.5 pb-1 border-b-2 flex items-center justify-between"
                  style={{ borderColor: accentColor, color: accentColor }}
                >
                  <span>{L.projects}</span>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: accentColor }} />
                </h3>
                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  {sections.projects.map((pr) => (
                    <div key={pr.id} className="p-2.5 rounded-lg border border-teal-100 bg-teal-50/40">
                      <div className="font-black text-slate-900">{pr.name}</div>
                      {pr.description && <p className="text-[10.5px] text-slate-600 mt-0.5">{pr.description}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* References Grid at Bottom */}
          {visibleSections?.references && (sections?.references || []).length > 0 && (
            <div className="pt-3 border-t border-slate-200">
              <h3
                className="text-xs font-black uppercase tracking-wider mb-2.5 pb-1 border-b-2 flex items-center justify-between"
                style={{ borderColor: accentColor, color: accentColor }}
              >
                <span>{L.references}</span>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: accentColor }} />
              </h3>
              <div className="grid grid-cols-2 gap-4 text-[11px]">
                {sections.references.map((ref) => (
                  <div key={ref.id}>
                    <div className="font-bold text-slate-900">{ref.name}</div>
                    <div className="text-slate-500 text-[10px]">{ref.relation}</div>
                    {ref.phone && <div className="text-slate-600 text-[10px] mt-0.5">{ref.phone}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Bottom Accent Line */}
      <div className="h-2 w-full" style={{ background: accentColor }} />
    </div>
  );
}
