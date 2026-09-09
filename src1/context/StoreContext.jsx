import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { kurdistanGovernorates } from '../data/kurdistanLocations';
import { soundService } from '../services/soundService';
import { apiService } from '../services/api';
import { socketService } from '../services/socketService';
import { realtimeService } from '../services/realtimeService';
import { useAuth } from './AuthContext';

const StoreContext = createContext();

const parseJsonArray = (val) => {
  if (Array.isArray(val)) return val;
  try { const p = JSON.parse(val || '[]'); return Array.isArray(p) ? p : []; } catch { return []; }
};

export const StoreProvider = ({ children }) => {
  const { user, token, updateUserProfile } = useAuth();

  // 100% Pure REST API & WebSocket Real-time State
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [freelancers, setFreelancers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [regions] = useState(kurdistanGovernorates);
  const [savedJobIds, setSavedJobIds] = useState([]);
  const [categories, setCategories] = useState([]);
  const [settings, setSettings] = useState({});
  const [planTiers, setPlanTiers] = useState([]);
  // True only until the very first fetch resolves — drives real skeleton
  // loaders instead of a blank flash or a fake fixed-duration shimmer.
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  // Persisted (not just in-memory) so the badge doesn't reappear after the next
  // background resync — the server has no per-notification read-state at all.
  const [lastSeenNotifAt, setLastSeenNotifAt] = useState(() => {
    try { return localStorage.getItem('ishkhwaz_last_seen_notif') || null; } catch { return null; }
  });

  // Hydrate saved jobs from the user's own persisted record on login
  useEffect(() => {
    setSavedJobIds(parseJsonArray(user?.saved_jobs));
  }, [user?.id]);

  const addToast = ({ title, message, type = 'info' }) => {
    const id = 'toast_' + Date.now();
    setToasts(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const toggleSaveJob = (jobId) => {
    setSavedJobIds(prev => {
      const next = prev.includes(jobId) ? prev.filter(id => id !== jobId) : [...prev, jobId];
      if (user && updateUserProfile) updateUserProfile({ saved_jobs: next });
      return next;
    });
  };

  // Initial Fetch & Real-time WebSocket Event Subscription
  //
  // All seven endpoints fire at once instead of one after another — this
  // used to await each call in turn (jobs, then applications, then
  // notifications, then freelancers, then categories, then settings, then
  // plan tiers), so total wait time was the SUM of every request's latency.
  // On shared hosting with no per-request caching, that's what actually made
  // data "arrive late": ~7 sequential round trips stacked up serially every
  // time this ran (every app load, and again on every realtime resync).
  // Running them together drops total wait to whichever single request is
  // slowest. Each apiService.* call already catches its own errors and
  // resolves to a safe fallback ([]/null/{}) rather than rejecting, so one
  // slow/failing endpoint can never block or fail the others via Promise.all.
  const syncBackendData = async () => {
    try {
      const [liveJobs, liveApps, liveNotifs, liveFreelancers, liveCompanies, liveCategories, liveSettings, liveTiers] = await Promise.all([
        apiService.getJobs({}, token),
        // /applications requires auth server-side — skip entirely when
        // logged out instead of firing a request that's guaranteed to 401.
        token ? apiService.getApplications(token) : Promise.resolve(null),
        apiService.getNotifications(token),
        apiService.getFreelancers(),
        apiService.getCompanies(),
        apiService.getCategories(),
        apiService.getSettings(),
        apiService.getPlanTiers(),
      ]);

      if (Array.isArray(liveJobs)) setJobs(liveJobs);
      if (Array.isArray(liveApps)) setApplications(liveApps);
      if (Array.isArray(liveNotifs)) setNotifications(liveNotifs);
      if (Array.isArray(liveFreelancers)) setFreelancers(liveFreelancers);
      if (Array.isArray(liveCompanies)) setCompanies(liveCompanies);
      if (Array.isArray(liveCategories) && liveCategories.length > 0) setCategories(liveCategories);
      if (liveSettings && Object.keys(liveSettings).length > 0) setSettings(liveSettings);
      if (Array.isArray(liveTiers)) setPlanTiers(liveTiers);
    } catch (e) {
      console.warn('Sync error', e);
    } finally {
      setIsInitialLoading(false);
    }
  };

  useEffect(() => {
    // 1. Perform initial data fetch
    syncBackendData();

    // 2. Connect WebSocket Engine for Instant Real-Time Push Events
    socketService.connect();

    // 3. Listen to Real-Time Socket Events
    socketService.on('job_created', (newJob) => {
      setJobs(prev => [newJob, ...prev]);
      soundService.playPop();
    });

    socketService.on('job_updated', (updatedJob) => {
      setJobs(prev => prev.map(j => String(j.id) === String(updatedJob.id) ? updatedJob : j));
    });

    socketService.on('job_deleted', (jobId) => {
      setJobs(prev => prev.filter(j => String(j.id) !== String(jobId)));
    });

    socketService.on('application_submitted', (newApp) => {
      setApplications(prev => [newApp, ...prev]);
      soundService.playSuccess();
    });

    socketService.on('freelancer_updated', (updatedFreelancer) => {
      setFreelancers(prev => prev.map(f => String(f.id) === String(updatedFreelancer.id) ? updatedFreelancer : f));
    });

    socketService.on('notification_received', (newNotif) => {
      setNotifications(prev => [newNotif, ...prev]);
      addToast({ title: newNotif.title || 'ئاگاداری تازە', message: newNotif.message || '', type: 'info' });
    });

    // Real real-time, via Pusher (socketService above is the deliberate
    // no-op — this host has no persistent WebSocket server). A notification
    // covers almost every kind of change (status decisions, invitations,
    // plan approvals, new applications, ...) since notifyUser() on the
    // backend fires for all of them — so one resync call here keeps
    // everything (applications, invitations, jobs) accurate instantly
    // instead of waiting up to 30s for the next poll.
    const offNotification = realtimeService.on('notification', (newNotif) => {
      setNotifications(prev => [newNotif, ...prev]);
      addToast({ title: newNotif.title || 'ئاگاداری تازە', message: newNotif.body || '', type: 'info' });
      syncBackendData();
    });
    const offNewApplication = realtimeService.on('new-application', () => {
      syncBackendData();
    });

    // Every logged-in session (not just admins — this listener is harmless
    // and simply never fires for anyone not subscribed to the admin channel)
    // picks up plan/job changes an admin makes live — e.g. a price change on
    // /plans, or a listing an admin took down, without waiting for the next
    // poll or a manual refresh.
    const offAdminUpdate = realtimeService.on('admin-update', (data) => {
      const type = data?.type || '';
      if (type.startsWith('plan_') || type === 'job_deleted') syncBackendData();
    });

    return () => {
      socketService.off('job_created');
      socketService.off('job_updated');
      socketService.off('job_deleted');
      socketService.off('application_submitted');
      socketService.off('freelancer_updated');
      socketService.off('notification_received');
      offNotification();
      offNewApplication();
      offAdminUpdate();
    };
  }, []);

  // Re-sync (to pick up applications) whenever login state actually changes
  useEffect(() => {
    if (token) { syncBackendData(); fetchInvitations(); }
  }, [token]);

  // socketService.connect() above is a deliberate no-op — this host has no
  // real WebSocket server, so "real-time" here means periodic polling
  // instead. Without this, a new job/freelancer/etc. posted by anyone else
  // would never show up in an already-open session until it was fully
  // closed and reopened. Only runs while the tab is actually visible, so it
  // doesn't keep hitting the API in a background tab.
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') syncBackendData();
    }, 30000);
    // Also refresh the instant the app is reopened/foregrounded (switching
    // back from another app, or back to this browser tab) instead of
    // waiting for the next 30s tick.
    const onVisible = () => { if (document.visibilityState === 'visible') syncBackendData(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitCVApplication = async (appData) => {
    const res = await apiService.submitApplication(appData, token);
    if (res && res.success) {
      addToast({ title: 'سەرکەوتوو بوو ✓', message: 'CVـەکەت گەیشتە کۆمپانیاکە', type: 'success' });
      syncBackendData();
      return true;
    }
    addToast({ title: 'نەنێردرا', message: res?.message || 'ناردنی سیڤی سەرکەوتوو نەبوو', type: 'warning' });
    return false;
  };

  // Invitations — a company proactively sending a CV/job offer to a freelancer
  const [invitations, setInvitations] = useState([]);

  const fetchInvitations = async () => {
    if (!token) return;
    const list = await apiService.getInvitations(token);
    if (Array.isArray(list)) setInvitations(list);
  };

  const sendInvitation = async (invitationData) => {
    const res = await apiService.sendInvitation(invitationData, token);
    if (res?.success) {
      addToast({ title: 'ئۆفەر نێردرا ✓', message: 'ئۆفەرەکەت بۆ فریلانسەرەکە نێردرا', type: 'success' });
      return true;
    }
    addToast({ title: 'نەنێردرا', message: res?.message || 'ناردنی ئۆفەر سەرکەوتوو نەبوو', type: 'warning' });
    return false;
  };

  const respondToInvitation = async (invitationId, status) => {
    const res = await apiService.respondToInvitation(invitationId, status, token);
    if (res?.success) {
      setInvitations(prev => prev.map(i => i.id === invitationId ? { ...i, status } : i));
      return true;
    }
    return false;
  };

  const verifyPayment = async (applicationId, status = 'approved') => {
    const isApproved = status === 'approved';
    const res = await apiService.verifyApplicationPayment(applicationId, isApproved, token);
    if (res && res.success) {
      addToast({ title: 'تۆمارکرا', message: 'بارودۆخی پارەدان نوێکرایەوە', type: 'success' });
      syncBackendData();
      return true;
    }
    addToast({ title: 'سەرنەکەوت', message: res?.message || 'نوێکردنەوەی بارودۆخ سەرکەوتوو نەبوو', type: 'warning' });
    return false;
  };

  const rateApplication = async (applicationId, rating, comment) => {
    const res = await apiService.submitRating(applicationId, rating, comment, token);
    if (res?.success) {
      addToast({ title: 'هەڵسەنگاندن نێردرا ✓', message: 'سوپاس بۆ هەڵسەنگاندنەکەت.', type: 'success' });
      return true;
    }
    addToast({ title: 'سەرنەکەوت', message: res?.message || 'ناردنی هەڵسەنگاندن سەرکەوتوو نەبوو', type: 'warning' });
    return false;
  };

  const updateCompanyApplicantStatus = async (applicationId, companyStatus) => {
    const res = await apiService.updateCompanyApplicantStatus(applicationId, companyStatus, token);
    if (res && res.success) {
      syncBackendData();
      return true;
    }
    addToast({ title: 'سەرنەکەوت', message: res?.message || 'نوێکردنەوەی بارودۆخ سەرکەوتوو نەبوو', type: 'warning' });
    return false;
  };

  const createJob = async (jobData) => {
    const res = await apiService.createJob(jobData, token);
    if (res && (res.success || res.job || res.id)) {
      addToast({ title: 'کاری نوێ بڵاوکرایەوە', message: 'هەلی کارەکە تۆمارکرا لە داتابەیس', type: 'success' });
      syncBackendData();
      return true;
    }
    addToast({ title: 'سەرنەکەوت', message: res?.message || 'بڵاوکردنەوەی کارەکە سەرکەوتوو نەبوو', type: 'warning' });
    return false;
  };

  const updateJob = async (jobId, jobData) => {
    const res = await apiService.updateJob(jobId, jobData, token);
    if (res && (res.success || res.job)) {
      addToast({ title: 'دەستکاریکرا', message: 'زانیاری هەلی کار دەستکاریکرا', type: 'success' });
      syncBackendData();
      return true;
    }
    addToast({ title: 'سەرنەکەوت', message: res?.message || 'دەستکاریکردنی کارەکە سەرکەوتوو نەبوو', type: 'warning' });
    return false;
  };

  const toggleJobStatus = async (jobId) => {
    const res = await apiService.toggleJobStatus(jobId, token);
    if (res && res.success) {
      addToast({
        title: res.status === 'active' ? 'چالاککرایەوە' : 'ناچالاککرا',
        message: res.status === 'active' ? 'هەلی کارەکە دیسان بۆ گشتی دیارە' : 'هەلی کارەکە شاردرایەوە لە لیستی گشتی',
        type: res.status === 'active' ? 'success' : 'info',
      });
      syncBackendData();
      return true;
    }
    addToast({ title: 'سەرنەکەوت', message: res?.message || 'گۆڕینی دۆخی کارەکە سەرکەوتوو نەبوو', type: 'warning' });
    return false;
  };

  const deleteJob = async (jobId) => {
    const res = await apiService.deleteJob(jobId, token);
    if (res && res.success) {
      addToast({ title: 'سڕایەوە', message: 'هەلی کارەکە سڕایەوە لە داتابەیس', type: 'info' });
      syncBackendData();
      return true;
    }
    addToast({ title: 'سەرنەکەوت', message: res?.message || 'سڕینەوەی کارەکە سەرکەوتوو نەبوو', type: 'warning' });
    return false;
  };

  // Mark all notifications as seen — persisted, so it survives background resyncs
  // instead of a purely in-memory flag the server keeps re-clearing.
  const markAllRead = () => {
    const now = new Date().toISOString();
    setLastSeenNotifAt(now);
    try { localStorage.setItem('ishkhwaz_last_seen_notif', now); } catch {}
  };

  const unreadNotifCount = lastSeenNotifAt
    ? notifications.filter(n => n?.created_at && n.created_at > lastSeenNotifAt).length
    : notifications.length;

  return (
    <StoreContext.Provider value={{
      jobs,
      setJobs,
      applications,
      freelancers,
      companies,
      savedJobIds,
      categories,
      settings,
      planTiers,
      isInitialLoading,
      notifications,
      unreadNotifCount,
      lastSeenNotifAt,
      toasts,
      regions,
      toggleSaveJob,
      addToast,
      removeToast,
      submitCVApplication,
      verifyPayment,
      updateCompanyApplicantStatus,
      rateApplication,
      createJob,
      updateJob,
      deleteJob,
      toggleJobStatus,
      syncBackendData,
      markAllRead,
      invitations,
      fetchInvitations,
      sendInvitation,
      respondToInvitation,
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => useContext(StoreContext);
