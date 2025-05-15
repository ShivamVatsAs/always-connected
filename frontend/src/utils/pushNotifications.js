// frontend/src/utils/pushNotifications.js

// IMPORTANT: VAPID (Voluntary Application Server Identification) keys are used to identify your application server
// to the push service. You need to generate these (public and private key pair).
// The public key is used in your frontend JavaScript. The private key is kept secret on your server.
// You can generate VAPID keys using libraries like 'web-push' in Node.js (e.g., webpush.generateVAPIDKeys()).
// Store your VAPID public key in your .env file (e.g., VITE_VAPID_PUBLIC_KEY)
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || 'YOUR_VAPID_PUBLIC_KEY_HERE';

if (VAPID_PUBLIC_KEY === 'YOUR_VAPID_PUBLIC_KEY_HERE') {
  console.warn(
    'Push Notifications: VAPID_PUBLIC_KEY is not set. Please generate VAPID keys and add the public key to your .env file (VITE_VAPID_PUBLIC_KEY).'
  );
}

/**
 * Converts a VAPID public key from a URL-safe base64 string to a Uint8Array.
 * This format is required by the Push API.
 * @param {string} base64String The URL-safe base64 VAPID public key.
 * @returns {Uint8Array} The VAPID public key as a Uint8Array.
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Checks if Push Notifications and Service Workers are supported by the browser.
 * @returns {boolean} True if supported, false otherwise.
 */
export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/**
 * Requests permission from the user to show notifications.
 * @returns {Promise<NotificationPermission>} A promise that resolves with the permission status ('granted', 'denied', or 'default').
 */
export async function requestNotificationPermission() {
  if (!isPushSupported()) {
    console.warn('Push notifications are not supported in this browser.');
    return 'denied'; // Or throw an error
  }
  try {
    const permission = await Notification.requestPermission();
    console.log('Notification permission status:', permission);
    return permission;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return 'default'; // Or rethrow, depending on how you want to handle
  }
}

/**
 * Gets the current push subscription for the active service worker.
 * @returns {Promise<PushSubscription|null>} A promise that resolves with the PushSubscription object or null if not subscribed.
 */
export async function getExistingSubscription() {
  if (!isPushSupported()) return null;
  try {
    const swRegistration = await navigator.serviceWorker.ready; // Ensures service worker is active
    const subscription = await swRegistration.pushManager.getSubscription();
    return subscription;
  } catch (error) {
    console.error('Error getting existing push subscription:', error);
    return null;
  }
}

/**
 * Subscribes the user to push notifications.
 * This should be called after ensuring the service worker is registered and notification permission is granted.
 * @returns {Promise<PushSubscription|null>} A promise that resolves with the new PushSubscription object or null on failure.
 */
export async function subscribeUserToPush() {
  if (!isPushSupported()) {
    console.error('Push not supported. Cannot subscribe.');
    return null;
  }
  if (!VAPID_PUBLIC_KEY || VAPID_PUBLIC_KEY === 'YOUR_VAPID_PUBLIC_KEY_HERE') {
     console.error('VAPID public key is not configured. Cannot subscribe to push notifications.');
     alert('Application configuration error: VAPID key missing. Push notifications cannot be enabled.'); // User-facing alert
     return null;
  }

  try {
    const swRegistration = await navigator.serviceWorker.ready; // Get the active service worker registration.
    console.log('Service Worker ready for push subscription:', swRegistration);

    // Check if already subscribed
    let subscription = await swRegistration.pushManager.getSubscription();
    if (subscription) {
      console.log('User is already subscribed:', subscription);
      return subscription;
    }

    // If not subscribed, create a new subscription.
    const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    subscription = await swRegistration.pushManager.subscribe({
      userVisibleOnly: true, // Required and must be true. Indicates messages will always be visible to the user.
      applicationServerKey: applicationServerKey, // Your VAPID public key.
    });

    console.log('User subscribed successfully:', subscription);
    return subscription;
  } catch (error) {
    console.error('Failed to subscribe the user to push notifications:', error);
    if (error.name === 'NotAllowedError') {
        console.warn('Notification permission was denied by the user or the browser.');
        // You might want to update UI to reflect this state
    } else if (error.name === 'AbortError') {
        console.warn('Push subscription aborted.');
    } else {
        console.error('An unknown error occurred during push subscription:', error);
    }
    return null;
  }
}

/**
 * Unsubscribes the user from push notifications.
 * @returns {Promise<boolean>} A promise that resolves with true if unsubscription was successful, false otherwise.
 */
export async function unsubscribeUserFromPush() {
  if (!isPushSupported()) return false;
  try {
    const swRegistration = await navigator.serviceWorker.ready;
    const subscription = await swRegistration.pushManager.getSubscription();
    if (subscription) {
      const successful = await subscription.unsubscribe();
      if (successful) {
        console.log('User unsubscribed successfully.');
        // You should also send this information to your server to remove the subscription.
        // Example: await removePushSubscriptionFromServer(subscription.endpoint);
      } else {
        console.error('Failed to unsubscribe user.');
      }
      return successful;
    }
    console.log('User was not subscribed.');
    return true; // Or false, depending on how you define success if not subscribed
  } catch (error) {
    console.error('Error unsubscribing user from push:', error);
    return false;
  }
}
