import React, { useState, useEffect } from 'react';
import styles from './RequestCard.module.css';
import Button from '@/components/ui/Button/Button';
import Tag from '@/components/ui/StatusBadge/StatusBadge';
import { Monitor, Home, Utensils, Wrench, ConciergeBell, AlertTriangle, FileText } from 'lucide-react';

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

const DOMAIN_MAP: Record<string, { icon: React.ElementType; label: string }> = {
  HK: { icon: Home, label: '하우스키핑' },
  FB: { icon: Utensils, label: '식음료' },
  FACILITY: { icon: Wrench, label: '시설관리' },
  CONCIERGE: { icon: ConciergeBell, label: '컨시어지' },
  FRONT: { icon: Monitor, label: '프론트' },
  EMERGENCY: { icon: AlertTriangle, label: '긴급' },
  UNKNOWN: { icon: FileText, label: '기타 요청' },
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
  const isUrgent = priority === 'URGENT';
  const isCancelled = status === 'CANCELLED';
  const isCancelPending = cancelPending === true;
  const isEscalatedChat = domainCode === 'FRONT' && entities?.intent === 'ESCALATION';
  const isInProgress = progress >= 50 && progress < 100 && !isCancelled;
  const isCompleted = progress >= 100 && !isCancelled;
  const domainInfo = DOMAIN_MAP[domainCode] || DOMAIN_MAP['UNKNOWN'];
  const bgClass = styles[`bg${domainCode}`] || styles.bgUNKNOWN;
  const cardBgClass = styles[`cardBg${domainCode}`] || styles.cardBgUNKNOWN;

  const DOMAIN_TIMER_COLORS: Record<string, string> = {
    HK: 'var(--color-dept-hk-text)',
    FB: 'var(--color-dept-fb-text)',
    FACILITY: 'var(--color-dept-facility-text)',
    CONCIERGE: 'var(--color-dept-concierge-text)',
    FRONT: 'var(--color-dept-front-text)',
    EMERGENCY: 'var(--color-dept-emergency-text)',
  };
  const timerColor = DOMAIN_TIMER_COLORS[domainCode] || 'var(--color-primary)';
  
  // Timer state
  const [timeLeft, setTimeLeft] = useState(graceRemaining);

  // Format summary to hide internal notes from guest
  const displaySummary = summary.includes('[직원 인수인계]') || summary.includes('[프론트 연결]') || summary.includes('미학습 정보') || isEscalatedChat
    ? '프론트 데스크 직원 연결 요청'
    : summary;

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
    
    const parts: string[] = [];
    if (Array.isArray(entities.items)) {
      entities.items.forEach((it: any) => {
        parts.push(`${it.item} ${it.count ? `×${it.count}` : ''}`);
      });
    } else if (entities.item) {
      parts.push(`${entities.item} ${entities.count ? `×${entities.count}` : ''}`);
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
    
    return parts.length > 0 ? parts.join(', ') : null;
  };

  const detailsText = renderDetails();

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  };

  return (
    <div className={`glass-panel ${styles.card} ${cardBgClass} ${isCancelled ? styles.cancelledCard : ''} ${isCancelPending ? styles.cancelPendingCard : ''} ${isInProgress ? styles.inProgressCard : ''} ${isCompleted ? styles.completedCard : ''}`}>
      <div className={styles.cardLayout}>
        {/* Left Column: Icon or Timer */}
        <div className={styles.leftColumn}>
          {showButtons ? (
            <div className={`${styles.timerContainer} ${bgClass}`} style={{ '--timer-color': timerColor } as React.CSSProperties}>
              <svg viewBox="0 0 36 36" className={styles.circularSvg}>
                <path
                  className={styles.circleBg}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={styles.circleProgress}
                  strokeDasharray={`${(timeLeft / Math.max(graceRemaining, 1)) * 100}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className={styles.timerText}>{timeLeft}</div>
            </div>
          ) : (
            <div className={`${styles.iconContainer} ${bgClass}`}>
              <domainInfo.icon size={20} />
            </div>
          )}
        </div>

        {/* Right Column: Content */}
        <div className={styles.rightColumn}>
          <div className={styles.content}>
            <div className={styles.summaryRow}>
              <div className={styles.summary}>{displaySummary}</div>
              <div className={styles.timeLabel}>{formatTime(createdAt)}</div>
            </div>
          </div>

          <div className={`${styles.completionMessage} ${isCancelled ? styles.cancelledText : ''}`}>
            {isCancelled ? (
              <>요청이 취소되었습니다</>
            ) : showButtons ? (
              <>요청 내용을 확인해 주세요. 잠시 후 자동 전달됩니다.</>
            ) : isCancelPending ? (
              <>취소 요청 확인 중</>
            ) : isEscalatedChat ? (
              <>직원이 응대할 예정입니다</>
            ) : (
              <>{domainInfo.label} 팀에 전달되었습니다</>
            )}
          </div>
        </div>
      </div>

      {/* Buttons — full width below cardLayout */}
      <div className={`${styles.buttonGroup} ${!showButtons ? styles.hiddenButtons : ''}`}>
        <Button variant="secondary" size="medium" onClick={onCancel} fullWidth>요청 취소</Button>
        <Button variant="primary" size="medium" onClick={onAccept} fullWidth>진행</Button>
      </div>
    </div>
  );
}
