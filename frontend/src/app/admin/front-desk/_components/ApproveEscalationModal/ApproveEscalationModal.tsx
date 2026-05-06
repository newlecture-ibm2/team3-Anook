'use client';

import React, { useEffect, useState } from 'react';
import ModalOverlay from '@/components/ui/Modal/ModalOverlay';
import ModalCard from '@/components/ui/Modal/ModalCard';
import Button from '@/components/ui/Button/Button';
import styles from './ApproveEscalationModal.module.css';

interface Department {
  id: string;
  name: string;
}

export interface ApproveEscalationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApprove: (departmentId: string, priority: string) => Promise<boolean>;
  loading?: boolean;
}

export default function ApproveEscalationModal({
  isOpen,
  onClose,
  onApprove,
  loading = false,
}: ApproveEscalationModalProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('URGENT');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/admin/departments')
        .then(res => res.json())
        .then(data => {
          setDepartments(data);
          if (data.length > 0) setSelectedDept(data[0].id);
        })
        .catch(err => console.error(err));
    }
  }, [isOpen]);

  const handleApprove = async () => {
    if (!selectedDept || !selectedPriority) return;
    setSaving(true);
    await onApprove(selectedDept, selectedPriority);
    setSaving(false);
  };

  return (
    <ModalOverlay isOpen={isOpen} onClose={onClose}>
      <ModalCard size="sm">
        <div className={styles.textWrapper}>
          <h2 className={styles.title}>에스컬레이션 승인</h2>
          <p className={styles.subtitle}>재배정할 부서를 선택해 주세요. 승인 시 우선순위가 긴급으로 변경되며 부서로 요청이 넘어갑니다.</p>
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label}>배정 부서</label>
          <select
            className={styles.select}
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            disabled={saving || loading}
          >
            {departments.map(dept => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label}>우선순위</label>
          <select
            className={styles.select}
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            disabled={saving || loading}
          >
            <option value="LOW">낮음 (LOW)</option>
            <option value="NORMAL">보통 (NORMAL)</option>
            <option value="HIGH">높음 (HIGH)</option>
            <option value="URGENT">긴급 (URGENT)</option>
          </select>
        </div>

        <div className={styles.buttonGroup}>
          <Button variant="secondary" style={{ flex: 1 }} onClick={onClose} disabled={saving || loading}>
            아니오
          </Button>
          <Button variant="primary" style={{ flex: 1 }} onClick={handleApprove} disabled={saving || loading}>
            승인하기
          </Button>
        </div>
      </ModalCard>
    </ModalOverlay>
  );
}
