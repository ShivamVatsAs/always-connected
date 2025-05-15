// backend/controllers/pushController.js
import webPush from 'web-push';
import dotenv from 'dotenv';
import User from '../models/User.js'; // User model to store/retrieve subscriptions

dotenv.config();

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_MAILTO = process.env.VAPID_MAILTO || 'mailto:your-email@example.com';

let vapidKeysSet = false;
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webPush.setVapidDetails(
      VAPID_MAILTO,
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );
    vapidKeysSet = true;
    console.log('Web Push VAPID details set successfully.');
  } catch (error) {
    console.error('Error setting VAPID details for web-push. Push notifications might fail.', error);
    // Depending on the error, you might want to prevent the app from starting or handle it gracefully.
  }
} else {
  console.warn(
    'WARNING: VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY (or both) are not defined in .env. Push notifications will be disabled.'
  );
}

/**
 * Subscribes a user to push notifications by saving their subscription object.
 */
export const subscribePush = async (req, res) => {
  const { subscription, userId } = req.body;

  if (!vapidKeysSet) {
    return res.status(503).json({ message: 'Push notifications are not configured on the server (VAPID keys missing).' });
  }

  if (!subscription || !userId) {
    return res.status(400).json({ message: 'Push subscription object and userId are required.' });
  }

  if (userId !== 'Shivam' && userId !== 'Arya') {
    return res.status(400).json({ message: 'Invalid userId.' });
  }

  // Validate subscription object structure (basic check)
  if (!subscription.endpoint || !subscription.keys || !subscription.keys.p256dh || !subscription.keys.auth) {
    return res.status(400).json({ message: 'Invalid push subscription object structure.' });
  }

  try {
    const user = await User.findOne({ userId: userId });
    if (!user) {
      // This case should ideally be handled by user creation on login/first interaction
      // For robustness, we can create the user here if they don't exist.
      console.warn(`User ${userId} not found during push subscription. Attempting to create.`);
      await User.findOrCreate(userId); // Use the static method from User model
      // Re-fetch the user after creation
      const newUser = await User.findOne({ userId: userId });
      if (!newUser) {
         return res.status(404).json({ message: `User ${userId} could not be found or created.` });
      }
      // Proceed with newUser
    }

    // Check if this specific subscription endpoint already exists for this user to avoid duplicates
    const existingSubscription = user.pushSubscriptions.find(sub => sub.endpoint === subscription.endpoint);

    if (existingSubscription) {
      console.log(`Push subscription for endpoint ${subscription.endpoint} already exists for user ${userId}.`);
      // Optionally update it if keys changed, though typically endpoints are unique
      // For now, just confirm it's there.
      return res.status(200).json({ message: 'Subscription already exists.' });
    }

    // Add the new subscription
    user.pushSubscriptions.push(subscription);
    await user.save();

    console.log(`Push subscription added for user ${userId}:`, subscription.endpoint);
    res.status(201).json({ message: 'Push subscription saved successfully.' });

    // Optional: Send a confirmation push notification
    // const payload = JSON.stringify({
    //   title: 'Always Connected',
    //   body: 'You are now subscribed to notifications!',
    //   icon: '/icon-192x192.png' // Relative to frontend public folder
    // });
    // webPush.sendNotification(subscription, payload)
    //   .then(() => console.log('Test push notification sent to', subscription.endpoint))
    //   .catch(err => console.error('Error sending test push notification:', err));

  } catch (error) {
    console.error(`Error saving push subscription for user ${userId}:`, error);
    if (error.code === 11000) { // Duplicate key error (e.g. if endpoint was unique globally by mistake)
        return res.status(409).json({ message: 'This push subscription endpoint might already be registered under another user or context.'});
    }
    res.status(500).json({ message: 'Server error while saving push subscription.' });
  }
};

/**
 * Unsubscribes a user from push notifications by removing their subscription object.
 */
