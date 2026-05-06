'use client';

import React, { useState } from 'react';
import InputField from '@/components/ui/Inputfield/InputField';
import FilterButton from '@/components/ui/FilterButton/FilterButton';
import ChatHistory, { ChatHistoryData } from '@/components/ui/ChatHistory/ChatHistory';
import ChatBubble from '@/app/guest/chat/_components/ChatBubble';
import { MoreVertical } from 'lucide-react';
import useChatHistory from './useChatHistory';
import styles from './page.module.css';

export default function ChatHistoryPage() {
  const [searchValue, setSearchValue] = useState('');
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [targetLang, setTargetLang] = useState('en');
  const [isSending, setIsSending] = useState(false);
  const { rooms, messages, selectedRoom, loadingRooms, loadingMessages, error, selectRoom, fetchMessages } = useChatHistory();

  const handleSend = async () => {
    if (!inputText.trim() || !selectedRoom) return;
    setIsSending(true);
    try {
      const res = await fetch('/api/staff/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomNo: selectedRoom,
          content: inputText,
          targetLanguage: targetLang,
        }),
      });
      if (res.ok) {
        setInputText('');
        fetchMessages(selectedRoom);
      } else {
        alert('메시지 전송에 실패했습니다.');
      }
    } catch (e) {
      console.error(e);
      alert('오류가 발생했습니다.');
    } finally {
      setIsSending(false);
    }
  };

  // API 데이터를 ChatHistory 컴포넌트 형식으로 매핑
  const chatRooms: ChatHistoryData[] = rooms.map(r => ({
    id: r.roomNo,
    roomNumber: r.roomNo,
    statusText: r.lastMessage ? '활성 대화' : '보관됨',
  }));

  return (
    <div className={styles.container}>
      {/* Header Section */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>채팅 히스토리</h1>
        </div>
        <div className={styles.headerActions}>
          <InputField 
            variant="search" 
            placeholder="검색어를 입력하세요..." 
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
          <FilterButton 
            filterOptions={[
              { label: '전체', value: 'all' }, 
              { label: '최신순', value: 'latest' }
            ]}
            selectedFilter="all"
            onFilterSelect={() => {}}
          />
        </div>
      </div>

      {/* Main Content Section */}
      <div className={styles.mainContent}>
        {/* Left Sidebar: Room List */}
        <div className={styles.sidebar}>
          {loadingRooms ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-gray-400)' }}>로딩 중...</div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-gray-400)' }}>오류: {error}</div>
          ) : (
            <ChatHistory 
              rooms={chatRooms} 
              activeRoomId={selectedRoom || undefined} 
              onRoomSelect={(id) => selectRoom(String(id))} 
            />
          )}
        </div>

        {/* Right Area: Chat Logs */}
        <div className={styles.chatArea}>
          {/* Chat Header */}
          <div className={styles.chatHeader}>
            <div className={styles.chatHeaderLeft}>
              <h2 className={styles.chatTitle}>{selectedRoom ? `${selectedRoom}호 채팅 기록` : '객실을 선택하세요'}</h2>
              <span className={styles.chatSubtitle}>전체 대화 로그</span>
            </div>
            <div className={styles.chatHeaderActions} onClick={() => setIsPopoverOpen(!isPopoverOpen)}>
              <MoreVertical size={24} />
              {isPopoverOpen && (
                <div className={styles.popoverMenu}>
                  <div className={styles.popoverItem}>
                    삭제
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Chat Body */}
          <div className={styles.chatBody}>
            {loadingMessages ? (
              <div style={{ textAlign: 'center', color: 'var(--color-gray-400)', marginTop: '40px' }}>메시지 로딩 중...</div>
            ) : messages.length > 0 ? (
              <>
                {messages.map(msg => (
                  <ChatBubble
                    key={msg.id}
                    variant={msg.sender === 'GUEST' ? 'sent' : 'received'}
                  >
                    {msg.content}
                  </ChatBubble>
                ))}
              </>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--color-gray-400)', marginTop: '40px' }}>
                대화 기록이 없습니다.
              </div>
            )}
          </div>

          {/* Chat Input Area */}
          {selectedRoom && (
            <div className={styles.chatInputContainer} style={{ padding: '20px', borderTop: '1px solid var(--color-gray-200)', display: 'flex', gap: '10px' }}>
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
                placeholder="투숙객에게 보낼 메시지를 입력하세요 (자동 번역됩니다)..."
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
          )}
        </div>
      </div>
    </div>
  );
}

