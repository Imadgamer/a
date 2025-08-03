import type { Source, ChatMessage } from '../types';

/**
 * Sends a message and the conversation history to the backend server.
 * The server will then call the Gemini API.
 * @param history - The entire chat history.
 * @param message - The new message from the user.
 * @returns A promise that resolves to the bot's response text and sources.
 */
export const sendMessage = async (history: ChatMessage[], message: string): Promise<{ text: string; sources: Source[] }> => {
  try {
    // The backend endpoint that will securely proxy the request to the Gemini API.
    const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            message: message, // The new user input text.
            history: history, // The full message history array.
        }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        // Use the error message from the backend if available, otherwise use the HTTP status.
        throw new Error(errorData.error || `Server responded with status: ${response.status}`);
    }

    const data = await response.json();
    return {
        text: data.text,
        sources: data.sources || [],
    };
  } catch (error) {
    console.error("Error sending message to backend:", error);
    if (error instanceof Error) {
        return { text: `Sorry, I couldn't connect to the server: ${error.message}. Please try again later.`, sources: [] };
    }
    return { text: "Sorry, I encountered an unknown error while trying to connect to the server. Please try again.", sources: [] };
  }
};
