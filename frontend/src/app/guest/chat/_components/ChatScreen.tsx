import React, { useRef, useEffect } from 'react';
import styles from './ChatScreen.module.css';
import ChatBubble from './ChatBubble';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';

import Pill from '@/components/ui/Pill/Pill';
import StatusCard from './StatusCard';
import FeedbackCard from './FeedbackCard';

export interface ChatMessage {
  id: string;
  variant: 'sent' | 'received';
  type?: 'TEXT' | 'WELCOME' | 'QUICK_REPLY' | 'STATUS_CARD' | 'FALLBACK' | 'FEEDBACK';
  content?: string;
  meta?: any;
}

export interface ChatScreenProps {
  messages: ChatMessage[];
  isTyping: boolean;
  onSendMessage: (text: string) => void;
}

export default function ChatScreen({ messages, isTyping, onSendMessage }: ChatScreenProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages or typing state changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  return (
    <div className={styles.chatScreen}>
      <div className={styles.header}>
        <div className={styles.logo}>Anook</div>
      </div>
      
      <div className={styles.messageList}>
        {messages.map((msg) => {
          if (msg.type === 'FALLBACK') {
            return (
              <ChatBubble key={msg.id} variant="received" isFallback>
                {msg.content}
              </ChatBubble>
            );
          }
          if (msg.type === 'STATUS_CARD') {
            return (
              <div key={msg.id} style={{ display: 'flex', flexDirection: 'column' }}>
                {msg.content && <ChatBubble variant="received">{msg.content}</ChatBubble>}
                <StatusCard 
                  progress={msg.meta?.progress || 0} 
                  steps={msg.meta?.steps} 
                  cancelled={msg.meta?.cancelled || false}
                />
              </div>
            );
          }
          if (msg.type === 'QUICK_REPLY' || msg.type === 'WELCOME') {
            return (
              <div key={msg.id} style={{ display: 'flex', flexDirection: 'column' }}>
                <ChatBubble variant="received">{msg.content}</ChatBubble>
                <Pill options={msg.meta?.options} onSelect={onSendMessage} />
              </div>
            );
          }
          if (msg.type === 'FEEDBACK') {
            return (
              <div key={msg.id} style={{ display: 'flex', flexDirection: 'column' }}>
                {msg.content && <ChatBubble variant="received">{msg.content}</ChatBubble>}
                <FeedbackCard onSubmit={(rating) => console.log('Feedback:', rating)} />
              </div>
            );
          }
          
          return (
            <ChatBubble key={msg.id} variant={msg.variant}>
              {msg.content}
            </ChatBubble>
          );
        })}
        {isTyping && (
          <ChatBubble variant="received">
            <TypingIndicator />
          </ChatBubble>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className={styles.footer}>
        <ChatInput onSend={onSendMessage} />
      </div>
    </div>
  );
}
