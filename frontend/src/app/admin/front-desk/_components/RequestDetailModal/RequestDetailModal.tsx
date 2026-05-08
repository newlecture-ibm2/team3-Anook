'use client';

import React, { useState, useEffect } from 'react';
import styles from './RequestDetailModal.module.css';
import ModalOverlay from '@/components/ui/Modal/ModalOverlay';
import ModalCard from '@/components/ui/Modal/ModalCard';
import Button from '@/components/ui/Button/Button';
import StatusBadge from '@/components/ui/StatusBadge/StatusBadge';
import { CancelIcon } from '@/components/icons';
import { useUiStore } from '@/stores/useUiStore';
import ConfirmModal from '@/components/ui/Modal/ConfirmModal';
import RejectEscalationModal from '../RejectEscalationModal/RejectEscalationModal';

interface Department {
  id: string;
  name: string;
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
  cancelRequested: boolean;
  cancelRequestedAt: string | null;
}

interface RequestDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  detail: RequestDetail | null;
  onChangePriority: (id: number, priority: string) => Promise<boolean>;
  onChangeDepartment: (id: number, departmentId: string) => Promise<boolean>;
  onCancel: (id: number) => Promise<boolean>;
  onApproveEscalation?: (id: number, departmentId: string, priority: string) => Promise<boolean>;
  onRejectEscalation?: (id: number, reason: string) => Promise<boolean>;
  onApproveCancellation?: (id: number) => Promise<boolean>;
  onRejectCancellation?: (id: number) => Promise<boolean>;
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
  onChangePriority,
  onChangeDepartment,
  onCancel,
  onApproveEscalation,
  onRejectEscalation,
  onApproveCancellation,
  onRejectCancellation,
  onUpdate,
  loading = false,
}: RequestDetailModalProps) {
  const [editPriority, setEditPriority] = useState('');
  const [editDeptId, setEditDeptId] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [saving, setSaving] = useState(false);
  const [confirmType, setConfirmType] = useState<'none' | 'cancel' | 'approve' | 'reject'>('none');
  const showToast = useUiStore((s) => s.showToast);

  useEffect(() => {
    if (detail) {
      setEditPriority(detail.priority);
      setEditDeptId(detail.departmentId);
    }
  }, [detail]);

  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/admin/departments')
      .then(res => res.json())
      .then(data => setDepartments(data))
      .catch(() => {});
  }, [isOpen]);

  if (!detail) return null;

  const statusInfo = STATUS_MAP[detail.status] ?? { text: detail.status, variant: 'gray' as const };

  const hasChanges =
    editPriority !== detail.priority ||
    editDeptId !== detail.departmentId;

  const handleSave = async () => {
    setSaving(true);
    let changed = false;

    if (editPriority !== detail.priority) {
      const ok = await onChangePriority(detail.id, editPriority);
      if (ok) changed = true;
    }

    if (editDeptId !== detail.departmentId) {
      const ok = await onChangeDepartment(detail.id, editDeptId);
      if (ok) changed = true;
    }

    setSaving(false);
    if (changed) {
      onUpdate();
      onClose();
    }
  };

  const handleCancel = async () => {
    setConfirmType('none');
    const ok = await onCancel(detail.id);
    if (ok) {
      showToast('요청이 취소되었습니다.', 'success');
      onUpdate();
      onClose();
    } else {
      showToast('요청 취소에 실패했습니다.', 'error');
    }
  };

  const handleApproveEscalation = async () => {
    if (!onApproveEscalation) return;
    setConfirmType('none');
    
    setSaving(true);
    // 상세 모달 내에서 직접 승인할 때는 현재 모달에 세팅된 editDeptId와 editPriority 값을 전달합니다.
    const ok = await onApproveEscalation(detail.id, editDeptId, editPriority);
    setSaving(false);
    if (ok) {
      showToast('에스컬레이션이 승인되어 재배정 대기 상태가 되었습니다.', 'success');
      onUpdate();
      onClose();
    } else {
      showToast('승인 처리에 실패했습니다.', 'error');
    }
  };

  const handleRejectEscalation = async (reason: string) => {
    if (!onRejectEscalation) return false;
    setConfirmType('none');
    
    setSaving(true);
    const ok = await onRejectEscalation(detail.id, reason);
    setSaving(false);
    if (ok) {
      showToast('에스컬레이션이 반려(요청 취소)되었습니다.', 'success');
      onUpdate();
      onClose();
    } else {
      showToast('반려 처리에 실패했습니다.', 'error');
    }
    return ok;
  };

  const handleApproveCancellation = async () => {
    if (!onApproveCancellation) return;
    setSaving(true);
    const ok = await onApproveCancellation(detail.id);
    setSaving(false);
    if (ok) {
      showToast('취소가 승인되었습니다.', 'success');
      onUpdate();
      onClose();
    } else {
      showToast('취소 승인에 실패했습니다.', 'error');
    }
  };

  const handleRejectCancellation = async () => {
    if (!onRejectCancellation) return;
    setSaving(true);
    const ok = await onRejectCancellation(detail.id);
    setSaving(false);
    if (ok) {
      showToast('취소가 반려되었습니다.', 'success');
      onUpdate();
      onClose();
    } else {
      showToast('취소 반려에 실패했습니다.', 'error');
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
            {detail.cancelRequested && (
              <StatusBadge variant="red">고객 취소 요청됨</StatusBadge>
            )}
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
              <span className={styles.label}>현재 부서</span>
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

        {/* 배정 관리 */}
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
              <label className={styles.label} htmlFor="detail-dept">배정 부서</label>
              <select
                id="detail-dept"
                className={styles.select}
                value={editDeptId}
                onChange={(e) => setEditDeptId(e.target.value)}
              >
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 하단 버튼 */}
        <div className={styles.footer}>
          {detail.status === 'ESCALATED' ? (
            <Button variant="secondary" onClick={() => setConfirmType('reject')} style={{ color: 'var(--color-error)' }} disabled={saving || loading}>
              에스컬레이션 반려
            </Button>
          ) : detail.cancelRequested ? (
            <>
              <Button variant="secondary" onClick={handleRejectCancellation} style={{ color: 'var(--color-error)' }} disabled={saving || loading}>
                취소 반려
              </Button>
              <Button variant="primary" onClick={handleApproveCancellation} disabled={saving || loading}>
                취소 승인
              </Button>
            </>
          ) : detail.status !== 'COMPLETED' && detail.status !== 'CANCELLED' ? (
            <Button variant="secondary" onClick={() => setConfirmType('cancel')} style={{ color: 'var(--color-error)' }}>
              강제 요청 취소
            </Button>
          ) : <div />}

          <div className={styles.footerRight}>
            <Button variant="secondary" onClick={onClose}>닫기</Button>
            {detail.status === 'ESCALATED' ? (
              <Button variant="primary" onClick={() => setConfirmType('approve')} disabled={saving || loading}>
                에스컬레이션 승인
              </Button>
            ) : hasChanges ? (
              <Button variant="primary" onClick={handleSave} disabled={saving || loading}>
                {saving ? '저장 중...' : '변경 저장'}
              </Button>
            ) : null}
          </div>
        </div>
      </ModalCard>

      <ConfirmModal
        isOpen={confirmType === 'cancel'}
        onClose={() => setConfirmType('none')}
        onConfirm={handleCancel}
        title="요청 취소"
        subtitle="정말 요청을 취소하시겠습니까?"
        status="danger"
        cancelText="아니오"
        confirmText="예, 취소합니다"
      />

      <ConfirmModal
        isOpen={confirmType === 'approve'}
        onClose={() => setConfirmType('none')}
        onConfirm={handleApproveEscalation}
        title="에스컬레이션 승인"
        subtitle={`선택한 부서(${departments.find(d => d.id === editDeptId)?.name || '...'})로 재배정하며 승인합니다.`}
        cancelText="아니오"
        confirmText="승인하기"
      />

      <RejectEscalationModal
        isOpen={confirmType === 'reject'}
        onClose={() => setConfirmType('none')}
        onReject={handleRejectEscalation}
      />
    </ModalOverlay>
  );
}
