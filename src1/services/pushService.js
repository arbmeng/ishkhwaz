// Web Push API Subscription Service for Ishkhwaz PWA
import { API_BASE_URL } from './api';

// Public VAPID key — safe to embed in client code (only the private half is secret).
const VAPID_PUBLIC_KEY = 'BFu7s9I3za1xcG8htRaPkYp26IACZ4KgwjaBE2Qw5wN6Hs5VB-1_r1R8PbSHszihvw7tfF3xIgZMJRW6sG-1ZY8';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const pushService = {
  async subscribeUserToPush(token) {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return { success: false, reason: 'unsupported' };
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        return { success: false, reason: 'denied' };
      }

      const registration = await navigator.serviceWorker.ready;

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      const subJson = subscription.toJSON();

      // Tied to the logged-in user (if any) so notifications can target them specifically
      // instead of only ever broadcasting to every subscribed device.
      await fetch(`${API_BASE_URL}/push/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          p256dh: subJson.keys?.p256dh || '',
          auth: subJson.keys?.auth || '',
        }),
      });

      return { success: true, subscription: subJson };
    } catch (e) {
      return { success: false, error: e?.message || 'push_unavailable' };
    }
  },
};
