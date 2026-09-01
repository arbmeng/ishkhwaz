import React from 'react';
import { Mail, Phone, MapPin, Globe, Linkedin, User } from 'lucide-react';
import { getResumeLabels } from './shared/resumeLabels.js';
import { getPlaceholders } from './shared/placeholderText.js';
import { formatRange } from './shared/formatRange.js';

export default function ProNavySplit({ resume }) {
  const { personalInfo: p = {}, sections = {}, sectionOrder, visibleSections, direction, fontFamily, accentColor = '#1a365d' } = resume;
  const L = getResumeLabels(resume.language);
  const ph = getPlaceholders(resume.language);
  const fontCls = fontFamily === 'latin' ? 'font-latin' : 'font-arabic';

  const sidebarKeys = ['education', 'skills', 'certifications', 'languages'];
  const mainKeys = (sectionOrder || []).filter((k) => !sidebarKeys.includes(k));

  return (
    <div
      dir={direction}
      className={`bg-white text-slate-900 flex ${fontCls}`}
      style={{ width: 794, minHeight: 1123, boxSizing: 'border-box' }}
    >
      {/* Deep Navy Left Sidebar */}
      <aside
        className="w-[280px] shrink-0 text-white flex flex-col justify-between"
        style={{ background: accentColor, padding: '36px 24px' }}
      >
        <div className="space-y-6">
          {/* Circular Photo */}
          <div className="w-32 h-32 rounded-full border-4 border-white/90 overflow-hidden mx-auto shadow-lg bg-white/10 flex items-center justify-center">
            {p.photo ? (
              <img src={p.photo} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className="w-14 h-14 text-white/70" />
            )}
          </div>

          {/* Contact Details */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-white border-b border-white/30 pb-1.5 mb-3">
              {L.contact}
            </h3>
            <div className="space-y-2 text-[11px] text-white/90">
              <div className="flex items-center gap-2.5">
                <Phone className="w-3.5 h-3.5 shrink-0 text-white/70" />
                <span className={p.phone ? 'truncate' : 'opacity-40 italic'}>{p.phone || ph.phone}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-3.5 h-3.5 shrink-0 text-white/70" />
                <span className={p.email ? 'truncate' : 'opacity-40 italic'}>{p.email || ph.email}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <MapPin className="w-3.5 h-3.5 shrink-0 text-white/70" />
                <span className={p.city || p.country ? 'truncate' : 'opacity-40 italic'}>
                  {[p.city, p.country].filter(Boolean).join(', ') || ph.location}
                </span>
              </div>
              {(p.website || !p.fullName) && (
                <div className="flex items-center gap-2.5">
                  <Globe className="w-3.5 h-3.5 shrink-0 text-white/70" />
                  <span className={p.website ? 'truncate' : 'opacity-40 italic'}>{p.website || ph.website}</span>
                </div>
              )}
            </div>
          </div>

          {/* Education in Sidebar */}
          {visibleSections?.education && (
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-white border-b border-white/30 pb-1.5 mb-3">
                {L.education}
              </h3>
              {(sections?.education || []).length > 0 ? (
                <div className="space-y-3 text-[11px] text-white/90">
                  {sections.education.map((ed) => (
                    <div key={ed.id}>
                      <div className="text-[10px] font-bold text-white/70">
                        {formatRange(ed.startDate, ed.endDate, ed.current, L.present)}
                      </div>
                      <div className="font-black text-white">{ed.degree} {ed.field ? `in ${ed.field}` : ''}</div>
                      <div className="text-white/80 text-[10px] uppercase">{ed.institution}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-white/40 italic">+ Education...</div>
              )}
            </div>
          )}

          {/* Skills / Expertise in Sidebar */}
          {visibleSections?.skills && (
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-white border-b border-white/30 pb-1.5 mb-3">
                {L.skills}
              </h3>
              {(sections?.skills || []).length > 0 ? (
                <ul className="space-y-1.5 text-[11px] text-white/90">
                  {sections.skills.map((s) => (
                    <li key={s.id} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-white/80 shrink-0" />
                      <span>{s.name}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-xs text-white/40 italic">+ Skill item...</div>
              )}
            </div>
          )}

          {/* Certifications in Sidebar */}
          {visibleSections?.certifications && (sections?.certifications || []).length > 0 && (
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-white border-b border-white/30 pb-1.5 mb-3">
                {L.certifications}
              </h3>
              <ul className="space-y-1.5 text-[11px] text-white/90">
                {sections.certifications.map((c) => (
                  <li key={c.id} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/80 shrink-0 mt-1.5" />
                    <div>
                      <div className="font-bold">{c.name}</div>
                      {c.issuer && <div className="text-[10px] text-white/70">{c.issuer}</div>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Languages in Sidebar */}
          {visibleSections?.languages && (
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-white border-b border-white/30 pb-1.5 mb-3">
                {L.languages}
              </h3>
              {(sections?.languages || []).length > 0 ? (
                <ul className="space-y-1 text-[11px] text-white/90">
                  {sections.languages.map((l) => (
                    <li key={l.id} className="flex items-center justify-between">
                      <span>{l.name}</span>
                      {l.level && <span className="text-white/60 text-[10px]">{l.level}</span>}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-xs text-white/40 italic">+ Language...</div>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Column */}
      <main className="flex-1 px-8 py-9 flex flex-col justify-between">
        <div className="space-y-6">
          {/* Header Name & Title */}
          <div className="pb-4 border-b border-slate-200">
            <h1 className="text-3xl font-black tracking-wider text-slate-900 uppercase">
              {p.fullName || <span className="opacity-40">{ph.fullName}</span>}
            </h1>
            <p className="text-sm font-bold tracking-widest text-slate-600 mt-1 uppercase" style={{ color: accentColor }}>
              {p.jobTitle || <span className="opacity-40">{ph.jobTitle}</span>}
            </p>
          </div>

          {/* Profile / Summary */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 border-b border-slate-900 pb-1 mb-2.5">
              {L.summary}
            </h3>
            <p className={`text-[11.5px] leading-relaxed whitespace-pre-line ${p.summary ? 'text-slate-700' : 'text-slate-400 italic'}`}>
              {p.summary || ph.summary}
            </p>
          </div>

          {/* Work Experience with Timeline Connection */}
          {visibleSections?.experience && (
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 border-b border-slate-900 pb-1 mb-4">
                {L.experience}
              </h3>
              {(sections?.experience || []).length > 0 ? (
                <div className="relative border-s-2 border-slate-300 ps-4 ms-2 space-y-5">
                  {sections.experience.map((exp) => (
                    <div key={exp.id} className="relative text-[11.5px]">
                      {/* Timeline Node Dot */}
                      <span
                        className="absolute -start-[23px] top-1 w-3 h-3 rounded-full bg-white border-2 shrink-0"
                        style={{ borderColor: accentColor }}
                      />
                      <div className="flex justify-between items-baseline mb-0.5">
                        <h4 className="font-black text-slate-900 text-xs">{exp.company}</h4>
                        <span className="text-[10px] font-bold text-slate-500">
                          {formatRange(exp.startDate, exp.endDate, exp.current, L.present)}
                        </span>
                      </div>
                      <div className="text-[11px] font-bold text-slate-600 mb-1.5" style={{ color: accentColor }}>
                        {exp.role}
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
                  + Add your experience in the editor...
                </div>
              )}
            </div>
          )}

          {/* Projects (if present) */}
          {visibleSections?.projects && (sections?.projects || []).length > 0 && (
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 border-b border-slate-900 pb-1 mb-3">
                {L.projects}
              </h3>
              <div className="space-y-3 text-[11.5px]">
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

        {/* References Footer Grid */}
        {visibleSections?.references && (sections?.references || []).length > 0 && (
          <div className="pt-4 border-t border-slate-200">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-3">
              {L.references}
            </h3>
            <div className="grid grid-cols-3 gap-3 text-[10.5px]">
              {sections.references.map((ref) => (
                <div key={ref.id} className="p-2 rounded bg-slate-50 border border-slate-100">
                  <div className="font-black text-slate-900">{ref.name}</div>
                  <div className="text-slate-500 text-[9.5px] truncate">{ref.relation}</div>
                  {ref.contact && <div className="text-slate-600 text-[9.5px] mt-0.5">{ref.contact}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
