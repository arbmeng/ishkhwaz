import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { soundService } from '../../services/soundService';
import { apiService } from '../../services/api';
import { EditJobModal } from '../company/EditJobModal';
import { CompanyBrandingModal } from '../company/CompanyBrandingModal';
import { FreelancerProfileModal } from '../freelancer/FreelancerProfileModal';
import { MessageThreadModal } from '../messages/MessageThreadModal';
import { DisputeModal } from '../shared/DisputeModal';
import { MilestonesPanel } from '../shared/MilestonesPanel';
import { StarRatingInput } from '../ui/StarRating';
import { TrendChart } from '../ui/TrendChart';
import { HScroll } from '../ui/HScroll';
import { PageHeader } from '../layout/PageHeader';
import {
  Plus, Check, X, Crown, Edit, Trash2, MessageCircle, FileText, Send,
  Inbox, CheckCircle2, XCircle, Undo2, Layers, Palette, Star, Eye,
  Play, Pause, MapPin, Briefcase, BarChart3, Search,
  ArrowUpRight, RefreshCw, Clock, Users, Building2, UserRound, CheckCheck
} from 'lucide-react';

const NK = "'Noto Kufi Arabic', 'Vazirmatn', system-ui, sans-serif";
const TEAL = '#12796b';
const TEAL_DEEP = '#0d5c50';
const TEAL_SOFT = '#e7f4f1';

const STAGE_LABELS = {
  payment_review: 'لە پشکنینی پارەدایە',
  with_company: 'لای کۆمپانیایە',
  accepted: 'پەسەندکراو',
  rejected: 'ڕەتکراوە',
  payment_rejected: 'پارەدان پەسەند نەکرا',
};

const stageBucket = (stage) => {
  if (stage === 'accepted') return 'accepted';
  if (stage === 'rejected' || stage === 'payment_rejected') return 'rejected';
  return 'pending';
};

const STATUS_FILTERS = [
  { id: 'all', label: 'هەموو' },
  { id: 'pending', label: 'چاوەڕوان' },
  { id: 'accepted', label: 'پەسەندکراو' },
  { id: 'rejected', label: 'ڕەتکراو' },
];

const daysAgoLabel = (isoDate) => {
  if (!isoDate) return '';
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const days = Math.floor(diffMs / (24 * 3600 * 1000));
  if (days <= 0) return 'ئەمڕۆ نێردرا';
  if (days === 1) return '١ ڕۆژ لەمەوە';
  return `${days} ڕۆژ لەمەوە`;
};

const safeArray = (value) => Array.isArray(value) ? value : [];

const GlassButton = ({ children, primary, className = '', ...props }) => (
  <button
    {...props}
    className={[
      'inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-black transition-all duration-200',
      'active:scale-[.97] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#12796b]/40',
      primary
        ? 'bg-[#12796b] text-white shadow-[0_10px_28px_rgba(18,121,107,.20)] hover:bg-[#0d5c50]'
        : 'bg-white text-[#33433e] border border-[#e4ebe8] hover:border-[#12796b]/30 hover:bg-[#f8fbfa]',
      className,
    ].join(' ')}
  >
    {children}
  </button>
);

const EmptyState = ({ icon: Icon = FileText, title, description, action }) => (
  <div className="rounded-[28px] border border-dashed border-[#dce7e3] bg-white/90 p-10 sm:p-14 text-center">
    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eaf5f2] text-[#12796b]">
      <Icon className="h-6 w-6" />
    </div>
    <h3 className="text-sm sm:text-base font-black text-[#17231f]">{title}</h3>
    {description && <p className="mx-auto mt-2 max-w-md text-xs leading-6 font-medium text-[#7b8e88]">{description}</p>}
    {action}
  </div>
);

const StatCard = ({ icon: Icon, value, label, accent, hint, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={[
      'group relative overflow-hidden rounded-[26px] border p-4 sm:p-5 text-right transition-all duration-300',
      'hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgba(18,53,47,.08)]',
      accent ? 'border-[#0d5c50] bg-[#12796b] text-white' : 'border-[#e5ece9] bg-white text-[#17231f]',
    ].join(' ')}
  >
    <div className={`absolute -left-8 -top-8 h-24 w-24 rounded-full blur-2xl ${accent ? 'bg-white/10' : 'bg-[#12796b]/5'}`} />
    <div className="relative flex items-start justify-between gap-3">
      <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${accent ? 'bg-white/12' : 'bg-[#eaf5f2]'} ${accent ? 'text-white' : 'text-[#12796b]'}`}>
        <Icon className="h-5 w-5" />
      </div>
      {hint && (
        <span className={`rounded-full px-2 py-1 text-[9px] font-black ${accent ? 'bg-white/10 text-white/80' : 'bg-[#f3f7f5] text-[#80908a]'}`}>
          {hint}
        </span>
      )}
    </div>
    <div className="relative mt-5">
      <div className={`text-[28px] sm:text-[32px] leading-none font-black tracking-tight ${accent ? 'text-white' : 'text-[#17231f]'}`}>{value}</div>
      <div className={`mt-2 text-[11px] font-bold ${accent ? 'text-white/75' : 'text-[#7b8e88]'}`}>{label}</div>
    </div>
  </button>
);

const SegmentedTabs = ({ tabs, active, onChange }) => (
  <HScroll bar={false} arrows={false} className="flex w-full rounded-[22px] border border-[#e5ece9] bg-white p-1.5 shadow-[0_4px_18px_rgba(18,53,47,.035)]">
    {tabs.map(({ id, label, Icon, count }) => {
      const selected = active === id;
      return (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={`min-w-[110px] flex-1 rounded-[16px] px-3 py-2.5 text-xs font-black transition-all ${selected ? 'bg-[#12796b] text-white shadow-[0_7px_18px_rgba(18,121,107,.18)]' : 'text-[#7b8e88] hover:bg-[#f6f9f8] hover:text-[#17231f]'
            }`}
        >
          <span className="inline-flex items-center justify-center gap-1.5">
            <Icon className="h-3.5 w-3.5" />
            {label}
            {count !== null && <span className={selected ? 'text-white/70' : 'text-[#a0afa9]'}>({count})</span>}
          </span>
        </button>
      );
    })}
  </HScroll>
);

const StatusPill = ({ type, children }) => {
  const styles = {
    success: 'bg-[#e7f4f1] text-[#0d5c50] border-[#c5e8df]',
    danger: 'bg-rose-50 text-rose-700 border-rose-100',
    warning: 'bg-amber-50 text-amber-700 border-amber-100',
    neutral: 'bg-[#f4f7f6] text-[#687872] border-[#e5ece9]',
  };
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black ${styles[type] || styles.neutral}`}>{children}</span>;
};

