// backend/server.js
import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws'; // Ensure 'ws' is imported correctly
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
// path and fileURLToPath are not used in this snippet, remove if not used elsewhere
// import path from 'path';
// import { fileURLToPath } from 'url';

import User from './models/User.js';
import Message from './models/Message.js';
import { processAndSaveMessage, getMessageHistory } from './controllers/messageController.js'; // Import getMessageHistory

import authRoutes from './routes/authRoutes.js';
import pushRoutes from './routes/pushRoutes.js';
import messageRoutes from './routes/messageRoutes.js';

dotenv.config();

const PORT = process.env.PORT || 3001;
const MONGO_URI = process.env.MONGO_URI;
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (!MONGO_URI) {
  console.error('FATAL ERROR: MONGO_URI is not defined in .env file.');
  process.exit(1);
}
if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.warn(
    'WARNING: VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY is not defined in .env. Push notifications will not work.'
  );
}

const app = express();
const server = http.createServer(app);

const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    // Add your Vercel frontend deployment URL here
  ],
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose.connect(MONGO_URI)
  .then(() => console.log('Successfully connected to MongoDB.'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

const wss = new WebSocketServer({ server });
const activeConnections = new Map(); // Map<userId, Set<WebSocket>>

wss.on('connection', (ws, req) => {
  const urlParams = new URLSearchParams(req.url.substring(req.url.indexOf('?')));
  const userId = urlParams.get('userId');

  if (!userId || (userId !== 'Shivam' && userId !== 'Arya')) {
    console.log('WebSocket connection rejected: Invalid or missing userId.');
    ws.send(JSON.stringify({ type: 'error', message: 'Invalid user ID for WebSocket connection.' }));
    ws.terminate();
    return;
  }

  console.log(`WebSocket client connected: ${userId}`);

  if (!activeConnections.has(userId)) {
    activeConnections.set(userId, new Set());
  }
  activeConnections.get(userId).add(ws);

  // Send connection acknowledgment
  ws.send(JSON.stringify({ type: 'connectionAck', message: `Successfully connected as ${userId}.` }));

  ws.on('message', async (message) => {
    console.log(`Received message from ${userId}: ${message}`);
    let parsedMessage;
    try {
      parsedMessage = JSON.parse(message);
    } catch (error) {
      console.error('Failed to parse WebSocket message as JSON:', message, error);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format.' }));
      return;
    }

    const { type, text, recipient, sender, user1, user2: msgUser2 } = parsedMessage; // msgUser2 to avoid conflict with function-scoped user2

    if (type === 'fetchHistory') {
        if (!user1 || !msgUser2) {
            ws.send(JSON.stringify({ type: 'error', message: 'User IDs missing for fetchHistory.' }));
            return;
        }
        try {
            // Re-use the getMessageHistory logic but adapt it for WebSocket
            const messagesFromDb = await Message.find({
              $or: [
                { sender: user1, recipient: msgUser2 },
                { sender: msgUser2, recipient: user1 },
              ],
            })
            .sort({ timestamp: 1 })
            .limit(100);

            const formattedMessages = messagesFromDb.map(msg => ({
              id: msg._id.toString(),
              sender: msg.sender,
              recipient: msg.recipient,
              type: msg.type,
              text: msg.type === 'predefinedMessage'
                    ? `${msg.originalText} - ${msg.geminiNote || '(Note not available)'}`
                    : msg.customText,
              originalText: msg.originalText,
              geminiNote: msg.geminiNote,
              customText: msg.customText,
              timestamp: msg.timestamp.toISOString(),
            }));
            ws.send(JSON.stringify({ type: 'messageHistory', messages: formattedMessages }));
            console.log(`Sent message history for ${user1} and ${msgUser2} to ${userId}`);
        } catch (historyError) {
            console.error('Error fetching message history for WebSocket:', historyError);
            ws.send(JSON.stringify({ type: 'error', message: 'Failed to fetch message history.' }));
        }
        return; // Done handling fetchHistory
    }


    // For sending new messages
    if (sender !== userId) {
        console.warn(`Message sender mismatch. Expected ${userId}, got ${sender}. Ignoring.`);
        ws.send(JSON.stringify({ type: 'error', message: 'Sender mismatch.' }));
        return;
    }
    if (!recipient || (recipient !== 'Shivam' && recipient !== 'Arya') || recipient === sender) {
        console.warn(`Invalid recipient: ${recipient}. Ignoring message.`);
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid recipient.' }));
        return;
    }
    if (!type || !text) {
        ws.send(JSON.stringify({ type: 'error', message: 'Message type or text missing.' }));
        return;
    }

    try {
      const processedMessageForBroadcast = await processAndSaveMessage({
        sender: sender,
        recipient: recipient,
        type: type,
        text: text, // Core content for Gemini or custom text
      });

      // Broadcast to recipient's WebSocket connections
      const recipientConnections = activeConnections.get(processedMessageForBroadcast.recipient);
      if (recipientConnections) {
        recipientConnections.forEach(client => {
          if (client.readyState === ws.OPEN) { // ws.OPEN or WebSocket.OPEN
            client.send(JSON.stringify(processedMessageForBroadcast));
            console.log(`Processed message sent via WebSocket to ${processedMessageForBroadcast.recipient}`);
          }
        });
      } else {
        console.log(`Recipient ${processedMessageForBroadcast.recipient} is not connected via WebSocket.`);
      }

      // Echo message back to sender so their UI updates consistently
      // The frontend's optimistic update might differ slightly (e.g., no Gemini note yet)
      // Sending the processed message ensures consistency.
      ws.send(JSON.stringify(processedMessageForBroadcast));
      console.log(`Processed message echoed back to sender ${sender}`);


    } catch (processingError) {
      console.error('Error processing and saving message:', processingError.message);
      ws.send(JSON.stringify({ type: 'error', message: `Failed to process message: ${processingError.message}` }));
    }
  });

  ws.on('close', () => {
    console.log(`WebSocket client disconnected: ${userId}`);
    if (activeConnections.has(userId)) {
      activeConnections.get(userId).delete(ws);
      if (activeConnections.get(userId).size === 0) {
        activeConnections.delete(userId);
      }
    }
  });

  ws.on('error', (error) => {
    console.error(`WebSocket error for ${userId}:`, error);
    if (activeConnections.has(userId)) {
      activeConnections.get(userId).delete(ws);
      if (activeConnections.get(userId).size === 0) {
        activeConnections.delete(userId);
      }
    }
  });
});

console.log('WebSocket server initialized.');

app.use('/api/auth', authRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/messages', messageRoutes);

app.get('/', (req, res) => {
  res.send('Always Connected Backend is running!');
});

app.use((err, req, res, next) => {
  console.error("Global Error Handler:", err.stack || err);
  res.status(err.status || 500).json({
    message: err.message || 'An unexpected error occurred.',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

server.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log(`WebSocket server is listening on ws://localhost:${PORT}`);
});
