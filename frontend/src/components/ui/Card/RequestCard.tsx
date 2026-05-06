import React, { useState } from 'react';
import styles from './RequestCard.module.css';
import Button from '@/components/ui/Button/Button';
import StatusBadge from '@/components/ui/StatusBadge/StatusBadge';
import ChatModal from '@/components/ui/Modal/ChatModal';

export interface RequestCardProps {
  roomType?: string;
  roomNumber: string | number;
  statusText?: string;
  statusVariant?: 'red' | 'purple' | 'green' | 'gray';
  createdAt: string | Date;
  title: string;
  description?: string;
  primaryActionText?: string;
  secondaryActionText?: string;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  onCardClick?: () => void;
  variant?: 'default' | 'warning';
}

export default function RequestCard({
  roomType = '객실',
  roomNumber,
  statusText = '미해결',
  statusVariant = 'red',
  createdAt,
  title,
  description,
  primaryActionText = '상담 시작',
  secondaryActionText = '무시하기',
  onPrimaryAction,
  onSecondaryAction,
  onCardClick,
  variant = 'default'
}: RequestCardProps) {
  const isWarning = variant === 'warning';
  const [isChatOpen, setIsChatOpen] = useState(false);

  const handlePrimaryClick = () => {
    if (primaryActionText === '상담 시작') {
      setIsChatOpen(true);
    }
    if (onPrimaryAction) {
      onPrimaryAction();
    }
  };

  return (
    <>
      <div className={`${styles.requestCard} ${isWarning ? styles.requestCardWarning : ''} ${onCardClick ? styles.clickable : ''}`} onClick={onCardClick}>
        <div className={`${styles.roomBox} ${isWarning ? styles.roomBoxWarning : ''}`}>
          <span className={`${styles.roomType} ${isWarning ? styles.textWhite : ''}`}>{roomType}</span>
          <span className={`${styles.roomNumber} ${isWarning ? styles.textWhite : ''}`}>{roomNumber}</span>
        </div>
        
        <div className={styles.contentSection}>
          <div className={styles.contentHeader}>
            <StatusBadge variant={statusVariant}>{statusText}</StatusBadge>
            <span className={styles.timeText}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              {getRelativeTime(createdAt)}
            </span>
          </div>
          <h3 className={styles.title}>{title}</h3>
          {description && <p className={styles.description}>{description}</p>}
        </div>

        <div className={`${styles.actionSection} ${isWarning ? styles.actionSectionWarning : ''}`} onClick={(e) => e.stopPropagation()}>
          {primaryActionText && (
            <Button variant="primary" className={styles.actionButton} onClick={handlePrimaryClick}>
              {primaryActionText}
            </Button>
          )}
          {secondaryActionText && (
            <Button variant="secondary" className={styles.actionButton} onClick={onSecondaryAction}>
              {secondaryActionText}
            </Button>
          )}
        </div>
      </div>

      <ChatModal 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
        roomNumber={roomNumber.toString()} 
      />
    </>
  );
}

function getRelativeTime(dateString: string | Date): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays > 0) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const paddedHours = String(hours).padStart(2, '0');
    return `${year}.${month}.${day} ${paddedHours}:${minutes} ${ampm}`;
  } else if (diffHours > 0) {
    return `${diffHours}시간 전`;
  } else if (diffMins > 0) {
    return `${diffMins}분 전`;
  } else {
    return '방금 전';
  }
}
