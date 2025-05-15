// backend/models/User.js
import mongoose from 'mongoose';

// Define the structure for a Push Subscription.
// This matches the structure of the PushSubscription object from the browser's Push API.
const PushSubscriptionSchema = new mongoose.Schema({
  endpoint: { type: String, required: true, unique: true }, // Unique endpoint URL from the push service
  expirationTime: { type: Date, default: null }, // Optional: when the subscription expires
  keys: {
    p256dh: { type: String, required: true }, // Public key for message encryption
    auth: { type: String, required: true },   // Authentication secret
  },
}, { _id: false }); // _id: false because this will be an array embedded in User

const UserSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true, // This automatically creates a unique index on userId
    enum: ['Shivam', 'Arya'], // Ensures only these two users can be created
  },
  // A user can have multiple push subscriptions (e.g., for different devices or browsers)
  pushSubscriptions: [PushSubscriptionSchema],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  // You could add other fields here if needed, like lastLogin, etc.
});

// Optional: Ensure users are created if they don't exist (useful for a fixed set of users)
// This can be run once when the application starts, or you can handle user creation/retrieval in your auth logic.
UserSchema.statics.findOrCreate = async function(userId) {
  if (userId !== 'Shivam' && userId !== 'Arya') {
    throw new Error('Invalid userId for findOrCreate. Must be "Shivam" or "Arya".');
  }
  try {
    let user = await this.findOne({ userId: userId });
    if (!user) {
      user = await this.create({ userId: userId, pushSubscriptions: [] });
      console.log(`User '${userId}' created.`);
    }
    return user;
  } catch (error) {
    console.error(`Error in findOrCreate for user '${userId}':`, error);
    throw error;
  }
};


// REMOVE OR COMMENT OUT THE LINE BELOW:
// UserSchema.index({ userId: 1 }); // This line is redundant if unique:true is used above

const User = mongoose.model('User', UserSchema);

export default User;
