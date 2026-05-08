'use client';

import React, { useEffect, useRef } from 'react';
import styles from './EmergencyBanner.module.css';

interface EmergencyAlert {
  requestId: number;
  roomNo: string;
  summary: string;
  category: string;
}

interface EmergencyBannerProps {
  alert: EmergencyAlert;
  onDismiss: () => void;
  onClick?: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  FIRE: '🔥 화재',
  MEDICAL: '🏥 의료',
  THREAT: '🚨 위협',
};

/**
 * 긴급 상황 알림 배너 (EM-217)
 *
 * WebSocket으로 URGENT + emergency_category 이벤트 수신 시 표시.
 * 빨간색 깜빡이는 배너 + 알림음으로 즉각 주의를 환기.
 */
export default function EmergencyBanner({ alert, onDismiss, onClick }: EmergencyBannerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 배너 표시 시 알림음 재생
  useEffect(() => {
    try {
      // Web Audio API로 경고음 생성 (외부 파일 불필요)
      const ctx = new AudioContext();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.connect(gain);
      gain.connect(ctx.destination);

      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);

      // 짧은 비프음 3회
      oscillator.start(ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.15, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0, ctx.currentTime + 0.45);
      gain.gain.setValueAtTime(0.15, ctx.currentTime + 0.6);
      gain.gain.setValueAtTime(0, ctx.currentTime + 0.75);
      oscillator.stop(ctx.currentTime + 0.8);
    } catch {
      // AudioContext 미지원 환경 무시
    }
  }, [alert.requestId]);

  const categoryLabel = CATEGORY_LABELS[alert.category] || '🚨 긴급';

  return (
    <div className={styles.banner} onClick={onClick} role="alert">
      <div className={styles.iconPulse}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
      </div>

      <div className={styles.textArea}>
        <p className={styles.title}>
          {categoryLabel} — {alert.roomNo}호
        </p>
        <p className={styles.detail}>{alert.summary}</p>
      </div>

      <button
        className={styles.closeBtn}
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
        aria-label="긴급 알림 닫기"
      >
        ✕
      </button>
    </div>
  );
}
