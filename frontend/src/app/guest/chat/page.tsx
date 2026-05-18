'use client';

import React from 'react';
import ChatScreen from './_components/ChatScreen';
import { useChat } from './useChat';

export default function GuestChatPage() {
  const { messages, isTyping, isStaffTyping, sendMessage, activeRequests, cancelRequest, confirmRequest, rateRequest, stopMessage, handlePillSelect } = useChat();

  return (
    <main style={{ 
      height: '100dvh', 
      display: 'flex', 
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'var(--color-gray-100)',
      overflow: 'hidden'
    }}>
      <ChatScreen
        messages={messages}
        isTyping={isTyping}
        isStaffTyping={isStaffTyping}
        activeRequests={activeRequests}
        onSendMessage={sendMessage}
        onCancelRequest={cancelRequest}
        onConfirmRequest={confirmRequest}
        onRateRequest={rateRequest}
        onStopMessage={stopMessage}
        onPillSelect={handlePillSelect}
      />
    </main>
  );
}
