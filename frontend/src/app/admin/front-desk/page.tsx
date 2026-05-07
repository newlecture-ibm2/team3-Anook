'use client';

import React, { useState } from 'react';
import Tabs from '@/components/ui/Tab/Tabs';
import RequestCard from '@/components/ui/Card/RequestCard';
import Button from '@/components/ui/Button/Button';
import useAdminRequests from '../useAdminRequests';
import useCreateRequest from './useCreateRequest';
import useRequestDetail from './useRequestDetail';
import useEscalations from './useEscalations';
import CreateRequestModal from './_components/CreateRequestModal/CreateRequestModal';
import RequestDetailModal from './_components/RequestDetailModal/RequestDetailModal';
import ApproveEscalationModal from './_components/ApproveEscalationModal/ApproveEscalationModal';
import RejectEscalationModal from './_components/RejectEscalationModal/RejectEscalationModal';
import styles from './page.module.css';
import { useTranslation } from '@/app/useTranslation';

export default function FrontDeskPage() {
  const [activeTab, setActiveTab] = useState('unhandled');
  const { requests, pending, inProgress, cancelPending, loading, error, refetch } = useAdminRequests('FRONT');
  const { createRequest, loading: creating } = useCreateRequest();
  const { detail, fetchDetail, changePriority, changeDepartment, cancelRequest, approveCancellation, rejectCancellation } = useRequestDetail();
  const { escalations, approveEscalation, rejectEscalation } = useEscalations();
  const { t } = useTranslation();

  // 요청 생성 모달 상태
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  // 상세 모달 상태
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  // 승인/반려 모달 상태
  const [approveTarget, setApproveTarget] = useState<number | null>(null);
  const [rejectTarget, setRejectTarget] = useState<number | null>(null);

  const mapStatusVariant = (status: string): 'red' | 'purple' | 'green' | 'gray' => {
    if (status === 'PENDING') return 'red';
    if (status === 'ASSIGNED') return 'purple';
    if (status === 'IN_PROGRESS') return 'green';
    return 'gray';
  };

  const mapStatusText = (status: string): string => {
    if (status === 'PENDING') return t.adminPage.frontDesk.status.pending;
    if (status === 'ASSIGNED') return t.adminPage.frontDesk.status.assigned;
    if (status === 'IN_PROGRESS') return t.adminPage.frontDesk.status.inProgress;
    if (status === 'COMPLETED') return t.adminPage.frontDesk.status.completed;
    if (status === 'ESCALATED') return t.adminPage.frontDesk.status.escalated;
    return status;
  };

  const handleApproveEscalationSubmit = async (departmentId: string, priority: string) => {
    if (!approveTarget) return false;
    const ok = await approveEscalation(approveTarget, departmentId, priority);
    if (ok) {
      setApproveTarget(null);
      refetch && refetch();
    }
    return ok;
  };

  const handleRejectEscalationSubmit = async (reason: string) => {
    if (!rejectTarget) return false;
    const ok = await rejectEscalation(rejectTarget, reason);
    if (ok) {
      setRejectTarget(null);
      refetch && refetch();
    }
    return ok;
  };

  // 탭에 따른 필터링
  const getFilteredRequests = () => {
    if (activeTab === 'unhandled') return pending;
    if (activeTab === 'inProgress') return inProgress;
    if (activeTab === 'cancelPending') return cancelPending;
    if (activeTab === 'escalation') return escalations;
    return pending;
  };
  const filteredRequests = getFilteredRequests();

  const handleCreate = async (payload: any) => {
    const success = await createRequest(payload);
    if (success && refetch) refetch();
    return success;
  };

  const handleCardClick = async (requestId: number) => {
    await fetchDetail(requestId);
    setIsDetailOpen(true);
  };

  // 탭에 따른 섹션 제목
  const sectionTitle = activeTab === 'escalation' ? t.adminPage.frontDesk.sections.escalation : activeTab === 'cancelPending' ? '취소 승인 대기' : t.adminPage.frontDesk.sections.unhandled;

  return (
    <div className={styles.container}>
      {/* Header Section */}
      <div className={styles.header}>
        <h1 className={styles.title}>{t.adminPage.frontDesk.title}</h1>
        <Button variant="primary" onClick={() => setIsCreateOpen(true)}>
          {t.adminPage.frontDesk.createRequest}
        </Button>
      </div>

      {/* Tabs Section */}
      <div className={styles.tabSection}>
        <Tabs 
          options={[
            { label: t.adminPage.frontDesk.tabs.unhandled, value: 'unhandled', count: pending.length },
            { label: t.adminPage.frontDesk.tabs.inProgress, value: 'inProgress', count: inProgress.length },
            { label: '취소 승인 대기', value: 'cancelPending', count: cancelPending.length },
            { label: t.adminPage.frontDesk.tabs.escalation, value: 'escalation', count: escalations.length }
          ]}
          activeValue={activeTab}
          onChange={(val) => setActiveTab(val || 'unhandled')}
        />
      </div>

      {/* Content Section */}
      <div className={styles.contentSection}>
        <h2 className={styles.sectionTitle}>{sectionTitle}</h2>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-gray-400)' }}>{t.common.loading}</div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-gray-400)' }}>{t.common.error}: {error}</div>
        ) : filteredRequests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-gray-400)' }}>{t.adminPage.frontDesk.empty}</div>
        ) : (
          <div className={styles.cardGrid}>
            {filteredRequests.map(req => (
              <RequestCard
                key={req.id}
                roomNumber={req.roomNo}
                title={req.summary}
                statusText={mapStatusText(req.status)}
                statusVariant={mapStatusVariant(req.status)}
                createdAt={req.createdAt}
                primaryActionText={activeTab === 'escalation' ? t.adminPage.frontDesk.actions.approve : t.adminPage.frontDesk.actions.startChat}
                secondaryActionText={activeTab === 'escalation' ? t.adminPage.frontDesk.actions.reject : t.adminPage.frontDesk.actions.manualAssign}
                onPrimaryAction={activeTab === 'escalation' ? () => setApproveTarget(req.id) : undefined}
                onSecondaryAction={
                  activeTab === 'escalation'
                    ? () => setRejectTarget(req.id)
                    : () => handleCardClick(req.id)
                }
                onCardClick={() => handleCardClick(req.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 요청 생성 모달 */}
      <CreateRequestModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreate={handleCreate}
        loading={creating}
      />

      {/* 요청 상세 모달 (우선순위 + 부서 배정 관리) */}
      <RequestDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        detail={detail}
        onChangePriority={changePriority}
        onChangeDepartment={changeDepartment}
        onCancel={cancelRequest}
        onApproveEscalation={approveEscalation}
        onRejectEscalation={rejectEscalation}
        onApproveCancellation={approveCancellation}
        onRejectCancellation={rejectCancellation}
        onUpdate={() => refetch && refetch()}
      />

      {/* 에스컬레이션 승인 모달 */}
      <ApproveEscalationModal
        isOpen={approveTarget !== null}
        onClose={() => setApproveTarget(null)}
        onApprove={handleApproveEscalationSubmit}
      />

      {/* 에스컬레이션 반려 모달 */}
      <RejectEscalationModal
        isOpen={rejectTarget !== null}
        onClose={() => setRejectTarget(null)}
        onReject={handleRejectEscalationSubmit}
      />
    </div>
  );
}
