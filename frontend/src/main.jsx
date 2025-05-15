// frontend/src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// We don't need to import Tailwind CSS here if it's loaded via CDN in index.html
// If you were using a PostCSS setup with Vite, you'd import your main CSS file (e.g., './index.css') here.

// --- Service Worker Registration ---
// We'll register the service worker here.
// It's good practice to do this after the main app component is mounted or on window load
// to avoid delaying the initial app render.

const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      // The service worker file (sw.js) is in the public folder,
      // so its path is relative to the root of the site.
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/', // Scope of the service worker
      });
      if (registration.installing) {
        console.log('Service worker installing');
      } else if (registration.waiting) {
        console.log('Service worker installed');
      } else if (registration.active) {
        console.log('Service worker active');
      }
      console.log('Service Worker registered successfully with scope:', registration.scope);
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  } else {
    console.log('Service Worker not supported in this browser.');
  }
};

// Register the service worker when the window is loaded.
// You could also tie this to a specific user action or after login if preferred.
window.addEventListener('load', () => {
  registerServiceWorker();
});


// Get the root DOM element
const rootElement = document.getElementById('root');

// Create a React root
const root = ReactDOM.createRoot(rootElement);

// Render the App component
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
