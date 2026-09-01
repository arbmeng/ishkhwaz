import Pusher from 'pusher-js';
import { API_BASE_URL } from './api';

const PUSHER_KEY = 'b55d4a519e8c85190e30';
const PUSHER_CLUSTER = 'ap2';
const EVENTS = ['notification', 'new-message', 'new-application'];
const ADMIN_EVENTS = ['admin-update'];

let pusherClient = null;
let channel = null;
let adminChannel = null;
let connectedUserId = null;

// Stable listener registry, independent of Pusher's own connect/reconnect
// lifecycle — components can call .on() at mount time regardless of whether
// a connection exists yet; events just start flowing once connect() runs
// (from AuthContext, once a user/token are actually available).
const listeners = { notification: new Set(), 'new-message': new Set(), 'new-application': new Set(), 'admin-update': new Set() };

function dispatch(event, data) {
  listeners[event]?.forEach((cb) => { try { cb(data); } catch { /* one bad listener shouldn't break the rest */ } });
}

export const realtimeService = {
  connect(userId, token, role) {
    if (!userId || !token || typeof window === 'undefined') return;
    if (connectedUserId === userId && pusherClient) return;
    this.disconnect();

    pusherClient = new Pusher(PUSHER_KEY, {
      cluster: PUSHER_CLUSTER,
      authEndpoint: `${API_BASE_URL}/pusher/auth`,
      auth: { headers: { Authorization: `Bearer ${token}` } },
    });
    channel = pusherClient.subscribe(`private-user-${userId}`);
    EVENTS.forEach((evt) => channel.bind(evt, (data) => dispatch(evt, data)));

    // Every admin/owner session with the panel mounted shares this one
    // channel — so any admin action, or any ordinary user action worth an
    // admin knowing about (new signup, new job, a plan purchase to review),
    // shows up live for every admin watching, not just whoever triggered it.
    if (role === 'admin' || role === 'owner') {
      adminChannel = pusherClient.subscribe('private-admin-panel');
      ADMIN_EVENTS.forEach((evt) => adminChannel.bind(evt, (data) => dispatch(evt, data)));
    }

    connectedUserId = userId;
  },

  disconnect() {
    if (pusherClient) {
      try { pusherClient.disconnect(); } catch { /* already gone */ }
    }
    pusherClient = null;
    channel = null;
    adminChannel = null;
    connectedUserId = null;
  },

  // Returns an unsubscribe function, same convention as a DOM/React effect cleanup.
  on(event, callback) {
    if (!listeners[event]) listeners[event] = new Set();
    listeners[event].add(callback);
    return () => listeners[event].delete(callback);
  },
};
