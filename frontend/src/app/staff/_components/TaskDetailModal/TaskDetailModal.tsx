import React, { useState } from 'react';
import ModalOverlay from '@/components/ui/Modal/ModalOverlay';
import ModalCard from '@/components/ui/Modal/ModalCard';
import StatusBadge from '@/components/ui/StatusBadge/StatusBadge';
import Button from '@/components/ui/Button/Button';
import styles from './TaskDetailModal.module.css';
import { useUiStore } from '@/stores/useUiStore';
import { StaffTask } from '../../useTasks';

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: StaffTask | null;
  onAccept?: (id: number, version: number) => Promise<void>;
  onComplete?: (id: number, version: number) => Promise<void>;
  onTransfer?: (id: number, version: number, toDepartmentId: string, reason: string) => Promise<void>;
}

const DEPARTMENTS = [
  { id: 'HK', name: '하우스키핑' },
  { id: 'FACILITY', name: '시설관리' },
  { id: 'FB', name: '식음료' },
  { id: 'FRONT', name: '프론트데스크' },
  { id: 'CONCIERGE', name: '컨시어지' }
];

export default function TaskDetailModal({ isOpen, onClose, task, onAccept, onComplete, onTransfer }: TaskDetailModalProps) {
  const { showToast } = useUiStore();
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [toDepartmentId, setToDepartmentId] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !task) return null;

  const handleClose = () => {
    setShowTransferForm(false);
    setToDepartmentId('');
    setTransferReason('');
    onClose();
  };

  const handleTransferSubmit = async () => {
    if (!toDepartmentId || !transferReason.trim()) {
      showToast('전달할 부서와 사유를 모두 입력해주세요.', 'error');
      return;
    }
    if (onTransfer) {
      setIsSubmitting(true);
      try {
        await onTransfer(task.id, task.version, toDepartmentId, transferReason);
        showToast('부서 전달이 완료되었습니다.', 'success');
        handleClose();
      } catch (err) {
        showToast(err instanceof Error ? err.message : '부서 전달 중 오류가 발생했습니다.', 'error');
        handleClose();
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleAccept = async () => {
    if (onAccept) {
      setIsSubmitting(true);
      try {
        await onAccept(task.id, task.version);
        handleClose();
      } catch (err) {
        showToast(err instanceof Error ? err.message : '요청 수락 중 오류가 발생했습니다.', 'error');
        handleClose();
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleComplete = async () => {
    if (onComplete) {
      setIsSubmitting(true);
      try {
        await onComplete(task.id, task.version);
        handleClose();
      } catch (err) {
        showToast(err instanceof Error ? err.message : '요청 완료 중 오류가 발생했습니다.', 'error');
        handleClose();
      } finally {
        setIsSubmitting(false);
      }
    }
  };

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

  const rawTextParts = task.rawText ? task.rawText.split('\n|||TRANSFER_REASON|||') : [];
  const originalRawText = rawTextParts[0] || '';
  const transferReasonText = rawTextParts.length > 1 ? rawTextParts.slice(1).join('\n') : null;

  return (
    <ModalOverlay isOpen={isOpen} onClose={handleClose}>
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
                {originalRawText}
              </div>
            </div>

            {transferReasonText && (
              <div className={styles.descriptionSection}>
                <h3 className={styles.descriptionTitle}>부서 이관 사유</h3>
                <div className={styles.descriptionBox}>
                  {transferReasonText}
                </div>
              </div>
            )}

            {showTransferForm && (
              <div className={styles.transferForm}>
                <h3 className={styles.descriptionTitle}>부서 전달 (이관)</h3>
                <div className={styles.transferFormGroup}>
                  <label className={styles.transferLabel}>전달 대상 부서</label>
                  <select 
                    className={styles.transferSelect}
                    value={toDepartmentId} 
                    onChange={e => setToDepartmentId(e.target.value)}
                  >
                    <option value="">부서 선택</option>
                    {DEPARTMENTS.filter(d => d.id !== task.departmentId).map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.transferFormGroup}>
                  <label className={styles.transferLabel}>전달 사유</label>
                  <textarea 
                    className={styles.transferTextarea}
                    placeholder="이관 사유를 입력해주세요 (예: 해당 건은 시설관리팀 소관입니다)"
                    value={transferReason}
                    onChange={e => setTransferReason(e.target.value)}
                  />
                </div>
                <div className={styles.transferActions}>
                  <Button variant="outlined" onClick={() => setShowTransferForm(false)} disabled={isSubmitting}>취소</Button>
                  <Button variant="primary" onClick={handleTransferSubmit} disabled={isSubmitting}>전달하기</Button>
                </div>
              </div>
            )}
          </div>

          {!showTransferForm && (
            <div className={styles.footer}>
              {task.status === 'PENDING' && (
                <>
                  <Button
                    variant="outlined"
                    onClick={() => setShowTransferForm(true)}
                    className={styles.actionButton}
                    disabled={isSubmitting}
                  >
                    부서 전달
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleAccept}
                    className={styles.actionButton}
                    disabled={isSubmitting}
                  >
                    업무 수락
                  </Button>
                </>
              )}

              {task.status === 'IN_PROGRESS' && onComplete && (
                <Button
                  variant="primary"
                  onClick={handleComplete}
                  className={styles.actionButton}
                  disabled={isSubmitting}
                >
                  업무 완료
                </Button>
              )}

              <Button variant="outlined" onClick={handleClose} className={styles.closeButton}>
                닫기
              </Button>
            </div>
          )}
        </div>
      </ModalCard>
    </ModalOverlay>
  );
}
