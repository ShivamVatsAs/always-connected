// frontend/src/components/Auth/PasswordPrompt.jsx
import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext'; // Import the useAuth hook

// Reusable Button component (can be shared or defined locally)
const ActionButton = ({ onClick, children, bgColor = 'bg-pink-500', hoverBgColor = 'hover:bg-pink-600', type = 'button', disabled = false }) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={`w-full ${bgColor} ${hoverBgColor} text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-pink-400 focus:ring-opacity-75 transition-all duration-150 ease-in-out transform hover:-translate-y-0.5 active:translate-y-0 active:shadow-inner disabled:opacity-50 disabled:cursor-not-allowed`}
  >
    {children}
  </button>
);

// Reusable Input component (can be shared or defined locally)
const PasswordInput = ({ value, onChange, placeholder = "Password" }) => (
  <input
    type="password"
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    className="w-full px-4 py-3 mb-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-400 focus:border-transparent outline-none shadow-sm transition-colors duration-150 ease-in-out"
    autoComplete="current-password"
  />
);

function PasswordPrompt({ user, onLoginSuccess, onBack }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth(); // Get the login function from AuthContext

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(''); // Clear previous errors
    setIsLoading(true);

    if (!password) {
      setError('Password cannot be empty.');
      setIsLoading(false);
      return;
    }

    // Use the login function from AuthContext
    const loginSuccessful = login(user, password); // login now directly returns true/false

    if (loginSuccessful) {
      console.log(`PasswordPrompt: Login successful for ${user}`);
      onLoginSuccess(); // Call the callback passed from App.jsx
    } else {
      setError('Incorrect password. Please try again.');
      console.warn(`PasswordPrompt: Login failed for ${user}`);
    }
    setIsLoading(false);
  };

  // Styling
  const containerStyle = "text-center";
  const headingStyle = "text-2xl font-semibold mb-1 text-gray-700";
  const subHeadingStyle = "text-md text-gray-500 mb-6";
  const errorStyle = "text-red-500 text-sm mb-4";
  const backButtonStyle = "mt-6 text-sm text-pink-600 hover:text-pink-700 hover:underline";

  return (
    <div className={containerStyle}>
      <h2 className={headingStyle}>
        Welcome back, <span className="text-brand-pink-darker">{user}</span>!
      </h2>
      <p className={subHeadingStyle}>Enter the password to continue.</p>

      <form onSubmit={handleSubmit}>
        <PasswordInput
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className={errorStyle}>{error}</p>}
        <div className="space-y-3">
          <ActionButton
            type="submit"
            bgColor="bg-green-500"
            hoverBgColor="hover:bg-green-600"
            disabled={isLoading}
          >
            {isLoading ? 'Verifying...' : 'Unlock Our Space'}
          </ActionButton>
        </div>
      </form>

      <button onClick={onBack} className={backButtonStyle}>
        &larr; Choose a different user
      </button>
    </div>
  );
}

export default PasswordPrompt;
