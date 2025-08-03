import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { ChatMessage } from '../types';
import Message from './Message';
import UserInput from './UserInput';
import LoadingSpinner from './LoadingSpinner';
import { sendMessage } from '../services/geminiService';
import { BotAvatar, MoreIcon, CloseIcon } from './icons';

const ChatWindow: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init',
      text: "Hello! I'm VidyaBot, the AI assistant for Vidya Mandir. How can I help you today?",
      sender: 'bot'
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = useCallback(async (inputText: string) => {
    if (!inputText.trim()) return;

    if (showSuggestions) {
      setShowSuggestions(false);
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
    };
    
    // Create a snapshot of the messages including the new user message to send to the backend.
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages); // Immediately update UI with user's message.
    setIsLoading(true);

    // The backend receives the full history and returns the bot's response.
    const botResponseData = await sendMessage(updatedMessages, inputText);

    const botMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      text: botResponseData.text,
      sender: 'bot',
      sources: botResponseData.sources.length > 0 ? botResponseData.sources : undefined,
    };
    
    setMessages(prev => [...prev, botMessage]);
    setIsLoading(false);
  }, [messages, showSuggestions]);
  
  const suggestions = ["Programs", "Admissions", "Locations"];

  return (
    <div className="flex flex-col h-[90vh] max-h-[700px] w-full max-w-md bg-white shadow-2xl rounded-2xl overflow-hidden">
      <header className="bg-[#9B59B6] text-white p-4 flex items-center justify-between shadow-md z-10">
          <div className="flex items-center gap-3">
              <BotAvatar className="w-10 h-10 rounded-full border-2 border-white" />
              <div>
                  <h2 className="font-bold text-lg">VidyaBot</h2>
                  <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <p className="text-xs">Online Now</p>
                  </div>
              </div>
          </div>
          <div className="flex items-center gap-4">
              <button aria-label="More options"><MoreIcon className="w-6 h-6" /></button>
              <button aria-label="Close chat"><CloseIcon className="w-6 h-6" /></button>
          </div>
      </header>
      
      <div className="flex-grow p-4 md:p-6 overflow-y-auto">
        <div className="flex flex-col space-y-4">
          {messages.map((msg) => (
            <Message key={msg.id} message={msg} />
          ))}

          {showSuggestions && (
            <div className="pt-2">
              {messages[messages.length-1].sender === 'bot' && (
                <div className="flex flex-wrap gap-2 justify-start">
                  {suggestions.map(s => (
                    <button key={s} onClick={() => handleSendMessage(s)} className="px-4 py-1.5 bg-white text-[#9B59B6] border border-[#9B59B6] rounded-full hover:bg-purple-50 transition-colors text-sm">
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {isLoading && (
            <div className="flex justify-start items-end space-x-3">
              <BotAvatar className="w-8 h-8 rounded-full flex-shrink-0" />
              <div className="p-3 bg-gray-200 rounded-2xl rounded-bl-none">
                <LoadingSpinner />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </div>
      
      <div className="p-4 border-t border-gray-200">
        <UserInput onSendMessage={handleSendMessage} isLoading={isLoading} />
        <div className="text-center text-xs text-gray-400 pt-3">
          Powered by <a href="https://rb.gy/vbxd5j" target="_blank" rel="noopener noreferrer" className="hover:underline font-semibold text-[#9B59B6]">
              Dami Ai
          </a>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
