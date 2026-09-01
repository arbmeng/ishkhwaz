import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { soundService } from '../../services/soundService';
import { apiService } from '../../services/api';
import { EditJobModal } from '../company/EditJobModal';
import { JobDetailViewModal } from '../company/JobDetailViewModal';
import { CompanyBrandingModal } from '../company/CompanyBrandingModal';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { FreelancerProfileModal } from '../freelancer/FreelancerProfileModal';
import { MessageThreadModal } from '../messages/MessageThreadModal';
import { DisputeModal } from '../shared/DisputeModal';
import { MilestonesPanel } from '../shared/MilestonesPanel';
import { StarRatingInput } from '../ui/StarRating';
import { TrendChart } from '../ui/TrendChart';
import {
  Plus, Check, X, Crown, Bell, Edit, Trash2, Camera, MessageCircle,
  FileText, Send, Inbox, Clock, CheckCircle2, XCircle, Undo2, Layers, Palette, Star, Eye
} from 'lucide-react';

// Shared light theme — matches DesktopHeaderNav, UserProfilePage, DirectoryPage.
const NK = "'Noto Kufi Arabic', 'Vazirmatn', system-ui, sans-serif";
const TEAL = '#12796b';
const TEAL_DEEP = '#0d5c50';
const TEAL_SOFT = '#e7f4f1';

// Real per-stage labels for a freelancer's own sent applications — derived
// from the actual 3-stage pipeline (admin payment review -> company
// decision -> outcome).
const STAGE_LABELS = {
  payment_review: 'لە پشکنینی پارەدایە (ئەدمین)',
  with_company: 'لای کۆمپانیایە، چاوەڕوانی وەڵام',
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
  if (days <= 0) return 'نێردرا ئەمڕۆ';
  if (days === 1) return 'نێردرا ١ ڕۆژ لەمەوپێش';
  return `نێردرا ${days} ڕۆژ لەمەوپێش`;
};

