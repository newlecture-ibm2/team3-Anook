import React from 'react';
import styles from './StatusCard.module.css';
import { TimerIcon } from '@/components/icons';

export interface StatusCardProps {
  progress: number; // 0 to 100
  steps?: string[];
  cancelled?: boolean;
  cancelPending?: boolean;
}

export default function StatusCard({ 
  progress, 
  steps = ['접수 완료', '처리 중', '완료'],
  cancelled = false,
  cancelPending = false,
}: StatusCardProps) {
  
  // 취소 상태면 별도 렌더링
  if (cancelled) {
    return (
      <div className={styles.card}>
        <div className={styles.title}>
          <TimerIcon style={{ width: '18px', height: '18px' }} />
          <span style={{ position: 'relative', top: '1px' }}>요청 처리 현황</span>
        </div>
        <div className={styles.barBackground}>
          <div className={styles.barCancelled} style={{ width: '100%' }} />
        </div>
        <div className={styles.cancelledText}>요청이 취소되었습니다</div>
      </div>
    );
  }

  // 계산된 진행률에 따라 활성화된 스텝을 판별 (33% = 접수 완료, 66% = 처리 중, 100% = 완료)
  const activeStepIndex = progress >= 100 ? 2 : progress >= 66 ? 1 : 0;

  return (
    <div className={styles.card}>
      <div className={styles.title}>
        <TimerIcon style={{ width: '18px', height: '18px' }} />
        <span style={{ position: 'relative', top: '1px' }}>요청 처리 현황</span>
      </div>
      <div className={styles.barBackground}>
        <div 
          className={cancelPending ? styles.barCancelPending : styles.barFill} 
          style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }} 
        />
      </div>
      <div className={styles.steps}>
        {steps.map((step, index) => (
          <span 
            key={index} 
            className={index <= activeStepIndex ? (cancelPending ? styles.stepCancelPending : styles.stepActive) : styles.stepInactive}
            style={{ 
              flex: 1, 
              textAlign: index === 0 ? 'left' : index === steps.length - 1 ? 'right' : 'center' 
            }}
          >
            {step} {index === steps.length - 1 && progress >= 100 && '✓'}
          </span>
        ))}
      </div>
    </div>
  );
}
