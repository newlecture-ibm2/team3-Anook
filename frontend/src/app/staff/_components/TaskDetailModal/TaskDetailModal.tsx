import React from 'react';
import ModalOverlay from '@/components/ui/Modal/ModalOverlay';
import ModalCard from '@/components/ui/Modal/ModalCard';
import StatusBadge from '@/components/ui/StatusBadge/StatusBadge';
import Button from '@/components/ui/Button/Button';
import styles from './TaskDetailModal.module.css';
import { StaffTask } from '../../useTasks';

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: StaffTask | null;
  onAccept?: (id: number) => Promise<void>;
  onComplete?: (id: number) => Promise<void>;
}

export default function TaskDetailModal({ isOpen, onClose, task, onAccept, onComplete }: TaskDetailModalProps) {
  if (!isOpen || !task) return null;

  let badgeVariant: 'red' | 'purple' | 'green' | 'gray' | 'black' = 'gray';
  if (task.priority === 'HIGH' || task.priority === 'URGENT') {
    badgeVariant = 'red';
  }

  const formattedDate = new Date(task.createdAt).toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <ModalOverlay isOpen={isOpen} onClose={onClose}>
      <ModalCard size="md" padding="var(--space-32)">
        <div className={styles.container}>
          <div className={styles.header}>
            <div className={styles.headerTop}>
              <span className={styles.roomBadge}>[{task.roomNumber}호]</span>
              <StatusBadge variant={badgeVariant}>{task.priority}</StatusBadge>
            </div>
            <h2 className={styles.title}>{task.summary}</h2>
          </div>

          <div className={styles.content}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>요청 시간</span>
              <span className={styles.infoValue}>{formattedDate}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>상태</span>
              <span className={styles.infoValue}>{task.status}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>부서</span>
              <span className={styles.infoValue}>{task.departmentId}</span>
            </div>

            <div className={styles.descriptionSection}>
              <h3 className={styles.descriptionTitle}>요청 상세 내용</h3>
              <div className={styles.descriptionBox}>
                {task.rawText}
              </div>
            </div>
          </div>

          <div className={styles.footer}>
            {task.status === 'PENDING' && onAccept && (
              <Button
                variant="primary"
                onClick={async () => {
                  await onAccept(task.id);
                  onClose();
                }}
                className={styles.actionButton}
              >
                업무 수락
              </Button>
            )}

            {task.status === 'IN_PROGRESS' && onComplete && (
              <Button
                variant="primary"
                onClick={async () => {
                  await onComplete(task.id);
                  onClose();
                }}
                className={styles.actionButton}
              >
                업무 완료
              </Button>
            )}

            <Button variant="outlined" onClick={onClose} className={styles.closeButton}>
              닫기
            </Button>
          </div>
        </div>
      </ModalCard>
    </ModalOverlay>
  );
}
