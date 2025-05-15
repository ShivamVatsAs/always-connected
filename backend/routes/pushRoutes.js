// backend/routes/pushRoutes.js
import express from 'express';
import { subscribePush, unsubscribePush } from '../controllers/pushController.js';
// We might add a test route here later if needed, but actual sending is programmatic

const router = express.Router();

// POST /api/push/subscribe
// Endpoint for clients to send their push subscription object
router.post('/subscribe', subscribePush);

// POST /api/push/unsubscribe
// Endpoint for clients to request removal of a push subscription
router.post('/unsubscribe', unsubscribePush);

// Example of a test route to send a push (not for production use by client directly)
// This would typically be triggered by server-side logic (e.g., new message)
// import { sendPushNotificationToUser } from '../controllers/pushController.js';
// router.post('/send-test', async (req, res) => {
//   const { userId, title, body } = req.body;
//   if (!userId || !title || !body) {
//     return res.status(400).json({ message: "userId, title, and body are required."});
//   }
//   try {
//     const result = await sendPushNotificationToUser(userId, { title, body, icon: '/icon-192x192.png', data: { url: '/' } });
//     if (result.success) {
//       res.status(200).json({ message: "Test push sent (or attempted).", details: result.message });
//     } else {
//       res.status(500).json({ message: "Failed to send test push.", details: result.message });
//     }
//   } catch (error) {
//     console.error("Error in /send-test route:", error);
//     res.status(500).json({ message: "Server error during test push." });
//   }
// });

export default router; // This line is crucial
