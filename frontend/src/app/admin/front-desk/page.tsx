'use client';

import React, { useState } from 'react';
import Tabs from '@/components/ui/Tab/Tabs';
import RequestCard from '@/components/ui/Card/RequestCard';
import Button from '@/components/ui/Button/Button';
import useAdminRequests from '../useAdminRequests';

import useEscalations from './useEscalations';
import CreateRequestModal from './_components/CreateRequestModal/CreateRequestModal';
import RequestDetailModal from './_components/RequestDetailModal/RequestDetailModal';
import ApproveEscalationModal from './_components/ApproveEscalationModal/ApproveEscalationModal';
import RejectEscalationModal from './_components/RejectEscalationModal/RejectEscalationModal';
import ApproveCancellationModal from './_components/ApproveCancellationModal/ApproveCancellationModal';
import RejectCancellationModal from './_components/RejectCancellationModal/RejectCancellationModal';
import ChatModal from '@/components/ui/Modal/ChatModal';
import RegisterTrainingModal from './_components/RegisterTrainingModal/RegisterTrainingModal';
import styles from './page.module.css';
import { useTranslation } from '@/app/useTranslation';

export default function FrontDeskPage() {
  const [activeTab, setActiveTab] = useState('unhandled');
  const { requests, loading, error, refetch } = useAdminRequests('FRONT');
  // 취소 승인 대기: 모든 부서의 취소 요청을 프론트에서 대신 처리하기 위해 전체 조회
  const { requests: allRequests, loading: allLoading, refetch: allRefetch } = useAdminRequests(undefined, '', 'all', true);

  const frontDeskRequests = requests.filter(r => r.priority !== 'EMERGENCY');

  const pending = frontDeskRequests.filter(r => r.status === 'PENDING');
  const inProgress = frontDeskRequests.filter(r => (r.status === 'ASSIGNED' || r.status === 'IN_PROGRESS') && !r.cancelRequested);
  // 모든 부서의 취소 대기 건 (프론트 데스크가 대신 처리)
  const cancelPending = allRequests.filter(r => r.cancelRequested);
  const completed = frontDeskRequests.filter(r => r.status === 'COMPLETED' || r.status === 'CANCELLED');

  const { escalations } = useEscalations();
  const nonEmergencyEscalations = escalations.filter(r => r.priority !== 'EMERGENCY');
  const { t } = useTranslation();

  // 요청 생성 모달 상태
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  // Chat Modal 상태
  const [activeChatRoom, setActiveChatRoom] = useState<{ roomNumber: string, requestId: number, status: string } | null>(null);
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


  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/requests/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok && refetch) { refetch(); allRefetch && allRefetch(); }
    } catch (e) {
      console.error(e);
    }
  };

  // 탭에 따른 필터링
  const getFilteredRequests = () => {
    if (activeTab === 'unhandled') return pending;
    if (activeTab === 'inProgress') return inProgress;
    if (activeTab === 'cancelPending') return cancelPending;
    if (activeTab === 'escalation') return nonEmergencyEscalations;
    if (activeTab === 'completed') return completed;
    return pending;
  };
  const filteredRequests = getFilteredRequests();


  const handleCardClick = (requestId: number) => {
    setDetailTarget(requestId);
  };

  // 탭에 따른 섹션 제목
  const sectionTitle =
    activeTab === 'escalation' ? t.adminPage.frontDesk.sections.escalation :
      activeTab === 'cancelPending' ? '취소 요청' :
        activeTab === 'completed' ? '상담 완료' :
          activeTab === 'inProgress' ? t.adminPage.frontDesk.sections.inProgress :
            t.adminPage.frontDesk.sections.unhandled;

  const [detailTarget, setDetailTarget] = useState<number | null>(null);
  const [cancelApproveTarget, setCancelApproveTarget] = useState<number | null>(null);
  const [cancelRejectTarget, setCancelRejectTarget] = useState<number | null>(null);
  const [trainingTarget, setTrainingTarget] = useState<any | null>(null);

  const getPrimaryActionText = () => {
    if (activeTab === 'escalation') return t.adminPage.frontDesk.actions.approve;
    if (activeTab === 'cancelPending') return '취소 승인';
    if (activeTab === 'inProgress') return '상담 계속하기';
    if (activeTab === 'completed') return '학습 관리 등록';
    return t.adminPage.frontDesk.actions.startChat;
  };

  const getSecondaryActionText = () => {
    if (activeTab === 'escalation') return t.adminPage.frontDesk.actions.reject;
    if (activeTab === 'cancelPending') return '취소 반려';
    if (activeTab === 'inProgress') return '수동 배정';
    if (activeTab === 'completed') return '상담 기록 보기';
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
            { label: '상담 완료', value: 'completed', count: completed.length },
            { label: '취소 요청', value: 'cancelPending', count: cancelPending.length },
            { label: t.adminPage.frontDesk.tabs.escalation, value: 'escalation', count: nonEmergencyEscalations.length }
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
                  activeTab === 'cancelPending' ? () => setCancelApproveTarget(req.id) :
                  activeTab === 'inProgress' ? () => setActiveChatRoom({ roomNumber: req.roomNo.toString(), requestId: req.id, status: req.status }) :
                  activeTab === 'completed' ? () => setTrainingTarget(req) :
                  undefined
                }
                onSecondaryAction={
                  activeTab === 'escalation' ? () => setRejectTarget(req.id) :
                  activeTab === 'cancelPending' ? () => setCancelRejectTarget(req.id) :
                  activeTab === 'inProgress' ? () => handleCardClick(req.id) :
                  activeTab === 'completed' ? () => setActiveChatRoom({ roomNumber: req.roomNo.toString(), requestId: req.id, status: req.status }) :
                  () => handleCardClick(req.id)
                }
                reverseActions={activeTab === 'inProgress' || activeTab === 'unhandled' || activeTab === 'escalation' || activeTab === 'cancelPending' || activeTab === 'completed'}
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
        onSuccess={() => refetch && refetch()}
      />

      {/* 요청 상세 모달 (우선순위 + 부서 배정 관리) */}
      {detailTarget !== null && (
        <RequestDetailModal
          isOpen={true}
          onClose={() => setDetailTarget(null)}
          requestId={detailTarget}
          onUpdate={() => refetch && refetch()}
        />
      )}
      {approveTarget !== null && (
        <ApproveEscalationModal
          isOpen={true}
          onClose={() => setApproveTarget(null)}
          requestId={approveTarget}
          onSuccess={() => refetch && refetch()}
        />
      )}

      {/* 에스컬레이션 반려 모달 */}
      {rejectTarget !== null && (
        <RejectEscalationModal
          isOpen={true}
          onClose={() => setRejectTarget(null)}
          requestId={rejectTarget}
          onSuccess={() => refetch && refetch()}
        />
      )}

      {/* 취소 승인 모달 */}
      {cancelApproveTarget !== null && (
        <ApproveCancellationModal
          isOpen={true}
          onClose={() => setCancelApproveTarget(null)}
          requestId={cancelApproveTarget}
          onSuccess={() => { refetch && refetch(); allRefetch && allRefetch(); }}
        />
      )}

      {/* 취소 반려 모달 */}
      {cancelRejectTarget !== null && (
        <RejectCancellationModal
          isOpen={true}
          onClose={() => setCancelRejectTarget(null)}
          requestId={cancelRejectTarget}
          onSuccess={() => { refetch && refetch(); allRefetch && allRefetch(); }}
        />
      )}

      {/* 학습 데이터 등록 모달 */}
      <RegisterTrainingModal
        isOpen={trainingTarget !== null}
        onClose={() => setTrainingTarget(null)}
        departmentId={trainingTarget?.departmentId}
        summary={trainingTarget?.summary}
        roomNo={trainingTarget?.roomNo?.toString()}
      />

      {/* 상담 계속하기 처리를 위한 ChatModal */}
      {activeChatRoom && (
        <ChatModal
          isOpen={true}
          onClose={() => setActiveChatRoom(null)}
          roomNumber={activeChatRoom.roomNumber}
          requestId={activeChatRoom.requestId}
          status={activeChatRoom.status}
          onStatusChange={handleStatusChange}
          autoComplete={false}
        />
      )}
    </div>
  );
}
