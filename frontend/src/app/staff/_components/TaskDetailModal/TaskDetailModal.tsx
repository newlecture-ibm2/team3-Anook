import React, { useState } from 'react';
import ModalOverlay from '@/components/ui/Modal/ModalOverlay';
import ModalCard from '@/components/ui/Modal/ModalCard';
import StatusBadge from '@/components/ui/StatusBadge/StatusBadge';
import Button from '@/components/ui/Button/Button';
import styles from './TaskDetailModal.module.css';
import { StaffTask } from '../../useTasks';
import { useUiStore } from '@/stores/useUiStore';

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: StaffTask | null;
  onAccept?: (id: number, version: number) => Promise<void>;
  onComplete?: (id: number, version: number) => Promise<void>;
  onTransfer?: (id: number, version: number, toDepartmentId: string, reason: string) => Promise<void>;
  onApproveCancellation?: (id: number, version: number) => Promise<void>;
  onRejectCancellation?: (id: number, version: number) => Promise<void>;
}

const DEPARTMENTS = [
  { id: 'HK', name: '하우스키핑' },
  { id: 'FACILITY', name: '시설관리' },
  { id: 'FB', name: '식음료' },
  { id: 'FRONT', name: '프론트데스크' },
  { id: 'CONCIERGE', name: '컨시어지' }
];

export default function TaskDetailModal({ isOpen, onClose, task, onAccept, onComplete, onTransfer, onApproveCancellation, onRejectCancellation }: TaskDetailModalProps) {
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [toDepartmentId, setToDepartmentId] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useUiStore();

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

  const handleApproveCancellation = async () => {
    if (onApproveCancellation) {
      setIsSubmitting(true);
      try {
        await onApproveCancellation(task.id, task.version);
        showToast('취소가 승인되었습니다.', 'success');
        handleClose();
      } catch (err) {
        showToast(err instanceof Error ? err.message : '취소 승인 중 오류가 발생했습니다.', 'error');
        handleClose();
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleRejectCancellation = async () => {
    if (onRejectCancellation) {
      setIsSubmitting(true);
      try {
        await onRejectCancellation(task.id, task.version);
        showToast('취소가 반려되었습니다.', 'success');
        handleClose();
      } catch (err) {
        showToast(err instanceof Error ? err.message : '취소 반려 중 오류가 발생했습니다.', 'error');
        handleClose();
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  let badgeVariant: 'red' | 'purple' | 'green' | 'gray' | 'black' = 'gray';
  if (task.priority === 'URGENT') {
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
  const mainText = rawTextParts[0] || '';
  const transferReasonText = rawTextParts.length > 1 ? rawTextParts.slice(1).join('\n').trim() : null;

  const detailParts = mainText.split('[주문 상세]');
  const customerText = detailParts[0].trim();
  const orderDetail = detailParts.length > 1 ? detailParts.slice(1).join('').trim() : '';

  return (
    <ModalOverlay isOpen={isOpen} onClose={handleClose}>
      <ModalCard size="md" padding="var(--space-32)">
        <div className={styles.container}>
          <div className={styles.header}>
            <div className={styles.headerTop}>
              <span className={styles.roomBadge}>[{task.roomNumber}호]</span>
              {task.priority === 'URGENT' && (
                <StatusBadge variant="red">긴급</StatusBadge>
              )}
              {task.cancelRequested && (
                <StatusBadge variant="red">취소 대기중</StatusBadge>
              )}
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
              <span className={styles.infoValue}>
                {task.status === 'PENDING' ? '대기 중' :
                 task.status === 'IN_PROGRESS' ? '진행 중' :
                 task.status === 'COMPLETED' ? '완료됨' :
                 task.status === 'CANCELLED' ? '취소됨' : task.status}
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>부서</span>
              <span className={styles.infoValue}>
                {DEPARTMENTS.find(d => d.id === task.departmentId)?.name || task.departmentId}
              </span>
            </div>

            {task.cancelRequested && (
              <div className={styles.cancelAlertBox}>
                <strong>⚠️ 고객 취소 요청</strong>
                <p>고객이 해당 요청에 대해 취소를 신청했습니다. 진행 상황을 확인하고 취소 승인 또는 반려를 선택해주세요.</p>
              </div>
            )}

            {customerText && (
              <div className={styles.descriptionSection}>
                <h3 className={styles.descriptionTitle}>고객 원문</h3>
                <div className={styles.descriptionBox}>
                  {customerText}
                </div>
              </div>
            )}

            {orderDetail && (
              <div className={styles.descriptionSection}>
                <h3 className={styles.descriptionTitle}>주문/요청 상세</h3>
                <div className={styles.orderDetailBox}>
                  {orderDetail}
                </div>
              </div>
            )}

            {task.entities && ((task.entities.items?.length ?? 0) > 0 || (task.entities.tasks?.length ?? 0) > 0) && (
              <div className={styles.descriptionSection}>
                <h3 className={styles.descriptionTitle}>AI 분석 상세 내역</h3>
                <div className={styles.descriptionBox} style={{ backgroundColor: '#f0f4ff' }}>
                  {task.entities.items && task.entities.items.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      <strong>물품 요청:</strong>
                      <ul style={{ margin: '4px 0 0 20px', padding: 0 }}>
                        {task.entities.items.map((it: any, idx: number) => (
                          <li key={idx}>{it.item} - {it.count}개</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {task.entities.tasks && task.entities.tasks.length > 0 && (
                    <div>
                      <strong>수행 업무:</strong>
                      <ul style={{ margin: '4px 0 0 20px', padding: 0 }}>
                        {task.entities.tasks.map((t: string, idx: number) => (
                          <li key={idx}>{t}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {transferReasonText && (
              <div className={styles.descriptionSection}>
                <h3 className={styles.descriptionTitle}>업무 전달 사유</h3>
                <div className={styles.transferReasonBox}>
                  {transferReasonText}
                </div>
              </div>
            )}

            {showTransferForm && (
              <div className={styles.transferForm}>
                <h3 className={styles.descriptionTitle}>업무 전달</h3>
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
                    placeholder="전달 사유를 입력해주세요 (예: 해당 건은 시설관리팀 소관입니다)"
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
                    업무 전달
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

              {task.status === 'IN_PROGRESS' && !task.cancelRequested && onComplete && (
                <Button
                  variant="primary"
                  onClick={handleComplete}
                  className={styles.actionButton}
                  disabled={isSubmitting}
                >
                  업무 완료
                </Button>
              )}

              {task.status === 'IN_PROGRESS' && task.cancelRequested && (
                <>
                  <Button
                    variant="outlined"
                    onClick={handleRejectCancellation}
                    className={styles.actionButton}
                    disabled={isSubmitting}
                  >
                    취소 반려
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleApproveCancellation}
                    className={styles.actionButton}
                    disabled={isSubmitting}
                  >
                    취소 승인
                  </Button>
                </>
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
