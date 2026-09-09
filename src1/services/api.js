import { socketService } from './socketService';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://ishkhwaz.zeraworld.com/api/v1';

// Admin endpoints are gated server-side by the caller's own signed session token —
// the backend checks that the logged-in user's role is admin/owner. No separate secret.
const adminHeaders = (token = '') => ({
  'Content-Type': 'application/json',
  ...(token ? { 'Authorization': `Bearer ${token}` } : {})
});

// A handful of GET calls fire together in one Promise.all burst on every
// app load (see StoreContext.syncBackendData) — on the shared MySQL host
// this occasionally exceeds its connection ceiling and one or two of them
// come back "Database unavailable" even though the data is fine moments
// later. One retry after a short delay absorbs that without ever blocking
// the UI further than the existing safe-fallback behavior already does.
const fetchJsonRetry = async (url, options, retries = 1) => {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return await res.json();
      if (attempt >= retries) throw new Error(`Request failed: ${res.status}`);
    } catch (e) {
      if (attempt >= retries) throw e;
    }
    await new Promise(r => setTimeout(r, 400 * (attempt + 1)));
  }
};

export const checkBackendHealth = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, { method: 'GET' });
    if (response.ok) {
      const data = await response.json();
      return { isOnline: true, data };
    }
    return { isOnline: false };
  } catch (error) {
    return { isOnline: false };
  }
};

