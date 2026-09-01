import Dexie from 'dexie';

// Define IndexedDB schema using Dexie
class IshkhwazDB extends Dexie {
  constructor() {
    super('IshkhwazOfflineDB');
    this.version(1).stores({
      cachedJobs: 'id, category, governorateId, districtId, subDistrictId, createdAt',
      savedJobs: 'id, savedAt',
      applicationsQueue: 'id, jobId, freelancerId, status, createdAt',
      userProfile: 'id, role, phone'
    });
  }
}

export const db = new IshkhwazDB();

export const offlineStorage = {
  // Cache jobs for offline browsing
  async cacheJobs(jobsList) {
    try {
      await db.cachedJobs.bulkPut(jobsList);
    } catch (err) {
      console.warn('Offline cache error:', err);
    }
  },

  // Retrieve cached jobs
  async getCachedJobs() {
    try {
      return await db.cachedJobs.toArray();
    } catch (err) {
      return [];
    }
  },

  // Save / Bookmark job offline
  async saveJobOffline(jobId) {
    try {
      await db.savedJobs.put({ id: jobId, savedAt: new Date().toISOString() });
    } catch (err) {}
  },

  // Remove saved job offline
  async unsaveJobOffline(jobId) {
    try {
      await db.savedJobs.delete(jobId);
    } catch (err) {}
  },

  // Get offline saved job IDs
  async getSavedJobIds() {
    try {
      const records = await db.savedJobs.toArray();
      return records.map(r => r.id);
    } catch (err) {
      return [];
    }
  },

  // Queue an action taken while offline (e.g. CV application)
  async queueOfflineApplication(applicationData) {
    try {
      await db.applicationsQueue.put({
        ...applicationData,
        queuedAt: new Date().toISOString()
      });
    } catch (err) {}
  },

  // Fetch pending offline queued applications
  async getQueuedApplications() {
    try {
      return await db.applicationsQueue.toArray();
    } catch (err) {
      return [];
    }
  },

  // Clear synced queue
  async clearQueuedApplications() {
    try {
      await db.applicationsQueue.clear();
    } catch (err) {}
  }
};
