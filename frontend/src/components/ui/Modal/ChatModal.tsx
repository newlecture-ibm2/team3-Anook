import React, { useState, useEffect, useRef } from 'react';
import styles from './ChatModal.module.css';
import ModalOverlay from './ModalOverlay';
import ModalCard from './ModalCard';
import ChatBubble from '@/app/guest/chat/_components/ChatBubble';
import ChatInput from '@/app/guest/chat/_components/ChatInput';
import { CancelIcon } from '@/components/icons';

export interface ChatMessage {
  id: string;
  variant: 'sent' | 'received'; // Staff perspective: 'sent' = staff/AI, 'received' = guest
  content: string;
}

export interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomNumber?: string;
}

export default function ChatModal({ isOpen, onClose, roomNumber = '1204' }: ChatModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const messageListRef = useRef<HTMLDivElement>(null);

  // 모달 열릴 때 실제 대화 내역 로드
  useEffect(() => {
    if (!isOpen || !roomNumber) return;

    const fetchMessages = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/messages/rooms/${roomNumber}/messages`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const mapped: ChatMessage[] = data.map((msg: any) => ({
          id: String(msg.id),
          variant: msg.senderType === 'GUEST' ? 'received' as const : 'sent' as const,
          content: msg.content,
        }));

        setMessages(mapped);
      } catch {
        setMessages([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [isOpen, roomNumber]);

  // 메시지 목록 스크롤 하단 유지
  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (text: string) => {
    // 1. 낙관적 업데이트 (즉시 화면에 표시)
    const tempId = Date.now().toString();
    const newMsg: ChatMessage = { id: tempId, variant: 'sent', content: text };
    setMessages(prev => [...prev, newMsg]);

    // 2. 백엔드로 전송
    try {
      const res = await fetch(`/api/admin/messages/rooms/${roomNumber}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch {
      // 전송 실패 시에도 화면에는 유지 (나중에 재시도 로직 추가 가능)
    }
  };

  return (
    <ModalOverlay isOpen={isOpen} onClose={onClose}>
      <ModalCard size="md" padding={0}>
        <div className={styles.chatModalContainer}>
          <div className={styles.header}>
            <div className={styles.headerInfo}>
              <span className={styles.roomBadge}>객실 {roomNumber}</span>
              <h3 className={styles.title}>고객 상담</h3>
            </div>
            <button className={styles.closeButton} onClick={onClose} aria-label="닫기">
              <CancelIcon width={24} height={24} color="var(--color-gray-500)" />
            </button>
          </div>
          
          <div className={styles.messageList} ref={messageListRef}>
            {loading ? (
              <div className={styles.emptyState}>대화 내역을 불러오는 중...</div>
            ) : messages.length === 0 ? (
              <div className={styles.emptyState}>이 객실의 대화 내역이 없습니다.</div>
            ) : (
              messages.map((msg) => (
                <ChatBubble key={msg.id} variant={msg.variant}>
                  {msg.content}
                </ChatBubble>
              ))
            )}
          </div>
          
          <div className={styles.footer}>
            <ChatInput placeholder="고객에게 답변을 입력하세요..." onSend={handleSend} />
          </div>
        </div>
      </ModalCard>
    </ModalOverlay>
  );
}
