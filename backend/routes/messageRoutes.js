// backend/routes/messageRoutes.js
import express from 'express';
import { getMessageHistory } from '../controllers/messageController.js';
// import { ensureAuthenticated } from '../middleware/authMiddleware'; // Example if you had auth middleware

const router = express.Router();

// GET /api/messages/history?user1=xxx&user2=yyy
// Fetches message history between two specified users.
// Add authentication/authorization middleware if needed to protect this route,
// though for two specific users, it might be less critical if client logic is sound.
router.get('/history', getMessageHistory);


// Note: Sending new messages is primarily handled via WebSockets in this application.
// If you needed an HTTP endpoint to post messages, you would define it here:
// router.post('/', ensureAuthenticated, createNewMessage); // Example

export default router;
