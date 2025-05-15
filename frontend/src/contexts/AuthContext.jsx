// frontend/src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

// 1. Create the Context
const AuthContext = createContext(null);

// Shared password (ideally, this would be handled more securely on a backend)
const SHARED_PASSWORD = 'arya143'; // As specified

// 2. Create a Provider Component
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null); // Stores 'Shivam' or 'Arya'
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true); // To handle initial check

  // Effect to check for existing authentication in localStorage on initial load
  useEffect(() => {
    console.log("AuthProvider: Checking localStorage for existing session...");
    try {
      const storedUser = localStorage.getItem('alwaysConnectedUser');
      const storedAuthStatus = localStorage.getItem('alwaysConnectedAuthenticated');

      if (storedUser && storedAuthStatus === 'true') {
        setCurrentUser(storedUser);
        setIsAuthenticated(true);
        console.log(`AuthProvider: Restored session for ${storedUser}`);
      } else {
        console.log("AuthProvider: No active session found in localStorage.");
      }
    } catch (error) {
      console.error("AuthProvider: Error reading from localStorage", error);
      // Ensure state is clean if localStorage access fails
      setCurrentUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('alwaysConnectedUser');
      localStorage.removeItem('alwaysConnectedAuthenticated');
    }
    setAuthLoading(false); // Finished initial auth check
  }, []);

  // Login function
  const login = (selectedUser, password) => {
    console.log(`AuthProvider: Attempting login for ${selectedUser}`);
    if (password === SHARED_PASSWORD) {
      setCurrentUser(selectedUser);
      setIsAuthenticated(true);
      localStorage.setItem('alwaysConnectedUser', selectedUser);
      localStorage.setItem('alwaysConnectedAuthenticated', 'true');
      console.log(`AuthProvider: Login successful for ${selectedUser}`);
      return true;
    }
    console.warn(`AuthProvider: Login failed for ${selectedUser} - incorrect password`);
    return false;
  };

  // Logout function
  const logout = () => {
    console.log(`AuthProvider: Logging out ${currentUser}`);
    setCurrentUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('alwaysConnectedUser');
    localStorage.removeItem('alwaysConnectedAuthenticated');
    // Here, you might also want to trigger unsubscription from push notifications
    // or send a request to the backend to clear any session-related data if applicable.
    console.log("AuthProvider: User logged out, localStorage cleared.");
  };

  // The value provided to consuming components
  const value = {
    currentUser,
    isAuthenticated,
    authLoading, // Provide loading state for UI to react if needed
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {/* Don't render children until initial auth check is complete to avoid UI flashes */}
      {!authLoading && children}
    </AuthContext.Provider>
  );
}

// 3. Create a custom hook to use the AuthContext
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined || context === null) {
    // This error is thrown if useAuth is used outside of an AuthProvider.
    // The 'null' check is because we initialize context with null.
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
