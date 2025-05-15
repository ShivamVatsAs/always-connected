// frontend/src/App.jsx
import React, { useState, useEffect } from 'react';
import UserSelection from './components/Auth/UserSelection';
import PasswordPrompt from './components/Auth/PasswordPrompt';
import MainAppPage from './components/MainAppPage';
import { AuthProvider, useAuth } from './contexts/AuthContext'; // We'll create this context soon

// Notification Handler (optional, if you want a dedicated component for in-app notifications)
// import NotificationHandler from './components/Notifications/NotificationHandler';

// Styles for the main app container (can be adjusted)
const appContainerStyle = "min-h-screen bg-brand-off-white flex flex-col items-center justify-center p-4 text-gray-800";
const contentStyle = "w-full max-w-md bg-white p-6 sm:p-8 rounded-xl shadow-xl"; // Added sm:p-8 for slightly more padding on small screens and up

function AppContent() {
  // This state will determine which user is trying to log in
  const [selectedUser, setSelectedUser] = useState(null); // null, 'Shivam', or 'Arya'
  // This state will track if the password has been successfully entered
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // This state will hold the actual logged-in user object/name after successful auth
  const [currentUser, setCurrentUser] = useState(null);

  // Simulate checking for a logged-in user from localStorage on initial load
  // In a real app, you might have a token or session to verify
  useEffect(() => {
    const storedUser = localStorage.getItem('alwaysConnectedUser');
    const storedAuth = localStorage.getItem('alwaysConnectedAuthenticated');

    if (storedUser && storedAuth === 'true') {
      setSelectedUser(storedUser);
      setIsAuthenticated(true);
      setCurrentUser(storedUser); // Set the current user based on localStorage
    }
  }, []);


  const handleUserSelect = (user) => {
    setSelectedUser(user);
  };

  const handleLoginSuccess = (user) => {
    setIsAuthenticated(true);
    setCurrentUser(user); // Set the actual logged-in user
    localStorage.setItem('alwaysConnectedUser', user);
    localStorage.setItem('alwaysConnectedAuthenticated', 'true');
  };

  const handleLogout = () => {
    setSelectedUser(null);
    setIsAuthenticated(false);
    setCurrentUser(null);
    localStorage.removeItem('alwaysConnectedUser');
    localStorage.removeItem('alwaysConnectedAuthenticated');
    // Also, consider unsubscribing from push notifications here or clearing relevant server-side session
    console.log("User logged out.");
  };

  // Render logic based on authentication state
  if (!selectedUser) {
    // Step 1: Show UserSelection if no user has been chosen yet
    return (
      <div className={appContainerStyle}>
        <div className={contentStyle}>
          <UserSelection onUserSelect={handleUserSelect} />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Step 2: Show PasswordPrompt if a user is selected but not yet authenticated
    return (
      <div className={appContainerStyle}>
        <div className={contentStyle}>
          <PasswordPrompt
            user={selectedUser}
            onLoginSuccess={() => handleLoginSuccess(selectedUser)}
            onBack={() => setSelectedUser(null)} // Allow going back to user selection
          />
        </div>
      </div>
    );
  }

  // Step 3: Show the MainAppPage if authenticated
  // We pass currentUser and handleLogout to MainAppPage
  return (
    <MainAppPage
      currentUser={currentUser}
      onLogout={handleLogout}
    />
    // Optional: Include a NotificationHandler for in-app visual feedback of messages
    // <NotificationHandler />
  );
}

// Main App component that includes the AuthProvider
export default function App() {
  return (
    <AuthProvider> {/* AuthProvider will wrap AppContent */}
      <AppContent />
    </AuthProvider>
  );
}