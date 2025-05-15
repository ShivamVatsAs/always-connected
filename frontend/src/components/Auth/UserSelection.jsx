// frontend/src/components/Auth/UserSelection.jsx
import React from 'react';

// Reusable Button component (we can create a more styled one later in UI/Button.jsx)
const ChoiceButton = ({ onClick, children, bgColor = 'bg-pink-500', hoverBgColor = 'bg-pink-600' }) => (
  <button
    onClick={onClick}
    className={`w-full ${bgColor} ${hoverBgColor} text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-pink-400 focus:ring-opacity-75 transition-all duration-150 ease-in-out mb-4 transform hover:-translate-y-0.5 active:translate-y-0 active:shadow-inner`}
  >
    {children}
  </button>
);

function UserSelection({ onUserSelect }) {
  // Styling for the container and heading
  const containerStyle = "text-center";
  const headingStyle = "text-3xl font-bold mb-2 text-gray-700";
  const subHeadingStyle = "text-md text-gray-500 mb-8";
  const heartIconStyle = "text-pink-500 mx-1 text-xl"; // For a little visual flair

  return (
    <div className={containerStyle}>
      <h1 className={headingStyle}>
        Always <span className="text-brand-pink-darker">Connected</span>
      </h1>
      <p className={subHeadingStyle}>
        Please choose who you are to continue.
      </p>
      <div className="space-y-4">
        <ChoiceButton
          onClick={() => onUserSelect('Shivam')}
          // Using Tailwind classes for specific button colors, can be customized
          bgColor="bg-sky-500" // Example: Blue for Shivam
          hoverBgColor="hover:bg-sky-600"
        >
          Continue as Shivam
        </ChoiceButton>
        <ChoiceButton
          onClick={() => onUserSelect('Arya')}
          bgColor="bg-rose-500" // Example: Rose for Arya
          hoverBgColor="hover:bg-rose-600"
        >
          Continue as Arya
        </ChoiceButton>
      </div>
      <p className="mt-10 text-sm text-gray-400">
        A special place for just us <span className={heartIconStyle}>&hearts;</span>
      </p>
    </div>
  );
}

export default UserSelection;
