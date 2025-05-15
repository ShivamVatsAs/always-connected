// backend/controllers/messageController.js
import Message from '../models/Message.js';
import { sendPushNotificationToUser } from './pushController.js'; // To send push notifications
import { getGeminiEnrichedNote } from '../services/geminiService.js'; // To get Gemini notes

/**
 * Saves a new message to the database and handles post-save actions
 * like sending push notifications and enriched content.
 * This function can be called from the WebSocket handler.
 *
 * @param {object} messageData - Object containing message details (sender, recipient, type, text, etc.)
 * @returns {Promise<object>} The saved message object, potentially enriched.
 * @throws {Error} If saving or processing fails.
 */
export const processAndSaveMessage = async (messageData) => {
  const { sender, recipient, type, text } = messageData; // 'text' is the core content

  if (!sender || !recipient || !type || !text) {
    throw new Error('Missing required message data (sender, recipient, type, text).');
  }
  if ((sender !== 'Shivam' && sender !== 'Arya') || (recipient !== 'Shivam' && recipient !== 'Arya')) {
    throw new Error('Invalid sender or recipient.');
  }
  if (sender === recipient) {
    throw new Error('Sender and recipient cannot be the same.');
  }

  let messageToSave = {
    sender,
    recipient,
    type,
    timestamp: new Date().toISOString(),
  };

  let pushNotificationText = text; // Default push text

  if (type === 'predefinedMessage') {
    try {
      const geminiNote = await getGeminiEnrichedNote(text, sender);
      messageToSave.originalText = text;
      messageToSave.geminiNote = geminiNote;
      // For the WebSocket message and push notification, we might want to combine them
      pushNotificationText = `${text} - ${sender} adds: "${geminiNote}"`;
      console.log(`Enriched predefined message for ${recipient}: ${pushNotificationText}`);
    } catch (geminiError) {
      console.error('Error getting enriched note from Gemini:', geminiError);
      // Fallback: save and send without Gemini note
      messageToSave.originalText = text;
      messageToSave.geminiNote = "(Could not generate a special note this time)";
      pushNotificationText = `${text} (from ${sender})`;
    }
  } else if (type === 'customMessage') {
    messageToSave.customText = text;
    pushNotificationText = `${sender} says: "${text}"`;
  } else {
    throw new Error('Invalid message type.');
  }

  try {
    const dbMessage = new Message(messageToSave);
    await dbMessage.save();
    console.log('Message saved to DB:', dbMessage._id);

    // After saving, trigger a push notification to the recipient
    const notificationPayload = {
      title: `New message from ${sender}`,
      body: pushNotificationText.length > 100 ? pushNotificationText.substring(0, 97) + "..." : pushNotificationText, // Keep it concise
      icon: '/icon-192x192.png', // Relative to frontend public folder
      data: {
        url: '/', // URL to open when notification is clicked
        sender: sender, // So frontend can know who sent it if needed
        messageId: dbMessage._id.toString(),
      },
      tag: `new-message-${sender}-${recipient}` // Tag to potentially stack or replace notifications
    };

    // Don't await this, let it run in the background
    sendPushNotificationToUser(recipient, notificationPayload)
      .then(result => console.log(`Push notification attempt to ${recipient}: ${result.message}`))
      .catch(err => console.error(`Error in sendPushNotificationToUser for ${recipient}:`, err));

    // Return the saved message (which includes the _id and potentially enriched content)
    // This is the object that will be broadcasted via WebSocket
    return {
        id: dbMessage._id.toString(), // Use string ID for frontend
        sender: dbMessage.sender,
        recipient: dbMessage.recipient,
        type: dbMessage.type,
        text: type === 'predefinedMessage' ? `${dbMessage.originalText} - ${dbMessage.geminiNote}` : dbMessage.customText,
        originalText: dbMessage.originalText, // For client to potentially display differently
        geminiNote: dbMessage.geminiNote,     // For client
        customText: dbMessage.customText,     // For client
        timestamp: dbMessage.timestamp.toISOString(),
    };

  } catch (dbError) {
    console.error('Error saving message to DB:', dbError);
    throw new Error('Failed to save message to database.');
  }
};


/**
 * Fetches message history between two users.
 * Users are identified by query parameters user1 and user2.
 */
export const getMessageHistory = async (req, res) => {
  const { user1, user2 } = req.query;

  if (!user1 || !user2) {
    return res.status(400).json({ message: 'Both user1 and user2 query parameters are required.' });
  }

  if ((user1 !== 'Shivam' && user1 !== 'Arya') || (user2 !== 'Shivam' && user2 !== 'Arya')) {
    return res.status(400).json({ message: 'Invalid user IDs. Must be Shivam or Arya.' });
  }

  try {
    const messages = await Message.find({
      $or: [
        { sender: user1, recipient: user2 },
        { sender: user2, recipient: user1 },
      ],
    })
    .sort({ timestamp: 1 }) // Sort by oldest first
    .limit(100); // Optionally limit the number of messages

    const formattedMessages = messages.map(msg => ({
      id: msg._id.toString(),
      sender: msg.sender,
      recipient: msg.recipient,
      type: msg.type,
      // Construct the display text based on type
      text: msg.type === 'predefinedMessage'
            ? `${msg.originalText} - ${msg.geminiNote || '(Note not available)'}`
            : msg.customText,
      originalText: msg.originalText,
      geminiNote: msg.geminiNote,
      customText: msg.customText,
      timestamp: msg.timestamp.toISOString(),
    }));

    res.status(200).json(formattedMessages);
  } catch (error) {
    console.error('Error fetching message history:', error);
    res.status(500).json({ message: 'Server error while fetching message history.' });
  }
};
