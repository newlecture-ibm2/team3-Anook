import React from 'react';
import styles from './RequestStatusCard.module.css';
import StatusTimeline, { RequestStatus } from '../StatusTimeline/StatusTimeline';

export interface RequestStatusCardProps {
  summary: string;
  domainCode: string;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
}

const DOMAIN_MAP: Record<string, string> = {
  'HK': '하우스키핑',
  'FB': '다이닝',
  'FD': '프론트 데스크',
  'ENG': '엔지니어링',
  'CON': '컨시어지',
};

export default function RequestStatusCard({
  summary,
  domainCode,
  status,
  createdAt,
  updatedAt,
}: RequestStatusCardProps) {
  
  const deptName = DOMAIN_MAP[domainCode] || domainCode;
  
  const formatTime = (isoStr: string) => {
    const date = new Date(isoStr);
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${hh}:${min}`;
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <span className={styles.department}>{deptName}</span>
          <h3 className={styles.title}>{summary}</h3>
        </div>
        <div className={styles.timeInfo}>
          <span>접수: {formatTime(createdAt)}</span>
          {status !== 'PENDING' && <span>업데이트: {formatTime(updatedAt)}</span>}
        </div>
      </div>
      
      <div className={styles.timelineWrapper}>
        <StatusTimeline status={status} />
      </div>
    </div>
  );
}