const ApplicantCard = ({ app, onCV, onApprove, onReject, onRate, ratingOpen, rated, ratingBusy, onRatingSubmit }) => {
  const accepted = app.status === 'accepted';
  const rejected = app.status === 'rejected';

  return (
    <article className={`group rounded-[26px] border p-4 sm:p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgba(18,53,47,.07)] ${accepted ? 'border-[#c6e9e1] bg-[#f7fcfa]' : rejected ? 'border-rose-100 bg-rose-50/25' : 'border-[#e5ece9] bg-white'
      }`}>
      <div className="flex items-start gap-3.5">
        {app.avatar ? (
          <img src={app.avatar} alt="" className="h-14 w-14 shrink-0 rounded-[18px] object-cover border border-[#d2ebe5]" />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] border border-[#c8e8e1] bg-[#e4f5f1] text-lg font-black text-[#12796b]">{app.initial}</div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm sm:text-base font-black text-[#17231f]">{app.freelancer_name}</h3>
            {app.isVIP && <span className="inline-flex items-center gap-1 rounded-full bg-[#17231f] px-2 py-1 text-[9px] font-black text-white"><Crown className="h-3 w-3 text-amber-300" /> VIP</span>}
          </div>
          <div className="mt-1.5 inline-flex max-w-full rounded-full bg-[#f3f7f5] px-2.5 py-1 text-[10px] font-bold text-[#596963]">
            <span className="truncate">{app.job_title}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10px] font-medium text-[#7b8e88]">
        <span>{app.cv_mode_text}</span>
        {app.location_text && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{app.location_text}</span>}
        <span className="max-w-[240px] truncate">{app.experience_text}</span>
      </div>

      <div className="mt-3">
        <StatusPill type={accepted ? 'success' : rejected ? 'danger' : 'warning'}>
          {accepted ? <CheckCircle2 className="h-3.5 w-3.5" /> : rejected ? <XCircle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
          {accepted ? 'پەسەندکراو' : rejected ? 'ڕەتکراوە' : 'چاوەڕوانی بڕیار'}
        </StatusPill>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#edf2f0] pt-4">
        <GlassButton onClick={() => onCV(app)}><FileText className="h-3.5 w-3.5" />بینینی CV</GlassButton>
        {!accepted && !rejected && (
          <>
            <button onClick={() => onReject(app.id)} className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#e5ece9] bg-white text-[#7b8e88] transition hover:border-rose-200 hover:text-rose-600 active:scale-95" aria-label="ڕەتکردنەوە"><X className="h-4 w-4" /></button>
            <GlassButton primary onClick={() => onApprove(app.id)}><Check className="h-3.5 w-3.5" />پەسەندکردن</GlassButton>
          </>
        )}
        {accepted && !rated && (
          <GlassButton onClick={() => onRate(app.id)}><Star className="h-3.5 w-3.5 text-amber-500" />هەڵسەنگاندن</GlassButton>
        )}
      </div>

      {ratingOpen && (
        <div className="mt-3">
          <StarRatingInput label={`هەڵسەنگاندنی ${app.freelancer_name}`} submitting={ratingBusy} onSubmit={onRatingSubmit} />
        </div>
      )}
    </article>
  );
};

const JobCard = ({ job, onOpen, onEdit, onToggle, toggling }) => {
  const canToggle = job.status === 'active' || job.status === 'paused';
  const status = {
    pending: ['چاوەڕوانی پەسەندکردن', 'warning'],
    rejected: ['ڕەتکراوە', 'danger'],
    closed: ['بەسەرچووە', 'neutral'],
    paused: ['ناچالاککراوە', 'warning'],
    active: ['چالاکە', 'success'],
  }[job.status] || ['چالاکە', 'success'];

  return (
    <article onClick={onOpen} className="group cursor-pointer rounded-[26px] border border-[#e5ece9] bg-white p-4 sm:p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#12796b]/25 hover:shadow-[0_18px_45px_rgba(18,53,47,.07)]">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#eaf5f2] text-[#12796b]"><Briefcase className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-black text-[#17231f] group-hover:text-[#12796b]">{job.title_ku || job.title}</h3>
          <div className="mt-2"><StatusPill type={status[1]}>{status[0]}</StatusPill></div>
        </div>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-[#b1bfba] transition group-hover:-translate-y-0.5 group-hover:text-[#12796b]" />
      </div>

      <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-[#7b8e88]">
        <Send className="h-3.5 w-3.5" />
        <span>{Number(job.applications_count) || 0} داواکاری</span>
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-[#edf2f0] pt-3">
        <button onClick={(e) => { e.stopPropagation(); onEdit(job); }} className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#e5ece9] bg-[#f7f9f8] text-[#5a6b65] transition hover:text-[#12796b]" aria-label="دەستکاریکردن"><Edit className="h-4 w-4" /></button>
        {canToggle && (
          <button disabled={toggling} onClick={(e) => { e.stopPropagation(); onToggle(job); }} className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#e5ece9] bg-[#f7f9f8] text-[#5a6b65] transition hover:text-[#12796b] disabled:opacity-50" aria-label="گۆڕینی دۆخ">
            {job.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
        )}
        <span className="mr-auto text-[10px] font-bold text-[#a0afa9]">وردەکاری</span>
      </div>
    </article>
  );
};

const ApplicationCard = ({ req, dispute, expanded, onExpand, onRate, rated, ratingOpen, ratingBusy, onRatingSubmit, onWithdraw, withdrawing, onMessage, onDispute }) => {
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const bucket = stageBucket(req.stage);
  const step = req.stage === 'payment_review' ? 1 : req.stage === 'with_company' ? 2 : 3;
  const pct = Math.round((step / 3) * 100);
  const accepted = bucket === 'accepted';
  const rejected = bucket === 'rejected';

  return (
    <article className={`rounded-[26px] border p-4 sm:p-5 transition-all duration-300 hover:shadow-[0_15px_40px_rgba(18,53,47,.06)] ${accepted ? 'border-[#c6e9e1] bg-[#f7fcfa]' : rejected ? 'border-rose-100 bg-rose-50/20' : 'border-[#e5ece9] bg-white'
      }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm sm:text-base font-black text-[#17231f]">{req.title}</h3>
          <p className="mt-1 truncate text-[11px] font-bold text-[#7b8e88]">{req.company}</p>
        </div>
        <StatusPill type={accepted ? 'success' : rejected ? 'danger' : 'warning'}>{STAGE_LABELS[req.stage]}</StatusPill>
      </div>

      <div className="my-4 h-px bg-[#edf2f0]" />

      {accepted && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[10px] font-black text-[#7b8e88]"><span>قۆناغی داواکاری</span><span>{step}/3 · {pct}%</span></div>
          <div className="flex gap-1.5">
            {[0, 1, 2].map(i => <div key={i} className="h-1.5 flex-1 rounded-full" style={{ background: i < step ? TEAL : '#dfeae6' }} />)}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button onClick={() => onExpand(req.id)} className="inline-flex items-center gap-1.5 text-xs font-black text-[#12796b]"><Layers className="h-3.5 w-3.5" />وردەکاری</button>
              {!rated && <button onClick={() => onRate(req.id)} className="inline-flex items-center gap-1.5 text-xs font-black text-amber-700"><Star className="h-3.5 w-3.5 text-amber-500" />هەڵسەنگاندن</button>}
            </div>
            <span className="text-[10px] font-bold text-[#7b8e88]">قۆناغەکان بە سەرکەوتوویی تێپەڕین</span>
          </div>
          {expanded && <MilestonesPanel applicationId={req.id} role="freelancer" />}
          {ratingOpen && <StarRatingInput label={`هەڵسەنگاندنی ${req.company}`} submitting={ratingBusy} onSubmit={onRatingSubmit} />}
        </div>
      )}

      {bucket === 'pending' && (
        <div className="space-y-3">
          <div className="flex gap-1.5">
            {[0, 1, 2].map(i => <div key={i} className="h-1.5 flex-1 rounded-full" style={{ background: i < step ? TEAL : '#dfeae6' }} />)}
          </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-bold text-[#7b8e88]">
          {req.txId && <span className="font-mono">مامەڵە: {req.txId}</span>}
          <span>{req.sentAgo}</span>
        </div>
        </div>
      )}

      {rejected && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] font-bold text-[#7b8e88]">
          {req.stage === 'payment_rejected' ? (
            <button onClick={() => onDispute(req.id, req.title)} className="inline-flex items-center gap-1.5 font-black text-rose-700"><Undo2 className="h-3.5 w-3.5" />{dispute ? 'بینینی گفتوگۆ' : 'گفتوگۆ'}</button>
          ) : <span />}
          <span>{dispute ? `دۆسیەی #${String(dispute.id).slice(-6)}` : req.sentAgo}</span>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#edf2f0] pt-3">
        <span className="text-[9px] font-mono text-[#8a9994]">{req.appliedAt ? `نێردراوە: ${req.appliedAt}` : ''}</span>
        <div className="flex flex-wrap gap-2">
          {req.stage === 'payment_review' && (
            confirmWithdraw ? (
              <>
                <GlassButton onClick={() => setConfirmWithdraw(false)}>نەخێر</GlassButton>
                <GlassButton disabled={withdrawing} onClick={() => { setConfirmWithdraw(false); onWithdraw(req.id); }} className="!bg-rose-600 !border-rose-600 !text-white hover:!bg-rose-700"><Trash2 className="h-3.5 w-3.5" />بەڵێ، لایببە</GlassButton>
              </>
            ) : (
              <GlassButton disabled={withdrawing} onClick={() => setConfirmWithdraw(true)} className="!bg-rose-50 !border-rose-100 !text-rose-700"><Trash2 className="h-3.5 w-3.5" />لابردنەوە</GlassButton>
            )
          )}
          {req.stage !== 'payment_review' && req.stage !== 'payment_rejected' && (
            <GlassButton onClick={() => onMessage(req)}><MessageCircle className="h-3.5 w-3.5" />پەیام</GlassButton>
          )}
        </div>
      </div>
    </article>
  );
};

export const Dashboard = ({ onNavigate }) => {
  const { user, token } = useAuth();
  const {
    jobs = [], applications = [], freelancers = [], invitations = [],
    categories: liveCategories = [],
    updateCompanyApplicantStatus, rateApplication, toggleJobStatus,
    respondToInvitation, syncBackendData, addToast,
  } = useStore();

  const isEmployer = user?.role === 'employer' || user?.role === 'owner' || user?.role === 'admin';

  const [statusOverrides, setStatusOverrides] = useState({});
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [employerSubTab, setEmployerSubTab] = useState('applicants');
  const [freelancerSubTab, setFreelancerSubTab] = useState('sent');
  const [statusFilter, setStatusFilter] = useState('all');
  const [analytics, setAnalytics] = useState({ series: [], totals: { views: 0, applications: 0 } });
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [viewingFreelancer, setViewingFreelancer] = useState(null);
  const [showBrandingModal, setShowBrandingModal] = useState(false);
  const [togglingJobId, setTogglingJobId] = useState(null);
  const [ratingOpenId, setRatingOpenId] = useState(null);
  const [ratedIds, setRatedIds] = useState(new Set());
  const [ratingBusy, setRatingBusy] = useState(false);
  const [disputes, setDisputes] = useState([]);
  const [messageThread, setMessageThread] = useState(null);
  const [withdrawingId, setWithdrawingId] = useState(null);
  const [disputeModalTarget, setDisputeModalTarget] = useState(null);
  const [expandedMilestones, setExpandedMilestones] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');

  const companyJobs = useMemo(() => {
    const list = safeArray(jobs);
    if (!user) return [];
    const id = String(user.id || '').trim();
    return list.filter(j =>
      String(j.company_id || j.companyId || j.user_id || '').trim() === id ||
      (user.company_name && (j.company_name === user.company_name || j.companyName === user.company_name))
    );
  }, [jobs, user]);

  const combinedApplicants = useMemo(() => safeArray(applications).map(a => {
    const matchedFl = safeArray(freelancers).find(f => String(f.id) === String(a.freelancer_id || a.user_id));
    const matchedJob = safeArray(jobs).find(j => String(j.id) === String(a.job_id));
    const name = a.freelancer_name || matchedFl?.name || 'کاندید';
    return {
      id: a.id,
      freelancer_id: a.freelancer_id || a.user_id || matchedFl?.id,
      freelancer_name: name,
      job_title: a.job_title || matchedJob?.title_ku || 'هەلی کار',
      job_category: matchedJob?.category || 'cat_other',
      experience_text: matchedFl?.bio || 'ئەزموونی پشتڕاستکراو',
      location_text: a.location || matchedFl?.governorate || '',
      cv_mode_text: a.cv_url ? 'CV بارکراو' : 'پڕۆفایل وەک CV',
      status: statusOverrides[a.id] || a.company_status || 'pending',
      isVIP: Boolean(a.is_vip || matchedFl?.plan === 'pro' || matchedFl?.plan === 'vip'),
      initial: name.trim().charAt(0) || 'ک',
      avatar: matchedFl?.avatar || a.avatar || '',
      rawApp: a,
    };
  }), [applications, freelancers, jobs, statusOverrides]);

  const applicantCategoryFilters = useMemo(() => {
    const present = new Set(combinedApplicants.map(a => a.job_category));
    const items = safeArray(liveCategories).filter(c => present.has(c.id)).map(c => ({ id: c.id, label: c.name_ku }));
    return [{ id: 'all', label: 'هەموو' }, ...items];
  }, [combinedApplicants, liveCategories]);

  const filteredApplicantsList = useMemo(() => {
    let list = selectedCategoryFilter === 'all'
      ? combinedApplicants
      : combinedApplicants.filter(a => a.job_category === selectedCategoryFilter);
    const q = query.trim().toLowerCase();
    if (q) list = list.filter(a => `${a.freelancer_name} ${a.job_title} ${a.location_text}`.toLowerCase().includes(q));
    return list;
  }, [combinedApplicants, selectedCategoryFilter, query]);

  const deriveStage = (app) => {
    if (app.company_status === 'accepted') return 'accepted';
    if (app.company_status === 'rejected') return 'rejected';
    if (app.payment_status === 'rejected') return 'payment_rejected';
    if (app.payment_status === 'approved') return 'with_company';
    return 'payment_review';
  };

  const sentRequests = useMemo(() => safeArray(applications).map(app => ({
    id: app.id,
    company: app.company_name || 'کۆمپانیا',
    title: app.job_title || 'داواکاری کار',
    stage: deriveStage(app),
    appliedAt: app.created_at ? new Date(app.created_at).toLocaleDateString('en-GB') : '',
    sentAgo: daysAgoLabel(app.created_at),
    txId: app.payment_tx_id || '',
  })), [applications]);

  const filteredSentRequests = useMemo(() => statusFilter === 'all'
    ? sentRequests
    : sentRequests.filter(r => stageBucket(r.stage) === statusFilter), [sentRequests, statusFilter]);

  const receivedOffers = useMemo(() => safeArray(invitations).map(inv => ({
    id: inv.id,
    company: inv.company_name || 'کۆمپانیا',
    title: inv.job_title || 'ئۆفەری کار',
    salary: inv.salary_offer || '',
    status: inv.status || 'pending',
    offeredAt: inv.created_at ? new Date(inv.created_at).toLocaleDateString('en-GB') : '',
    message: inv.message || '',
  })), [invitations]);

  useEffect(() => {
    if (!isEmployer || !token) return;
    let active = true;
    setAnalyticsLoading(true);
    apiService.getCompanyAnalytics(14, token)
      .then(data => { if (active) setAnalytics(data || { series: [], totals: { views: 0, applications: 0 } }); })
      .finally(() => { if (active) setAnalyticsLoading(false); });
    return () => { active = false; };
  }, [isEmployer, token]);

  useEffect(() => {
    if (isEmployer || !token) return;
    let active = true;
    apiService.getDisputes(token).then(data => { if (active) setDisputes(safeArray(data)); });
    return () => { active = false; };
  }, [token, isEmployer]);

  const disputeFor = (applicationId) => disputes.find(d => d.target_type === 'application' && d.target_id === applicationId);

  const handleRefresh = async () => {
    if (!syncBackendData || refreshing) return;
    setRefreshing(true);
    soundService.playTick?.();
    try { await syncBackendData(); addToast?.({ title: 'نوێکرایەوە', message: 'داتا بە سەرکەوتوویی نوێکرایەوە.', type: 'success' }); }
    finally { setRefreshing(false); }
  };

  const handleSubmitRating = async (appId, rating, comment) => {
    setRatingBusy(true);
    const ok = await rateApplication(appId, rating, comment);
    setRatingBusy(false);
    if (ok) { setRatedIds(prev => new Set(prev).add(appId)); setRatingOpenId(null); }
  };

  const decideApplicant = async (appId, decision) => {
    const previous = statusOverrides[appId];
    setStatusOverrides(prev => ({ ...prev, [appId]: decision }));
    const ok = await updateCompanyApplicantStatus?.(appId, decision);
    if (ok) return true;
    setStatusOverrides(prev => {
      const next = { ...prev };
      if (previous === undefined) delete next[appId]; else next[appId] = previous;
      return next;
    });
    return false;
  };

  const handleApproveApplicant = async (id) => {
    soundService.playTick?.();
    if (await decideApplicant(id, 'accepted')) {
      soundService.playSuccess?.();
      addToast?.({ title: 'پەسەندکرا ✓', message: 'کاندید بە سەرکەوتوویی پەسەندکرا.', type: 'success' });
    }
  };

  const handleRejectApplicant = async (id) => {
    soundService.playTick?.();
    if (await decideApplicant(id, 'rejected')) addToast?.({ title: 'ڕەتکرایەوە', message: 'کاندید ڕەتکرایەوە.', type: 'info' });
  };

  const handleOpenCv = (app) => {
    soundService.playTick?.();
    const matched = safeArray(freelancers).find(f => String(f.id) === String(app.freelancer_id) || f.name === app.freelancer_name) || {
      id: app.freelancer_id, name: app.freelancer_name, title: app.job_title, bio: app.experience_text, plan: app.isVIP ? 'pro' : 'free',
    };
    setViewingFreelancer(matched);
  };

  const handleToggleJobStatus = async (job) => {
    soundService.playTick?.();
    setTogglingJobId(job.id);
    try { await toggleJobStatus?.(job.id); } finally { setTogglingJobId(null); }
  };

  const handleWithdraw = async (appId) => {
    soundService.playTick?.();
    setWithdrawingId(appId);
    try {
      const res = await apiService.withdrawApplication(appId, token);
      if (res?.success) { await syncBackendData(); addToast?.({ title: 'لابرا', message: 'داواکارییەکە لابرا.', type: 'info' }); }
    } finally { setWithdrawingId(null); }
  };

  const handleAcceptOffer = async (offerId, companyName) => {
    soundService.playSuccess?.();
    const ok = await respondToInvitation(offerId, 'accepted');
    if (ok) addToast?.({ title: 'پیرۆزە! 🎉', message: `ئۆفەری کۆمپانیای "${companyName}" قبووڵکرا.`, type: 'success' });
  };

  const handleRejectOffer = async (offerId) => {
    soundService.playTick?.();
    await respondToInvitation(offerId, 'rejected');
  };


  const statCards = isEmployer ? [
    { value: companyJobs.filter(j => j.status === 'active').length, label: 'کاری چالاک', icon: Briefcase, hint: 'کارەکان', accent: false, tab: 'jobs' },
    { value: combinedApplicants.length, label: 'هەموو داواکارییەکان', icon: Users, hint: 'کاندیدەکان', accent: true, tab: 'applicants' },
    { value: combinedApplicants.filter(a => a.status === 'accepted').length, label: 'پەسەندکراو', icon: CheckCircle2, hint: 'ئەنجام', accent: false, tab: 'applicants' },
  ] : [
    { value: sentRequests.length, label: 'داواکارییە نێردراوەکان', icon: Send, hint: 'نێردراو', accent: false, tab: 'sent' },
    { value: receivedOffers.length, label: 'ئۆفەرە وەرگیراوەکان', icon: Inbox, hint: 'ئۆفەر', accent: true, tab: 'received' },
    { value: sentRequests.filter(r => stageBucket(r.stage) === 'accepted').length, label: 'پەسەندکراو', icon: CheckCircle2, hint: 'ئەنجام', accent: false, tab: 'sent' },
  ];

  const employerTabs = [
    { id: 'applicants', label: 'داواکارییەکان', Icon: Users, count: combinedApplicants.length },
    { id: 'jobs', label: 'کارەکان', Icon: Briefcase, count: companyJobs.length },
    { id: 'analytics', label: 'شیکاری', Icon: BarChart3, count: null },
  ];

  return (
    <div dir="rtl" className="min-h-screen select-none bg-[#f4f7f6] pb-24 text-right" style={{ fontFamily: NK }}>
      <style>{`
        @keyframes dashboardRise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .dashboard-rise{animation:dashboardRise .45s cubic-bezier(.22,.9,.34,1) both}
        .dashboard-delay-1{animation-delay:.04s}.dashboard-delay-2{animation-delay:.08s}.dashboard-delay-3{animation-delay:.12s}
        @media (prefers-reduced-motion:reduce){.dashboard-rise{animation:none!important}}
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -right-32 -top-32 h-80 w-80 rounded-full bg-[#12796b]/5 blur-3xl" />
        <div className="absolute -left-40 top-[38%] h-96 w-96 rounded-full bg-[#12796b]/4 blur-3xl" />
      </div>

      <PageHeader
        title={isEmployer ? 'داشبۆردی کۆمپانیا' : 'داواکارییەکانم'}
        actions={[{ icon: RefreshCw, label: 'نوێکردنەوە', onClick: handleRefresh, active: refreshing }]}
      />

      <main className="relative mx-auto w-full max-w-[1500px] px-3 pb-8 pt-4 sm:px-6 sm:pt-7 lg:px-8">
        {isEmployer && (
          <div className="dashboard-rise mb-4">
            <GlassButton primary onClick={() => { soundService.playTick?.(); onNavigate?.('post_job'); }} className="w-full sm:w-auto sm:px-6 py-3.5 sm:py-3">
              <Plus className="h-4 w-4" />بڵاوکردنەوەی کار
            </GlassButton>
          </div>
        )}

        {/* Stats */}
        <section className="dashboard-rise dashboard-delay-1 mb-5 grid grid-cols-3 gap-2.5 sm:gap-3.5">
          {statCards.map((s, i) => (
            <StatCard
              key={i}
              icon={s.icon}
              value={s.value}
              label={s.label}
              hint={s.hint}
              accent={s.accent}
              onClick={() => isEmployer ? setEmployerSubTab(s.tab) : setFreelancerSubTab(s.tab)}
            />
          ))}
        </section>

        {/* Employer */}
        {isEmployer ? (
          <section className="dashboard-rise dashboard-delay-2 space-y-4">
            <SegmentedTabs tabs={employerTabs} active={employerSubTab} onChange={(id) => { soundService.playTick?.(); setEmployerSubTab(id); }} />

            {employerSubTab === 'applicants' && (
              <div className="space-y-4">
                <div className="flex flex-col gap-3 rounded-[26px] border border-[#e5ece9] bg-white p-3 sm:p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative min-w-0 flex-1">
                      <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aaaa4]" />
                      <input
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="گەڕان بە ناوی کاندید، کار یان شوێن..."
                        className="h-11 w-full rounded-2xl border border-[#e6edea] bg-[#f8faf9] pr-10 pl-4 text-xs font-bold text-[#17231f] outline-none transition focus:border-[#12796b]/40 focus:bg-white"
                      />
                    </div>
                    <div className="min-w-0 sm:max-w-[55%]">
                    <HScroll bar={false} className="flex items-center gap-2 px-1 py-0.5">
                      {applicantCategoryFilters.map(c => (
                        <button key={c.id} onClick={() => setSelectedCategoryFilter(c.id)} className={`shrink-0 rounded-full px-3.5 py-2 text-[10px] font-black transition ${selectedCategoryFilter === c.id ? 'bg-[#17231f] text-white' : 'border border-[#e5ece9] bg-white text-[#65766f] hover:border-[#12796b]/30'}`}>{c.label}</button>
                      ))}
                    </HScroll>
                    </div>
                  </div>
                  <div className="text-[10px] font-bold text-[#8a9994]">{filteredApplicantsList.length} کاندید</div>
                </div>

                {filteredApplicantsList.length === 0 ? (
                  <EmptyState icon={Users} title="هیچ داواکارییەک نەدۆزرایەوە" description="کاتێک کاندیدێک بۆ کارێکت داواکاری بنێرێت، لێرە دەردەکەوێت." />
                ) : (
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    {filteredApplicantsList.map(app => (
                      <ApplicantCard
                        key={app.id}
                        app={app}
                        onCV={handleOpenCv}
                        onApprove={handleApproveApplicant}
                        onReject={handleRejectApplicant}
                        onRate={id => { soundService.playTick?.(); setRatingOpenId(ratingOpenId === id ? null : id); }}
                        ratingOpen={ratingOpenId === app.id}
                        rated={ratedIds.has(app.id)}
                        ratingBusy={ratingBusy}
                        onRatingSubmit={(rating, comment) => handleSubmitRating(app.id, rating, comment)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {employerSubTab === 'jobs' && (
              <div className="space-y-3">
                {companyJobs.length === 0 ? (
                  <EmptyState icon={Briefcase} title="هێشتا هیچ کارێکت بڵاونەکردووەتەوە" description="یەکەم هەلی کارەکەت دروست بکە و دەرفەتەکەت بگەیەنە بە کاندیدەکانی ئیش خواز." action={<GlassButton primary className="mt-5" onClick={() => onNavigate?.('post_job')}><Plus className="h-4 w-4" />دروستکردنی کاری نوێ</GlassButton>} />
                ) : (
                  <>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {companyJobs.map(job => <JobCard key={job.id} job={job} onOpen={() => onNavigate?.('job_view', { jobId: job.id })} onEdit={setEditingJob} onToggle={handleToggleJobStatus} toggling={togglingJobId === job.id} />)}
                    </div>
                    <button onClick={() => { soundService.playTick?.(); setShowBrandingModal(true); }} className="flex w-full items-center justify-center gap-2 rounded-[22px] border border-[#e5ece9] bg-white py-3.5 text-xs font-black text-[#263630] transition hover:border-[#12796b]/30 hover:text-[#12796b]">
                      <Palette className="h-4 w-4 text-[#12796b]" />نوێکردنەوەی براندی هەموو کارەکان
                    </button>
                  </>
                )}
              </div>
            )}

            {employerSubTab === 'analytics' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                  <div className="rounded-[24px] border border-[#e5ece9] bg-white p-4"><div className="flex items-center gap-2 text-[10px] font-black text-[#7b8e88]"><Eye className="h-4 w-4 text-[#12796b]" />بینین</div><div className="mt-3 text-2xl font-black text-[#17231f]">{analytics.totals.views || 0}</div></div>
                  <div className="rounded-[24px] border border-[#e5ece9] bg-white p-4"><div className="flex items-center gap-2 text-[10px] font-black text-[#7b8e88]"><Send className="h-4 w-4 text-[#12796b]" />داواکاری</div><div className="mt-3 text-2xl font-black text-[#17231f]">{analytics.totals.applications || 0}</div></div>
                </div>
                {analyticsLoading ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {[1, 2].map(i => <div key={i} className="h-64 animate-pulse rounded-[26px] border border-[#e5ece9] bg-white" />)}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <TrendChart title="بینینی پرۆفایل · ١٤ ڕۆژ" icon={Eye} color={TEAL} data={safeArray(analytics.series).map(s => ({ date: s.date, value: s.views }))} total={analytics.totals.views} />
                    <TrendChart title="داواکاری · ١٤ ڕۆژ" icon={Send} color="#f5a524" data={safeArray(analytics.series).map(s => ({ date: s.date, value: s.applications }))} total={analytics.totals.applications} />
                  </div>
                )}
              </div>
            )}
          </section>
        ) : (
          /* Freelancer */
          <section className="dashboard-rise dashboard-delay-2 space-y-4">
            <SegmentedTabs
              tabs={[
                { id: 'sent', label: 'داواکارییە نێردراوەکان', Icon: Send, count: sentRequests.length },
                { id: 'received', label: 'ئۆفەرە وەرگیراوەکان', Icon: Inbox, count: receivedOffers.length },
              ]}
              active={freelancerSubTab}
              onChange={(id) => { soundService.playTick?.(); setFreelancerSubTab(id); }}
            />

            {freelancerSubTab === 'sent' && (
              <div className="space-y-3">
                <HScroll bar={false} className="flex gap-2 px-1 py-1">
                  {STATUS_FILTERS.map(f => {
                    const count = f.id === 'all' ? sentRequests.length : sentRequests.filter(r => stageBucket(r.stage) === f.id).length;
                    return <button key={f.id} onClick={() => { soundService.playTick?.(); setStatusFilter(f.id); }} className={`shrink-0 rounded-full px-4 py-2 text-[10px] font-black transition ${statusFilter === f.id ? 'bg-[#12796b] text-white shadow-[0_7px_18px_rgba(18,121,107,.16)]' : 'border border-[#e5ece9] bg-white text-[#6d7d77]'}`}>{f.label} ({count})</button>;
                  })}
                </HScroll>

                {filteredSentRequests.length === 0 ? (
                  <EmptyState
                    icon={Send}
                    title={sentRequests.length === 0 ? 'هیچ داواکارییەکت نەناردووە' : 'هیچ داواکارییەک بەم فلتەرە نییە'}
                    description="لە گەڕانی ئیشدا کارێکی گونجاو بدۆزەوە و سیڤیەکەت بنێرە بۆ کۆمپانیاکان."
                    action={<GlassButton primary className="mt-5" onClick={() => onNavigate?.('search')}><Search className="h-4 w-4" />گەڕانی ئیش</GlassButton>}
                  />
                ) : (
                  <div className="space-y-3">
                    {filteredSentRequests.map(req => (
                      <ApplicationCard
                        key={req.id}
                        req={req}
                        dispute={disputeFor(req.id)}
                        expanded={expandedMilestones === req.id}
                        onExpand={id => { soundService.playTick?.(); setExpandedMilestones(expandedMilestones === id ? null : id); }}
                        onRate={id => { soundService.playTick?.(); setRatingOpenId(ratingOpenId === id ? null : id); }}
                        rated={ratedIds.has(req.id)}
                        ratingOpen={ratingOpenId === req.id}
                        ratingBusy={ratingBusy}
                        onRatingSubmit={(rating, comment) => handleSubmitRating(req.id, rating, comment)}
                        onWithdraw={handleWithdraw}
                        withdrawing={withdrawingId === req.id}
                        onMessage={r => { soundService.playTick?.(); setMessageThread({ id: r.id, title: r.title, counterpart: r.company }); }}
                        onDispute={(id, title) => { soundService.playTick?.(); setDisputeModalTarget({ targetId: id, title }); }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {freelancerSubTab === 'received' && (
              <div className="space-y-3">
                {receivedOffers.length === 0 ? (
                  <EmptyState icon={Inbox} title="هیچ ئۆفەرێکی نوێت نییە" description="کاتێک کۆمپانیاکان بەپێی سیڤیەکەت داوات دەکەن، ئۆفەرەکان لێرە دەردەکەون." />
                ) : receivedOffers.map(offer => (
                  <article key={offer.id} className="rounded-[26px] border border-[#e5ece9] bg-white p-4 sm:p-5 shadow-[0_4px_18px_rgba(18,53,47,.03)]">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#eaf5f2] text-[#12796b]"><Building2 className="h-5 w-5" /></div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm sm:text-base font-black text-[#17231f]">{offer.title}</h3>
                        <p className="mt-1 truncate text-[11px] font-bold text-[#7b8e88]">ئۆفەر لە: {offer.company}</p>
                      </div>
                      {offer.salary && <span className="shrink-0 rounded-xl bg-[#12796b] px-3 py-1.5 font-mono text-[10px] font-black text-white">{offer.salary}</span>}
                    </div>

                    {offer.message && <div className="mt-4 rounded-2xl bg-[#f5f8f7] p-4 text-xs leading-6 text-[#53645e]"><b className="text-[#17231f]">پەیامی کۆمپانیا:</b><p className="mt-1">{offer.message}</p></div>}

                    <div className="mt-4 flex flex-col gap-3 border-t border-[#edf2f0] pt-4 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-[9px] font-mono font-bold text-[#8a9994]">نێردراوە: {offer.offeredAt}</span>
                      {offer.status === 'pending' ? (
                        <div className="grid grid-cols-2 gap-2">
                          <button onClick={() => handleRejectOffer(offer.id)} className="rounded-2xl bg-rose-50 px-4 py-3 text-[10px] font-black text-rose-700 transition hover:bg-rose-100"><XCircle className="mr-1 inline h-4 w-4" />ڕەتکردنەوە</button>
                          <button onClick={() => handleAcceptOffer(offer.id, offer.company)} className="rounded-2xl bg-[#12796b] px-4 py-3 text-[10px] font-black text-white shadow-[0_8px_22px_rgba(18,121,107,.18)] transition hover:bg-[#0d5c50]"><CheckCircle2 className="mr-1 inline h-4 w-4" />قبووڵکردن</button>
                        </div>
                      ) : offer.status === 'accepted' ? (
                        <StatusPill type="success"><CheckCheck className="h-3.5 w-3.5" />ئەم ئۆفەرەت قبووڵ کردووە</StatusPill>
                      ) : (
                        <StatusPill type="danger"><XCircle className="h-3.5 w-3.5" />ئەم ئۆفەرە ڕەتکرایەوە</StatusPill>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Small mobile quick action rail */}
        <div className="mt-5 grid grid-cols-3 gap-2 sm:hidden">
          {[
            { label: 'گەڕان', icon: Search, action: () => onNavigate?.('search') },
            { label: 'پەیامەکان', icon: MessageCircle, action: () => onNavigate?.('messages') },
            { label: 'پرۆفایل', icon: UserRound, action: () => onNavigate?.('profile') },
          ].map(({ label, icon: Icon, action }) => (
            <button key={label} onClick={action} className="rounded-2xl border border-[#e5ece9] bg-white py-3 text-[9px] font-black text-[#65766f]">
              <Icon className="mx-auto mb-1 h-4 w-4 text-[#12796b]" />{label}
            </button>
          ))}
        </div>
      </main>

      {isEmployer && editingJob && <EditJobModal job={editingJob} isOpen={!!editingJob} onClose={() => setEditingJob(null)} />}
      {isEmployer && viewingFreelancer && <FreelancerProfileModal freelancer={viewingFreelancer} isOpen={!!viewingFreelancer} onClose={() => setViewingFreelancer(null)} />}
      {isEmployer && showBrandingModal && <CompanyBrandingModal isOpen={showBrandingModal} onClose={() => setShowBrandingModal(false)} jobs={companyJobs} />}
      {!isEmployer && messageThread && <MessageThreadModal applicationId={messageThread.id} title={messageThread.title} counterpart={messageThread.counterpart} onClose={() => setMessageThread(null)} />}
      {!isEmployer && disputeModalTarget && (
        <DisputeModal
          isOpen={!!disputeModalTarget}
          onClose={() => setDisputeModalTarget(null)}
          targetType="application"
          targetId={disputeModalTarget.targetId}
          title={disputeModalTarget.title}
          existingDispute={disputeFor(disputeModalTarget.targetId)}
          onChanged={(d) => setDisputes(prev => prev.some(x => x.id === d.id) ? prev.map(x => x.id === d.id ? d : x) : [...prev, d])}
        />
      )}
    </div>
  );
};
