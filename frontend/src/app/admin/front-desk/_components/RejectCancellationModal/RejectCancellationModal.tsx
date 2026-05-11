'use client';

import React, { useState } from 'react';
import ModalOverlay from '@/components/ui/Modal/ModalOverlay';
import ModalCard from '@/components/ui/Modal/ModalCard';
import Button from '@/components/ui/Button/Button';
import styles from './RejectCancellationModal.module.css';
import useRejectCancellation from './useRejectCancellation';

export interface RejectCancellationModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestId: number;
  onSuccess?: () => void;
}

export default function RejectCancellationModal({
  isOpen,
  onClose,
  requestId,
  onSuccess,
}: RejectCancellationModalProps) {
  const [reason, setReason] = useState('');
  const { rejectCancellation, loading } = useRejectCancellation();

  const handleReject = async () => {
    if (!reason.trim()) {
      alert('고객에게 안내할 반려 사유를 입력해주세요.');
      return;
    }
    const success = await rejectCancellation(requestId, reason);
    if (success) {
      setReason('');
      onClose();
      if (onSuccess) onSuccess();
    }
  };

  return (
    <ModalOverlay isOpen={isOpen} onClose={onClose}>
      <ModalCard size="md">
        <div className={styles.textWrapper}>
          <h2 className={styles.title}>취소 반려 및 고객 안내</h2>
          <p className={styles.subtitle}>
            취소가 불가하여 반려합니다. 작성하신 사유는 고객의 대화창(상담 화면)으로 자동 전송됩니다.
          </p>
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label}>반려 사유 (고객 전송용 메시지)</label>
          <textarea
            className={styles.textarea}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={loading}
            placeholder="예: 죄송합니다. 이미 조리가 시작되어 취소가 어렵습니다."
            rows={5}
          />
        </div>

        <div className={styles.buttonGroup}>
          <Button variant="secondary" style={{ flex: 1 }} onClick={onClose} disabled={loading}>
            아니오
          </Button>
          <Button variant="danger" style={{ flex: 1 }} onClick={handleReject} disabled={loading}>
            반려 및 전송
          </Button>
        </div>
      </ModalCard>
    </ModalOverlay>
  );
}
