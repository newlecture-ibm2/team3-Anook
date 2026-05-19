import React from 'react';
import styles from './TaskTicket.module.css';
import StatusBadge from '@/components/ui/StatusBadge/StatusBadge';
import Button from '@/components/ui/Button/Button';
import { useNetworkStore } from '@/stores/useNetworkStore';
import { useTranslation } from '@/app/useTranslation';
import { useTranslationApi } from '@/app/useTranslationApi';

export interface TaskTicketProps {
  ticketId?: string | number;
  roomNo?: string | number;
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
  roomNo,
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
  const isOnline = useNetworkStore((state) => state.isOnline);
  const { t, language } = useTranslation();
  const { translatedText: translatedSummary, isLoading: isTranslating } = useTranslationApi(title, language);

  let displayDept = department;
  let deptKey = 'front';

  let deptUpper = department ? department.toUpperCase() : '';

  if (department) {
    if (deptUpper.includes('HK') || deptUpper.includes('하우스키핑')) {
      deptKey = 'hk';
      displayDept = t.ticketUI.department.HK;
    } else if (deptUpper.includes('FACILITY') || deptUpper.includes('시설')) {
      deptKey = 'facility';
      displayDept = t.ticketUI.department.FACILITY;
    } else if (deptUpper.includes('FB') || deptUpper.includes('식음료')) {
      deptKey = 'fb';
      displayDept = t.ticketUI.department.FB;
    } else if (deptUpper.includes('CONCIERGE') || deptUpper.includes('컨시어지')) {
      deptKey = 'concierge';
      displayDept = t.ticketUI.department.CONCIERGE;
    } else {
      deptKey = 'front';
      displayDept = t.ticketUI.department.FRONT;
    }
  }

  // 긴급 부서(EMERGENCY)로 배정된 경우 뱃지 덮어쓰기
  if (deptUpper && (deptUpper.includes('EMERGENCY') || deptUpper.includes('긴급대응팀'))) {
    deptKey = 'emergency';
    displayDept = t.ticketUI.department.EMERGENCY;
  }

  const isManuallyReassigned = entities?.intent === 'ESCALATION' && deptKey !== 'front' && deptKey !== 'emergency';
  
  const getFixedTitle = () => {
    const baseSummary = translatedSummary || title;
    if (isTranslating || isManuallyReassigned || baseSummary.includes('프론트 연결')) {
      return baseSummary;
    }
    const intent = entities?.intent as string | undefined;
    switch (deptKey) {
      case 'fb':
        if (intent === 'DINING') return '룸서비스 음식 주문';
        if (intent === 'AMENITY') return '객실 어메니티 요청';
        return '룸서비스 주문';
      case 'concierge':
        if (intent === 'TAXI') return '택시 호출 예약';
        if (intent === 'LUGGAGE_STORAGE') return '수하물 보관/찾기';
        if (intent === 'RESTAURANT') return '식당 예약';
        if (intent === 'WAKE_UP_CALL') return '모닝콜 예약';
        if (intent === 'POSTAL_SERVICE') return '우편물 발송 대행';
        return '컨시어지 서비스 요청';
      case 'facility':
        return '객실 시설 수리 요청';
      case 'hk':
        return '객실 정비/비품 요청';
      default:
        return baseSummary.split('(')[0].trim();
    }
  };

  const displayTitle = getFixedTitle();

  let timeDisplay = '';
  if (status === 'DONE') {
    let parsedString = createdAt;
    const date = new Date(parsedString);
    const hours = date.getHours();
    const mins = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hr = hours % 12 || 12;
    timeDisplay = `${String(hr).padStart(2, '0')}:${mins} ${ampm}`;
  } else if (status === 'IN_PROGRESS' && updatedAt) {
    const relTime = getRelativeTime(updatedAt, language, t.ticketUI.time);
    if (relTime === t.ticketUI.time.justNow) {
      timeDisplay = t.ticketUI.time.justStarted;
    } else {
      timeDisplay = relTime.replace(language === 'ko' ? ' 전' : ' ago', t.ticketUI.time.elapsed);
    }
  } else {
    timeDisplay = getRelativeTime(updatedAt || createdAt, language, t.ticketUI.time);
  }

