import React from 'react';
import Button from '@/components/ui/Button/Button';
import styles from './NotificationCard.module.css';

export type NotificationVariant = 'cancel' | 'escalation';

interface NotificationCardProps {
  /** 카드 유형: 'cancel' = 취소 요청, 'escalation' = 이관 요청 */
  variant: NotificationVariant;
  /** AI가 생성한 요약 제목 */
  title: string;
  /** 원문 또는 상세 설명 (rawText 등) */
  description?: string;
  /** 객실 번호 */
  roomNumber: string;
  /** 소속 부서명 */
  departmentName?: string;
  /** 생성 시각 (ISO string) */
  createdAt?: string;
  /** 우선순위 */
  priority?: string;
  /** 좌측(Primary) 버튼 텍스트 */
  primaryLabel: string;
  /** 우측(Secondary) 버튼 텍스트 */
  secondaryLabel: string;
  /** Primary 버튼 클릭 핸들러 */
  onPrimaryClick: () => void;
  /** Secondary 버튼 클릭 핸들러 */
  onSecondaryClick: () => void;
  /** 카드 자체 클릭 핸들러 (상세 모달 등) */
  onClick?: () => void;
}

const VARIANT_CONFIG: Record<NotificationVariant, { label: string; className: string }> = {
  cancel: { label: '취소 요청', className: 'tagCancel' },
  escalation: { label: '이관 요청', className: 'tagEscalation' },
};

function formatTime(isoStr?: string): string {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export default function NotificationCard({
  variant,
  title,
  description,
  roomNumber,
  departmentName,
  createdAt,
  priority,
  primaryLabel,
  secondaryLabel,
  onPrimaryClick,
  onSecondaryClick,
  onClick,
}: NotificationCardProps) {
  const config = VARIANT_CONFIG[variant];
  const isUrgent = priority === 'URGENT';

  return (
    <div
      className={`${styles.card} ${styles[variant]}`}
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      {/* 상단 컬러 액센트 바 */}
      <div className={styles.accentBar} />

      {/* 태그 + 객실 + 시간 */}
      <div className={styles.topRow}>
        <div className={styles.tags}>
          <span className={`${styles.tag} ${styles[config.className]}`}>{config.label}</span>
          {isUrgent && <span className={styles.tagUrgent}>긴급</span>}
        </div>
        <div className={styles.meta}>
          {createdAt && <span className={styles.time}>{formatTime(createdAt)}</span>}
        </div>
      </div>

      {/* 제목 + 객실 번호 */}
      <div className={styles.titleRow}>
        <h4 className={styles.title}>{title}</h4>
        <span className={styles.roomBadge}>{roomNumber}호</span>
      </div>

      {/* 부서명 */}
      {departmentName && (
        <span className={styles.department}>{departmentName}</span>
      )}

      {/* 상세 설명 */}
      {description && (
        <p className={styles.description}>{description}</p>
      )}

      {/* 액션 버튼 */}
      <div className={styles.actions}>
        <Button
          variant="primary"
          size="medium"
          fullWidth
          onClick={(e) => { e.stopPropagation(); onPrimaryClick(); }}
        >
          {primaryLabel}
        </Button>
        <Button
          variant="secondary"
          size="medium"
          fullWidth
          onClick={(e) => { e.stopPropagation(); onSecondaryClick(); }}
        >
          {secondaryLabel}
        </Button>
      </div>
    </div>
  );
}
