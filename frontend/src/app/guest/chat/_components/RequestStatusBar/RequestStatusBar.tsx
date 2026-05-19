import React, { useState, useEffect } from 'react';
import styles from './RequestStatusBar.module.css';
import { useTranslation } from '@/app/useTranslation';
import { useTranslationApi } from '@/app/useTranslationApi';

export interface RequestStatusBarProps {
  requestId: number;
  domainCode: string;
  summary: string;
  status: string;
  entities?: Record<string, unknown>;
  createdAt?: string;
  progress: number;
  isMini?: boolean;
}

const DOMAIN_MAP: Record<string, { icon: string, key: string }> = {
  HK: { icon: '🏨', key: 'HK' },
  FB: { icon: '🍽️', key: 'FB' },
  FACILITY: { icon: '🔧', key: 'FACILITY' },
  CONCIERGE: { icon: '🛎️', key: 'CONCIERGE' },
  FRONT: { icon: '🏢', key: 'FRONT' },
  EMERGENCY: { icon: '🚨', key: 'EMERGENCY' },
  UNKNOWN: { icon: '📋', key: 'UNKNOWN' },
};

export default function RequestStatusBar({
  domainCode,
  summary,
  status,
  entities,
  progress,
  isMini = false
}: RequestStatusBarProps) {
  const [visible, setVisible] = useState(true);
  const { t, language } = useTranslation();
  
  // Translation for summary
  const { translatedText } = useTranslationApi(summary, language);
  const displaySummary = translatedText || summary;

  const domainInfo = DOMAIN_MAP[domainCode] || DOMAIN_MAP['UNKNOWN'];
  // @ts-ignore
  const domainLabel = domainInfo.key !== 'UNKNOWN' ? (t.ticketUI.department[domainInfo.key] || domainInfo.key) : (t.ticketUI.department.FRONT || '기타');
  
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
  
  let computedProgress = 0;
  if (status === 'PENDING' || status === 'CANCEL_PENDING' || status === 'ESCALATED') {
    computedProgress = 0;
  } else if (status === 'IN_PROGRESS') {
    computedProgress = 50;
  } else if (status === 'COMPLETED') {
    computedProgress = 100;
  }

  useEffect(() => {
    if (status === 'CANCELLED') {
      setVisible(false);
    } else if (status === 'COMPLETED') {
      const timer = setTimeout(() => {
        setVisible(false);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setVisible(true);
    }
  }, [status]);

  if (!visible) return null;

  return (
    <div 
      className={styles.statusBarContainer}
      style={isMini ? { padding: 'var(--space-12) var(--space-24)', gap: 0 } : {}}
    >
      {!isMini && (
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.title}>{displaySummary}</div>
            <div className={styles.details}>
              <span className={styles.detailText}>
                {domainCode === 'EMERGENCY' ? (
                  <>
                    {(status === 'PENDING' || status === 'CANCEL_PENDING') && (t.cardUI.statusBar?.emergencyPending || '프론트 데스크에서 긴급 요청건을 확인하고 있습니다.')}
                    {status === 'IN_PROGRESS' && (t.cardUI.statusBar?.emergencyInProgress || '프론트 데스크에서 긴급 요청건을 처리 중입니다.')}
                    {status === 'COMPLETED' && (t.cardUI.statusBar?.emergencyCompleted || '긴급 요청건이 처리 완료되었습니다.')}
                  </>
                ) : detailsText ? (
                  <>
                    {(status === 'PENDING' || status === 'CANCEL_PENDING') && t.cardUI.statusBar?.templateWithDetailsPending?.replace('{team}', domainLabel).replace('{details}', detailsText)}
                    {status === 'IN_PROGRESS' && t.cardUI.statusBar?.templateWithDetailsInProgress?.replace('{team}', domainLabel).replace('{details}', detailsText)}
                    {status === 'COMPLETED' && t.cardUI.statusBar?.templateWithDetailsCompleted?.replace('{team}', domainLabel).replace('{details}', detailsText)}
                  </>
                ) : (
                  <>
                    {(status === 'PENDING' || status === 'CANCEL_PENDING') && t.cardUI.statusBar?.templateNoDetailsPending?.replace('{team}', domainLabel)}
                    {status === 'IN_PROGRESS' && t.cardUI.statusBar?.templateNoDetailsInProgress?.replace('{team}', domainLabel)}
                    {status === 'COMPLETED' && t.cardUI.statusBar?.templateNoDetailsCompleted?.replace('{team}', domainLabel)}
                  </>
                )}
              </span>
            </div>
          </div>
        </div>
      )}
      
      <div className={styles.stepperContainer}>
        {/* Background lines */}
        <div className={styles.stepperTrack}>
          <div 
            className={styles.stepperFill} 
            style={{ width: `${computedProgress}%` }} 
          />
        </div>

        {/* Nodes */}
        <div className={styles.stepperNodes}>
          {/* Step 1: 확인 중 (0%) */}
          <div className={styles.stepWrapper}>
            <div className={`${styles.node} ${computedProgress > 0 ? styles.nodeCompleted : computedProgress === 0 ? styles.nodeActive : styles.nodeInactive}`}>
              {computedProgress > 0 ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              ) : computedProgress === 0 ? <div className={styles.innerDot} /> : null}
            </div>
            <div className={`${styles.stepLabel} ${computedProgress >= 0 ? styles.labelActive : ''}`}>{t.cardUI.statusBar?.checking || '확인 중'}</div>
          </div>

          {/* Step 2: 처리 중 (50%) */}
          <div className={styles.stepWrapper}>
            <div className={`${styles.node} ${computedProgress > 50 ? styles.nodeCompleted : computedProgress === 50 ? styles.nodeActive : styles.nodeInactive}`}>
              {computedProgress > 50 ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              ) : computedProgress === 50 ? <div className={styles.innerDot} /> : null}
            </div>
            <div className={`${styles.stepLabel} ${computedProgress >= 50 ? styles.labelActive : ''}`}>{t.cardUI.statusBar?.processing || '처리 중'}</div>
          </div>

          {/* Step 3: 처리 완료 (100%) */}
          <div className={styles.stepWrapper}>
            <div className={`${styles.node} ${computedProgress >= 100 ? styles.nodeCompleted : styles.nodeInactive}`}>
              {computedProgress >= 100 ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              ) : null}
            </div>
            <div className={`${styles.stepLabel} ${computedProgress >= 100 ? styles.labelActive : ''}`}>{t.cardUI.statusBar?.completed || '처리 완료'}</div>
          </div>
        </div>
      </div>

    </div>
  );
}
