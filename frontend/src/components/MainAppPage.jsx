// frontend/src/components/MainAppPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../src/contexts/AuthContext';
import {
  requestNotificationPermission,
  subscribeUserToPush,
  getExistingSubscription,
  isPushSupported
} from '../../src/utils/pushNotifications'; // We'll create this util file soon
import { sendPushSubscriptionToServer } from '../../src/services/api'; // We'll create this API service soon

// --- Reusable UI Components (can be moved to a UI folder later) ---
const PredefinedButton = ({ onClick, children, color = "pink" }) => {
  const colors = {
    pink: "bg-pink-500 hover:bg-pink-600 focus:ring-pink-400",
    lavender: "bg-purple-400 hover:bg-purple-500 focus:ring-purple-300", // A bit like lavender
    rose: "bg-rose-500 hover:bg-rose-600 focus:ring-rose-400",
    teal: "bg-teal-400 hover:bg-teal-500 focus:ring-teal-300"
  };
  return (
    <button
      onClick={onClick}
      className={`w-full sm:w-auto text-sm sm:text-base ${colors[color] || colors.pink} text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-opacity-75 transition-all duration-150 ease-in-out transform hover:-translate-y-0.5 active:translate-y-0 active:shadow-inner mb-2 sm:mb-0 sm:mr-2`}
    >
      {children}
    </button>
  );
};

const CustomMessageInput = ({ value, onChange, placeholder }) => (
  <textarea
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    rows="3"
    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-400 focus:border-transparent outline-none shadow-sm resize-none"
  />
);

const SendButton = ({ onClick, disabled, children }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="w-full mt-2 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-75 transition-all duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
  >
    {children}
  </button>
);
// --- End Reusable UI Components ---


