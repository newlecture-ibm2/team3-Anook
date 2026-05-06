'use client';

import React, { useState } from 'react';
import styles from './AssignModal.module.css';
import ModalOverlay from '@/components/ui/Modal/ModalOverlay';
import ModalCard from '@/components/ui/Modal/ModalCard';
import Button from '@/components/ui/Button/Button';
import { CancelIcon } from '@/components/icons';

interface StaffMember {
  id: number;
  name: string;
  departmentId: string;
}

interface AssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (staffId: number) => Promise<boolean>;
  staffList: StaffMember[];
  requestSummary: string;
  roomNo: string;
  loading?: boolean;
}

export default function AssignModal({
  isOpen,
  onClose,
  onAssign,
  staffList,
  requestSummary,
  roomNo,
  loading = false,
}: AssignModalProps) {
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);

  const handleAssign = async () => {
    if (selectedStaffId === null) return;
    const success = await onAssign(selectedStaffId);
    if (success) {
      setSelectedStaffId(null);
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedStaffId(null);
    onClose();
  };

  return (
    <ModalOverlay isOpen={isOpen} onClose={handleClose}>
      <ModalCard size="sm">
        <div className={styles.header}>
          <h2 className={styles.title}>수동 배정</h2>
          <button className={styles.closeButton} onClick={handleClose} aria-label="닫기">
            <CancelIcon width={20} height={20} color="var(--color-gray-500)" />
          </button>
        </div>

        <div className={styles.info}>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>객실</span>
            <span className={styles.infoValue}>{roomNo}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>요청</span>
            <span className={styles.infoValue}>{requestSummary}</span>
          </div>
        </div>

        <div className={styles.selectWrapper}>
          <label className={styles.selectLabel} htmlFor="staff-select">담당 직원 선택</label>
          <select
            id="staff-select"
            className={styles.select}
            value={selectedStaffId ?? ''}
            onChange={(e) => setSelectedStaffId(Number(e.target.value))}
          >
            <option value="" disabled>직원을 선택하세요</option>
            {staffList.map(staff => (
              <option key={staff.id} value={staff.id}>
                {staff.name} ({staff.departmentId})
              </option>
            ))}
          </select>
        </div>

        <div className={styles.buttonGroup}>
          <Button variant="secondary" style={{ flex: 1 }} onClick={handleClose}>
            취소
          </Button>
          <Button
            variant="primary"
            style={{ flex: 1 }}
            onClick={handleAssign}
            disabled={selectedStaffId === null || loading}
          >
            {loading ? '배정 중...' : '배정하기'}
          </Button>
        </div>
      </ModalCard>
    </ModalOverlay>
  );
}
