import React, { useRef, useEffect } from 'react';
import styles from './ChatScreen.module.css';
import ChatBubble from './ChatBubble';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';

import Pill from '@/components/ui/Pill/Pill';
import StatusCard from './StatusCard';
import FeedbackCard from './FeedbackCard';
import RequestCard from './RequestCard/RequestCard';
import RequestStatusBar from './RequestStatusBar/RequestStatusBar';
import { ActiveRequest } from '../useChat';

export interface ChatMessage {
  id: string;
  variant: 'sent' | 'received';
  type?: 'TEXT' | 'WELCOME' | 'QUICK_REPLY' | 'STATUS_CARD' | 'FALLBACK' | 'FEEDBACK' | 'REQUEST_CARD';
  content?: string;
  meta?: Record<string, unknown>;
}

export interface ChatScreenProps {
  messages: ChatMessage[];
  isTyping: boolean;
  activeRequest?: ActiveRequest | null;
  onSendMessage: (text: string) => void;
  onCancelRequest?: (requestId: number) => void;
}

export default function ChatScreen({ messages, isTyping, activeRequest, onSendMessage, onCancelRequest }: ChatScreenProps) {
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
      
      {/* 고정 상태 바 */}
      {activeRequest && (
        <RequestStatusBar
          requestId={activeRequest.requestId}
          domainCode={activeRequest.domainCode}
          summary={activeRequest.summary}
          status={activeRequest.status}
          entities={activeRequest.entities}
          progress={activeRequest.progress}
        />
      )}

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
                  progress={Number(msg.meta?.progress) || 0} 
                  steps={msg.meta?.steps as string[]} 
                  cancelled={Boolean(msg.meta?.cancelled) || false}
                />
              </div>
            );
          }
          if (msg.type === 'REQUEST_CARD') {
            return (
              <RequestCard 
                key={msg.id}
                requestId={Number(msg.meta?.requestId)}
                domainCode={String(msg.meta?.domainCode)}
                summary={String(msg.meta?.summary)}
                entities={msg.meta?.entities as Record<string, unknown>}
                status={String(msg.meta?.status)}
                progress={Number(msg.meta?.progress) || 0}
                graceRemaining={Number(msg.meta?.graceRemaining) || 0}
                priority={String(msg.meta?.priority || 'NORMAL')}
                onCancel={() => onCancelRequest?.(Number(msg.meta?.requestId))}
                onModify={() => {
                  onCancelRequest?.(Number(msg.meta?.requestId));
                  // focus input (implementation omitted for brevity)
                }}
              />
            );
          }
          if (msg.type === 'QUICK_REPLY' || msg.type === 'WELCOME') {
            return (
              <div key={msg.id} style={{ display: 'flex', flexDirection: 'column' }}>
                <ChatBubble variant="received">{msg.content}</ChatBubble>
                <Pill options={msg.meta?.options as string[]} onSelect={onSendMessage} />
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
