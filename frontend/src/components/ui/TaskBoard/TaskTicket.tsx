import React from 'react';
import styles from './TaskTicket.module.css';
import StatusBadge from '@/components/ui/StatusBadge/StatusBadge';
import Button from '@/components/ui/Button/Button';
import { useNetworkStore } from '@/stores/useNetworkStore';

export interface TaskTicketProps {
  ticketId?: string | number;
  priority?: 'NORMAL' | 'URGENT';
  title: string;
  description: string;
  status?: 'TODO' | 'IN_PROGRESS' | 'DONE';
  createdAt: string | Date;
  updatedAt?: string | Date;
  cancelRequested?: boolean;
  onAccept?: (e: React.MouseEvent) => void;
  onComplete?: (e: React.MouseEvent) => void;
  isCancelled?: boolean;
  entities?: {
    is_contactless?: boolean;
    target_time?: string;
    items?: Array<{ item: string; count: number }>;
    tasks?: string[];
    [key: string]: any;
  };
}

export default function TaskTicket({
  ticketId,
  priority = 'NORMAL',
  title,
  description,
  status = 'TODO',
  createdAt,
  updatedAt,
  cancelRequested = false,
  onAccept,
  onComplete,
  isCancelled = false,
  entities
}: TaskTicketProps) {
  const isOnline = useNetworkStore((state) => state.isOnline);

  let badgeVariant: 'red' | 'purple' | 'green' | 'gray' | 'black' = 'gray';
  if (priority === 'URGENT') {
    badgeVariant = 'red';
  } else {
    badgeVariant = 'gray';
  }

  let timeDisplay = '';
  if (status === 'DONE') {
    let parsedString = createdAt;
    if (typeof createdAt === 'string' && !createdAt.endsWith('Z') && !createdAt.includes('+')) {
      parsedString = createdAt + 'Z';
    }
    const date = new Date(parsedString);
    const hours = date.getHours();
    const mins = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hr = hours % 12 || 12;
    timeDisplay = `${String(hr).padStart(2, '0')}:${mins} ${ampm}`;
  } else if (status === 'IN_PROGRESS' && updatedAt) {
    const relTime = getRelativeTime(updatedAt);
    timeDisplay = relTime === '방금 전' ? '방금 시작' : relTime.replace(' 전', ' 경과');
  } else {
    timeDisplay = getRelativeTime(createdAt);
  }

  return (
    <div className={styles.taskTicket}>
      <div className={styles.header}>
        {ticketId && <span className={styles.ticketId}>#{ticketId}</span>}
        <div style={{ display: 'flex', gap: '8px' }}>
          {isCancelled && (
            <StatusBadge variant="gray">
              취소됨
            </StatusBadge>
          )}
          {cancelRequested && (
            <StatusBadge variant="red">
              취소 대기
            </StatusBadge>
          )}
          <StatusBadge variant={badgeVariant}>
            {priority}
          </StatusBadge>
        </div>
      </div>
      
      {(entities?.is_contactless || entities?.target_time) && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', marginTop: '-4px' }}>
          {entities.is_contactless && (
            <StatusBadge variant="purple">비대면 배달</StatusBadge>
          )}
          {entities.target_time && (
            <StatusBadge variant="gray">희망 시간: {entities.target_time}</StatusBadge>
          )}
        </div>
      )}

      <div className={styles.content}>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.description}>{description}</p>
      </div>
      
      <div className={styles.divider} />
      
      <div className={styles.footer}>
        <span className={styles.timeText}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          {timeDisplay}
        </span>
        {status === 'TODO' && onAccept && (
          <Button 
            variant="primary"
            onClick={onAccept}
            style={{ padding: '4px 12px', minHeight: 'auto', fontSize: '12px' }}
            disabled={!isOnline}
            title={!isOnline ? "오프라인 상태에서는 변경할 수 없습니다" : undefined}
          >
            수락하기
          </Button>
        )}
        {status === 'IN_PROGRESS' && onComplete && (
          <Button 
            variant="primary"
            onClick={onComplete}
            style={{ padding: '4px 12px', minHeight: 'auto', fontSize: '12px' }}
            disabled={!isOnline}
            title={!isOnline ? "오프라인 상태에서는 변경할 수 없습니다" : undefined}
          >
            업무 완료
          </Button>
        )}
      </div>
    </div>
  );
}

function getRelativeTime(dateString: string | Date): string {
  let parsedString = dateString;
  if (typeof dateString === 'string' && !dateString.endsWith('Z') && !dateString.includes('+')) {
    parsedString = dateString + 'Z';
  }
  const date = new Date(parsedString);
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
