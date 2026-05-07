'use client';

import React, { useState } from 'react';
import InputField from '@/components/ui/Inputfield/InputField';
import FilterButton from '@/components/ui/FilterButton/FilterButton';
import ChatHistory, { ChatHistoryData } from '@/components/ui/ChatHistory/ChatHistory';
import ChatBubble from '@/app/guest/chat/_components/ChatBubble';
import { MoreVertical } from 'lucide-react';
import useChatHistory from './useChatHistory';
import styles from './page.module.css';
import { useTranslation } from '@/app/useTranslation';

export default function ChatHistoryPage() {
  const [searchValue, setSearchValue] = useState('');
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { rooms, messages, selectedRoom, loadingRooms, loadingMessages, error, selectRoom } = useChatHistory();
  const { t } = useTranslation();



  // API 데이터를 ChatHistory 컴포넌트 형식으로 매핑
  const chatRooms: ChatHistoryData[] = rooms.map(r => ({
    id: r.roomNo,
    roomNumber: r.roomNo,
    statusText: r.lastMessage ? t.adminPage.chatHistory.activeChat : t.adminPage.chatHistory.archived,
  }));

  return (
    <div className={styles.container}>
      {/* Header Section */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>{t.adminPage.chatHistory.title}</h1>
        </div>
        <div className={styles.headerActions}>
          <InputField
            variant="search"
            placeholder={t.adminPage.chatHistory.searchPlaceholder}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
          <FilterButton
            filterOptions={[
              { label: t.adminPage.chatHistory.filterAll, value: 'all' },
              { label: t.adminPage.chatHistory.filterLatest, value: 'latest' }
            ]}
            selectedFilter="all"
            onFilterSelect={() => { }}
          />
        </div>
      </div>

      {/* Main Content Section */}
      <div className={styles.mainContent}>
        {/* Left Sidebar: Room List */}
        <div className={styles.sidebar}>
          {loadingRooms ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-gray-400)' }}>{t.common.loading}</div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-gray-400)' }}>{t.common.error}: {error}</div>
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
              <h2 className={styles.chatTitle}>{selectedRoom ? `${selectedRoom}${t.adminPage.chatHistory.roomLog}` : t.adminPage.chatHistory.selectRoom}</h2>
              <span className={styles.chatSubtitle}>{t.adminPage.chatHistory.fullLog}</span>
            </div>
            <div className={styles.chatHeaderActions} onClick={() => setIsPopoverOpen(!isPopoverOpen)}>
              <MoreVertical size={24} />
              {isPopoverOpen && (
                <div className={styles.popoverMenu}>
                  <div className={styles.popoverItem}>
                    {t.adminPage.chatHistory.delete}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Chat Body */}
          <div className={styles.chatBody}>
            {loadingMessages ? (
              <div style={{ textAlign: 'center', color: 'var(--color-gray-400)', marginTop: '40px' }}>{t.adminPage.chatHistory.loadingMessages}</div>
            ) : messages.length > 0 ? (
              <>
                {messages.map(msg => (
                  <ChatBubble
                    key={msg.id}
                    variant={msg.senderType === 'GUEST' ? 'received' : 'sent'}
                  >
                    {msg.content}
                  </ChatBubble>
                ))}
              </>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--color-gray-400)', marginTop: '40px' }}>
                {t.adminPage.chatHistory.noHistory}
              </div>
            )}
          </div>


        </div>
      </div>
    </div>
  );
}

