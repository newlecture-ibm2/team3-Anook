import React, { useState, useEffect, useRef } from 'react';
import styles from './ChatModal.module.css';
import ModalOverlay from './ModalOverlay';
import ModalCard from './ModalCard';
import ChatBubble from '@/app/guest/chat/_components/ChatBubble';
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
  const [inputText, setInputText] = useState('');
  const [targetLang, setTargetLang] = useState('en');
  const [isSending, setIsSending] = useState(false);
  const messageListRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    if (!roomNumber) return;
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

  // 모달 열릴 때 실제 대화 내역 로드
  useEffect(() => {
    if (!isOpen) return;
    fetchMessages();
  }, [isOpen, roomNumber]);

  // 메시지 목록 스크롤 하단 유지
  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim()) return;
    setIsSending(true);
    try {
      const res = await fetch('/api/staff/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomNo: roomNumber,
          content: inputText,
          targetLanguage: targetLang,
        }),
      });
      if (res.ok) {
        setInputText('');
        fetchMessages();
      } else {
        alert('메시지 전송에 실패했습니다.');
      }
    } catch {
      alert('오류가 발생했습니다.');
    } finally {
      setIsSending(false);
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

          <div className={styles.footer} style={{ padding: '20px', borderTop: '1px solid var(--color-gray-200)', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--color-gray-300)' }}
            >
              <option value="en">🇺🇸 영어</option>
              <option value="ja">🇯🇵 일본어</option>
              <option value="zh">🇨🇳 중국어</option>
              <option value="ko">🇰🇷 한국어</option>
            </select>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="투숙객에게 보낼 메시지 (자동 번역됨)..."
              style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--color-gray-300)' }}
              disabled={isSending}
            />
            <button
              onClick={handleSend}
              disabled={isSending || !inputText.trim()}
              style={{ padding: '10px 20px', borderRadius: '8px', backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', cursor: 'pointer' }}
            >
              {isSending ? '전송중...' : '전송'}
            </button>
          </div>
        </div>
      </ModalCard>
    </ModalOverlay>
  );
}
