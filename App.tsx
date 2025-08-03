
import React from 'react';
import ChatWindow from './components/ChatWindow';

const App: React.FC = () => {
  return (
    <div className="bg-gray-100 font-sans flex items-center justify-center min-h-screen p-4">
      <ChatWindow />
    </div>
  );
};

export default App;
