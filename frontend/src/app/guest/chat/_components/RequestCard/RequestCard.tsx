import React, { useState, useEffect } from 'react';
import styles from './RequestCard.module.css';

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
  onCancel?: () => void;
  onModify?: () => void;
}

const DOMAIN_MAP: Record<string, { icon: string; label: string; color: string }> = {
  HK: { icon: '🏨', label: '하우스키핑', color: '#E8F5E9' },
  FB: { icon: '🍽️', label: '식음료', color: '#FFF3E0' },
  FACILITY: { icon: '🔧', label: '시설관리', color: '#FFF8E1' },
  CONCIERGE: { icon: '🛎️', label: '컨시어지', color: '#E3F2FD' },
  FRONT: { icon: '🏢', label: '프론트', color: '#F3E5F5' },
  EMERGENCY: { icon: '🚨', label: '긴급', color: '#FFEBEE' },
  UNKNOWN: { icon: '📋', label: '기타 요청', color: '#F3F4F6' },
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
  onCancel,
  onModify,
}: RequestCardProps) {
  const isUrgent = priority === 'URGENT';
  const isCancelled = status === 'CANCELLED';
  const isEscalatedChat = entities?.intent === 'ESCALATION';
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
    const parts = [];
    if (entities.menu) parts.push(`${entities.menu}`);
    if (entities.symptom) parts.push(`${entities.symptom}`);
    return parts.join(', ');
  };

  const detailsText = renderDetails();

  return (
    <div className={`${styles.card} ${isUrgent ? styles.urgentCard : ''} ${isCancelled ? styles.cancelledCard : ''}`}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.badge} style={{ backgroundColor: domainInfo.color }}>
          {domainInfo.icon} {domainInfo.label}
        </div>
        <div className={styles.statusText}>
          {isCancelled ? '취소됨' : isEscalatedChat ? '상담 대기 중' : isUrgent ? '긴급 접수' : '대기 중'}
        </div>
      </div>

      {/* Content */}
      <div className={styles.content}>
        <div className={styles.summary}>{summary}</div>
        {detailsText && <div className={styles.details}>{detailsText}</div>}
      </div>

      {/* Meta */}
      {createdAt && (
        <div className={styles.meta}>
          🕐 {new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 접수
        </div>
      )}

      {/* Grace Period Timer & Buttons */}
      {showButtons && (
        <>
          <div className={styles.timerContainer}>
            <div className={styles.timerBarBg}>
              <div 
                className={styles.timerBarFill} 
                style={{ animationDuration: `${graceRemaining}s` }}
              />
            </div>
            <div className={styles.timerText}>{timeLeft}초</div>
          </div>
          <div className={styles.buttonGroup}>
            <button className={styles.actionButton} onClick={onModify}>수정하기</button>
            <button className={styles.actionButton} onClick={onCancel}>취소하기</button>
          </div>
        </>
      )}

      {/* Expiry Message or Progress */}
      {!showButtons && !isCancelled && (
        <>
          {isEscalatedChat ? (
            <div className={styles.completionMessage} style={{ color: 'var(--color-primary)' }}>
              💬 프론트 직원이 채팅으로 응대할 예정입니다.
            </div>
          ) : isUrgent ? (
            <div className={styles.completionMessage} style={{ color: 'var(--color-error)' }}>
              🔴 즉시 대응팀에 전달되었습니다
            </div>
          ) : (
            <div className={styles.completionMessage}>
              ✅ 직원에게 전달되었습니다
            </div>
          )}
          
          {/* Progress bar after grace period expires (Hide for Escalated Chat) */}
          {!isEscalatedChat && (
            <div className={styles.progressContainer}>
              <div className={styles.progressBarBg}>
                <div className={styles.progressBarFill} style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }} />
              </div>
              <div className={styles.steps}>
                <span className={progress >= 0 ? styles.stepActive : styles.stepInactive}>접수 완료</span>
                <span className={progress >= 50 ? styles.stepActive : styles.stepInactive}>처리 중</span>
                <span className={progress >= 100 ? styles.stepActive : styles.stepInactive}>완료</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
