// frontend/src/services/api.js

// Define the base URL for your backend API.
// It's good practice to use an environment variable for this.
// For local development, this might be 'http://localhost:3001/api'.
// For Vercel, this will be your deployed backend URL.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'; // Default to /api if not set

/**
 * Helper function to handle API responses.
 * @param {Response} response - The fetch API Response object.
 * @returns {Promise<any>} - A promise that resolves with the JSON data or rejects with an error.
 */
async function handleResponse(response) {
  if (!response.ok) {
    // Try to parse error message from backend if available
    let errorMessage = `HTTP error! status: ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch (e) {
      // Ignore if error response is not JSON
    }
    console.error('API Error:', errorMessage, 'Full response:', response);
    throw new Error(errorMessage);
  }
  // Check if response has content before trying to parse as JSON
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.indexOf("application/json") !== -1) {
    return response.json();
  } else {
    return response.text(); // Or handle as appropriate for non-JSON responses
  }
}

/**
 * Sends the push notification subscription to the backend server.
 * @param {PushSubscription} subscription - The PushSubscription object.
 * @param {string} userId - The ID of the current user (e.g., 'Shivam' or 'Arya').
 * @returns {Promise<any>} - A promise that resolves with the server's response.
 */
export async function sendPushSubscriptionToServer(subscription, userId) {
  if (!subscription) {
    console.error('sendPushSubscriptionToServer: Subscription object is null or undefined.');
    return Promise.reject(new Error('Subscription object is required.'));
  }
  if (!userId) {
    console.error('sendPushSubscriptionToServer: userId is null or undefined.');
    return Promise.reject(new Error('User ID is required.'));
  }

  console.log('Sending push subscription to server:', subscription, 'for user:', userId);

  try {
    const response = await fetch(`${API_BASE_URL}/push/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ subscription, userId }),
    });
    return handleResponse(response);
  } catch (error) {
    console.error('Error sending push subscription to server:', error);
    throw error; // Re-throw the error to be caught by the caller
  }
}

/**
 * (Optional) Sends a request to the server to remove a push notification subscription.
 * @param {string} endpoint - The endpoint URL of the subscription to remove.
 * @param {string} userId - The ID of the current user.
 * @returns {Promise<any>} - A promise that resolves with the server's response.
 */
export async function removePushSubscriptionFromServer(endpoint, userId) {
   if (!endpoint) {
    console.error('removePushSubscriptionFromServer: Endpoint is null or undefined.');
    return Promise.reject(new Error('Subscription endpoint is required.'));
  }
   if (!userId) {
    console.error('removePushSubscriptionFromServer: userId is null or undefined.');
    return Promise.reject(new Error('User ID is required.'));
  }

  console.log('Requesting server to remove push subscription:', endpoint, 'for user:', userId);

  try {
    const response = await fetch(`${API_BASE_URL}/push/unsubscribe`, {
      method: 'POST', // Or DELETE, depending on your API design
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ endpoint, userId }),
    });
    return handleResponse(response);
  } catch (error) {
    console.error('Error removing push subscription from server:', error);
    throw error;
  }
}

// You can add other API functions here as needed, for example:
// - fetchMessageHistory(userId, recipientId)
// - reportActivity(userId)
// etc.
