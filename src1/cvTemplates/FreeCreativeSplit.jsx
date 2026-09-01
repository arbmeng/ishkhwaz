import React from 'react';
import { Mail, Phone, MapPin, Globe, Linkedin, User, Briefcase, GraduationCap, Award, Heart } from 'lucide-react';
import { getResumeLabels } from './shared/resumeLabels.js';
import { getPlaceholders } from './shared/placeholderText.js';
import { formatRange } from './shared/formatRange.js';

export default function FreeCreativeSplit({ resume }) {
  const { personalInfo: p = {}, sections = {}, sectionOrder, visibleSections, direction, fontFamily, accentColor = '#0284c7' } = resume;
  const L = getResumeLabels(resume.language);
  const ph = getPlaceholders(resume.language);
  const fontCls = fontFamily === 'latin' ? 'font-latin' : 'font-arabic';

  const sidebarKeys = ['skills', 'languages', 'certifications'];
  const mainKeys = (sectionOrder || []).filter((k) => !sidebarKeys.includes(k));

  return (
    <div
      dir={direction}
      className={`bg-white text-slate-900 flex ${fontCls}`}
      style={{ width: 794, minHeight: 1123, boxSizing: 'border-box' }}
    >
      {/* Light Slate Sidebar */}
      <aside className="w-64 shrink-0 bg-slate-50 dark:bg-slate-900 border-e border-slate-200 px-6 py-8 flex flex-col justify-between">
        <div className="space-y-6">
          {/* Photo */}
          <div className="w-32 h-32 rounded-2xl border-2 border-slate-200 shadow-sm mx-auto overflow-hidden bg-white flex items-center justify-center">
            {p.photo ? (
              <img src={p.photo} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className="w-14 h-14 text-slate-400" />
            )}
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider mb-3 pb-1 border-b border-slate-200" style={{ color: accentColor }}>
              {L.contact}
            </h3>
            <div className="space-y-2 text-[11px] text-slate-700">
              <div className="flex items-center gap-2">
                <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                <span className={p.phone ? 'truncate' : 'opacity-40 italic'}>{p.phone || ph.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                <span className={p.email ? 'truncate' : 'opacity-40 italic'}>{p.email || ph.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                <span className={p.city || p.country ? 'truncate' : 'opacity-40 italic'}>
                  {[p.city, p.country].filter(Boolean).join(', ') || ph.location}
                </span>
              </div>
            </div>
          </div>

          {/* Skills */}
          {visibleSections?.skills && (
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider mb-3 pb-1 border-b border-slate-200" style={{ color: accentColor }}>
                {L.skills}
              </h3>
              {(sections?.skills || []).length > 0 ? (
                <div className="space-y-1.5 text-[11px]">
                  {sections.skills.map((s) => (
                    <div key={s.id} className="font-semibold text-slate-800 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: accentColor }} />
                      <span>{s.name}</span>
                    </div>
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
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 px-8 py-8 flex flex-col justify-between space-y-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="pb-3 border-b-2" style={{ borderColor: accentColor }}>
            <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900">
              {p.fullName || <span className="opacity-40">{ph.fullName}</span>}
            </h1>
            <p className="text-xs font-black uppercase tracking-widest mt-1" style={{ color: accentColor }}>
              {p.jobTitle || <span className="opacity-40">{ph.jobTitle}</span>}
            </p>
          </div>

          {/* Summary */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider mb-1.5" style={{ color: accentColor }}>
              {L.summary}
            </h3>
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
                        <span className="text-[10px] font-bold text-slate-400">
                          {formatRange(exp.startDate, exp.endDate, exp.current, L.present)}
                        </span>
                      </div>
                      <div className="font-bold text-[11px]" style={{ color: accentColor }}>{exp.company}</div>
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
                      <span className="text-[10px] font-bold text-slate-400 shrink-0">
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

          {/* Projects */}
          {visibleSections?.projects && (sections?.projects || []).length > 0 && (
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider mb-2.5 pb-1 border-b border-slate-200" style={{ color: accentColor }}>
                {L.projects}
              </h3>
              <div className="space-y-2 text-[11.5px]">
                {sections.projects.map((pr) => (
                  <div key={pr.id}>
                    <div className="font-black text-slate-900">{pr.name}</div>
                    {pr.description && <p className="text-[11px] text-slate-600 mt-0.5">{pr.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
