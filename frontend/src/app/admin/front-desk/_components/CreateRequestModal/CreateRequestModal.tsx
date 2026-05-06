'use client';

import React, { useState, useEffect } from 'react';
import styles from './CreateRequestModal.module.css';
import ModalOverlay from '@/components/ui/Modal/ModalOverlay';
import ModalCard from '@/components/ui/Modal/ModalCard';
import Button from '@/components/ui/Button/Button';
import { CancelIcon } from '@/components/icons';

interface Department {
  id: string;
  name: string;
}

interface StaffMember {
  id: number;
  name: string;
  departmentId: string;
}

interface CreateRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (payload: {
    departmentId: string;
    roomNo: string;
    summary: string;
    rawText?: string;
    priority?: string;
    assignedStaffId?: number;
  }) => Promise<boolean>;
  loading?: boolean;
}

const PRIORITIES = [
  { value: 'LOW', label: '낮음' },
  { value: 'NORMAL', label: '보통' },
  { value: 'HIGH', label: '높음' },
  { value: 'URGENT', label: '긴급' },
];

export default function CreateRequestModal({
  isOpen,
  onClose,
  onCreate,
  loading = false,
}: CreateRequestModalProps) {
  const [departmentId, setDepartmentId] = useState('');
  const [roomNo, setRoomNo] = useState('');
  const [summary, setSummary] = useState('');
  const [rawText, setRawText] = useState('');
  const [priority, setPriority] = useState('NORMAL');
  const [assignedStaffId, setAssignedStaffId] = useState<number | ''>('');

  const [departments, setDepartments] = useState<Department[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    // 부서 목록 조회
    fetch('/api/admin/departments')
      .then(res => res.json())
      .then(data => setDepartments(data))
      .catch(() => {});
    // 직원 목록 조회
    fetch('/api/admin/staff')
      .then(res => res.json())
      .then(data => setStaffList(data))
      .catch(() => {});
  }, [isOpen]);

  const resetForm = () => {
    setDepartmentId('');
    setRoomNo('');
    setSummary('');
    setRawText('');
    setPriority('NORMAL');
    setAssignedStaffId('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!departmentId || !roomNo || !summary) return;
    const payload: any = { departmentId, roomNo, summary, priority };
    if (rawText) payload.rawText = rawText;
    if (assignedStaffId !== '') payload.assignedStaffId = assignedStaffId;
    const success = await onCreate(payload);
    if (success) {
      resetForm();
      onClose();
    }
  };

  const isValid = departmentId && roomNo && summary;

  return (
    <ModalOverlay isOpen={isOpen} onClose={handleClose}>
      <ModalCard size="md">
        <div className={styles.header}>
          <h2 className={styles.title}>요청 생성</h2>
          <button className={styles.closeButton} onClick={handleClose} aria-label="닫기">
            <CancelIcon width={20} height={20} color="var(--color-gray-500)" />
          </button>
        </div>

        <div className={styles.form}>
          {/* 객실 번호 */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="cr-room">객실 번호 <span className={styles.required}>*</span></label>
            <input
              id="cr-room"
              className={styles.input}
              type="text"
              placeholder="예: 707"
              value={roomNo}
              onChange={(e) => setRoomNo(e.target.value)}
            />
          </div>

          {/* 부서 선택 */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="cr-dept">부서 <span className={styles.required}>*</span></label>
            <select
              id="cr-dept"
              className={styles.select}
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
            >
              <option value="" disabled>부서를 선택하세요</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* 요약 */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="cr-summary">요청 내용 <span className={styles.required}>*</span></label>
            <input
              id="cr-summary"
              className={styles.input}
              type="text"
              placeholder="예: 수건 2장 추가 요청"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
            />
          </div>

          {/* 상세 내용 (선택) */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="cr-raw">상세 내용</label>
            <textarea
              id="cr-raw"
              className={styles.textarea}
              placeholder="고객 원문 또는 상세 메모 (선택)"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={3}
            />
          </div>

          {/* 하단 2열: 우선순위 + 담당 직원 */}
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="cr-priority">우선순위</label>
              <select
                id="cr-priority"
                className={styles.select}
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                {PRIORITIES.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="cr-staff">담당 직원</label>
              <select
                id="cr-staff"
                className={styles.select}
                value={assignedStaffId}
                onChange={(e) => setAssignedStaffId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">미배정</option>
                {staffList.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className={styles.buttonGroup}>
          <Button variant="secondary" style={{ flex: 1 }} onClick={handleClose}>
            취소
          </Button>
          <Button
            variant="primary"
            style={{ flex: 1 }}
            onClick={handleSubmit}
            disabled={!isValid || loading}
          >
            {loading ? '생성 중...' : '요청 생성'}
          </Button>
        </div>
      </ModalCard>
    </ModalOverlay>
  );
}
