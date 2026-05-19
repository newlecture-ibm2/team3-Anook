import React, { useState, useEffect } from 'react';
import ModalOverlay from '@/components/ui/Modal/ModalOverlay';
import ModalCard from '@/components/ui/Modal/ModalCard';
import { CancelIcon } from '@/components/icons';
import Button from '@/components/ui/Button/Button';
import Dropdown from '@/components/ui/Dropdown/Dropdown';
import TaskTicket from '@/components/ui/TaskBoard/TaskTicket';
import styles from './ManualAssignModal.module.css';

interface Department {
  id: string;
  name: string;
}

interface RequestDetail {
  id: number;
  priority: string;
  departmentId: string;
  departmentName: string;
  roomNo: string;
  summary: string;
  createdAt: string;
  status: string;
}

interface ManualAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  detail: RequestDetail;
  departments: Department[];
  onSave: (editDeptId: string, editPriority: string, editSummary?: string, editDescription?: string) => Promise<void>;
  saving: boolean;
}

export default function ManualAssignModal({ isOpen, onClose, detail, departments, onSave, saving }: ManualAssignModalProps) {

  const [editDeptId, setEditDeptId] = useState(detail.departmentId);
  const [editSummary, setEditSummary] = useState('');
  const [editDescription, setEditDescription] = useState('');

  useEffect(() => {
    if (isOpen) {

      setEditDeptId(detail.departmentId);
      setEditSummary('');
      setEditDescription('');
    }
  }, [isOpen, detail]);

  if (!isOpen) return null;

  const canSubmit = editDeptId && editDeptId !== 'FRONT' && editSummary.trim().length > 0;

  return (
    <ModalOverlay isOpen={isOpen} onClose={onClose}>
      <ModalCard size="md" overflowVisible={true}>
        <div className={styles.header}>
          <h2 className={styles.title}>수동 배정</h2>
          <button className={styles.closeButton} onClick={onClose} aria-label="닫기">
            <CancelIcon width={20} height={20} color="var(--color-gray-500)" />
          </button>
        </div>

        <div className={styles.content}>
          {/* 미리보기 카드 — 실시간 반영 */}
          <div className={styles.previewSection}>
            <div className={styles.previewCardWrapper}>
              <TaskTicket
                ticketId={detail.id}
                roomNo={detail.roomNo}
                department={editDeptId}
                priority={'NORMAL'}
                title={editSummary || '배정할 업무 내용을 입력하세요'}
                description={editDescription}
                status="TODO"
                createdAt={detail.createdAt}
              />
            </div>
          </div>

          {/* 편집 폼 */}
          <div className={styles.formSection}>
            <div className={styles.editField}>
              <label className={styles.label}>제목</label>
              <input
                type="text"
                className={styles.inputField}
                value={editSummary}
                onChange={(e) => setEditSummary(e.target.value)}
                placeholder="배정할 업무 내용을 입력하세요"
              />
            </div>

            <div className={styles.editField}>
              <label className={styles.label}>설명 / 이관 사유</label>
              <textarea
                className={styles.textareaField}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="필요시 설명 또는 이관 사유를 입력하세요"
                rows={3}
              />
            </div>

            <div className={styles.editField}>
              <Dropdown
                label="배정 부서"
                placeholder="부서를 선택하세요"
                options={departments.filter(d => d.id !== 'FRONT').map(d => ({ value: d.id, label: d.name }))}
                value={editDeptId}
                onChange={(val) => setEditDeptId(val)}
              />
            </div>


          </div>
        </div>

        <div className={styles.footer}>
          <Button variant="secondary" onClick={onClose}>취소</Button>
          <Button variant="primary" disabled={!canSubmit || saving} onClick={() => onSave(editDeptId, 'NORMAL', editSummary, editDescription)}>
            {saving ? '저장 중...' : '배정하기'}
          </Button>
        </div>
      </ModalCard>
    </ModalOverlay>
  );
}
