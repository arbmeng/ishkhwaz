import React from 'react';
import { Mail, Phone, MapPin, Globe, Linkedin, User, Briefcase, GraduationCap, Award, Heart } from 'lucide-react';
import { getResumeLabels } from './shared/resumeLabels.js';
import { getPlaceholders } from './shared/placeholderText.js';
import { formatRange } from './shared/formatRange.js';

export default function ProPurpleBadge({ resume }) {
  const { personalInfo: p = {}, sections = {}, sectionOrder, visibleSections, direction, fontFamily, accentColor = '#6366f1' } = resume;
  const L = getResumeLabels(resume.language);
  const ph = getPlaceholders(resume.language);
  const fontCls = fontFamily === 'latin' ? 'font-latin' : 'font-arabic';

  const sidebarKeys = ['summary', 'contact'];
  const mainKeys = (sectionOrder || []).filter((k) => !sidebarKeys.includes(k));

  return (
    <div
      dir={direction}
      className={`bg-white text-slate-900 relative overflow-hidden flex flex-col justify-between ${fontCls}`}
      style={{ width: 794, minHeight: 1123, boxSizing: 'border-box' }}
    >
      {/* Top Left Soft Gradient Block */}
      <div
        className="absolute top-0 start-0 pointer-events-none"
        style={{
          width: 320,
          height: 300,
          background: `linear-gradient(135deg, ${accentColor}30, ${accentColor}05)`,
          borderBottomRightRadius: direction === 'rtl' ? '0px' : '60px',
          borderBottomLeftRadius: direction === 'rtl' ? '60px' : '0px',
        }}
      />

      {/* Main 2-Column Body */}
      <div className="relative z-10 px-9 py-8 flex gap-10 flex-1">
        {/* Left Column (Photo, Name, About Me, Contact) */}
        <div className="w-64 shrink-0 space-y-6">
          {/* Photo */}
          <div className="w-36 h-36 rounded-full border-4 border-slate-900 shadow-xl overflow-hidden bg-white flex items-center justify-center">
            {p.photo ? (
              <img src={p.photo} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className="w-16 h-16 text-slate-400" />
            )}
          </div>

          {/* Name & Title */}
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 leading-tight">
              {p.fullName || <span className="opacity-40">{ph.fullName}</span>}
            </h1>
            <p className="text-xs font-black uppercase tracking-widest text-slate-600 mt-1" style={{ color: accentColor }}>
              {p.jobTitle || <span className="opacity-40">{ph.jobTitle}</span>}
            </p>
          </div>

          {/* About Me / Summary */}
          <div>
            <div
              className="inline-block px-4 py-1 rounded-md text-white font-black text-[11px] uppercase tracking-wider mb-2.5 shadow-sm"
              style={{ background: accentColor }}
            >
              {L.summary}
            </div>
            <p className={`text-[11px] leading-relaxed whitespace-pre-line ${p.summary ? 'text-slate-600' : 'text-slate-400 italic'}`}>
              {p.summary || ph.summary}
            </p>
          </div>

          {/* Contact Details */}
          <div>
            <div
              className="inline-block px-4 py-1 rounded-md text-white font-black text-[11px] uppercase tracking-wider mb-2.5 shadow-sm"
              style={{ background: accentColor }}
            >
              {L.contact}
            </div>
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
              {(p.website || !p.fullName) && (
                <div className="flex items-center gap-2">
                  <Globe className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className={p.website ? 'truncate' : 'opacity-40 italic'}>{p.website || ph.website}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Main Column (Education, Experience, Skills, Languages, References) */}
        <div className="flex-1 min-w-0 space-y-6">
          {mainKeys.map((key) => {
            if (!visibleSections?.[key]) return null;
            const items = sections?.[key] || [];

            if (key === 'education') {
              return (
                <div key={key}>
                  <div
                    className="inline-block px-5 py-1 rounded-md text-white font-black text-[11px] uppercase tracking-wider mb-3 shadow-sm"
                    style={{ background: accentColor }}
                  >
                    {L.education}
                  </div>
                  {items.length > 0 ? (
                    <div className="space-y-3.5 text-[11.5px]">
                      {items.map((ed) => (
                        <div key={ed.id}>
                          <div className="font-black text-slate-900 uppercase">
                            {ed.degree} {ed.field ? `IN ${ed.field}` : ''}
                          </div>
                          <div className="text-slate-600 text-[11px]">{ed.institution} | {formatRange(ed.startDate, ed.endDate, ed.current, L.present)}</div>
                          {ed.description && <p className="text-[10.5px] text-slate-500 mt-0.5">{ed.description}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-slate-400 text-xs italic">+ Education history...</div>
                  )}
                </div>
              );
            }

            if (key === 'experience') {
              return (
                <div key={key}>
                  <div
                    className="inline-block px-5 py-1 rounded-md text-white font-black text-[11px] uppercase tracking-wider mb-3 shadow-sm"
                    style={{ background: accentColor }}
                  >
                    {L.experience}
                  </div>
                  {items.length > 0 ? (
                    <div className="space-y-4 text-[11.5px]">
                      {items.map((exp) => (
                        <div key={exp.id}>
                          <div className="flex justify-between items-baseline">
                            <span className="font-black text-slate-900 uppercase">{exp.role}</span>
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
              );
            }

            if (key === 'skills') {
              return (
                <div key={key}>
                  <div
                    className="inline-block px-5 py-1 rounded-md text-white font-black text-[11px] uppercase tracking-wider mb-3 shadow-sm"
                    style={{ background: accentColor }}
                  >
                    {L.skills}
                  </div>
                  {items.length > 0 ? (
                    <div className="space-y-1.5 text-[11px] text-slate-700">
                      {items.map((s) => (
                        <div key={s.id} className="font-semibold">{s.name}</div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-slate-400 text-xs italic">+ Skills...</div>
                  )}
                </div>
              );
            }

            if (key === 'languages') {
              return (
                <div key={key}>
                  <div
                    className="inline-block px-5 py-1 rounded-md text-white font-black text-[11px] uppercase tracking-wider mb-3 shadow-sm"
                    style={{ background: accentColor }}
                  >
                    {L.languages}
                  </div>
                  {items.length > 0 ? (
                    <div className="space-y-1.5 text-[11px] text-slate-700">
                      {items.map((l) => (
                        <div key={l.id} className="flex items-center justify-between">
                          <span className="font-semibold">{l.name}</span>
                          <span className="text-slate-500 text-[10px]">{l.level}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-slate-400 text-xs italic">+ Languages...</div>
                  )}
                </div>
              );
            }

            if (key === 'references' && items.length > 0) {
              return (
                <div key={key}>
                  <div
                    className="inline-block px-5 py-1 rounded-md text-white font-black text-[11px] uppercase tracking-wider mb-3 shadow-sm"
                    style={{ background: accentColor }}
                  >
                    {L.references}
                  </div>
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
