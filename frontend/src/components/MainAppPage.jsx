// frontend/src/components/MainAppPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  requestNotificationPermission,
  subscribeUserToPush,
  getExistingSubscription,
  isPushSupported
} from '../utils/pushNotifications'; // Corrected path
import { sendPushSubscriptionToServer } from '../services/api'; // Corrected path

// --- Reusable UI Components ---
const PredefinedButton = ({ onClick, children, color = "pink" }) => {
  const colors = {
    pink: "bg-pink-500 hover:bg-pink-600 focus:ring-pink-400",
    lavender: "bg-purple-400 hover:bg-purple-500 focus:ring-purple-300",
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
  const [messages, setMessages] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState('Checking...');
  const [isSubscribed, setIsSubscribed] = useState(false);

  const ws = useRef(null);

  const predefinedMessages = [
    { text: "Love you", id: "love_you", color: "rose" },
    { text: "Miss you", id: "miss_you", color: "pink" },
    { text: "Always", id: "always", color: "lavender" },
    { text: "My heart", id: "my_heart", color: "rose" },
    { text: "Thinking of you", id: "thinking_of_you", color: "pink" },
    { text: "Can't wait", id: "cant_wait", color: "teal" },
    { text: "Soon", id: "soon", color: "lavender" },
  ];

  const recipient = currentUser === 'Shivam' ? 'Arya' : 'Shivam';

  // Debug: Log messages state whenever it changes
  useEffect(() => {
    console.log("Messages state updated:", messages);
  }, [messages]);

  useEffect(() => {
    if (!currentUser) return;

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // VITE_BACKEND_WS_URL should be like wss://your-backend.onrender.com (no port for standard deployments)
    const backendWsUrl = import.meta.env.VITE_BACKEND_WS_URL || `${wsProtocol}//localhost:3001`;


    console.log(`MainAppPage: Connecting to WebSocket server at ${backendWsUrl} for user ${currentUser}`);
    ws.current = new WebSocket(`${backendWsUrl}?userId=${currentUser}`);

    ws.current.onopen = () => {
      console.log(`WebSocket connected for ${currentUser}`);
    };

    ws.current.onmessage = (event) => {
      try {
        const receivedMsg = JSON.parse(event.data);
        console.log('MAINAPPDEBUG: WebSocket message received:', receivedMsg);

        if (receivedMsg.type === 'error') {
          console.error('Error message from WebSocket server:', receivedMsg.message);
          setMessages((prevMessages) => [
            ...prevMessages,
            {
              id: Date.now().toString(),
              text: `Server error: ${receivedMsg.message}`,
              sender: "System",
              timestamp: new Date().toISOString(),
              isOwnMessage: false,
              type: 'error'
            }
          ]);
          return;
        }

        if (receivedMsg.type === 'connectionAck') {
            console.log('Connection Acknowledged by server:', receivedMsg.message);
            if (ws.current && ws.current.readyState === WebSocket.OPEN) {
                 ws.current.send(JSON.stringify({ type: 'fetchHistory', user1: currentUser, user2: recipient }));
            }
            return;
        }

        // Handle new messages (predefined, custom, or echoed) and history
        if (receivedMsg.type === 'messageHistory') {
          console.log("MAINAPPDEBUG: Setting message history", receivedMsg.messages);
          setMessages(receivedMsg.messages.map(msg => ({
            ...msg,
            id: msg.id || msg._id,
            isOwnMessage: msg.sender === currentUser
          })));
        } else if (receivedMsg.type === 'newMessage' || receivedMsg.type === 'predefinedMessage' || receivedMsg.type === 'customMessage' || receivedMsg.type === 'messageEcho') {
           console.log("MAINAPPDEBUG: Adding new/echoed message", receivedMsg);
           setMessages((prevMessages) => {
             // Prevent adding duplicate if an optimistic update was done and server echoes with same ID
             if (prevMessages.some(m => m.id === receivedMsg.id)) {
                 console.log("MAINAPPDEBUG: Message with ID already exists, not re-adding", receivedMsg.id);
                 // Optionally, update the existing message if the echoed one has more details (e.g., Gemini note)
                 return prevMessages.map(m => m.id === receivedMsg.id ? {
                    ...m, // Keep original optimistic parts if any
                    ...receivedMsg, // Override with server's version (includes Gemini note, final timestamp)
                    isOwnMessage: receivedMsg.sender === currentUser // Ensure this is set correctly
                 } : m);
             }
             const newMsg = {
                ...receivedMsg,
                id: receivedMsg.id || Date.now().toString(),
                sender: receivedMsg.sender,
                timestamp: receivedMsg.timestamp || new Date().toISOString(),
                isOwnMessage: receivedMsg.sender === currentUser
              };
             console.log("MAINAPPDEBUG: Appending new message to state:", newMsg);
             return [...prevMessages, newMsg];
           });
        } else {
            console.log("MAINAPPDEBUG: Received unhandled message type", receivedMsg.type);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message or updating state:', error);
      }
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setMessages((prev) => [...prev, { text: "WebSocket connection error. Please refresh.", sender: "System", timestamp: new Date().toISOString(), isOwnMessage: false, type: 'error', id: 'wsError' }]);
    };

    ws.current.onclose = () => {
      console.log(`WebSocket disconnected for ${currentUser}`);
    };

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [currentUser, recipient]);

  const sendMessage = (messageContent, type = 'custom') => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      console.error('WebSocket is not connected.');
      setMessages(prev => [...prev, { id: 'sendError', text: "Error: Not connected. Message not sent.", sender: "System", timestamp: new Date().toISOString(), isOwnMessage: false, type: 'error' }]);
      return;
    }

    setIsSending(true);
    const messagePayload = {
      type: type === 'predefined' ? 'predefinedMessage' : 'customMessage',
      text: messageContent,
      sender: currentUser,
      recipient: recipient,
    };

    ws.current.send(JSON.stringify(messagePayload));
    console.log('Message sent via WebSocket:', messagePayload);

    if (type === 'custom') {
      setCustomMessage('');
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
        } else {
          setIsSubscribed(false);
          if (Notification.permission === 'granted') {
            // Permission was granted previously, but no subscription found. Maybe offer to re-subscribe.
            setNotificationStatus('Permission granted, but not subscribed. Try enabling notifications.');
          } else {
            setNotificationStatus(`Click to enable notifications. (${Notification.permission})`);
          }
        }
      } catch (error) {
        console.error("Error checking push subscription:", error);
        setNotificationStatus('Error checking notification status.');
      }
    };
    if (currentUser) {
        checkSubscription();
    }
  }, [currentUser, isSubscribed]); // Added isSubscribed to re-check if it changes

  const handleSubscribeToPush = async () => {
    if (!isPushSupported() || !currentUser) return;

    setNotificationStatus('Processing...');
    try {
      const permission = await requestNotificationPermission();
      if (permission === 'granted') {
        setNotificationStatus('Permission granted. Subscribing...');
        const subscription = await subscribeUserToPush();
        if (subscription) {
          await sendPushSubscriptionToServer(subscription, currentUser);
          setIsSubscribed(true); // This should trigger the useEffect above to update status
          setNotificationStatus('Successfully subscribed to notifications!');
          console.log('User subscribed to push:', subscription);
        } else {
          setNotificationStatus('Failed to subscribe. Check console for VAPID key errors. Try again?');
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
    logout();
  };

  const messagesEndRef = useRef(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(scrollToBottom, [messages]);

  console.log("MAINAPPDEBUG: Rendering MainAppPage, messages.length:", messages.length);

  if (!currentUser) {
    return <div className="p-8 text-center">Loading user...</div>;
  }

  return (
    <div className="min-h-screen bg-brand-beige flex flex-col items-center justify-start p-2 sm:p-4">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl flex flex-col h-[95vh] sm:h-[90vh] overflow-hidden">
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

        <main className="flex-grow p-3 sm:p-4 overflow-y-auto bg-gray-50">
          {/* Debug: Always show messages if any, or the "No messages" text */}
          {console.log("MAINAPPDEBUG: In JSX, messages.length:", messages.length)}
          {messages.length === 0 ? (
            <p className="text-center text-gray-500 mt-10">No messages yet. Send one!</p>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`mb-3 p-3 rounded-lg max-w-[80%] sm:max-w-[70%] break-words ${
                  msg.isOwnMessage
                    ? 'bg-pink-100 text-pink-800 ml-auto text-right shadow'
                    : 'bg-purple-100 text-purple-800 mr-auto text-left shadow'
                }`}
              >
                {!msg.isOwnMessage && msg.sender !== "System" && <p className="text-xs font-semibold mb-1">{msg.sender}:</p>}
                <p className="text-sm sm:text-base">{msg.text}</p>
                {msg.sender !== "System" && msg.timestamp && <p className="text-xs text-gray-500 mt-1">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </main>

        {/* Push Notification UI */}
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
