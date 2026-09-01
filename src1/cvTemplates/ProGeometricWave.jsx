import React from 'react';
import { Mail, Phone, MapPin, Globe, Linkedin, User, Briefcase, GraduationCap, Award, Heart } from 'lucide-react';
import { getResumeLabels } from './shared/resumeLabels.js';
import { getPlaceholders } from './shared/placeholderText.js';
import { formatRange } from './shared/formatRange.js';

export default function ProGeometricWave({ resume }) {
  const { personalInfo: p = {}, sections = {}, sectionOrder, visibleSections, direction, fontFamily, accentColor = '#0284c7' } = resume;
  const L = getResumeLabels(resume.language);
  const ph = getPlaceholders(resume.language);
  const fontCls = fontFamily === 'latin' ? 'font-latin' : 'font-arabic';
  const isRtl = direction === 'rtl';

  const sidebarKeys = ['education', 'skills', 'languages'];
  const mainKeys = (sectionOrder || []).filter((k) => !sidebarKeys.includes(k));

  return (
    <div
      dir={direction}
      className={`bg-white text-slate-900 relative overflow-hidden flex flex-col justify-between ${fontCls}`}
      style={{ width: 794, minHeight: 1123, boxSizing: 'border-box' }}
    >
      {/* Top Geometric Corner Accents */}
      <svg
        className="absolute top-0 end-0 pointer-events-none"
        width="280"
        height="180"
        viewBox="0 0 280 180"
        fill="none"
      >
        <polygon points="120,0 280,0 280,140" fill={accentColor} opacity="0.12" />
        <polygon points="180,0 280,0 280,70" fill={accentColor} />
        <line x1="20" y1="0" x2="280" y2="180" stroke={accentColor} strokeWidth="1" opacity="0.25" />
      </svg>

      {/* Bottom Wave Lines Vector */}
      <svg
        className="absolute bottom-0 inset-x-0 pointer-events-none"
        width="794"
        height="180"
        viewBox="0 0 794 180"
        fill="none"
      >
        <path
          d="M0,120 C200,60 400,180 794,80 L794,180 L0,180 Z"
          fill={accentColor}
          opacity="0.9"
        />
        <path
          d="M0,150 C300,100 500,190 794,130"
          stroke="white"
          strokeWidth="1.5"
          opacity="0.3"
        />
        <path
          d="M0,135 C250,90 450,170 794,115"
          stroke="white"
          strokeWidth="1"
          opacity="0.2"
        />
      </svg>

      {/* Main Container */}
      <div className="relative z-10 px-8 pt-8 pb-12 flex gap-8 flex-1">
        {/* Left Column (Photo, Contact, Education, Expertise, Languages) */}
        <div className="w-64 shrink-0 space-y-6">
          {/* Circular Photo with Geometric Accent Frame */}
          <div className="relative w-36 h-36 mx-auto">
            <div
              className="absolute inset-0 rounded-full border-4 shadow-lg flex items-center justify-center overflow-hidden bg-slate-100"
              style={{ borderColor: accentColor }}
            >
              {p.photo ? (
                <img src={p.photo} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-16 h-16 text-slate-400" />
              )}
            </div>
          </div>

          {/* Contact Section with Badges */}
          <div>
            <h3
              className="text-xs font-black uppercase tracking-widest mb-3 pb-1 border-b-2"
              style={{ borderColor: accentColor, color: accentColor }}
            >
              {L.contact}
            </h3>
            <div className="space-y-2.5 text-[11px] text-slate-700">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white shrink-0"
                  style={{ background: accentColor }}
                >
                  <Phone className="w-3 h-3" />
                </div>
                <span className={p.phone ? 'truncate' : 'opacity-40 italic'}>{p.phone || ph.phone}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white shrink-0"
                  style={{ background: accentColor }}
                >
                  <Mail className="w-3 h-3" />
                </div>
                <span className={p.email ? 'truncate' : 'opacity-40 italic'}>{p.email || ph.email}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white shrink-0"
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
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white shrink-0"
                    style={{ background: accentColor }}
                  >
                    <Globe className="w-3 h-3" />
                  </div>
                  <span className={p.website ? 'truncate' : 'opacity-40 italic'}>{p.website || ph.website}</span>
                </div>
              )}
            </div>
          </div>

          {/* Education in Left Column */}
          {visibleSections?.education && (
            <div>
              <h3
                className="text-xs font-black uppercase tracking-widest mb-3 pb-1 border-b-2"
                style={{ borderColor: accentColor, color: accentColor }}
              >
                {L.education}
              </h3>
              {(sections?.education || []).length > 0 ? (
                <div className="space-y-3 text-[11px] text-slate-700">
                  {sections.education.map((ed) => (
                    <div key={ed.id}>
                      <div className="font-black text-slate-900">{ed.degree} {ed.field ? `in ${ed.field}` : ''}</div>
                      <div className="text-slate-600 font-semibold">{ed.institution}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {formatRange(ed.startDate, ed.endDate, ed.current, L.present)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-400 italic">+ Education...</div>
              )}
            </div>
          )}

          {/* Expertise / Skills */}
          {visibleSections?.skills && (
            <div>
              <h3
                className="text-xs font-black uppercase tracking-widest mb-3 pb-1 border-b-2"
                style={{ borderColor: accentColor, color: accentColor }}
              >
                {L.skills}
              </h3>
              {(sections?.skills || []).length > 0 ? (
                <ul className="space-y-1.5 text-[11px] text-slate-700">
                  {sections.skills.map((s) => (
                    <li key={s.id} className="flex items-center gap-2 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: accentColor }} />
                      <span>{s.name}</span>
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
                className="text-xs font-black uppercase tracking-widest mb-3 pb-1 border-b-2"
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
        </div>

        {/* Right Main Column */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Header Name & Title */}
          <div className="pb-4 border-b-2 border-slate-200">
            <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">
              {p.fullName || <span className="opacity-40">{ph.fullName}</span>}
            </h1>
            <p className="text-sm font-black tracking-widest uppercase mt-1" style={{ color: accentColor }}>
              {p.jobTitle || <span className="opacity-40">{ph.jobTitle}</span>}
            </p>
          </div>

          {/* Profile / Summary */}
          <div>
            <h3
              className="text-xs font-black uppercase tracking-widest mb-2"
              style={{ color: accentColor }}
            >
              {L.summary}
            </h3>
            <p className={`text-[11.5px] leading-relaxed whitespace-pre-line ${p.summary ? 'text-slate-700' : 'text-slate-400 italic'}`}>
              {p.summary || ph.summary}
            </p>
          </div>

          {/* Work Experience */}
          {visibleSections?.experience && (
            <div>
              <h3
                className="text-xs font-black uppercase tracking-widest mb-3"
                style={{ color: accentColor }}
              >
                {L.experience}
              </h3>
              {(sections?.experience || []).length > 0 ? (
                <div className="space-y-4">
                  {sections.experience.map((exp) => (
                    <div key={exp.id} className="text-[11.5px]">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <h4 className="font-black text-slate-900 text-xs">{exp.company}</h4>
                        <span className="text-[10px] font-bold text-slate-400">
                          {formatRange(exp.startDate, exp.endDate, exp.current, L.present)}
                        </span>
                      </div>
                      <div className="text-[11px] font-bold text-slate-600 mb-1" style={{ color: accentColor }}>
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

          {/* Projects (if visible) */}
          {visibleSections?.projects && (sections?.projects || []).length > 0 && (
            <div>
              <h3
                className="text-xs font-black uppercase tracking-widest mb-2.5"
                style={{ color: accentColor }}
              >
                {L.projects}
              </h3>
              <div className="space-y-2.5 text-[11.5px]">
                {sections.projects.map((pr) => (
                  <div key={pr.id}>
                    <div className="font-bold text-slate-900">{pr.name}</div>
                    {pr.description && <p className="text-[11px] text-slate-600 mt-0.5">{pr.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* References Grid */}
          {visibleSections?.references && (sections?.references || []).length > 0 && (
            <div className="pt-2">
              <h3
                className="text-xs font-black uppercase tracking-widest mb-2.5"
                style={{ color: accentColor }}
              >
                {L.references}
              </h3>
              <div className="grid grid-cols-2 gap-3 text-[11px]">
                {sections.references.map((ref) => (
                  <div key={ref.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="font-black text-slate-900">{ref.name}</div>
                    <div className="text-slate-600 text-[10px]">{ref.relation}</div>
                    {ref.contact && <div className="text-slate-500 text-[9.5px] mt-0.5">{ref.contact}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
