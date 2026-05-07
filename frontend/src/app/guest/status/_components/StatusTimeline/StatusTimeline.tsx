import React from 'react';
import styles from './StatusTimeline.module.css';

export type RequestStatus = 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'SETTLED' | 'CANCELLED';

interface StatusTimelineProps {
  status: RequestStatus;
}

const STEPS = [
  { key: 'PENDING', label: '접수됨' },
  { key: 'ASSIGNED', label: '담당자 배정' },
  { key: 'IN_PROGRESS', label: '진행 중' },
  { key: 'COMPLETED', label: '완료' },
];

export default function StatusTimeline({ status }: StatusTimelineProps) {
  if (status === 'CANCELLED') {
    return (
      <div className={styles.timeline}>
        <div style={{ width: '100%', textAlign: 'center', color: 'var(--color-error)', font: 'var(--text-body-medium)' }}>
          취소된 요청입니다.
        </div>
      </div>
    );
  }

  // 매핑 로직
  let currentIndex = 0;
  if (status === 'ASSIGNED') currentIndex = 1;
  else if (status === 'IN_PROGRESS') currentIndex = 2;
  else if (status === 'COMPLETED' || status === 'SETTLED') currentIndex = 3;

  const progressPercentage = (currentIndex / (STEPS.length - 1)) * 100;

  return (
    <div className={styles.timeline}>
      <div className={styles.track} />
      <div className={styles.progress} style={{ width: `${progressPercentage}%` }} />
      
      {STEPS.map((step, index) => {
        const isPast = index < currentIndex;
        const isCurrent = index === currentIndex;
        
        let circleClass = styles.circle;
        if (isPast || (isCurrent && currentIndex === STEPS.length - 1)) circleClass += ` ${styles.activeCircle}`;
        else if (isCurrent) circleClass += ` ${styles.pulseCircle}`;

        let labelClass = styles.label;
        if (isPast || isCurrent) labelClass += ` ${styles.activeLabel}`;

        return (
          <div key={step.key} className={styles.step}>
            <div className={circleClass}>
              {(isPast || (isCurrent && currentIndex === STEPS.length - 1)) ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : isCurrent ? (
                <div className={styles.innerDot} />
              ) : null}
            </div>
            <span className={labelClass}>{step.label}</span>
          </div>
        );
      })}
    </div>
  );
}