export const unsubscribePush = async (req, res) => {
  const { endpoint, userId } = req.body; // Frontend should send the specific endpoint to remove

  if (!endpoint || !userId) {
    return res.status(400).json({ message: 'Subscription endpoint and userId are required for unsubscription.' });
  }

  if (userId !== 'Shivam' && userId !== 'Arya') {
    return res.status(400).json({ message: 'Invalid userId.' });
  }

  try {
    const user = await User.findOne({ userId: userId });
    if (!user) {
      return res.status(404).json({ message: `User ${userId} not found.` });
    }

    const initialSubscriptionCount = user.pushSubscriptions.length;
    user.pushSubscriptions = user.pushSubscriptions.filter(sub => sub.endpoint !== endpoint);

    if (user.pushSubscriptions.length < initialSubscriptionCount) {
      await user.save();
      console.log(`Push subscription removed for user ${userId}: ${endpoint}`);
      res.status(200).json({ message: 'Push subscription removed successfully.' });
    } else {
      console.log(`Push subscription endpoint ${endpoint} not found for user ${userId}.`);
      res.status(404).json({ message: 'Subscription endpoint not found for this user.' });
    }
  } catch (error) {
    console.error(`Error removing push subscription for user ${userId}:`, error);
    res.status(500).json({ message: 'Server error while removing push subscription.' });
  }
};


/**
 * Sends a push notification to a specific user.
 * This function would be called when a new message needs to be delivered via push.
 * @param {string} targetUserId - The userId of the recipient ('Shivam' or 'Arya').
 * @param {object} notificationPayload - The payload for the notification (e.g., { title, body, icon, data: { url } }).
 */
export const sendPushNotificationToUser = async (targetUserId, notificationPayload) => {
  if (!vapidKeysSet) {
    console.warn('Cannot send push notification: VAPID keys not set.');
    return { success: false, message: 'VAPID keys not configured on server.' };
  }
  if (!targetUserId || !notificationPayload) {
    console.error('sendPushNotificationToUser: targetUserId and notificationPayload are required.');
    return { success: false, message: 'Target user ID and payload required.' };
  }

  try {
    const user = await User.findOne({ userId: targetUserId });
    if (!user || !user.pushSubscriptions || user.pushSubscriptions.length === 0) {
      console.log(`No push subscriptions found for user ${targetUserId}. Cannot send push.`);
      return { success: false, message: `No subscriptions for ${targetUserId}.` };
    }

    const payloadString = JSON.stringify(notificationPayload);
    let successfulSends = 0;
    let failedSends = 0;

    // Iterate over all subscriptions for the user and send a notification to each.
    const sendPromises = user.pushSubscriptions.map(subscription =>
      webPush.sendNotification(subscription, payloadString)
        .then(() => {
          console.log(`Push notification sent successfully to ${targetUserId} at endpoint: ${subscription.endpoint.substring(0, 30)}...`);
          successfulSends++;
        })
        .catch(error => {
          failedSends++;
          console.error(`Error sending push notification to ${targetUserId} at endpoint ${subscription.endpoint.substring(0,30)}...:`, error.statusCode, error.body);
          // If the subscription is no longer valid (e.g., 404 or 410), remove it from the database.
          if (error.statusCode === 404 || error.statusCode === 410) {
            console.log(`Subscription ${subscription.endpoint} is invalid. Removing for user ${targetUserId}.`);
            user.pushSubscriptions = user.pushSubscriptions.filter(sub => sub.endpoint !== subscription.endpoint);
            // No await here, fire and forget removal or collect promises
          }
        })
    );

    await Promise.allSettled(sendPromises); // Wait for all send attempts

    if (failedSends > 0 && user.pushSubscriptions.length < (successfulSends + failedSends)) {
        // If any subscriptions were marked for removal, save the user document
        await user.save();
        console.log(`Updated subscriptions for ${targetUserId} after pruning invalid ones.`);
    }

    if (successfulSends > 0) {
      return { success: true, message: `Sent ${successfulSends} push notifications to ${targetUserId}. Failed: ${failedSends}` };
    } else {
      return { success: false, message: `Failed to send any push notifications to ${targetUserId}. Attempts: ${failedSends}` };
    }

  } catch (dbError) {
    console.error(`Database error while trying to send push notification to ${targetUserId}:`, dbError);
    return { success: false, message: 'Database error during push notification process.' };
  }
};
