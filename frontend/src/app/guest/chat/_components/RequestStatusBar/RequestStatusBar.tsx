import React, { useState, useEffect } from 'react';
import styles from './RequestStatusBar.module.css';

export interface RequestStatusBarProps {
  requestId: number;
  domainCode: string;
  summary: string;
  status: string;
  entities?: Record<string, unknown>;
  createdAt?: string;
  progress: number;
}

const DOMAIN_MAP: Record<string, { icon: string; label: string }> = {
  HK: { icon: '🏨', label: '하우스키핑' },
  FB: { icon: '🍽️', label: '식음료' },
  FACILITY: { icon: '🔧', label: '시설관리' },
  CONCIERGE: { icon: '🛎️', label: '컨시어지' },
  FRONT: { icon: '🏢', label: '프론트' },
  EMERGENCY: { icon: '🚨', label: '긴급' },
  UNKNOWN: { icon: '📋', label: '기타 요청' },
};

const STATUS_TEXT: Record<string, string> = {
  PENDING: '대기 중',
  IN_PROGRESS: '처리 중',
  COMPLETED: '처리 완료',
  CANCELLED: '취소됨',
};

export default function RequestStatusBar({
  requestId,
  domainCode,
  summary,
  status,
  entities,
  createdAt,
  progress,
}: RequestStatusBarProps) {
  const [expanded, setExpanded] = useState(false);
  const [visible, setVisible] = useState(true);

  const domainInfo = DOMAIN_MAP[domainCode] || DOMAIN_MAP['UNKNOWN'];
  const statusLabel = STATUS_TEXT[status] || '알 수 없음';
  
  // Handle auto-hide on completion or cancellation
  useEffect(() => {
    if (status === 'CANCELLED') {
      setVisible(false);
    } else if (status === 'COMPLETED') {
      const timer = setTimeout(() => {
        setVisible(false);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setVisible(true); // reset visibility if status goes back to pending/assigned
    }
  }, [status]);

  if (!visible) {
    return <div className={styles.statusBarContainer + ' ' + styles.hidden} />;
  }

  return (
    <div className={styles.statusBarContainer}>
      {/* Compact View */}
      <div className={styles.compactView} onClick={() => setExpanded(!expanded)}>
        <div className={styles.iconWrapper}>
          <span className={styles.icon}>{domainInfo.icon}</span>
        </div>
        
        <div className={styles.progressSection}>
          <div className={styles.inlineProgressBarContainer}>
            <div className={styles.inlineProgressBarBg}>
              <div 
                className={styles.inlineProgressBarFill} 
                style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }} 
              />
            </div>
            <div className={styles.progressDotsOverlay}>
              <div className={`${styles.progressDot} ${progress > 0 ? styles.dotActive : ''}`} />
              <div className={`${styles.progressDot} ${progress >= 50 ? styles.dotActive : ''}`} />
              <div className={`${styles.progressDot} ${progress >= 100 ? styles.dotActive : ''}`} />
            </div>
          </div>
        </div>

        <div className={styles.statusSection}>
          <span className={styles.summary}>{statusLabel}</span>
          <span className={`${styles.arrow} ${expanded ? styles.open : ''}`}>▾</span>
        </div>
      </div>

      {/* Expanded View */}
      {expanded && (
        <div className={styles.expandedView}>
          <div className={styles.progressContainer}>
            <div className={styles.inlineProgressBarContainer}>
              <div className={styles.inlineProgressBarBg}>
                <div 
                  className={styles.inlineProgressBarFill} 
                  style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }} 
                />
              </div>
              <div className={styles.progressDotsOverlay}>
                <div className={`${styles.progressDot} ${progress > 0 ? styles.dotActive : ''}`} />
                <div className={`${styles.progressDot} ${progress >= 50 ? styles.dotActive : ''}`} />
                <div className={`${styles.progressDot} ${progress >= 100 ? styles.dotActive : ''}`} />
              </div>
            </div>
            <div className={styles.steps}>
              <span className={progress >= 0 ? styles.stepActive : styles.stepInactive}>접수 완료</span>
              <span className={progress >= 50 ? styles.stepActive : styles.stepInactive}>처리 중</span>
              <span className={progress >= 100 ? styles.stepActive : styles.stepInactive}>처리 완료</span>
            </div>
          </div>

          <div className={styles.detailsContainer}>
            <div className={styles.detailsTitle}>📋 {summary}</div>
            
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>담당</span>
              <span className={styles.detailValue}>{domainInfo.label}</span>
            </div>
            
            {createdAt && (
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>접수 시간</span>
                <span className={styles.detailValue}>
                  {new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}
            
            {Boolean(entities && entities.item) && (
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>물품</span>
                <span className={styles.detailValue}>{String(entities?.item)}</span>
              </div>
            )}
            {Boolean(entities && entities.count !== undefined && entities.count !== null) && (
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>수량</span>
                <span className={styles.detailValue}>{String(entities?.count)}개</span>
              </div>
            )}
            {Boolean(entities && !entities.item) && Object.entries(entities || {}).map(([key, val]) => {
              if (key === 'intent') return null;
              return (
                <div key={key} className={styles.detailItem}>
                  <span className={styles.detailLabel}>{key}</span>
                  <span className={styles.detailValue}>{String(val)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
