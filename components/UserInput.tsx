import React, { useState } from 'react';
import { SendIcon } from './icons';

interface UserInputProps {
  onSendMessage: (text: string) => void;
  isLoading: boolean;
}

const UserInput: React.FC<UserInputProps> = ({ onSendMessage, isLoading }) => {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() && !isLoading) {
      onSendMessage(text);
      setText('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center space-x-3">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Reply to VidyaBot..."
        className="flex-grow p-2 bg-transparent border-b border-gray-300 focus:outline-none focus:border-[#9B59B6] text-gray-800 transition-colors"
        disabled={isLoading}
        aria-label="Your message"
      />
      <button
        type="submit"
        disabled={isLoading || !text.trim()}
        className="bg-[#9B59B6] text-white p-3 rounded-lg hover:bg-[#8E44AD] disabled:bg-purple-300 disabled:cursor-not-allowed transition-colors focus:ring-2 focus:ring-[#9B59B6] focus:outline-none flex items-center justify-center"
        aria-label="Send message"
      >
        <SendIcon className="w-6 h-6" />
      </button>
    </form>
  );
};

export default UserInput;