import React, { useRef, useEffect, useState } from 'react';
import styles from './ChatScreen.module.css';
import ChatBubble from './ChatBubble';
import ChatInput from './ChatInput';

import Pill from '@/components/ui/Pill/Pill';
import ChatBackground from './ChatBackground';
import ChatEndCard from './ChatEndCard/ChatEndCard';
import FeedbackCard from './FeedbackCard';
import RequestCard from './RequestCard/RequestCard';
import RequestStatusBar from './RequestStatusBar/RequestStatusBar';
import ProgressIndicator from './ProgressIndicator/ProgressIndicator';
import { ActiveRequest } from '../useChat';
import { ArrowDownIcon } from '@/components/icons';

export interface ChatMessage {
  id: string;
  variant: 'sent' | 'received';
  type?: 'TEXT' | 'REQUEST_CARD' | 'AI_PROGRESS' | 'QUICK_REPLY' | 'FEEDBACK' | 'CHAT_END' | 'WELCOME' | 'FALLBACK' | 'STATUS_CARD';
  content: string;
  imageUrl?: string;
  meta?: Record<string, any>;
}

export interface ChatScreenProps {
  messages: ChatMessage[];
  isTyping: boolean;
  isStaffTyping?: boolean;
  activeRequests?: ActiveRequest[];
  onSendMessage: (text: string) => void;
  onCancelRequest?: (requestId: number) => void;
  onConfirmRequest?: (requestId: number) => void;
  onRateRequest?: (requestId: number, rating: number) => void;
  onStopMessage?: () => void;
  onPillSelect?: (msgId: string, option: string) => void;
}