  const renderDetails = () => {
    if (!entities) return null;
    
    const parts: string[] = [];
    if (entities.intent === 'TAXI') {
      if (entities.time) parts.push(String(entities.time));
      if (entities.destination) parts.push(String(entities.destination));
      if (entities.passenger_count) parts.push(String(entities.passenger_count));
    } else {
      if (Array.isArray(entities.items)) {
        entities.items.forEach((it: any) => {
          parts.push(`${it.item} ${it.count ? `×${it.count}` : ''}`.trim());
        });
      } else if (entities.item) {
        parts.push(`${entities.item} ${entities.count ? `×${entities.count}` : ''}`.trim());
      }
      if (Array.isArray(entities.tasks)) {
        entities.tasks.forEach((t: string) => parts.push(t));
      }
      if (parts.length === 0) {
        if (entities.menu) {
          parts.push(`${entities.menu} ${entities.count ? `×${entities.count}` : ''}`.trim());
        }
        if (entities.symptom) parts.push(`${entities.symptom}`);
      }
    }
    return parts.length > 0 ? parts.join(' • ') : null;
  };

  const entityDetails = renderDetails();

  let displayDescription = description;
  if (isManuallyReassigned && displayDescription) {
    // 수동 배정: rawText 원본에서 마지막 줄(frontdesk 이관 사유)만 추출
    const lines = displayDescription.split('\n').filter(l => l.trim());
    displayDescription = lines[lines.length - 1] || '';
  } else if (status !== 'IN_PROGRESS' && entityDetails) {
    // Override rawText with entity details for TODO/DONE
    displayDescription = entityDetails;
  } else if (displayDescription && displayDescription.includes('[주문 상세]')) {
    displayDescription = displayDescription.split('[주문 상세]')[0].trim();
  }
  
  if (language === 'en') {
    if (displayDescription === '프론트 데스크') displayDescription = 'Frontdesk';
    else if (displayDescription === '직원') displayDescription = 'Staff';
  }

  return (
    <div className={`${styles.taskTicket} ${styles[deptKey]} ${isCancelled ? styles.isCancelled : ''}`}>
      <div className={styles.topColorBar} />
      <div className={styles.header}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {roomNo && (
            <>
              <span className={styles.roomNo}>
                {language === 'ko' ? `${roomNo}호` : `NO.${roomNo}`}
              </span>
              <div className={styles.headerDivider} />
            </>
          )}
          {department && (
            <div className={styles.deptBadge}>
              {displayDept}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {isCancelled && (
            <span className={`${styles.textStatus} ${styles.textStatusCancelled}`}>
              {t.ticketUI.badge.cancelled}
            </span>
          )}
          {cancelRequested && (
            <span className={`${styles.textStatus} ${styles.textStatusCancelPending}`}>
              {t.ticketUI.badge.cancelPending}
            </span>
          )}
          {priority === 'URGENT' && (
            <div className={`${styles.textStatus} ${styles.textStatusUrgent}`}>
              {t.ticketUI.badge.urgent}
              <span className={styles.redDot} />
            </div>
          )}
        </div>
      </div>

      {(entities?.is_contactless || entities?.target_time) && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', marginTop: '-4px' }}>
          {entities.is_contactless && (
            <StatusBadge variant="purple">{t.ticketUI.badge.contactless}</StatusBadge>
          )}
          {entities.target_time && (
            <StatusBadge variant="gray">{t.ticketUI.badge.targetTime}: {entities.target_time}</StatusBadge>
          )}
        </div>
      )}

      <div className={styles.content}>
        <h3 className={styles.title}>{isTranslating ? t.common.loading || 'Loading...' : (displayTitle as string)}</h3>
        <p className={styles.description}>{displayDescription}</p>
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
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {ticketId && <span className={styles.ticketId}>#{ticketId}</span>}
          {status === 'TODO' && onAccept && (
            <Button
              variant="primary"
              onClick={onAccept}
              style={{ padding: '4px 12px', minHeight: 'auto', fontSize: '12px' }}
              disabled={!isOnline}
              title={!isOnline ? "오프라인 상태에서는 변경할 수 없습니다" : undefined}
            >
              {t.ticketUI.button.accept}
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
              {t.ticketUI.button.complete}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function getRelativeTime(dateString: string | Date, language: string, timeTexts: any): string {
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
    return `${diffHours}${language === 'en' ? ' ' : ''}${timeTexts.hoursAgo}`;
  } else if (diffMins > 0) {
    return `${diffMins}${language === 'en' ? ' ' : ''}${timeTexts.minsAgo}`;
  } else {
    return timeTexts.justNow;
  }
}
