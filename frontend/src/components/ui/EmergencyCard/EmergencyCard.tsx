import React from 'react';
import styles from './EmergencyCard.module.css';

interface EmergencyCardProps {
  id: number;
  roomNumber: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  onStartResponse: (id: number) => void;
  onCallEngineer: (id: number) => void;
  isStarting?: boolean;
  isCalling?: boolean;
}

export default function EmergencyCard({
  id,
  roomNumber,
  title,
  description,
  status,
  priority,
  createdAt,
  onStartResponse,
  onCallEngineer,
  isStarting = false,
  isCalling = false
}: EmergencyCardProps) {
  
  // Format date to show time only if it's today, otherwise show date
  const formatTime = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateString;
    }
  };

  const isPending = status === 'PENDING';
  const isInProgress = status === 'IN_PROGRESS';

  return (
    <div className={styles.card}>
      <div className={styles.roomBox}>
        <span className={styles.roomLabel}>객실</span>
        <span className={styles.roomNumber}>{roomNumber || '-'}</span>
      </div>
      
      <div className={styles.content}>
        <div className={styles.meta}>
          <span className={styles.badge}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg> 
            {priority}
          </span>
          <span className={styles.time}>🕒 {formatTime(createdAt)}</span>
          <span className={isInProgress ? styles.statusInProgress : styles.statusPending}>
            {isInProgress ? '진행 중' : isPending ? '대기 중' : status}
          </span>
        </div>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.description}>{description}</p>
      </div>
      
      <div className={styles.actions}>
        <button 
          className={styles.btnPrimary} 
          onClick={() => onStartResponse(id)}
          disabled={isStarting || isInProgress}
        >
          {isStarting ? '처리중...' : isInProgress ? '대응중' : '긴급 대응 시작'}
        </button>
        <button 
          className={styles.btnSecondary} 
          onClick={() => onCallEngineer(id)}
          disabled={isCalling}
        >
          {isCalling ? '호출중...' : '엔지니어 호출'}
        </button>
      </div>
    </div>
  );
}