export const apiService = {
  // Real-time Authentication & Sanctum
  async login(phoneOrEmail, password) {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_or_email: phoneOrEmail, password })
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.message || 'ژمارەی تەلەفۆن یان وشەی نهێنی هەڵەیە.' };
      return data;
    } catch (e) {
      return null;
    }
  },

  async register(userData) {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.message || 'تۆمارکردن لە داتابەیس ڕوویدا نەبوو.' };
      return data;
    } catch (e) {
      return null;
    }
  },

  async forgotPassword(phoneOrEmail) {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneOrEmail }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.message };
      return data;
    } catch (e) {
      return { success: false, message: 'ناتوانرێت پەیوەندی بکرێت.' };
    }
  },

  async resetPassword(resetToken, password) {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, password }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.message };
      return data;
    } catch (e) {
      return { success: false, message: 'ناتوانرێت پەیوەندی بکرێت.' };
    }
  },

  async verifyEmail(token) {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/verify-email?token=${encodeURIComponent(token)}`);
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.message || 'دڵنیاکردنەوە سەرکەوتوو نەبوو.' };
      return data;
    } catch (e) {
      return { success: false, message: 'ناتوانرێت پەیوەندی بکرێت.' };
    }
  },

  async resendVerificationEmail(token) {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.message };
      return data;
    } catch (e) {
      return { success: false, message: 'ناتوانرێت پەیوەندی بکرێت.' };
    }
  },

  // Google / Facebook / Apple — accessToken is the Supabase session token
  // from supabaseClient's OAuth flow. The backend verifies it itself against
  // Supabase's own signing keys before trusting anything in it.
  async socialLogin(accessToken) {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/social`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: accessToken })
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.message || 'چوونە ژوورەوە سەرکەوتوو نەبوو.' };
      return data;
    } catch (e) {
      return null;
    }
  },

  async me(token) {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch user profile');
      return await res.json();
    } catch (e) {
      return null;
    }
  },

  // Only ever sends fields the caller actually named — every field the
  // backend accepts here already falls back to the existing DB value when
  // omitted (see POST /auth/me), so there's no need to resend everything on
  // every save. This matters a lot for images: `updateUserProfile({ cover })`
  // used to go out as a FULL profile payload (via AuthContext's optimistic
  // merge), silently dragging along whatever avatar/cover/company_logo/
  // company_cover the account already had — four ~500KB-800KB base64 images
  // stacked in one request routinely blew past the server's request-size
  // cap, surfacing as a plain "upload failed" with no useful reason.
  async updateProfile(profileData, token) {
    try {
      const field = (key, transform = (v) => v) =>
        profileData[key] !== undefined ? { [key]: transform(profileData[key]) } : {};

      const payload = {
        ...field('name'),
        ...(profileData.governorate !== undefined || profileData.city !== undefined
          ? { governorate: profileData.governorate || profileData.city || '' } : {}),
        ...field('district'),
        ...(profileData.subDistrict !== undefined || profileData.sub_district !== undefined
          ? { sub_district: profileData.subDistrict || profileData.sub_district || '' } : {}),
        ...field('bio'),
        ...field('avatar'),
        ...field('cover'),
        ...field('gender'),
        ...field('email'),
        ...field('skills'),
        ...field('favorite_categories'),
        ...field('saved_jobs'),
        ...field('experience'),
        // Only present when actually changing — e.g. a fresh social sign-up
        // choosing freelancer vs employer while completing their profile.
        ...field('role'),
        ...field('company_name'),
        ...field('company_reg'),
        ...field('company_phone'),
        ...field('company_email'),
        ...field('industry'),
        ...field('company_size'),
        ...field('company_type'),
        // Deliberately separate from avatar/cover — the business's own brand
        // mark and background, not the account holder's personal photos.
        ...field('company_logo'),
        ...field('company_cover'),
        ...field('hiring_preferences'),
      };

      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));
      return { success: res.ok, ...data };
    } catch (e) {
      return { success: false };
    }
  },

  async getCategories() {
    try {
      const data = await fetchJsonRetry(`${API_BASE_URL}/categories`);
      return data.categories || [];
    } catch (e) {
      return [];
    }
  },

  async getSettings() {
    try {
      const data = await fetchJsonRetry(`${API_BASE_URL}/settings`);
      return data.settings || {};
    } catch (e) {
      return {};
    }
  },

  async updateSetting(key, value, token) {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/settings/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ key, value }),
      });
      if (!res.ok) return { success: false };
      return await res.json();
    } catch (e) {
      return { success: false };
    }
  },

  async getFreelancers() {
    try {
      const data = await fetchJsonRetry(`${API_BASE_URL}/freelancers`);
      return data.freelancers || [];
    } catch (e) {
      return [];
    }
  },

  async getCompanies() {
    try {
      const data = await fetchJsonRetry(`${API_BASE_URL}/companies`);
      return data.companies || [];
    } catch (e) {
      return [];
    }
  },

  async getNotifications(token) {
    try {
      const data = await fetchJsonRetry(`${API_BASE_URL}/notifications`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      return data.notifications || [];
    } catch (e) {
      return [];
    }
  },

  // Invitations — a company proactively sending a CV/job offer to a freelancer
  async sendInvitation(invitationData, token) {
    try {
      const res = await fetch(`${API_BASE_URL}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(invitationData),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.message };
      return data;
    } catch (e) {
      return { success: false };
    }
  },

  async getInvitations(token) {
    try {
      const res = await fetch(`${API_BASE_URL}/invitations`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch invitations');
      const data = await res.json();
      return data.invitations || [];
    } catch (e) {
      return [];
    }
  },

  async respondToInvitation(invitationId, status, token) {
    try {
      const res = await fetch(`${API_BASE_URL}/invitations/${invitationId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.message };
      return data;
    } catch (e) {
      return { success: false };
    }
  },

  // Real-time Jobs Feed API
  // Public — works for a guest with no token. But when a token IS passed,
  // the backend also includes the caller's own pending/rejected jobs
  // (employer) or every job regardless of status (admin/owner) — needed so
  // "my jobs"/the admin review queue don't silently drop anything not yet
  // approved. See GET /jobs in public/api/index.php.
  async getJobs(params = {}, token = null) {
    try {
      const query = new URLSearchParams(params).toString();
      const url = query ? `${API_BASE_URL}/jobs?${query}` : `${API_BASE_URL}/jobs`;
      const data = await fetchJsonRetry(url, token ? { headers: { 'Authorization': `Bearer ${token}` } } : undefined);
      return data.jobs || data;
    } catch (e) {
      return [];
    }
  },
  async approveJob(id, token) {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/jobs/approve`, {
        method: 'POST', headers: adminHeaders(token), body: JSON.stringify({ id })
      });
      return await res.json();
    } catch (e) {
      return { success: false };
    }
  },
  async rejectJob(id, reason, token) {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/jobs/reject`, {
        method: 'POST', headers: adminHeaders(token), body: JSON.stringify({ id, reason })
      });
      return await res.json();
    } catch (e) {
      return { success: false };
    }
  },

  async createJob(jobData, token) {
    try {
      const res = await fetch(`${API_BASE_URL}/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(jobData)
      });
      if (!res.ok) return { success: false };
      return await res.json();
    } catch (e) {
      return null;
    }
  },

  async updateJob(jobId, jobData, token) {
    try {
      const res = await fetch(`${API_BASE_URL}/jobs/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id: jobId, ...jobData })
      });
      if (!res.ok) return { success: false };
      return await res.json();
    } catch (e) {
      return null;
    }
  },

  async deleteJob(jobId, token) {
    try {
      const res = await fetch(`${API_BASE_URL}/jobs/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id: jobId })
      });
      if (!res.ok) return { success: false };
      return await res.json();
    } catch (e) {
      return null;
    }
  },

  async toggleJobStatus(jobId, token) {
    try {
      const res = await fetch(`${API_BASE_URL}/jobs/toggle-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id: jobId })
      });
      if (!res.ok) return { success: false };
      return await res.json();
    } catch (e) {
      return null;
    }
  },

  async boostJob(jobId, token) {
    try {
      const res = await fetch(`${API_BASE_URL}/jobs/boost`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ id: jobId })
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.message };
      return data;
    } catch (e) {
      return { success: false };
    }
  },

  async withdrawApplication(applicationId, token) {
    try {
      const res = await fetch(`${API_BASE_URL}/applications/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ id: applicationId })
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.message };
      return data;
    } catch (e) {
      return { success: false };
    }
  },

  async registerFreelancerView(freelancerId) {
    try {
      await fetch(`${API_BASE_URL}/freelancers/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: freelancerId })
      });
    } catch (e) { /* best-effort */ }
  },

  async registerJobView(jobId) {
    try {
      await fetch(`${API_BASE_URL}/jobs/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: jobId })
      });
    } catch (e) { /* best-effort, never blocks the UI */ }
  },

  // Messages — real two-party thread tied to an application
  async sendMessage(applicationId, body, token) {
    try {
      const res = await fetch(`${API_BASE_URL}/messages/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ application_id: applicationId, body })
      });
      return await res.json();
    } catch (e) {
      return { success: false };
    }
  },

  async getMessageThread(applicationId, token) {
    try {
      const res = await fetch(`${API_BASE_URL}/messages/thread?application_id=${encodeURIComponent(applicationId)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      return data.messages || [];
    } catch (e) {
      return [];
    }
  },

  async getMessageThreads(token) {
    try {
      const res = await fetch(`${API_BASE_URL}/messages/threads`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      return data.threads || [];
    } catch (e) {
      return [];
    }
  },

  // Saved searches — a persisted filter combo that alerts on matching new jobs
  async getSavedSearches(token) {
    try {
      const res = await fetch(`${API_BASE_URL}/saved-searches`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      return data.searches || [];
    } catch (e) {
      return [];
    }
  },

  async createSavedSearch(searchData, token) {
    try {
      const res = await fetch(`${API_BASE_URL}/saved-searches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(searchData)
      });
      return await res.json();
    } catch (e) {
      return { success: false };
    }
  },

  async deleteSavedSearch(id, token) {
    try {
      const res = await fetch(`${API_BASE_URL}/saved-searches/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ id })
      });
      return await res.json();
    } catch (e) {
      return { success: false };
    }
  },

  // Real-time CV Applications API
  async submitApplication(applicationData, token) {
    try {
      const res = await fetch(`${API_BASE_URL}/applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(applicationData)
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.message };
      return data;
    } catch (e) {
      return null;
    }
  },

  async fetchMyApplications(token) {
    try {
      const res = await fetch(`${API_BASE_URL}/applications/my-cvs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      return data.applications || [];
    } catch (e) {
      return [];
    }
  },

  async getApplications(token) {
    try {
      const data = await fetchJsonRetry(`${API_BASE_URL}/applications`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      return data.applications || [];
    } catch (e) {
      return [];
    }
  },

  async verifyApplicationPayment(applicationId, isApproved, token) {
    try {
      const status = isApproved ? 'approved' : 'rejected';
      const res = await fetch(`${API_BASE_URL}/applications/${applicationId}/verify`, {
        method: 'POST',
        headers: adminHeaders(token),
        body: JSON.stringify({ status })
      });
      return await res.json();
    } catch (e) {
      return null;
    }
  },

  async updateCompanyApplicantStatus(applicationId, status, token) {
    try {
      const res = await fetch(`${API_BASE_URL}/applications/${applicationId}/company-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ company_status: status })
      });
      return await res.json();
    } catch (e) {
      return null;
    }
  },

  async fetchCompanyApplications(token) {
    try {
      const res = await fetch(`${API_BASE_URL}/applications/company`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      return data.applications || [];
    } catch (e) {
      return [];
    }
  },

  // Plan tier definitions (Pro/VIP/etc.) — public list plus admin CRUD.
  // Distinct from purchasePlan()/getMyPlanPurchases() below, which are about
  // someone actually buying one of these tiers, not the tiers themselves.
  async getPlanTiers() {
    try {
      const data = await fetchJsonRetry(`${API_BASE_URL}/plans`);
      return data.plans || [];
    } catch (e) {
      return [];
    }
  },

  // Admin-only: every plan tier including inactive ones — getPlanTiers()
  // above is the public list (active only), which would make a disabled
  // plan impossible to find and re-enable from the admin panel.
  async getAllPlanTiers(token) {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/plan-tiers`, { headers: adminHeaders(token) });
      const data = await res.json();
      return data.plans || [];
    } catch (e) {
      return [];
    }
  },

  async addPlanTier(planData, token) {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/plans/add`, {
        method: 'POST',
        headers: adminHeaders(token),
        body: JSON.stringify(planData)
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.message };
      return data;
    } catch (e) {
      return { success: false };
    }
  },

  async updatePlanTier(planData, token) {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/plans/update`, {
        method: 'POST',
        headers: adminHeaders(token),
        body: JSON.stringify(planData)
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.message };
      return data;
    } catch (e) {
      return { success: false };
    }
  },

  async deletePlanTier(id, token) {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/plans/delete`, {
        method: 'POST',
        headers: adminHeaders(token),
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.message };
      return data;
    } catch (e) {
      return { success: false };
    }
  },

  // Plans API — real one-time purchase, FastPay-proof + admin verification,
  // same pattern as CV application payments.
  async purchasePlan(plan, paymentMethod, paymentTxId, token) {
    try {
      const res = await fetch(`${API_BASE_URL}/plans/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ plan, payment_method: paymentMethod, payment_tx_id: paymentTxId })
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.message };
      return data;
    } catch (e) {
      return { success: false };
    }
  },

  async getMyPlanPurchases(token) {
    try {
      const res = await fetch(`${API_BASE_URL}/plans/my-purchases`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      return data.purchases || [];
    } catch (e) {
      return [];
    }
  },

  // Persists a CV (data + chosen template/accent color, from the in-app
  // template picker) into Karnama's storage in the background — the backend
  // auto-provisions (or reuses) a linked Karnama account server-to-server.
  // The user never leaves Ishkhwaz or sees Karnama; this call only exists so
  // the premium-template-slot limits (tied to the Ishkhwaz plan) are tracked
  // centrally and the CV can be re-opened/edited from Karnama later.
  async createKarnamaResume(resume, token) {
    try {
      const res = await fetch(`${API_BASE_URL}/karnama/create-resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ resume }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.message };
      return data;
    } catch (e) {
      return { success: false, message: 'ناتوانرێت پەیوەندی بکرێت.' };
    }
  },

  // Saved resumes — multiple per user, capped server-side by their real
  // plan's max_cvs (0 = unlimited). Used both for the Resumes page and for
  // picking which one to send on a specific job application.
  async getResumes(token) {
    try {
      const res = await fetch(`${API_BASE_URL}/resumes`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.message };
      return data;
    } catch (e) {
      return { success: false, message: 'ناتوانرێت پەیوەندی بکرێت.' };
    }
  },
  async createResume(payload, token) {
    try {
      const res = await fetch(`${API_BASE_URL}/resumes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.message };
      return data;
    } catch (e) {
      return { success: false, message: 'ناتوانرێت پەیوەندی بکرێت.' };
    }
  },
  async updateResume(id, payload, token) {
    try {
      const res = await fetch(`${API_BASE_URL}/resumes/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ id, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.message };
      return data;
    } catch (e) {
      return { success: false, message: 'ناتوانرێت پەیوەندی بکرێت.' };
    }
  },
  async deleteResume(id, token) {
    try {
      const res = await fetch(`${API_BASE_URL}/resumes/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.message };
      return data;
    } catch (e) {
      return { success: false, message: 'ناتوانرێت پەیوەندی بکرێت.' };
    }
  },

  // Karnama AI — VIP-only conversational CV builder (see /ai-cv/* in the backend).
  async getAiCvChat(token) {
    try {
      const res = await fetch(`${API_BASE_URL}/ai-cv/messages`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.message };
      return data;
    } catch (e) {
      return { success: false, message: 'ناتوانرێت پەیوەندی بکرێت.' };
    }
  },
  async sendAiCvMessage(message, token) {
    try {
      const res = await fetch(`${API_BASE_URL}/ai-cv/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.message };
      return data;
    } catch (e) {
      return { success: false, message: 'ناتوانرێت پەیوەندی بکرێت.' };
    }
  },
  async buildAiCvResume(token) {
    try {
      const res = await fetch(`${API_BASE_URL}/ai-cv/build`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.message };
      return data;
    } catch (e) {
      return { success: false, message: 'ناتوانرێت پەیوەندی بکرێت.' };
    }
  },
  async resetAiCvChat(token) {
    try {
      const res = await fetch(`${API_BASE_URL}/ai-cv/messages`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.message };
      return data;
    } catch (e) {
      return { success: false, message: 'ناتوانرێت پەیوەندی بکرێت.' };
    }
  },

  // App Guide AI — general "how do I use this app" assistant, open to
  // every logged-in user (no VIP gate, no CV-build step, unlike Karnama AI).
  async getAppGuideChat(token) {
    try {
      const res = await fetch(`${API_BASE_URL}/app-guide/messages`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.message };
      return data;
    } catch (e) {
      return { success: false, message: 'ناتوانرێت پەیوەندی بکرێت.' };
    }
  },
  async sendAppGuideMessage(message, token) {
    try {
      const res = await fetch(`${API_BASE_URL}/app-guide/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.message };
      return data;
    } catch (e) {
      return { success: false, message: 'ناتوانرێت پەیوەندی بکرێت.' };
    }
  },
  async resetAppGuideChat(token) {
    try {
      const res = await fetch(`${API_BASE_URL}/app-guide/messages`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.message };
      return data;
    } catch (e) {
      return { success: false, message: 'ناتوانرێت پەیوەندی بکرێت.' };
    }
  },

  // AI writing assist — one endpoint, dispatched by `kind`:
  // 'cv_summary' | 'cv_experience' | 'job_description'. See input shapes at
  // each call site; the backend builds the actual prompt.
  async aiWrite(kind, input, token) {
    try {
      const res = await fetch(`${API_BASE_URL}/ai/write`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ kind, input }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.message };
      return data;
    } catch (e) {
      return { success: false, message: 'ناتوانرێت پەیوەندی بکرێت.' };
    }
  },

  // How many premium ("pro-*") CV designs this user may use, and how many
  // they've already used — drives which designs are locked in the picker.
  async getKarnamaStatus(token) {
    try {
      const res = await fetch(`${API_BASE_URL}/karnama/status`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.message };
      return data;
    } catch (e) {
      return { success: false, message: 'ناتوانرێت پەیوەندی بکرێت.' };
    }
  },

  // Who viewed my profile — a plan perk (VIP-tier), so a 403 here just means
  // the caller's current plan doesn't include it, not a real error.
  async getProfileViewers(token) {
    try {
      const res = await fetch(`${API_BASE_URL}/profile-viewers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok || !data.success) return { allowed: false, viewers: [] };
      return { allowed: true, viewers: data.viewers || [] };
    } catch (e) {
      return { allowed: false, viewers: [] };
    }
  },

  async getPendingPlanPurchases(token) {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/plans`, {
        headers: adminHeaders(token)
      });
      const data = await res.json();
      return data.purchases || [];
    } catch (e) {
      return [];
    }
  },

  async verifyPlanPurchase(purchaseId, status, token) {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/plans/verify`, {
        method: 'POST',
        headers: adminHeaders(token),
        body: JSON.stringify({ id: purchaseId, status })
      });
      return await res.json();
    } catch (e) {
      return { success: false };
    }
  },

  // Admin Production Master API Layer
  async getAdminAnalytics(token) {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/analytics`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    }
  },

  async getAdminUsers(token) {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/users`, {
        headers: adminHeaders(token)
      });
      const data = await res.json();
      return data.users || [];
    } catch (e) {
      return [];
    }
  },

  async createAdminUser(userData, token) {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/users/add`, {
        method: 'POST',
        headers: adminHeaders(token),
        body: JSON.stringify(userData)
      });
      return await res.json();
    } catch (e) {
      return null;
    }
  },

  // Full-profile admin edit — same broad field set /auth/me itself accepts
  // (plus role/wallet/plan, which only an admin can touch). Send only the
  // fields actually being changed; every one falls back server-side to the
  // user's existing value when omitted.
  async updateAdminUser(userData, token) {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/users/update`, {
        method: 'POST',
        headers: adminHeaders(token),
        body: JSON.stringify(userData)
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.message };
      return data;
    } catch (e) {
      return { success: false };
    }
  },

  async toggleBlockUser(userId, isBlocked, token) {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/users/block`, {
        method: 'POST',
        headers: adminHeaders(token),
        body: JSON.stringify({ id: userId, status: isBlocked ? 'blocked' : 'active' })
      });
      return await res.json();
    } catch (e) {
      return null;
    }
  },

  async toggleVerifyUser(userId, verified, token) {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/users/verify`, {
        method: 'POST',
        headers: adminHeaders(token),
        body: JSON.stringify({ id: userId, verified: verified ? 1 : 0 })
      });
      return await res.json();
    } catch (e) {
      return null;
    }
  },

  async deleteAdminUser(userId, token) {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/users/delete`, {
        method: 'POST',
        headers: adminHeaders(token),
        body: JSON.stringify({ id: userId })
      });
      return await res.json();
    } catch (e) {
      return null;
    }
  },

  async verifyPayment(applicationId, status, token) {
    try {
      const res = await fetch(`${API_BASE_URL}/applications/${applicationId}/verify`, {
        method: 'POST',
        headers: adminHeaders(token),
        body: JSON.stringify({ status })
      });
      return await res.json();
    } catch (e) {
      return null;
    }
  },

  async getFullDatabase(token) {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/database`, {
        headers: adminHeaders(token)
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    }
  },

  // ---- Disputes — real recourse for a rejected FastPay payment ----
  async fileDispute({ targetType, targetId, reason }, token) {
    try {
      const res = await fetch(`${API_BASE_URL}/disputes`, {
        method: 'POST',
        headers: adminHeaders(token),
        body: JSON.stringify({ target_type: targetType, target_id: targetId, reason })
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.message };
      return data;
    } catch (e) {
      return { success: false };
    }
  },
  async getDisputes(token) {
    try {
      const res = await fetch(`${API_BASE_URL}/disputes`, { headers: adminHeaders(token) });
      const data = await res.json();
      return data.disputes || [];
    } catch (e) {
      return [];
    }
  },
  async sendDisputeMessage(disputeId, body, token) {
    try {
      const res = await fetch(`${API_BASE_URL}/disputes/${disputeId}/messages`, {
        method: 'POST',
        headers: adminHeaders(token),
        body: JSON.stringify({ body })
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.message };
      return data;
    } catch (e) {
      return { success: false };
    }
  },
  async resolveDispute(disputeId, status, note, token) {
    try {
      const res = await fetch(`${API_BASE_URL}/disputes/${disputeId}/resolve`, {
        method: 'POST',
        headers: adminHeaders(token),
        body: JSON.stringify({ status, note })
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.message };
      return data;
    } catch (e) {
      return { success: false };
    }
  },

  // ---- Milestones — real project tracking + payment confirmation ----
  async createMilestone({ applicationId, title, amount }, token) {
    try {
      const res = await fetch(`${API_BASE_URL}/milestones`, {
        method: 'POST',
        headers: adminHeaders(token),
        body: JSON.stringify({ application_id: applicationId, title, amount })
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.message };
      return data;
    } catch (e) {
      return { success: false };
    }
  },
  async getMilestones(applicationId, token) {
    try {
      const res = await fetch(`${API_BASE_URL}/milestones?application_id=${encodeURIComponent(applicationId)}`, {
        headers: adminHeaders(token)
      });
      const data = await res.json();
      return data.milestones || [];
    } catch (e) {
      return [];
    }
  },
  async submitMilestone(id, note, token) {
    try {
      const res = await fetch(`${API_BASE_URL}/milestones/${id}/submit`, {
        method: 'POST', headers: adminHeaders(token), body: JSON.stringify({ note })
      });
      return await res.json();
    } catch (e) {
      return { success: false };
    }
  },
  async confirmMilestone(id, note, token) {
    try {
      const res = await fetch(`${API_BASE_URL}/milestones/${id}/confirm`, {
        method: 'POST', headers: adminHeaders(token), body: JSON.stringify({ note })
      });
      return await res.json();
    } catch (e) {
      return { success: false };
    }
  },
  async deleteMilestone(id, token) {
    try {
      const res = await fetch(`${API_BASE_URL}/milestones/${id}/delete`, {
        method: 'POST', headers: adminHeaders(token)
      });
      return await res.json();
    } catch (e) {
      return { success: false };
    }
  },

  // ---- Ratings — either side of a hired (accepted) application can rate
  // the other, once. GET is public (no token) since it's shown on profiles.
  async submitRating(applicationId, rating, comment, token) {
    try {
      const res = await fetch(`${API_BASE_URL}/ratings`, {
        method: 'POST',
        headers: adminHeaders(token),
        body: JSON.stringify({ application_id: applicationId, rating, comment })
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.message };
      return data;
    } catch (e) {
      return { success: false };
    }
  },
  async getRatings(userId) {
    try {
      const res = await fetch(`${API_BASE_URL}/ratings/${encodeURIComponent(userId)}`);
      const data = await res.json();
      return { ratings: data.ratings || [], average: data.average || 0, count: data.count || 0 };
    } catch (e) {
      return { ratings: [], average: 0, count: 0 };
    }
  },

  // ---- Company analytics — real day-by-day trend, not a snapshot ----
  async getCompanyAnalytics(days = 14, token) {
    try {
      const res = await fetch(`${API_BASE_URL}/analytics/company?days=${days}`, { headers: adminHeaders(token) });
      const data = await res.json();
      return { series: data.series || [], totals: data.totals || { views: 0, applications: 0 } };
    } catch (e) {
      return { series: [], totals: { views: 0, applications: 0 } };
    }
  },

  // ---- AI-powered job recommendations ----
  async getRecommendedJobs(token) {
    try {
      const res = await fetch(`${API_BASE_URL}/jobs/recommended`, { headers: adminHeaders(token) });
      if (!res.ok) return { jobs: [], aiPowered: false };
      const data = await res.json();
      return { jobs: data.jobs || [], aiPowered: !!data.aiPowered };
    } catch (e) {
      return { jobs: [], aiPowered: false };
    }
  }
};
