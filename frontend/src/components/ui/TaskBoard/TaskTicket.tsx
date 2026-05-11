import React from 'react';
import styles from './TaskTicket.module.css';
import StatusBadge from '@/components/ui/StatusBadge/StatusBadge';
import Button from '@/components/ui/Button/Button';

export interface TaskTicketProps {
  ticketId?: string | number;
  priority?: 'NORMAL' | 'URGENT';
  department?: string;
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
  department,
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


  let borderColor = 'var(--color-surface)';
  let badgeBgColor = '#F3F4F6';
  let badgeTextColor = '#374151';
  let displayDept = department;

  let deptUpper = department ? department.toUpperCase() : '';

  if (department) {
    if (deptUpper.includes('HK') || deptUpper.includes('하우스키핑')) {
      borderColor = '#93C5FD'; // Blue-300
      badgeBgColor = '#EFF6FF'; // Blue-50
      badgeTextColor = '#1E40AF'; // Blue-800
      displayDept = '하우스키핑';
    } else if (deptUpper.includes('FACILITY') || deptUpper.includes('시설')) {
      borderColor = '#FDBA74'; // Orange-300
      badgeBgColor = '#FFF7ED'; // Orange-50
      badgeTextColor = '#9A3412'; // Orange-800
      displayDept = '시설관리';
    } else if (deptUpper.includes('FB') || deptUpper.includes('식음료')) {
      borderColor = '#F9A8D4'; // Pink-300
      badgeBgColor = '#FDF2F8'; // Pink-50
      badgeTextColor = '#9D174D'; // Pink-800
      displayDept = 'F&B';
    } else if (deptUpper.includes('CONCIERGE') || deptUpper.includes('컨시어지')) {
      borderColor = '#86EFAC'; // Green-300
      badgeBgColor = '#F0FDF4'; // Green-50
      badgeTextColor = '#166534'; // Green-800
      displayDept = '컨시어지';
    } else {
      borderColor = '#93C5FD';
      badgeBgColor = '#EFF6FF';
      displayDept = '프런트';
    }
  }

  // 긴급 부서(EMERGENCY)로 배정된 경우 뱃지 덮어쓰기
  if (deptUpper && (deptUpper.includes('EMERGENCY') || deptUpper.includes('긴급대응팀'))) {
    borderColor = '#FCA5A5'; // Red-300
    badgeBgColor = '#FEF2F2'; // Red-50
    badgeTextColor = '#991B1B'; // Red-800
    displayDept = '🚨 응급상황';
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
      <div className={styles.topColorBar} style={{ backgroundColor: borderColor }} />
      <div className={styles.header}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {department && (
            <div className={styles.deptBadge} style={{ backgroundColor: badgeBgColor, color: badgeTextColor }}>
              {displayDept}
            </div>
          )}
          {ticketId && <span className={styles.ticketId}>#{ticketId}</span>}
        </div>
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
          {priority === 'URGENT' && (
            <StatusBadge variant="red">
              긴급
            </StatusBadge>
          )}
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
          >
            수락하기
          </Button>
        )}
        {status === 'IN_PROGRESS' && onComplete && (
          <Button 
            variant="primary"
            onClick={onComplete}
            style={{ padding: '4px 12px', minHeight: 'auto', fontSize: '12px' }}
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