function MainAppPage() {
  const { currentUser, logout } = useAuth();
  const [customMessage, setCustomMessage] = useState('');
  const [messages, setMessages] = useState([]); // To store and display messages
  const [isSending, setIsSending] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState('Checking...');
  const [isSubscribed, setIsSubscribed] = useState(false);

  const ws = useRef(null); // WebSocket reference

  const predefinedMessages = [
    { text: "Love you", id: "love_you", color: "rose" },
    { text: "Miss you", id: "miss_you", color: "pink" },
    { text: "Always", id: "always", color: "lavender" },
    { text: "My heart", id: "my_heart", color: "rose" }, // Or "My everything" / "My world"
    { text: "Thinking of you", id: "thinking_of_you", color: "pink" },
    { text: "Can't wait", id: "cant_wait", color: "teal" },
    { text: "Soon", id: "soon", color: "lavender" },
  ];

  const recipient = currentUser === 'Shivam' ? 'Arya' : 'Shivam';

  // --- WebSocket Logic (Placeholder - to be implemented fully) ---
  useEffect(() => {
    if (!currentUser) return;

    // Determine WebSocket URL based on environment
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // For local development, VITE_BACKEND_WS_URL could be ws://localhost:3001
    // For Vercel, you'd use your deployed backend's WebSocket URL.
    // Vercel doesn't directly support WebSockets in Serverless Functions for long-lived connections.
    // You might need a separate service or a platform that supports WebSockets (e.g., Heroku, Render, or a dedicated WebSocket service).
    // For now, let's assume a local setup or a compatible Vercel setup.
    const backendWsUrl = import.meta.env.VITE_BACKEND_WS_URL || `${wsProtocol}//${window.location.host.replace(/:\d+$/, '')}:3001`;


    console.log(`MainAppPage: Connecting to WebSocket server at ${backendWsUrl} for user ${currentUser}`);
    ws.current = new WebSocket(`${backendWsUrl}?userId=${currentUser}`);

    ws.current.onopen = () => {
      console.log(`WebSocket connected for ${currentUser}`);
      // Optionally send an initial message or fetch history
      // ws.current.send(JSON.stringify({ type: 'fetchHistory', recipient: recipient }));
    };

    ws.current.onmessage = (event) => {
      try {
        const receivedMsg = JSON.parse(event.data);
        console.log('WebSocket message received:', receivedMsg);
        // Handle different message types (e.g., new message, history, error)
        if (receivedMsg.type === 'newMessage' || receivedMsg.type === 'predefinedMessage') {
           setMessages((prevMessages) => [
            ...prevMessages,
            {
              ...receivedMsg,
              sender: receivedMsg.sender, // Ensure sender is part of the payload
              timestamp: receivedMsg.timestamp || new Date().toISOString(),
              isOwnMessage: receivedMsg.sender === currentUser
            }
          ]);
        } else if (receivedMsg.type === 'messageHistory') {
          setMessages(receivedMsg.messages.map(msg => ({
            ...msg,
            isOwnMessage: msg.sender === currentUser
          })));
        }
      } catch (error) {
        console.error('Error parsing WebSocket message or updating state:', error);
      }
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.current.onclose = () => {
      console.log(`WebSocket disconnected for ${currentUser}`);
      // Optionally implement reconnection logic here
    };

    // Cleanup WebSocket connection on component unmount
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [currentUser, recipient]); // Reconnect if currentUser changes (e.g., on re-login)

  const sendMessage = (messageContent, type = 'custom') => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      console.error('WebSocket is not connected.');
      // Add to a queue or show an error
      setMessages(prev => [...prev, { text: "Error: Not connected. Message not sent.", sender: "System", timestamp: new Date().toISOString(), isOwnMessage: false, type: 'error' }]);
      return;
    }

    setIsSending(true);
    const messagePayload = {
      type: type === 'predefined' ? 'predefinedMessage' : 'customMessage',
      text: messageContent,
      sender: currentUser,
      recipient: recipient,
      timestamp: new Date().toISOString(),
    };

    ws.current.send(JSON.stringify(messagePayload));
    console.log('Message sent via WebSocket:', messagePayload);

    // Optimistically add to UI, or wait for ack from server
    // For simplicity, we'll wait for the server to echo it back via onmessage
    // If not echoing, add it here:
    // setMessages((prevMessages) => [...prevMessages, { ...messagePayload, isOwnMessage: true }]);

    if (type === 'custom') {
      setCustomMessage(''); // Clear custom message input
    }
    setIsSending(false);
  };

  const handleSendPredefined = (messageText) => {
    sendMessage(messageText, 'predefined');
  };

  const handleSendCustom = () => {
    if (customMessage.trim() === '') return;
    sendMessage(customMessage.trim(), 'custom');
  };

  // --- Push Notification Logic ---
  useEffect(() => {
    if (!isPushSupported()) {
      setNotificationStatus('Push notifications not supported by this browser.');
      return;
    }

    const checkSubscription = async () => {
      try {
        const existingSub = await getExistingSubscription();
        if (existingSub) {
          setIsSubscribed(true);
          setNotificationStatus(`Subscribed for notifications. (${Notification.permission})`);
          // Optionally, re-send to server if you want to ensure it's up-to-date
          // await sendPushSubscriptionToServer(existingSub, currentUser);
        } else {
          setIsSubscribed(false);
          setNotificationStatus(`Click to enable notifications. (${Notification.permission})`);
        }
      } catch (error) {
        console.error("Error checking push subscription:", error);
        setNotificationStatus('Error checking notification status.');
      }
    };
    checkSubscription();
  }, [currentUser]); // Re-check if user changes

  const handleSubscribeToPush = async () => {
    if (!isPushSupported() || !currentUser) return;

    setNotificationStatus('Processing...');
    try {
      const permission = await requestNotificationPermission();
      if (permission === 'granted') {
        setNotificationStatus('Permission granted. Subscribing...');
        const subscription = await subscribeUserToPush();
        if (subscription) {
          await sendPushSubscriptionToServer(subscription, currentUser); // Send to backend
          setIsSubscribed(true);
          setNotificationStatus('Successfully subscribed to notifications!');
          console.log('User subscribed to push:', subscription);
        } else {
          setNotificationStatus('Failed to subscribe. Try again?');
          setIsSubscribed(false);
        }
      } else if (permission === 'denied') {
        setNotificationStatus('Notification permission denied. Please enable in browser settings.');
        setIsSubscribed(false);
      } else {
        setNotificationStatus('Notification permission not granted (dismissed).');
        setIsSubscribed(false);
      }
    } catch (error) {
      console.error('Error during push subscription process:', error);
      setNotificationStatus(`Subscription error: ${error.message}. Try again?`);
      setIsSubscribed(false);
    }
  };


  const handleLogout = () => {
    // Consider unsubscribing from push or clearing server-side session related to this device
    // For example, if the push subscription is tied to this session.
    // For now, AuthContext's logout clears localStorage.
    logout();
    // The App.jsx will then redirect to the login screen.
  };

  // Scroll to bottom of messages when new messages arrive
  const messagesEndRef = useRef(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(scrollToBottom, [messages]);


  if (!currentUser) {
    return <div className="p-8 text-center">Loading user...</div>; // Should be handled by App.jsx routing
  }

  return (
    <div className="min-h-screen bg-brand-beige flex flex-col items-center justify-start p-2 sm:p-4">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl flex flex-col h-[95vh] sm:h-[90vh] overflow-hidden">
        {/* Header */}
        <header className="bg-brand-pink text-white p-4 sm:p-5 shadow-md flex justify-between items-center">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Always Connected</h1>
            <p className="text-xs sm:text-sm">Sending as: <span className="font-semibold">{currentUser}</span> (to {recipient})</p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-3 sm:px-4 rounded-lg shadow hover:shadow-md transition-colors text-xs sm:text-sm"
          >
            Logout
          </button>
        </header>

        {/* Message Display Area */}
        <main className="flex-grow p-3 sm:p-4 overflow-y-auto bg-gray-50">
          {messages.length === 0 && (
            <p className="text-center text-gray-500 mt-10">No messages yet. Send one!</p>
          )}
          {messages.map((msg, index) => (
            <div
              key={msg.id || index} // Prefer a unique msg.id from server
              className={`mb-3 p-3 rounded-lg max-w-[80%] sm:max-w-[70%] break-words ${
                msg.isOwnMessage
                  ? 'bg-pink-100 text-pink-800 ml-auto text-right shadow'
                  : 'bg-purple-100 text-purple-800 mr-auto text-left shadow'
              }`}
            >
              {!msg.isOwnMessage && <p className="text-xs font-semibold mb-1">{msg.sender || 'Unknown'}:</p>}
              <p className="text-sm sm:text-base">{msg.text || (msg.originalText + ' ' + msg.geminiNote)}</p>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          ))}
          <div ref={messagesEndRef} /> {/* For auto-scrolling */}
        </main>

        {/* Push Notification Subscription UI */}
        {!isSubscribed && isPushSupported() && Notification.permission !== 'denied' && (
          <div className="p-3 bg-yellow-100 border-t border-b border-yellow-300 text-center">
            <p className="text-sm text-yellow-800 mb-2">{notificationStatus}</p>
            <button
              onClick={handleSubscribeToPush}
              className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-4 rounded-lg text-sm"
            >
              Enable Notifications
            </button>
          </div>
        )}
        {Notification.permission === 'denied' && (
             <div className="p-3 bg-red-100 border-t border-b border-red-300 text-center">
                <p className="text-sm text-red-700">{notificationStatus}</p>
             </div>
        )}


        {/* Message Input Area */}
        <footer className="bg-white p-3 sm:p-4 border-t border-gray-200 shadow-inner">
          <div className="mb-3 text-center sm:text-left">
            <p className="text-sm text-gray-600 mb-2">Quick thoughts for {recipient}:</p>
            <div className="flex flex-wrap justify-center sm:justify-start">
              {predefinedMessages.map((msg) => (
                <PredefinedButton key={msg.id} onClick={() => handleSendPredefined(msg.text)} color={msg.color}>
                  {msg.text}
                </PredefinedButton>
              ))}
            </div>
          </div>
          <div className="mt-2">
             <p className="text-sm text-gray-600 mb-1 text-center sm:text-left">Or type a custom message:</p>
            <CustomMessageInput
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder={`Type your message to ${recipient}...`}
            />
            <SendButton onClick={handleSendCustom} disabled={isSending || customMessage.trim() === ''}>
              {isSending ? 'Sending...' : `Send to ${recipient}`}
            </SendButton>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default MainAppPage;