export default function ChatScreen({ messages, isTyping, isStaffTyping, activeRequests, onSendMessage, onCancelRequest, onConfirmRequest, onRateRequest, onStopMessage, onPillSelect }: ChatScreenProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isUserTyping, setIsUserTyping] = useState(false);
  const [isRequestsExpanded, setIsRequestsExpanded] = useState(true);

  // Auto-scroll to bottom when messages or typing state changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, isStaffTyping]);

  const hasInteracted = messages.some(msg => msg.variant === 'sent');
  const showTypingBackground = isUserTyping || hasInteracted;

  return (
    <div className={styles.chatScreen}>
      <ChatBackground isAiTyping={isTyping} isUserTyping={showTypingBackground} />


      
      {/* 고정 상태 바 컨테이너 */}
      {activeRequests && activeRequests.length > 0 && (
        <div 
          className={styles.statusBarContainer}
          style={{
            zIndex: 9999,
            top: '12px',
            left: '12px',
            right: '12px',
            width: 'auto',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'rgba(255, 255, 255, 0.5)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.8)',
            boxShadow: '0 8px 32px rgba(31, 38, 135, 0.05)',
            transform: 'translateZ(0)'
          }}
        >
          <div className={styles.requestList}>
            {[...activeRequests].reverse().map((req, index) => {
              const isLatest = index === 0;
              const content = (
                <RequestStatusBar
                  key={req.requestId}
                  requestId={req.requestId}
                  domainCode={req.domainCode}
                  summary={req.summary}
                  status={req.status}
                  entities={req.entities}
                  progress={req.progress}
                  isMini={isLatest ? !isRequestsExpanded : false}
                />
              );

              if (isLatest) {
                return content;
              }

              return (
                <div 
                  key={req.requestId} 
                  className={`${styles.expandableWrapper} ${isRequestsExpanded ? styles.expanded : ''}`}
                >
                  <div className={styles.expandableInner}>
                    {content}
                  </div>
                </div>
              );
            })}
          </div>
          <div 
            className={styles.multiRequestToggle}
            onClick={() => setIsRequestsExpanded(!isRequestsExpanded)}
          >
            <span>{activeRequests.length}개의 진행 중인 요청</span>
            <span className={`${styles.arrow} ${isRequestsExpanded ? styles.arrowOpen : ''}`}>
              <ArrowDownIcon width={24} height={24} strokeWidth={1.5} color="var(--color-gray-500)" />
            </span>
          </div>
        </div>
      )}

      <div 
        className={`${styles.messageList} ${activeRequests && activeRequests.length > 0 ? styles.messageListWithStatusBar : ''}`}
        style={activeRequests && activeRequests.length > 1 ? { '--status-bar-offset': `${activeRequests.length * 56}px` } as React.CSSProperties : undefined}
      >
        {!(messages.length === 1 && messages[0].type === 'WELCOME') && <div className={styles.spacer} />}
        {messages.map((msg, index) => {
          const isLatest = index === messages.length - 1;

          if (msg.type === 'AI_PROGRESS') {
            return (
              <ProgressIndicator
                key={msg.id}
                domains={msg.meta?.domains as string[]}
              />
            );
          }
          if (msg.type === 'FALLBACK') {
            return (
              <ChatBubble key={msg.id} variant="received" isFallback isLatest={isLatest}>
                {msg.content}
              </ChatBubble>
            );
          }
          if (msg.type === 'STATUS_CARD') {
            return (
              <div key={msg.id} style={{ display: 'flex', flexDirection: 'column' }}>
                {msg.content && <ChatBubble variant="received" isLatest={isLatest}>{msg.content}</ChatBubble>}
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
                createdAt={msg.meta?.createdAt as string}
                cancelPending={Boolean(msg.meta?.cancelPending)}
                onCancel={() => onCancelRequest?.(Number(msg.meta?.requestId))}
                onAccept={() => onConfirmRequest?.(Number(msg.meta?.requestId))}
              />
            );
          }
          if (msg.type === 'QUICK_REPLY' || msg.type === 'WELCOME') {
            const isWelcome = msg.type === 'WELCOME';
            const isFirstChat = index === 0 && !isWelcome;
            let welcomeLine1 = '';
            let welcomeLine2 = '';
            if (isWelcome) {
              const lines = (msg.content || '').split('\n');
              welcomeLine1 = lines[0] || '';
              welcomeLine2 = lines.slice(1).join('\n') || '';
            }
            return (
              <div key={msg.id} style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                margin: isWelcome ? 'auto 0' : (isFirstChat ? 'auto 0 0 0' : '0')
              }}>
                {isWelcome ? (
                  <div style={{ 
                    marginBottom: 'var(--space-24)', 
                    padding: '0 var(--space-8)',
                    textAlign: 'center',
                    lineHeight: '1.5'
                  }}>
                    <div style={{ font: 'var(--text-h1-bold)', color: 'var(--color-gray-900)', marginBottom: 'var(--space-8)' }}>
                      {welcomeLine1}
                    </div>
                    {welcomeLine2 && (
                      <div style={{ font: 'var(--text-body-medium)', color: 'var(--color-gray-500)', whiteSpace: 'pre-wrap' }}>
                        {welcomeLine2}
                      </div>
                    )}
                  </div>
                ) : (
                  msg.content ? <ChatBubble variant="received" isLatest={isLatest}>{msg.content}</ChatBubble> : null
                )}
                {!msg.meta?.selectedOption && (
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: isWelcome ? 'center' : 'flex-start',
                    marginBottom: isWelcome ? '-16px' : '0',
                    paddingLeft: isWelcome ? '0' : '0'
                  }}>
                    <Pill 
                      options={msg.meta?.options as string[]} 
                      selectedOption={msg.meta?.selectedOption as string | undefined}
                      disabled={msg.meta?.pillDisabled as boolean | undefined}
                      onSelect={(option) => {
                        if (onPillSelect) {
                          onPillSelect(msg.id, option);
                        } else {
                          onSendMessage(option);
                        }
                      }} 
                      align={isWelcome ? 'center' : 'flex-start'}
                    />
                  </div>
                )}
              </div>
            );
          }
          if (msg.type === 'FEEDBACK') {
            return (
              <ChatEndCard
                key={msg.id}
                summary={String(msg.meta?.summary || '')}
                domainCode={String(msg.meta?.domainCode || 'UNKNOWN')}
                completedAt={String(msg.meta?.completedAt || new Date().toISOString())}
                onSubmitRating={(rating) => {
                  const requestId = msg.meta?.requestId;
                  if (requestId && onRateRequest) {
                    onRateRequest(Number(requestId), rating);
                  }
                }}
              />
            );
          }
          if (msg.type === 'CHAT_END') {
            return (
              <FeedbackCard
                key={msg.id}
                completedAt={String(msg.meta?.completedAt || new Date().toISOString())}
                onSubmit={(rating) => {
                  const requestId = msg.meta?.requestId;
                  if (requestId && onRateRequest) {
                    onRateRequest(Number(requestId), rating);
                  }
                }}
              />
            );
          }
          
          return (
            <ChatBubble key={msg.id} variant={msg.variant} isLatest={isLatest} imageUrl={msg.imageUrl}>
              {msg.content}
            </ChatBubble>
          );
        })}
        {isStaffTyping && (
          <ChatBubble variant="received" isFallback isLatest>
            <span className={styles.typingDots}>
              <span className={styles.dot} />
              <span className={styles.dot} />
              <span className={styles.dot} />
            </span>
          </ChatBubble>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className={styles.footer}>
        <ChatInput 
          onSend={onSendMessage} 
          isTyping={isTyping} 
          onStop={onStopMessage} 
          onUserTyping={setIsUserTyping} 
          onFocus={() => setIsRequestsExpanded(false)}
        />
      </div>
    </div>
  );
}
