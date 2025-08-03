import React from 'react';
import type { ChatMessage } from '../types';
import { BotAvatar, LinkIcon } from './icons';

interface MessageProps {
  message: ChatMessage;
}

const Message: React.FC<MessageProps> = ({ message }) => {
  const isUser = message.sender === 'user';

  return (
    <div className={`flex items-end gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <BotAvatar className="w-8 h-8 rounded-full flex-shrink-0" />
      )}

      <div className={`max-w-[80%]`}>
        {!isUser && (
          <p className="text-xs text-gray-500 mb-1 ml-1">VidyaBot</p>
        )}
        <div
          className={`px-4 py-3 rounded-2xl whitespace-pre-wrap shadow-sm ${
            isUser
              ? 'bg-[#9B59B6] text-white rounded-br-none'
              : 'bg-white text-gray-800 rounded-bl-none border border-gray-200'
          }`}
        >
          <p>{message.text}</p>
        </div>

        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-2 pl-1">
            <h4 className="text-xs font-semibold text-gray-500 mb-1">Sources:</h4>
            <div className="flex flex-wrap gap-2">
              {message.sources.map((source, index) => (
                <a
                  key={index}
                  href={source.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full hover:bg-gray-200 transition-colors"
                >
                  <LinkIcon className="w-3 h-3 flex-shrink-0"/>
                  <span className="truncate max-w-xs">{source.title || new URL(source.uri).hostname}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Message;