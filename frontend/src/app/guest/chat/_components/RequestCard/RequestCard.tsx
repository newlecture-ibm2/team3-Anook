import React, { useState, useEffect } from 'react';
import styles from './RequestCard.module.css';
import Button from '@/components/ui/Button/Button';
import Tag from '@/components/ui/StatusBadge/StatusBadge';
import { useTranslation } from '@/app/useTranslation';

export interface RequestCardProps {
  requestId: number;
  domainCode: string;
  summary: string;
  entities?: Record<string, unknown>;
  status: string;
  progress: number;
  graceRemaining: number;
  priority: string;
  createdAt?: string;
  cancelPending?: boolean;
  onCancel?: () => void;
  onModify?: () => void;
  onAccept?: () => void;
}

const DOMAIN_MAP: Record<string, { icon: string; label: string; variant: 'red' | 'purple' | 'green' | 'gray' }> = {
  HK: { icon: '🏨', label: '하우스키핑', variant: 'green' },
  FB: { icon: '🍽️', label: '식음료', variant: 'gray' },
  FACILITY: { icon: '🔧', label: '시설관리', variant: 'gray' },
  CONCIERGE: { icon: '🛎️', label: '컨시어지', variant: 'purple' },
  FRONT: { icon: '🏢', label: '프론트', variant: 'purple' },
  EMERGENCY: { icon: '🚨', label: '긴급', variant: 'red' },
  UNKNOWN: { icon: '📋', label: '기타 요청', variant: 'gray' },
};

