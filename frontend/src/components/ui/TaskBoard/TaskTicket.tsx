import React from 'react';
import styles from './TaskTicket.module.css';
import StatusBadge from '@/components/ui/StatusBadge/StatusBadge';
import Button from '@/components/ui/Button/Button';
import { useNetworkStore } from '@/stores/useNetworkStore';
import { useTranslation } from '@/app/useTranslation';

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

  let targetIntent = entities?.intent;
  let targetCount = entities?.count;
  let orderDetails = '';
  
  // 만약 items나 tasks 배열이 있다면 (HK 등), 그 안의 세부 항목을 진짜 targetIntent로 사용합니다.
  if (entities?.items && Array.isArray(entities.items) && entities.items.length > 0) {
    targetIntent = entities.items[0].item;
    targetCount = entities.items[0].count;
  } else if (entities?.tasks && Array.isArray(entities.tasks) && entities.tasks.length > 0) {
    targetIntent = entities.tasks[0];
  } else if (entities?.intent === 'ROOM_SERVICE' && entities?.menu_items && Array.isArray(entities.menu_items) && entities.menu_items.length > 0) {
    // F&B 룸서비스의 경우, 첫 번째 메뉴 이름을 사용
    let firstMenu = entities.menu_items[0].name;
    const tMenu = (t as any).menu;
    if (tMenu && firstMenu in tMenu) {
      firstMenu = tMenu[firstMenu];
    }
    const totalCount = entities.menu_items.reduce((sum: number, m: any) => sum + (m.quantity || 1), 0);
    const extraCount = entities.menu_items.length - 1;
    
    if (extraCount > 0) {
      orderDetails = `${firstMenu} ${totalCount}${t.cardUI.items} ${t.cardUI.and} ${extraCount}${t.cardUI.others}`;
    } else {
      orderDetails = `${firstMenu} ${totalCount}${t.cardUI.items}`;
    }
  }

  // 혹시라도 소문자로 왔을 경우를 대비해 대문자로 정규화
  if (targetIntent && typeof targetIntent === 'string') {
    targetIntent = targetIntent.toUpperCase();
  }

  const translatedIntent = targetIntent && t.intents ? t.intents[targetIntent as keyof typeof t.intents] : null;
  
  let displayTitle = title;
  if (language === 'en' && (entities as any)?.summary_en) {
    displayTitle = (entities as any).summary_en as string;
  }

  if (orderDetails) {
    displayTitle = orderDetails; // e.g. "콜라 2개 외 1건" or "Coke 2items and 1other item(s)"
  } else if (entities?.intent === 'ORDER_MODIFY' || entities?.intent === 'ORDER_CANCEL') {
    // 주문 변경/취소의 경우 AI가 생성한 상세 summary(title)를 그대로 사용
  } else if (translatedIntent && (!(entities as any)?.summary_en || language !== 'en')) {
    displayTitle = targetCount ? `${translatedIntent} (${targetCount}${t.cardUI.items})` : translatedIntent;
  }

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
    timeDisplay = getRelativeTime(createdAt, language, t.ticketUI.time);
  }

  let displayDescription = description;
  if (language === 'en') {
    if (description === '관리자') displayDescription = 'Admin';
    else if (description === '직원') displayDescription = 'Staff';
  }

  return (
    <div className={`${styles.taskTicket} ${styles[deptKey]} ${isCancelled ? styles.isCancelled : ''}`}>
      <div className={styles.topColorBar} />
      <div className={styles.header}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {roomNo && (
            <>
              <span className={styles.roomNo}>{roomNo}호</span>
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
        <h3 className={styles.title}>{displayTitle as string}</h3>
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
