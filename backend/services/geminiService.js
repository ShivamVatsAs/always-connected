// backend/services/geminiService.js
import dotenv from 'dotenv';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// Trying a different, generally available and recent model
const MODEL_NAME = "gemini-1.5-flash-latest"; // Changed model

if (!GEMINI_API_KEY) {
  console.warn(
    'WARNING: GEMINI_API_KEY is not defined in .env. Gemini API calls will be skipped, and fallback notes will be used.'
  );
}

let genAI;
let model;

if (GEMINI_API_KEY) {
  try {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: MODEL_NAME });
    console.log(`Google Generative AI SDK initialized successfully with model: ${MODEL_NAME}.`);
  } catch (error) {
    console.error("Failed to initialize Google Generative AI SDK:", error);
    genAI = null;
    model = null;
  }
}

const generationConfig = {
  temperature: 0.8,
  // topK: 1, // Often defaults are fine for these newer models
  // topP: 0.95,
  maxOutputTokens: 150, // Keep notes concise
};

const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

/**
 * Generates an enriched, heartfelt note using the Gemini API based on a predefined message and sender.
 *
 * @param {string} predefinedMessage - The short, predefined message (e.g., "Love you").
 * @param {string} senderName - The name of the sender (e.g., "Shivam").
 * @returns {Promise<string>} A promise that resolves to the Gemini-generated note, or a fallback note on error/missing key.
 */
export const getGeminiEnrichedNote = async (predefinedMessage, senderName) => {
  if (!GEMINI_API_KEY || !model) {
    console.log('Gemini API key not configured or SDK not initialized. Returning fallback note.');
    return `(A special thought from ${senderName}!)`;
  }

  const prompt = `
    You are a helpful assistant for a personal notifier app between two people who care deeply for each other.
    The sender, ${senderName}, has just sent the predefined message: "${predefinedMessage}".
    Your task is to generate a short, expressive, and heartfelt elaboration of this sentiment, as if it's an additional thought from ${senderName}.
    Make it sound personal and warm. Keep it concise, around 1-3 sentences.
    Do NOT repeat the predefined message itself in your response. Focus on elaborating the feeling behind it.
    Do NOT start with "${senderName} is thinking..." or "${senderName} wants to say...". Instead, phrase it more directly from their perspective or as an observation of their feeling.
    For example, if the message is "Miss you" and sender is Shivam, a good response might be: "Just a little reminder of how much space you occupy in his thoughts. He's already looking forward to when you're together again."
    Another example: If message is "Love you" and sender is Arya, a good response: "Her heart is full of warmth for you right now, a gentle reminder of the beautiful connection you share."

    Predefined Message: "${predefinedMessage}"
    Sender: ${senderName}
    Generated Elaboration:
  `;

  try {
    console.log(`Sending prompt to Gemini (${MODEL_NAME}) for "${predefinedMessage}" from ${senderName}`);
    
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig,
      safetySettings,
    });

    const response = result.response;
    
    // Check if response or candidates are undefined before trying to access text() or other properties
    if (!response) {
        console.warn('Gemini API returned no response object. Using fallback.');
        return `(${senderName} is sending lots of love!)`;
    }

    const generatedText = response.text();

    if (generatedText && generatedText.trim() !== "") {
      console.log('Gemini API Response Text:', generatedText.trim());
      return generatedText.trim();
    } else {
      console.warn('Gemini API returned an empty or no text response. Using fallback.');
      const candidate = response.candidates && response.candidates[0];
      if (candidate) {
        console.warn(`Candidate finish reason: ${candidate.finishReason}`);
        if (candidate.safetyRatings) {
            console.warn('Safety Ratings:', candidate.safetyRatings);
        }
      } else {
        console.warn('No candidates found in Gemini response.');
      }
      return `(${senderName} is sending lots of love!)`;
    }
  } catch (error) {
    console.error(`Error calling Gemini API (${MODEL_NAME}):`, error.message);
    // Log the full error object for more details if it's not a standard message
    if (!(error instanceof Error)) {
        console.error("Full error object:", error);
    }

     if (error.message && (error.message.includes('API key not valid') || error.message.includes('PERMISSION_DENIED'))) {
        console.error('This is likely an API key issue or a permissions problem. Ensure your API key is correct, has the "Generative Language API" (or "Vertex AI API" if using Vertex) enabled in your Google Cloud project, and that billing is active if required.');
        return `(There was an issue connecting to the special note service for ${senderName}.)`;
    }
    if (error.message && error.message.includes('SAFETY')) {
        console.warn('Gemini content generation blocked due to safety settings.');
        return `(A heartfelt thought from ${senderName} that couldn't be phrased automatically.)`;
    }
    // General fallback
    return `(${senderName} wanted to add a special note, but there was a little hiccup!)`;
  }
};
