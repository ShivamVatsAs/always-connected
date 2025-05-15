// backend/controllers/authController.js
import dotenv from 'dotenv';
import User from '../models/User.js'; // Import User model for findOrCreate

dotenv.config();

const SHARED_PASSWORD = 'arya143'; // The shared password

/**
 * Handles a login attempt.
 * For this application, user selection happens on the frontend.
 * This controller mainly verifies the shared password.
 * It also ensures the user exists in the database.
 */
export const loginUser = async (req, res) => {
  const { userId, password } = req.body;

  // Validate input
  if (!userId || !password) {
    return res.status(400).json({ message: 'User ID and password are required.' });
  }

  if (userId !== 'Shivam' && userId !== 'Arya') {
    return res.status(400).json({ message: 'Invalid User ID. Must be Shivam or Arya.' });
  }

  if (password !== SHARED_PASSWORD) {
    return res.status(401).json({ message: 'Incorrect password.' });
  }

  try {
    // Ensure the user exists in the database, create if not.
    // This is useful if you want to associate data (like push subscriptions) with a DB record.
    const user = await User.findOrCreate(userId);
    if (!user) {
      // This case should ideally not be reached if findOrCreate works as expected
      return res.status(500).json({ message: 'Could not find or create user.' });
    }

    // Password is correct, user is identified.
    // The frontend will typically manage the "session" or logged-in state.
    // This endpoint just confirms the password.
    console.log(`Login successful for user: ${userId}`);
    res.status(200).json({
      message: 'Login successful.',
      user: {
        userId: user.userId,
        // Do not send back sensitive info like all push subscriptions here unless needed
      },
      // In a more complex app, you might issue a token here (e.g., JWT)
    });
  } catch (error) {
    console.error('Error during login process for user:', userId, error);
    res.status(500).json({ message: 'Server error during login.' });
  }
};

// Add other auth-related controller functions if needed, e.g., logout (though logout is mainly client-side for this app)
// export const logoutUser = (req, res) => {
//   // For a stateless API, logout might involve clearing client-side tokens/sessions.
//   // If using server-side sessions, you'd clear them here.
//   res.status(200).json({ message: 'Logout successful (conceptual).' });
// };
