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
import ChatModal from '@/components/ui/Modal/ChatModal';
import styles from './page.module.css';
import { useTranslation } from '@/app/useTranslation';

export default function FrontDeskPage() {
  const [activeTab, setActiveTab] = useState('unhandled');
  const { requests, pending, inProgress, cancelPending, completed, loading, error, refetch } = useAdminRequests('FRONT');
  const { createRequest, loading: creating } = useCreateRequest();
  const { detail, fetchDetail, changePriority, changeDepartment, cancelRequest, approveCancellation, rejectCancellation } = useRequestDetail();
  const { escalations, approveEscalation, rejectEscalation } = useEscalations();
  const { t } = useTranslation();

  // 요청 생성 모달 상태
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  // 상세 모달 상태
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  // Chat Modal 상태
  const [activeChatRoom, setActiveChatRoom] = useState<{ roomNumber: string, requestId: number } | null>(null);
  // 승인/반려 모달 상태
  const [approveTarget, setApproveTarget] = useState<number | null>(null);
  const [rejectTarget, setRejectTarget] = useState<number | null>(null);

  const mapStatusVariant = (status: string): 'red' | 'purple' | 'green' | 'gray' => {
    if (status === 'PENDING') return 'red';
    if (status === 'IN_PROGRESS') return 'green';
    if (status === 'COMPLETED' || status === 'CANCELLED') return 'gray';
    return 'gray';
  };

  const mapStatusText = (status: string): string => {
    if (status === 'PENDING') return t.adminPage.frontDesk.status.pending;
    if (status === 'IN_PROGRESS') return t.adminPage.frontDesk.status.inProgress;
    if (status === 'COMPLETED' || status === 'CANCELLED') return t.adminPage.frontDesk.status.completed;
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

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/requests/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok && refetch) refetch();
    } catch (e) {
      console.error(e);
    }
  };

  // 탭에 따른 필터링
  const getFilteredRequests = () => {
    if (activeTab === 'unhandled') return pending;
    if (activeTab === 'inProgress') return inProgress;
    if (activeTab === 'cancelPending') return cancelPending;
    if (activeTab === 'escalation') return escalations;
    if (activeTab === 'completed') return completed;
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
  const sectionTitle = 
    activeTab === 'escalation' ? t.adminPage.frontDesk.sections.escalation : 
    activeTab === 'cancelPending' ? '취소 승인 대기' : 
    activeTab === 'completed' ? '상담 완료' :
    activeTab === 'inProgress' ? t.adminPage.frontDesk.sections.inProgress :
    t.adminPage.frontDesk.sections.unhandled;

  const getPrimaryActionText = () => {
    if (activeTab === 'escalation') return t.adminPage.frontDesk.actions.approve;
    if (activeTab === 'inProgress') return '상담 계속하기';
    if (activeTab === 'completed') return '상담 기록 보기';
    return t.adminPage.frontDesk.actions.startChat;
  };

  const getSecondaryActionText = () => {
    if (activeTab === 'escalation') return t.adminPage.frontDesk.actions.reject;
    if (activeTab === 'inProgress') return '수동 배정';
    if (activeTab === 'completed') return '';
    return t.adminPage.frontDesk.actions.manualAssign;
  };

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
            { label: t.adminPage.frontDesk.tabs.escalation, value: 'escalation', count: escalations.length },
            { label: '상담 완료', value: 'completed', count: completed.length }
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
                primaryActionText={getPrimaryActionText()}
                secondaryActionText={getSecondaryActionText()}
                onPrimaryAction={
                  activeTab === 'escalation' ? () => setApproveTarget(req.id) : 
                  activeTab === 'inProgress' ? () => setActiveChatRoom({ roomNumber: req.roomNo.toString(), requestId: req.id }) :
                  undefined
                }
                onSecondaryAction={
                  activeTab === 'escalation' ? () => setRejectTarget(req.id) :
                  activeTab === 'inProgress' ? () => handleCardClick(req.id) :
                  () => handleCardClick(req.id)
                }
                reverseActions={activeTab === 'inProgress' || activeTab === 'unhandled' || activeTab === 'escalation'}
                onCardClick={() => handleCardClick(req.id)}
                // custom props to pass to ChatModal through RequestCard
                requestId={req.id}
                status={req.status}
                onStatusChange={handleStatusChange}
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

      {/* 상담 계속하기 처리를 위한 ChatModal */}
      {activeChatRoom && (
        <ChatModal
          isOpen={true}
          onClose={() => setActiveChatRoom(null)}
          roomNumber={activeChatRoom.roomNumber}
          requestId={activeChatRoom.requestId}
          status="IN_PROGRESS"
          onStatusChange={handleStatusChange}
          autoComplete={false}
        />
      )}
    </div>
  );
}
