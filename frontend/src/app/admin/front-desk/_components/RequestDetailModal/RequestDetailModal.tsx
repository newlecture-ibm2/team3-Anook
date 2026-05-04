'use client';

import React, { useState, useEffect } from 'react';
import styles from './RequestDetailModal.module.css';
import ModalOverlay from '@/components/ui/Modal/ModalOverlay';
import ModalCard from '@/components/ui/Modal/ModalCard';
import Button from '@/components/ui/Button/Button';
import StatusBadge from '@/components/ui/StatusBadge/StatusBadge';
import { CancelIcon } from '@/components/icons';

interface StaffMember {
  id: number;
  name: string;
  departmentId: string;
}

interface RequestDetail {
  id: number;
  status: string;
  priority: string;
  departmentId: string;
  departmentName: string;
  entities: Record<string, any> | null;
  rawText: string;
  summary: string;
  confidence: number;
  roomNo: string;
  assignedStaffId: number | null;
  assignedStaffName: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

interface RequestDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  detail: RequestDetail | null;
  staffList: StaffMember[];
  onChangePriority: (id: number, priority: string) => Promise<boolean>;
  onAssignStaff: (id: number, staffId: number) => Promise<boolean>;
  onCancel: (id: number) => Promise<boolean>;
  onUpdate: () => void;
  loading?: boolean;
}

const PRIORITIES = [
  { value: 'LOW', label: '낮음' },
  { value: 'NORMAL', label: '보통' },
  { value: 'HIGH', label: '높음' },
  { value: 'URGENT', label: '긴급' },
];

const STATUS_MAP: Record<string, { text: string; variant: 'red' | 'purple' | 'green' | 'gray' }> = {
  PENDING: { text: '대기 중', variant: 'red' },
  ASSIGNED: { text: '배정됨', variant: 'purple' },
  IN_PROGRESS: { text: '처리 중', variant: 'green' },
  COMPLETED: { text: '완료', variant: 'gray' },
  CANCELLED: { text: '취소됨', variant: 'gray' },
  ESCALATED: { text: '에스컬레이션', variant: 'red' },
};

export default function RequestDetailModal({
  isOpen,
  onClose,
  detail,
  staffList,
  onChangePriority,
  onAssignStaff,
  onCancel,
  onUpdate,
  loading = false,
}: RequestDetailModalProps) {
  const [editPriority, setEditPriority] = useState('');
  const [editStaffId, setEditStaffId] = useState<number | ''>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (detail) {
      setEditPriority(detail.priority);
      setEditStaffId(detail.assignedStaffId ?? '');
    }
  }, [detail]);

  if (!detail) return null;

  const statusInfo = STATUS_MAP[detail.status] ?? { text: detail.status, variant: 'gray' as const };

  const hasChanges =
    editPriority !== detail.priority ||
    editStaffId !== (detail.assignedStaffId ?? '');

  const handleSave = async () => {
    setSaving(true);
    let changed = false;

    if (editPriority !== detail.priority) {
      const ok = await onChangePriority(detail.id, editPriority);
      if (ok) changed = true;
    }

    if (editStaffId !== '' && editStaffId !== (detail.assignedStaffId ?? '')) {
      const ok = await onAssignStaff(detail.id, editStaffId as number);
      if (ok) changed = true;
    }

    setSaving(false);
    if (changed) {
      onUpdate();
      onClose();
    }
  };

  const handleCancel = async () => {
    const ok = await onCancel(detail.id);
    if (ok) {
      onUpdate();
      onClose();
    }
  };

  const formatDateTime = (dt: string) => {
    const d = new Date(dt);
    return d.toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <ModalOverlay isOpen={isOpen} onClose={onClose}>
      <ModalCard size="lg">
        {/* 헤더 */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h2 className={styles.title}>요청 상세</h2>
            <StatusBadge variant={statusInfo.variant}>{statusInfo.text}</StatusBadge>
          </div>
          <button className={styles.closeButton} onClick={onClose} aria-label="닫기">
            <CancelIcon width={20} height={20} color="var(--color-gray-500)" />
          </button>
        </div>

        {/* 기본 정보 */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>기본 정보</h3>
          <div className={styles.grid}>
            <div className={styles.gridItem}>
              <span className={styles.label}>객실</span>
              <span className={styles.value}>{detail.roomNo}</span>
            </div>
            <div className={styles.gridItem}>
              <span className={styles.label}>부서</span>
              <span className={styles.value}>{detail.departmentName}</span>
            </div>
            <div className={styles.gridItem}>
              <span className={styles.label}>생성 시간</span>
              <span className={styles.value}>{formatDateTime(detail.createdAt)}</span>
            </div>
            <div className={styles.gridItem}>
              <span className={styles.label}>최종 수정</span>
              <span className={styles.value}>{formatDateTime(detail.updatedAt)}</span>
            </div>
          </div>
        </div>

        {/* 요약 + 원문 */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>요청 내용</h3>
          <div className={styles.contentBlock}>
            <span className={styles.label}>요약</span>
            <p className={styles.contentText}>{detail.summary}</p>
          </div>
          {detail.rawText && (
            <div className={styles.contentBlock}>
              <span className={styles.label}>고객 원문</span>
              <p className={styles.rawText}>{detail.rawText}</p>
            </div>
          )}
        </div>

        {/* AI 분석 결과 */}
        {detail.entities && Object.keys(detail.entities).length > 0 && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>AI 분석 결과</h3>
            <div className={styles.aiInfo}>
              <div className={styles.confidenceBadge}>
                신뢰도: {Math.round(detail.confidence * 100)}%
              </div>
              <pre className={styles.jsonBlock}>
                {JSON.stringify(detail.entities, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* 수정 가능 영역 */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>배정 관리</h3>
          <div className={styles.editRow}>
            <div className={styles.editField}>
              <label className={styles.label} htmlFor="detail-priority">우선순위</label>
              <select
                id="detail-priority"
                className={styles.select}
                value={editPriority}
                onChange={(e) => setEditPriority(e.target.value)}
              >
                {PRIORITIES.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div className={styles.editField}>
              <label className={styles.label} htmlFor="detail-staff">담당자</label>
              <select
                id="detail-staff"
                className={styles.select}
                value={editStaffId}
                onChange={(e) => setEditStaffId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">미배정</option>
                {staffList.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 하단 버튼 */}
        <div className={styles.footer}>
          {detail.status !== 'COMPLETED' && detail.status !== 'CANCELLED' && (
            <Button variant="secondary" onClick={handleCancel} style={{ color: 'var(--color-error)' }}>
              요청 취소
            </Button>
          )}
          <div className={styles.footerRight}>
            <Button variant="secondary" onClick={onClose}>닫기</Button>
            {hasChanges && (
              <Button variant="primary" onClick={handleSave} disabled={saving || loading}>
                {saving ? '저장 중...' : '변경 저장'}
              </Button>
            )}
          </div>
        </div>
      </ModalCard>
    </ModalOverlay>
  );
}