// One page, two roles: a company account sees freelancers/applicants as the
// primary content, a freelancer account sees companies/applications as the
// primary content — same shell (greeting, stat row, sub-tabs, card list),
// different data source and card fields. Supersedes the old, separately
// built CompanyDashboard.jsx and RequestsPage.jsx.
export const Dashboard = ({ onNavigate }) => {
  const { user, token } = useAuth();
  const {
    jobs = [],
    applications = [],
    freelancers = [],
    invitations = [],
    updateCompanyApplicantStatus,
    rateApplication,
    deleteJob,
    respondToInvitation,
    syncBackendData,
    addToast,
  } = useStore();

  const isEmployer = user?.role === 'employer' || user?.role === 'owner' || user?.role === 'admin';

  /* ══════════════════════ EMPLOYER-SIDE DATA ══════════════════════ */

  const companyJobs = useMemo(() => {
    const safeJobs = Array.isArray(jobs) ? jobs : [];
    if (!user) return [];
    const uId = String(user.id || '').trim();
    return safeJobs.filter(j =>
      String(j.company_id || j.companyId || j.user_id || '').trim() === uId ||
      (user.company_name && (j.company_name === user.company_name || j.companyName === user.company_name))
    );
  }, [jobs, user]);

  const [statusOverrides, setStatusOverrides] = useState({});
  const [stageOverrides, setStageOverrides] = useState({});

  const combinedApplicants = useMemo(() => {
    return (Array.isArray(applications) ? applications : []).map(a => {
      const matchedFl = (Array.isArray(freelancers) ? freelancers : []).find(
        f => String(f.id) === String(a.freelancer_id || a.user_id)
      );
      const name = a.freelancer_name || matchedFl?.name || 'کاندید';
      return {
        id: a.id,
        freelancer_id: a.freelancer_id || a.user_id || matchedFl?.id,
        freelancer_name: name,
        job_title: a.job_title || 'هەلی کار',
        job_category: (a.job_title || '').includes('پشتیگری') ? 'support' : 'web',
        experience_text: matchedFl?.bio || 'ئەزموونی پشتڕاستکراو',
        location_text: a.location || matchedFl?.governorate || '',
        cv_mode_text: a.cv_url ? 'CV بارکراو' : 'پڕۆفایل وەک CV',
        status: statusOverrides[a.id] || a.company_status || 'pending',
        isVIP: Boolean(a.is_vip || matchedFl?.plan === 'pro' || matchedFl?.plan === 'vip'),
        initial: name.trim().charAt(0) || 'ک',
        currentStage: stageOverrides[a.id] || a.currentStage || 1,
        stageDates: { 1: 'ئەمڕۆ', 2: 'چاوەڕوان', 3: 'چاوەڕوان', 4: 'چاوەڕوان' },
        rawApp: a,
      };
    });
  }, [applications, freelancers, statusOverrides, stageOverrides]);

  const [selectedApplicantId, setSelectedApplicantId] = useState('');
  const [ratingOpenId, setRatingOpenId] = useState(null);
  const [ratedIds, setRatedIds] = useState(new Set());
  const [ratingBusy, setRatingBusy] = useState(false);
  const handleSubmitRating = async (appId, rating, comment) => {
    setRatingBusy(true);
    const ok = await rateApplication(appId, rating, comment);
    setRatingBusy(false);
    if (ok) {
      setRatedIds(prev => new Set(prev).add(appId));
      setRatingOpenId(null);
    }
  };
  const selectedApplicant = useMemo(() => {
    return combinedApplicants.find(a => a.id === selectedApplicantId) || combinedApplicants[0];
  }, [combinedApplicants, selectedApplicantId]);

  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const filteredApplicantsList = useMemo(() => {
    if (selectedCategoryFilter === 'all') return combinedApplicants;
    if (selectedCategoryFilter === 'web') {
      return combinedApplicants.filter(a => a.job_title.includes('وێب') || a.job_title.includes('React'));
    }
    if (selectedCategoryFilter === 'support') {
      return combinedApplicants.filter(a => a.job_title.includes('پشتیگری') || a.job_title.includes('تەکنیکی'));
    }
    return combinedApplicants;
  }, [combinedApplicants, selectedCategoryFilter]);

  const [employerSubTab, setEmployerSubTab] = useState('applicants'); // 'applicants' | 'jobs' | 'analytics'
  const [analytics, setAnalytics] = useState({ series: [], totals: { views: 0, applications: 0 } });
  useEffect(() => {
    if (!isEmployer || !token) return;
    apiService.getCompanyAnalytics(14, token).then(setAnalytics);
  }, [isEmployer, token]);
  const [editingJob, setEditingJob] = useState(null);
  const [viewingJob, setViewingJob] = useState(null);
  const [jobToDelete, setJobToDelete] = useState(null);
  const [viewingFreelancer, setViewingFreelancer] = useState(null);
  const [showBrandingModal, setShowBrandingModal] = useState(false);

  const handleApproveApplicant = (appId) => {
    soundService.playSuccess?.();
    setStatusOverrides(prev => ({ ...prev, [appId]: 'accepted' }));
    setStageOverrides(prev => ({ ...prev, [appId]: 4 }));
    updateCompanyApplicantStatus?.(appId, 'accepted');
    addToast?.({ title: 'پەسەندکرا ✓', message: 'کاندید بە سەرکەوتوویی پەسەندکرا.', type: 'success' });
  };

  const handleRejectApplicant = (appId) => {
    soundService.playTick?.();
    setStatusOverrides(prev => ({ ...prev, [appId]: 'rejected' }));
    updateCompanyApplicantStatus?.(appId, 'rejected');
    addToast?.({ title: 'ڕەتکرایەوە', message: 'کاندید ڕەتکرایەوە.', type: 'info' });
  };

  const handleAdvanceStage = () => {
    if (!selectedApplicant) return;
    soundService.playSuccess?.();
    const nextStage = Math.min(4, (selectedApplicant.currentStage || 1) + 1);
    setStageOverrides(prev => ({ ...prev, [selectedApplicant.id]: nextStage }));
    addToast?.({
      title: 'قۆناغ نوێکرایەوە ✓',
      message: `قۆناغی ${selectedApplicant.freelancer_name} بەرزکرایەوە بۆ قۆناغی ${nextStage}`,
      type: 'success',
    });
  };

  const handleOpenCv = (applicant) => {
    soundService.playTick?.();
    const matched = (Array.isArray(freelancers) ? freelancers : []).find(
      f => String(f.id) === String(applicant.freelancer_id) || f.name === applicant.freelancer_name
    ) || {
      id: applicant.freelancer_id,
      name: applicant.freelancer_name,
      title: applicant.job_title,
      bio: applicant.experience_text,
      plan: applicant.isVIP ? 'pro' : 'free',
    };
    setViewingFreelancer(matched);
  };

  const companyDisplayName = user?.company_name || user?.name || 'کۆمپانیا';

  /* ══════════════════════ FREELANCER-SIDE DATA ══════════════════════ */

  const [disputes, setDisputes] = useState([]);
  useEffect(() => {
    if (!isEmployer) apiService.getDisputes(token).then(setDisputes);
  }, [token, isEmployer]);

  const disputeFor = (applicationId) => disputes.find(d => d.target_type === 'application' && d.target_id === applicationId);

  const deriveStage = (app) => {
    if (app.company_status === 'accepted') return 'accepted';
    if (app.company_status === 'rejected') return 'rejected';
    if (app.payment_status === 'rejected') return 'payment_rejected';
    if (app.payment_status === 'approved') return 'with_company';
    return 'payment_review';
  };

  const stageStep = (stage) => {
    if (stage === 'payment_review') return 1;
    if (stage === 'with_company') return 2;
    return 3;
  };

  const sentRequests = useMemo(() => applications.map(app => ({
    id: app.id,
    company: app.company_name || 'کۆمپانیا',
    title: app.job_title || 'داواکاری کار',
    stage: deriveStage(app),
    appliedAt: app.created_at ? new Date(app.created_at).toLocaleDateString('en-GB') : '',
    sentAgo: daysAgoLabel(app.created_at),
    txId: app.payment_tx_id || '',
  })), [applications]);

  const [statusFilter, setStatusFilter] = useState('all');
  const filteredSentRequests = statusFilter === 'all'
    ? sentRequests
    : sentRequests.filter(r => stageBucket(r.stage) === statusFilter);
  const filterCount = (id) => id === 'all' ? sentRequests.length : sentRequests.filter(r => stageBucket(r.stage) === id).length;

  const receivedOffers = useMemo(() => invitations.map(inv => ({
    id: inv.id,
    company: inv.company_name || 'کۆمپانیا',
    title: inv.job_title || 'ئۆفەری کار',
    salary: inv.salary_offer || '',
    status: inv.status || 'pending',
    offeredAt: inv.created_at ? new Date(inv.created_at).toLocaleDateString('en-GB') : '',
    message: inv.message || '',
  })), [invitations]);

  const [freelancerSubTab, setFreelancerSubTab] = useState('sent'); // 'sent' | 'received'
  const [messageThread, setMessageThread] = useState(null);
  const [withdrawingId, setWithdrawingId] = useState(null);
  const [disputeModalTarget, setDisputeModalTarget] = useState(null);
  const [expandedMilestones, setExpandedMilestones] = useState(null);

  const handleWithdraw = async (appId) => {
    if (!confirm('دڵنیایت لە لابردنەوەی ئەم داواکارییە؟')) return;
    soundService.playTick();
    setWithdrawingId(appId);
    const res = await apiService.withdrawApplication(appId, token);
    if (res?.success) await syncBackendData();
    setWithdrawingId(null);
  };

  const handleAcceptOffer = async (offerId, companyName) => {
    soundService.playSuccess();
    const ok = await respondToInvitation(offerId, 'accepted');
    if (ok) alert(`پیرۆزە! ئۆفەری کۆمپانیای "${companyName}" بە سەرکەوتوویی قبووڵکرا! 🎉`);
  };

  const handleRejectOffer = async (offerId) => {
    soundService.playTick();
    await respondToInvitation(offerId, 'rejected');
  };

  /* ══════════════════════ SHARED HERO ══════════════════════ */

  const displayName = isEmployer ? companyDisplayName : (user?.name || 'بەکارهێنەر');

  const statCards = isEmployer
    ? [
        { value: companyJobs.length, label: 'کاری چالاک', accent: false },
        { value: combinedApplicants.length, label: 'داواکاری نوێ', accent: true },
        { value: combinedApplicants.filter(a => a.status === 'accepted').length, label: 'پەسەندکراو', accent: false },
      ]
    : [
        { value: sentRequests.length, label: 'داواکارییە نێردراوەکان', accent: false },
        { value: receivedOffers.length, label: 'ئۆفەرە وەرگیراوەکان', accent: true },
        { value: sentRequests.filter(r => stageBucket(r.stage) === 'accepted').length, label: 'پەسەندکراو', accent: false },
      ];

  return (
    <div dir="rtl" className="min-h-screen select-none pb-28 text-right" style={{ background: '#f4f7f6', fontFamily: NK }}>
      <main className="max-w-[1400px] mx-auto px-4 sm:px-8 pt-6 sm:pt-8">

        {/* Greeting + CTA (employer only) */}
        <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
          <div className="space-y-0.5">
            <span className="text-xs text-[#7b8e88] font-bold block">بەیانیت باش</span>
            <h1 className="text-2xl sm:text-3xl font-black text-[#111d1a] tracking-tight">{displayName}</h1>
          </div>
          {isEmployer && (
            <button
              onClick={() => { soundService.playTick?.(); onNavigate?.('post_job'); }}
              className="py-2.5 px-4 rounded-2xl bg-[#12796b] hover:bg-[#0d5c50] text-white text-xs font-black shadow-sm active:scale-95 transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>بڵاوکردنەوەی کار</span>
            </button>
          )}
        </div>

        {/* Stat cards — same 3-card shell, different source per role */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
          {statCards.map((s, i) => (
            <div
              key={i}
              className={`rounded-2xl p-4 sm:p-5 border shadow-2xs text-center space-y-1 ${
                s.accent ? 'bg-[#d4f7ee] border-[#beece2]' : 'bg-white border-[#e8eeec]'
              }`}
            >
              <div className={`text-2xl sm:text-3xl font-mono font-black ${s.accent ? 'text-[#12796b]' : 'text-[#111d1a]'}`}>
                {s.value}
              </div>
              <div className={`text-xs ${s.accent ? 'text-[#12796b] font-black' : 'text-[#7b8e88] font-bold'}`}>{s.label}</div>
            </div>
          ))}
        </div>

        {isEmployer ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

            {/* ─── Main: applicants / jobs ─── */}
            <div className="lg:col-span-8 space-y-6 order-1">

              <div className="flex items-center gap-6 text-xs sm:text-sm font-bold border-b border-[#e8eeed]">
                <button
                  onClick={() => { soundService.playTick?.(); setEmployerSubTab('applicants'); }}
                  className={`pb-3 transition flex items-center gap-1.5 ${
                    employerSubTab === 'applicants' ? 'text-[#111d1a] font-black border-b-2 border-[#111d1a]' : 'text-[#7b8e88] hover:text-[#111d1a]'
                  }`}
                >
                  <span>داواکارییەکان</span>
                  <span className="font-mono text-xs">({combinedApplicants.length})</span>
                </button>
                <button
                  onClick={() => { soundService.playTick?.(); setEmployerSubTab('jobs'); }}
                  className={`pb-3 transition ${
                    employerSubTab === 'jobs' ? 'text-[#111d1a] font-black border-b-2 border-[#111d1a]' : 'text-[#7b8e88] hover:text-[#111d1a]'
                  }`}
                >
                  کارەکان ({companyJobs.length})
                </button>
                <button
                  onClick={() => { soundService.playTick?.(); setEmployerSubTab('analytics'); }}
                  className={`pb-3 transition ${
                    employerSubTab === 'analytics' ? 'text-[#111d1a] font-black border-b-2 border-[#111d1a]' : 'text-[#7b8e88] hover:text-[#111d1a]'
                  }`}
                >
                  شیکاری
                </button>
              </div>

              {employerSubTab === 'analytics' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <TrendChart title="بینینی پرۆفایل (14 ڕۆژی ڕابردوو)" icon={Eye} color={TEAL} data={analytics.series.map(s => ({ date: s.date, value: s.views }))} total={analytics.totals.views} />
                  <TrendChart title="داواکاری وەرگیراو (14 ڕۆژی ڕابردوو)" icon={Send} color="#f5a524" data={analytics.series.map(s => ({ date: s.date, value: s.applications }))} total={analytics.totals.applications} />
                </div>
              )}

              {employerSubTab === 'applicants' && (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    {[
                      { id: 'all', label: 'هەموو' },
                      { id: 'web', label: 'پەرەپێدەری وێب' },
                      { id: 'support', label: 'پشتیگری تەکنیکی' },
                    ].map(c => (
                      <button
                        key={c.id}
                        onClick={() => { soundService.playTick?.(); setSelectedCategoryFilter(c.id); }}
                        className={`px-4 py-1.5 rounded-full text-xs font-black transition active:scale-95 ${
                          selectedCategoryFilter === c.id
                            ? 'bg-[#111d1a] text-white shadow-xs'
                            : 'bg-white text-[#5a6b65] border border-[#e8eeed] hover:border-[#12796b]/40'
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-3">
                    {filteredApplicantsList.length === 0 ? (
                      <div className="p-12 rounded-3xl bg-white border border-[#e8eeec] text-center space-y-2">
                        <FileText className="w-10 h-10 text-[#c3d1cd] mx-auto" />
                        <p className="text-xs font-bold text-[#7b8e88]">هیچ داواکارییەک نییە</p>
                      </div>
                    ) : (
                      filteredApplicantsList.map((app) => {
                        const isSelected = selectedApplicantId === app.id;
                        const isAccepted = app.status === 'accepted';
                        const isRejected = app.status === 'rejected';
                        return (
                          <div
                            key={app.id}
                            onClick={() => { soundService.playTick?.(); setSelectedApplicantId(app.id); }}
                            className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer shadow-2xs ${
                              isSelected ? 'bg-[#e8f7f4] border-[#12796b] shadow-xs' : 'bg-white border-[#e8eeec] hover:border-[#12796b]/40'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                              <div className="flex items-center gap-2 order-2 sm:order-1 w-full sm:w-auto justify-end sm:justify-start">
                                {isAccepted ? (
                                  <>
                                    <span className="px-4 py-2 rounded-xl bg-[#d4f7ee] text-[#12796b] text-xs font-black inline-flex items-center gap-1.5">
                                      <Check className="w-3.5 h-3.5" /> پەسەندکراو
                                    </span>
                                    {!ratedIds.has(app.id) && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); soundService.playTick?.(); setRatingOpenId(ratingOpenId === app.id ? null : app.id); }}
                                        className="px-3 py-2 rounded-xl bg-white border border-[#e8eeed] text-[#4a5854] hover:bg-[#f8faf9] text-xs font-bold shadow-2xs active:scale-95 transition flex items-center gap-1"
                                      >
                                        <Star className="w-3.5 h-3.5" style={{ color: '#f5a524' }} /> هەڵسەنگاندن
                                      </button>
                                    )}
                                  </>
                                ) : isRejected ? (
                                  <span className="px-4 py-2 rounded-xl bg-rose-50 text-rose-600 text-xs font-black inline-flex items-center gap-1.5">
                                    <X className="w-3.5 h-3.5" /> ڕەتکراوە
                                  </span>
                                ) : (
                                  <>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleApproveApplicant(app.id); }}
                                      className="px-4 py-2 rounded-xl bg-[#111d1a] hover:bg-black text-white text-xs font-black shadow-xs active:scale-95 transition flex items-center gap-1.5"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                      <span>پەسەندکردن</span>
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleRejectApplicant(app.id); }}
                                      className="w-9 h-9 rounded-xl bg-white border border-[#e8eeed] text-[#7b8e88] hover:text-rose-600 hover:border-rose-200 flex items-center justify-center transition active:scale-95"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleOpenCv(app); }}
                                  className="px-4 py-2 rounded-xl bg-white border border-[#e8eeed] text-[#4a5854] hover:bg-[#f8faf9] text-xs font-bold shadow-2xs active:scale-95 transition"
                                >
                                  بینینی CV
                                </button>
                              </div>

                              <div className="flex items-center gap-3.5 order-1 sm:order-2">
                                <div className="text-right">
                                  <div className="flex items-center gap-2 flex-wrap justify-end">
                                    {app.isVIP && (
                                      <span className="px-2 py-0.5 rounded-full bg-[#12796b] text-white text-[10px] font-black inline-flex items-center gap-0.5">
                                        <Crown className="w-3 h-3 text-amber-300" /> VIP
                                      </span>
                                    )}
                                    <span className="text-xs text-[#7b8e88] font-bold">{app.job_title}</span>
                                    <h3 className="text-sm sm:text-base font-black text-[#111d1a]">{app.freelancer_name}</h3>
                                  </div>
                                  <div className="text-[11px] text-[#7b8e88] font-medium mt-1">
                                    {app.experience_text} · {app.location_text} · {app.cv_mode_text}
                                  </div>
                                </div>
                                <div className="w-11 h-11 rounded-2xl bg-[#d4f7ee] border border-[#beece2] text-[#12796b] flex items-center justify-center font-black text-sm shrink-0 shadow-2xs">
                                  {app.initial}
                                </div>
                              </div>
                            </div>
                            {ratingOpenId === app.id && (
                              <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                                <StarRatingInput
                                  label={`هەڵسەنگاندنی ${app.freelancer_name}`}
                                  submitting={ratingBusy}
                                  onSubmit={(rating, comment) => handleSubmitRating(app.id, rating, comment)}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}

              {employerSubTab === 'jobs' && (
                <div className="space-y-3">
                  {companyJobs.length === 0 ? (
                    <div className="p-12 rounded-3xl bg-white border border-[#e8eeec] text-center space-y-2">
                      <FileText className="w-10 h-10 text-[#c3d1cd] mx-auto" />
                      <p className="text-xs font-bold text-[#7b8e88]">هێشتا هیچ کارێکت بڵاونەکردووەتەوە</p>
                    </div>
                  ) : (
                    companyJobs.map(job => (
                      <div
                        key={job.id}
                        onClick={() => { soundService.playTick?.(); setViewingJob(job); }}
                        className="p-4 rounded-2xl bg-white border border-[#e8eeec] hover:border-[#12796b]/40 shadow-2xs flex items-center justify-between gap-3 cursor-pointer transition"
                      >
                        <button
                          onClick={(e) => { e.stopPropagation(); soundService.playTick?.(); setEditingJob(job); }}
                          className="w-9 h-9 rounded-xl bg-[#f4f7f6] border border-[#e8eeed] text-[#5a6b65] hover:text-[#12796b] flex items-center justify-center shrink-0 transition"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <div className="text-right flex-1 min-w-0">
                          <div className="text-xs font-black text-[#111d1a] truncate">{job.title_ku || job.title}</div>
                          <span
                            className="text-[10px] font-bold"
                            style={{ color: job.status === 'pending' ? '#c98a1f' : job.status === 'rejected' ? '#dc2626' : '#12796b' }}
                          >
                            {job.status === 'pending' ? 'چاوەڕوانی پەسەندکردنی ئەدمین' : job.status === 'rejected' ? 'ڕەتکراوە' : 'چالاکە'}
                          </span>
                        </div>
                      </div>
                    ))
                  )}

                  {companyJobs.length > 0 && (
                    <button
                      onClick={() => { soundService.playTick?.(); setShowBrandingModal(true); }}
                      className="w-full py-3 rounded-2xl bg-white hover:bg-[#f8faf9] border border-[#e8eeed] text-[#111d1a] text-xs font-black shadow-2xs active:scale-95 transition flex items-center justify-center gap-2"
                    >
                      <Palette className="w-4 h-4 text-[#12796b]" />
                      <span>نوێکردنەوەی براندی هەموو کارەکان</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* ─── Sidebar: stage timeline for the selected applicant ─── */}
            <div className="lg:col-span-4 space-y-6 order-2">
              <div className="bg-white rounded-3xl p-6 border border-[#e8eeec] shadow-2xs space-y-5">
                <h3 className="text-sm font-black text-[#111d1a] border-b border-[#f4f7f6] pb-3">قۆناغەکان</h3>

                {selectedApplicant ? (
                  <>
                    <div className="text-right space-y-0.5">
                      <h4 className="text-sm font-black text-[#111d1a]">{selectedApplicant.freelancer_name}</h4>
                      <p className="text-[11px] text-[#7b8e88] font-bold">{selectedApplicant.job_title}</p>
                    </div>

                    <div className="space-y-4 pt-1">
                      {[
                        { n: 1, label: 'داواکاری وەرگیرا' },
                        { n: 2, label: 'چاوپێکەوتنی یەکەم' },
                        { n: 3, label: 'تاقیکردنەوەی تەکنیکی' },
                        { n: 4, label: 'پێشکەشکردنی پێشنیار' },
                      ].map(({ n, label }) => (
                        <div key={n} className="flex items-center justify-between text-xs">
                          <span className="font-mono text-[11px] text-[#7b8e88]">{selectedApplicant.stageDates[n] || ''}</span>
                          <div className="flex items-center gap-2.5">
                            <span className="font-bold text-[#111d1a]">{label}</span>
                            {selectedApplicant.currentStage >= n ? (
                              <div className="w-5 h-5 rounded-full bg-[#12796b] text-white flex items-center justify-center shadow-xs">
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </div>
                            ) : (
                              <div className="w-5 h-5 rounded-full border-2 border-stone-300" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={handleAdvanceStage}
                      className="w-full py-3 rounded-2xl bg-white hover:bg-[#f8faf9] border border-[#e8eeed] text-[#111d1a] text-xs font-black shadow-2xs active:scale-95 transition"
                    >
                      قۆناغی داهاتوو تەواوبکە
                    </button>
                  </>
                ) : (
                  <p className="text-xs text-[#7b8e88] font-bold text-center py-6">هیچ داواکارییەک نییە</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-5">

            <div className="flex items-center gap-1 bg-stone-100 rounded-full p-1 max-w-md">
              <button
                onClick={() => { soundService.playTick(); setFreelancerSubTab('sent'); }}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-full text-xs font-black whitespace-nowrap transition-all ${
                  freelancerSubTab === 'sent' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'
                }`}
              >
                <Send className="w-3.5 h-3.5" style={freelancerSubTab === 'sent' ? { color: TEAL } : {}} />
                <span>داواکارییە نێردراوەکان ({sentRequests.length})</span>
              </button>
              <button
                onClick={() => { soundService.playTick(); setFreelancerSubTab('received'); }}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-full text-xs font-black whitespace-nowrap transition-all ${
                  freelancerSubTab === 'received' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'
                }`}
              >
                <Inbox className="w-3.5 h-3.5" style={freelancerSubTab === 'received' ? { color: TEAL } : {}} />
                <span>ئۆفەرە وەرگیراوەکان ({receivedOffers.length})</span>
              </button>
            </div>

            {freelancerSubTab === 'sent' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  {STATUS_FILTERS.map((f) => {
                    const on = statusFilter === f.id;
                    const isAll = f.id === 'all';
                    return (
                      <button
                        key={f.id}
                        onClick={() => { soundService.playTick(); setStatusFilter(f.id); }}
                        className={`px-4 py-2 rounded-full text-xs font-black whitespace-nowrap transition-all active:scale-95 ${
                          on ? (isAll ? 'bg-stone-900 text-white shadow-sm' : 'text-white shadow-sm') : 'bg-white text-stone-500 shadow-[0_2px_16px_rgba(0,0,0,0.05)]'
                        }`}
                        style={on && !isAll ? { background: TEAL } : {}}
                      >
                        {f.label} ({filterCount(f.id)})
                      </button>
                    );
                  })}
                </div>

                {filteredSentRequests.length === 0 ? (
                  <div className="p-12 rounded-2xl bg-white border border-[#e8eeec] text-center space-y-2">
                    <FileText className="w-10 h-10 text-[#c3d1cd] mx-auto" />
                    <h4 className="text-sm font-bold text-[#111d1a]">
                      {sentRequests.length === 0 ? 'هیچ داواکارییەکت نەناردووە' : 'هیچ داواکارییەک بەم فلتەرە نییە'}
                    </h4>
                    <p className="text-xs text-[#7b8e88]">سەردانی بەشی (گەڕان) یان (نەخشە) بکە بۆ ناردنی سیڤی بۆ کۆمپانیاکان.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredSentRequests.map((req) => {
                      const bucket = stageBucket(req.stage);
                      const step = stageStep(req.stage);
                      const pct = Math.round((step / 3) * 100);
                      const dispute = disputeFor(req.id);
                      const cardStyle =
                        bucket === 'accepted' ? { background: TEAL_SOFT, border: `1px solid ${TEAL}55` } :
                        bucket === 'rejected' ? { background: '#fdf2f2', border: '1px solid #f2c6c6' } :
                        {};
                      const pillStyle =
                        bucket === 'accepted' ? { background: '#fff', color: TEAL_DEEP } :
                        bucket === 'rejected' ? { background: '#fff', color: '#b91c1c' } :
                        { background: TEAL_SOFT, color: TEAL_DEEP };

                      return (
                        <div
                          key={req.id}
                          className={`rounded-2xl p-4 sm:p-5 space-y-4 text-right transition-all shadow-2xs ${bucket === 'pending' ? 'bg-white border border-[#e8eeec]' : ''}`}
                          style={cardStyle}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h4 className="text-sm sm:text-base font-black text-[#111d1a] truncate">{req.title}</h4>
                              <p className="text-xs font-bold text-[#7b8e88] mt-0.5 truncate">{req.company}</p>
                            </div>
                            <span className="shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-black whitespace-nowrap" style={pillStyle}>
                              {STAGE_LABELS[req.stage]}
                            </span>
                          </div>

                          <div className="h-px" style={{ background: bucket === 'accepted' ? `${TEAL}22` : bucket === 'rejected' ? '#f2c6c644' : '#f1f4f3' }} />

                          {bucket === 'accepted' && (
                            <>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-bold text-[#7b8e88] font-mono">{step}/3 · {pct}%</span>
                                  <span className="text-[11px] font-black" style={{ color: TEAL_DEEP }}>قۆناغەکان</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  {Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="h-1.5 flex-1 rounded-full transition-all duration-500" style={{ background: i < step ? TEAL : '#ffffff' }} />
                                  ))}
                                </div>
                              </div>
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-3">
                                  <button
                                    onClick={() => { soundService.playTick(); setExpandedMilestones(expandedMilestones === req.id ? null : req.id); }}
                                    className="text-xs font-black flex items-center gap-1.5"
                                    style={{ color: TEAL }}
                                  >
                                    <Layers className="w-3.5 h-3.5" />
                                    <span>وردەکاری</span>
                                  </button>
                                  {!ratedIds.has(req.id) && (
                                    <button
                                      onClick={() => { soundService.playTick(); setRatingOpenId(ratingOpenId === req.id ? null : req.id); }}
                                      className="text-xs font-black flex items-center gap-1.5"
                                      style={{ color: '#c98a1f' }}
                                    >
                                      <Star className="w-3.5 h-3.5" style={{ color: '#f5a524' }} />
                                      <span>هەڵسەنگاندن</span>
                                    </button>
                                  )}
                                </div>
                                <span className="text-[11px] font-bold text-[#7b8e88]">هەموو قۆناغەکانی داواکاری تەواو بوون</span>
                              </div>
                              {expandedMilestones === req.id && (
                                <MilestonesPanel applicationId={req.id} role={isEmployer ? 'employer' : 'freelancer'} />
                              )}
                              {ratingOpenId === req.id && (
                                <StarRatingInput
                                  label={`هەڵسەنگاندنی ${req.company}`}
                                  submitting={ratingBusy}
                                  onSubmit={(rating, comment) => handleSubmitRating(req.id, rating, comment)}
                                />
                              )}
                            </>
                          )}

                          {bucket === 'pending' && (
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              {req.txId && <span className="text-[11px] font-mono font-bold text-[#7b8e88]">مامەڵە: {req.txId}</span>}
                              <span className="text-[11px] font-bold text-[#7b8e88]">{req.sentAgo}</span>
                            </div>
                          )}

                          {bucket === 'rejected' && (
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              {req.stage === 'payment_rejected' ? (
                                <button
                                  onClick={() => { soundService.playTick(); setDisputeModalTarget({ targetId: req.id, title: req.title }); }}
                                  className="text-xs font-black flex items-center gap-1.5 text-rose-700"
                                >
                                  <Undo2 className="w-3.5 h-3.5" />
                                  <span>{dispute ? 'بینینی گفتوگۆ' : 'گفتوگۆ'}</span>
                                </button>
                              ) : <span />}
                              <span className="text-[11px] font-bold text-[#7b8e88]">
                                {dispute ? `دۆسیەی #${String(dispute.id).slice(-6)}` : req.sentAgo}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                            {req.appliedAt && <span className="text-[10px] text-[#7b8e88] font-mono">نێردراوە لە: {req.appliedAt}</span>}
                            <div className="flex items-center gap-2">
                              {req.stage === 'payment_review' && (
                                <button
                                  onClick={() => handleWithdraw(req.id)}
                                  disabled={withdrawingId === req.id}
                                  className="px-3.5 py-2 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-black transition-all flex items-center gap-1.5 disabled:opacity-50"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>لابردنەوە</span>
                                </button>
                              )}
                              {req.stage !== 'payment_review' && req.stage !== 'payment_rejected' && (
                                <button
                                  onClick={() => { soundService.playTick(); setMessageThread({ id: req.id, title: req.title, counterpart: req.company }); }}
                                  className="px-3.5 py-2 rounded-2xl bg-white hover:bg-[#12796b] hover:text-white text-stone-600 text-xs font-black transition-all flex items-center gap-1.5 shadow-2xs"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                  <span>پەیام بۆ {req.company}</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {freelancerSubTab === 'received' && (
              <div className="space-y-3">
                {receivedOffers.length === 0 ? (
                  <div className="p-12 rounded-2xl bg-white border border-[#e8eeec] text-center space-y-2">
                    <Inbox className="w-10 h-10 text-[#c3d1cd] mx-auto" />
                    <h4 className="text-sm font-bold text-[#111d1a]">هیچ ئۆفەرێکی نوێت نییە</h4>
                    <p className="text-xs text-[#7b8e88]">کاتێک کۆمپانیاکان بەپێی سیڤیەکەت داوات دەکەن، ئۆفەرەکان لێرە دەردەکەون.</p>
                  </div>
                ) : (
                  receivedOffers.map((offer) => (
                    <div key={offer.id} className="bg-white rounded-2xl p-4 sm:p-5 border border-[#e8eeec] shadow-2xs space-y-4 text-right">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="text-sm sm:text-base font-black text-[#111d1a] truncate">{offer.title}</h4>
                          <p className="text-xs font-bold text-[#7b8e88] mt-0.5 truncate">ئۆفەری کار لە: {offer.company}</p>
                        </div>
                        {offer.salary && (
                          <span className="shrink-0 px-3 py-1.5 rounded-xl font-mono text-xs font-black text-white" style={{ background: TEAL }}>
                            {offer.salary}
                          </span>
                        )}
                      </div>

                      {offer.message && (
                        <div className="p-4 rounded-2xl bg-[#f4f7f6] text-xs text-[#4a5854] space-y-1">
                          <span className="font-extrabold text-[#111d1a] block">پەیامی کۆمپانیا:</span>
                          <p className="leading-relaxed font-medium">{offer.message}</p>
                        </div>
                      )}

                      <div className="h-px bg-[#f1f4f3]" />

                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                        <span className="text-[11px] text-[#7b8e88] font-mono">نێردراوە لە: {offer.offeredAt}</span>
                        {offer.status === 'pending' ? (
                          <div className="flex items-center gap-2.5 w-full sm:w-auto">
                            <button
                              onClick={() => handleRejectOffer(offer.id)}
                              className="flex-1 sm:flex-initial py-3 px-5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-black transition flex items-center justify-center gap-1.5"
                            >
                              <XCircle className="w-4 h-4" />
                              <span>ڕەتکردنەوەی ئۆفەر</span>
                            </button>
                            <button
                              onClick={() => handleAcceptOffer(offer.id, offer.company)}
                              className="flex-1 sm:flex-initial py-3 px-6 rounded-2xl text-white text-xs font-black transition flex items-center justify-center gap-2 active:scale-95"
                              style={{ background: TEAL, boxShadow: `0 10px 24px ${TEAL}4d` }}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>قبووڵکردنی ئۆفەر</span>
                            </button>
                          </div>
                        ) : offer.status === 'accepted' ? (
                          <div className="px-4 py-2 rounded-2xl text-xs font-black flex items-center gap-2" style={{ background: TEAL_SOFT, color: TEAL_DEEP }}>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>ئەم ئۆفەرەت بە سەرکەوتوویی قبووڵ کرد!</span>
                          </div>
                        ) : (
                          <div className="px-4 py-2 rounded-2xl bg-rose-50 text-rose-700 text-xs font-black flex items-center gap-2">
                            <XCircle className="w-4 h-4" />
                            <span>ئەم ئۆفەرە ڕەتکرایەوە.</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ══════════════════════ MODALS ══════════════════════ */}

      {isEmployer && editingJob && (
        <EditJobModal job={editingJob} isOpen={!!editingJob} onClose={() => setEditingJob(null)} />
      )}

      {isEmployer && viewingJob && (
        <JobDetailViewModal
          job={viewingJob}
          isOpen={!!viewingJob}
          onClose={() => setViewingJob(null)}
          onEdit={(job) => { setViewingJob(null); setEditingJob(job); }}
          onDelete={(job) => { setViewingJob(null); setJobToDelete(job); }}
        />
      )}

      {isEmployer && jobToDelete && (
        <ConfirmationModal
          title="سڕینەوەی هەلی کار"
          message={`ئایا دڵنیایت دەتەوێت "${jobToDelete.title_ku || jobToDelete.title}" بسڕیتەوە؟`}
          onConfirm={async () => { await deleteJob(jobToDelete.id); setJobToDelete(null); }}
          onClose={() => setJobToDelete(null)}
        />
      )}

      {isEmployer && viewingFreelancer && (
        <FreelancerProfileModal freelancer={viewingFreelancer} isOpen={!!viewingFreelancer} onClose={() => setViewingFreelancer(null)} />
      )}

      {isEmployer && showBrandingModal && (
        <CompanyBrandingModal isOpen={showBrandingModal} onClose={() => setShowBrandingModal(false)} jobs={companyJobs} />
      )}

      {!isEmployer && messageThread && (
        <MessageThreadModal
          applicationId={messageThread.id}
          title={messageThread.title}
          counterpart={messageThread.counterpart}
          onClose={() => setMessageThread(null)}
        />
      )}

      {!isEmployer && disputeModalTarget && (
        <DisputeModal
          isOpen={!!disputeModalTarget}
          onClose={() => setDisputeModalTarget(null)}
          targetType="application"
          targetId={disputeModalTarget.targetId}
          title={disputeModalTarget.title}
          existingDispute={disputeFor(disputeModalTarget.targetId)}
          onChanged={(d) => setDisputes((prev) => (prev.some((x) => x.id === d.id) ? prev.map((x) => (x.id === d.id ? d : x)) : [...prev, d]))}
        />
      )}
    </div>
  );
};
