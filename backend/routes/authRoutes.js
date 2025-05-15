// backend/routes/authRoutes.js
import express from 'express';
import { loginUser } from '../controllers/authController.js'; // Ensure authController.js exports loginUser

const router = express.Router();

// POST /api/auth/login
// This endpoint can be used by the frontend to verify the password if
// password validation is moved from client-side AuthContext to the backend.
router.post('/login', loginUser);

// router.post('/logout', logoutUser); // Conceptual logout endpoint

export default router; // This line is crucial