export default function RequestCard({
  requestId,
  domainCode,
  summary,
  entities,
  status,
  progress,
  graceRemaining,
  priority,
  createdAt,
  cancelPending,
  onCancel,
  onModify,
  onAccept,
}: RequestCardProps) {
  const { t, language } = useTranslation();

  const isUrgent = priority === 'URGENT';
  const isCancelled = status === 'CANCELLED';
  const isCancelPending = cancelPending === true;
  const isEscalatedChat = entities?.intent === 'ESCALATION';
  const isInProgress = progress >= 50 && progress < 100 && !isCancelled;
  const isCompleted = progress >= 100 && !isCancelled;
  const domainInfo = DOMAIN_MAP[domainCode] || DOMAIN_MAP['UNKNOWN'];
  
  // Timer state
  const [timeLeft, setTimeLeft] = useState(graceRemaining);

  useEffect(() => {
    if (graceRemaining <= 0 || isCancelled) {
      setTimeLeft(0);
      return;
    }

    setTimeLeft(graceRemaining);
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [graceRemaining, isCancelled]);

  // Determine if we should show buttons
  const showButtons = !isUrgent && !isCancelled && timeLeft > 0;

  // Render entities description
  const renderDetails = () => {
    if (!entities) return null;
    
    // Example: "수건 ×2장"
    if (entities.item) {
      return `${entities.item} ${entities.count ? `×${entities.count}` : ''}`;
    }
    // Fallback if no specific format matched, maybe raw text or other entity props
    const HIDDEN_KEYS = ['intent', 'emergency_category', 'matched_keyword', 'severity'];
    const parts = [];
    if (entities.menu) parts.push(`${entities.menu}`);
    if (entities.symptom) parts.push(`${entities.symptom}`);
    // 시스템 내부용 키만 있는 경우 빈 문자열 반환
    if (parts.length === 0) {
      const visibleEntries = Object.entries(entities).filter(([key]) => !HIDDEN_KEYS.includes(key));
      if (visibleEntries.length === 0) return null;
    }
    return parts.join(', ');
  };

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
    // 다국어 메뉴 매핑이 있으면 영어 등으로 번역
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
  
  let displaySummary = summary;
  if (language === 'en' && (entities as any)?.summary_en) {
    displaySummary = (entities as any).summary_en as string;
  }
  
  if (orderDetails) {
    displaySummary = orderDetails; // e.g. "콜라 2개 외 1건" or "Coke 2items and 1other item(s)"
  } else if (translatedIntent && (!(entities as any)?.summary_en || language !== 'en')) {
    // summary_en이 없고 번역된 인텐트가 있는 경우에만 인텐트를 표시 (폴백)
    displaySummary = targetCount ? `${translatedIntent} (${targetCount}${t.cardUI.items})` : translatedIntent;
  }

  // summary_en을 쓰거나 번역된 인텐트가 있는 경우, 중복된 한국어 상세 정보(고장 등)를 숨김
  const detailsText = (translatedIntent || (language === 'en' && (entities as any)?.summary_en)) ? null : renderDetails();

  let statusText = t.cardUI.status.pending;
  if (isCancelled) statusText = t.cardUI.status.cancelled;
  else if (isCancelPending) statusText = t.cardUI.status.cancelPending;
  else if (isEscalatedChat) statusText = t.cardUI.status.escalated;
  else if (isCompleted) statusText = t.cardUI.status.completedMark;
  else if (isInProgress) statusText = t.cardUI.status.inProgress;

  const displayDomainLabel = t.ticketUI.department[domainCode as keyof typeof t.ticketUI.department] || domainInfo.label;

  return (
    <div className={`${styles.card} ${isCancelled ? styles.cancelledCard : ''} ${isCancelPending ? styles.cancelPendingCard : ''} ${isInProgress ? styles.inProgressCard : ''} ${isCompleted ? styles.completedCard : ''}`}>
      {/* Header */}
      <div className={styles.header}>
        <Tag variant={domainInfo.variant}>
          {domainInfo.icon} {displayDomainLabel}
        </Tag>
        <div className={styles.statusText}>
          {statusText}
        </div>
      </div>

      {/* Content */}
      <div className={styles.content}>
        <div className={styles.summary}>{displaySummary as string}</div>
        {detailsText && <div className={styles.details}>{detailsText}</div>}
      </div>

      {/* Meta */}
      {createdAt && (
        <div className={styles.meta}>
          🕐 {new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {t.cardUI.time.received}
        </div>
      )}

      {/* Grace Period Timer & Buttons */}
      {showButtons && (
        <>
          <div className={styles.guideText}>
            <strong>{t.cardUI.message.autoAcceptGuide}</strong>
          </div>
          <div className={styles.timerContainer}>
            <div className={styles.timerBarBg}>
              <div 
                className={styles.timerBarFill} 
                style={{ animationDuration: `${graceRemaining}s` }}
              />
            </div>
            <div className={styles.timerText}>{timeLeft}{t.cardUI.time.seconds}</div>
          </div>
          <div className={styles.buttonGroup}>
            <Button variant="primary" style={{ flex: 1, borderRadius: 'var(--radius-full)' }} onClick={onAccept}>{t.cardUI.button.accept}</Button>
            <Button variant="secondary" style={{ flex: 1, borderRadius: 'var(--radius-full)' }} onClick={onCancel}>{t.cardUI.button.cancel}</Button>
          </div>
        </>
      )}

      {/* Expiry Message or Progress */}
      {!showButtons && !isCancelled && (
        <>
          {isCancelPending ? (
            <div className={styles.completionMessage} style={{ color: 'var(--color-primary)' }}>
              {t.cardUI.message.cancelPending}
            </div>
          ) : isEscalatedChat ? (
            <div className={styles.completionMessage} style={{ color: 'var(--color-primary)' }}>
              {t.cardUI.message.escalated}
            </div>
          ) : (
            <div className={styles.completionMessage}>
              {t.cardUI.message.forwarded}
            </div>
          )}
          
          {/* Progress bar after grace period expires (Hide for Escalated Chat) */}
          {!isEscalatedChat && (
            <div className={styles.progressContainer}>
              <div className={styles.progressBarBg}>
                <div className={styles.progressBarFill} style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }} />
              </div>
              <div className={styles.steps}>
                <span className={progress >= 0 ? styles.stepActive : styles.stepInactive}>{t.cardUI.status.received}</span>
                <span className={progress >= 50 ? styles.stepActive : styles.stepInactive}>{t.cardUI.status.inProgress}</span>
                <span className={progress >= 100 ? styles.stepActive : styles.stepInactive}>{t.cardUI.status.completed}</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
