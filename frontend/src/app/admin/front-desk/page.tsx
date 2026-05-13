'use client';

import React, { useState } from 'react';
import FilterButton from '@/components/ui/FilterButton/FilterButton';
import RequestCard from '@/components/ui/Card/RequestCard';
import Button from '@/components/ui/Button/Button';
import useAdminRequests from '../useAdminRequests';

import useEscalations from './useEscalations';
import CreateRequestModal from './_components/CreateRequestModal/CreateRequestModal';
import ApproveEscalationModal from './_components/ApproveEscalationModal/ApproveEscalationModal';
import RejectEscalationModal from './_components/RejectEscalationModal/RejectEscalationModal';
import ApproveCancellationModal from './_components/ApproveCancellationModal/ApproveCancellationModal';
import RejectCancellationModal from './_components/RejectCancellationModal/RejectCancellationModal';
import ChatPanel from './_components/ChatPanel/ChatPanel';
import RequestDetailPanel from './_components/RequestDetailPanel/RequestDetailPanel';
import RegisterTrainingModal from './_components/RegisterTrainingModal/RegisterTrainingModal';
import styles from './page.module.css';
import { useTranslation } from '@/app/useTranslation';
import { useUiStore } from '@/stores/useUiStore';

export default function FrontDeskPage() {
  const [filterStatus, setFilterStatus] = useState('ALL');
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

  const { activeModal, closeModal } = useUiStore();
  // Chat Modal 상태
  const [activeChatRoom, setActiveChatRoom] = useState<{ roomNumber: string, requestId: number, status: string, initialMessage?: string } | null>(null);
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
      if (res.ok) {
        if (refetch) refetch();
        if (allRefetch) allRefetch();
        if (activeChatRoom?.requestId === id) {
          if (newStatus === 'COMPLETED') {
            setActiveChatRoom(null);
          } else {
            setActiveChatRoom(prev => prev ? { ...prev, status: newStatus } : null);
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 필터에 따른 리스트 렌더링
  const getFilteredRequests = () => {
    let list = frontDeskRequests;
    if (filterStatus === 'PENDING') {
      list = pending;
    } else if (filterStatus === 'IN_PROGRESS') {
      list = inProgress;
    } else if (filterStatus === 'COMPLETED') {
      list = completed;
    } else {
      list = [...pending, ...inProgress, ...completed];
    }
    // 최신순 정렬
    return list.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };
  const filteredRequests = getFilteredRequests();


  const handleCardClick = (requestId: number) => {
    setDetailTarget(requestId);
  };


  const [detailTarget, setDetailTarget] = useState<number | null>(null);
  const [cancelApproveTarget, setCancelApproveTarget] = useState<number | null>(null);
  const [cancelRejectTarget, setCancelRejectTarget] = useState<number | null>(null);
  const [trainingTarget, setTrainingTarget] = useState<any | null>(null);

  const getPrimaryActionText = (req: any) => {
    if (req.status === 'COMPLETED') return '학습 관리 등록';
    return undefined;
  };

  const getSecondaryActionText = (req: any) => {
    if (req.status === 'COMPLETED') return '상담 기록 보기';
    return undefined;
  };

  return (
    <div className={styles.container}>
      {/* Content Section (Split Layout) */}
      <div className={styles.splitLayout}>
        {/* Left Pane: Request List */}
        <div className={styles.leftPane}>
          {/* Filter options inside left pane */}
          <div style={{ marginBottom: 'var(--space-16)', display: 'flex', justifyContent: 'flex-end' }}>
            <FilterButton
              filterOptions={[
                { label: `전체 (${pending.length + inProgress.length + completed.length})`, value: 'ALL' },
                { label: `대기 중 (${pending.length})`, value: 'PENDING' },
                { label: `처리 중 (${inProgress.length})`, value: 'IN_PROGRESS' },
                { label: `상담 완료 (${completed.length})`, value: 'COMPLETED' }
              ]}
              selectedFilter={filterStatus}
              onFilterSelect={(val) => setFilterStatus(val)}
            />
          </div>

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
                description={req.rawText || '요청 내용이 없습니다.'}
                statusText={mapStatusText(req.status)}
                statusVariant={mapStatusVariant(req.status)}
                createdAt={req.createdAt}
                isSelected={activeChatRoom?.requestId === req.id}
                primaryActionText={getPrimaryActionText(req)}
                secondaryActionText={getSecondaryActionText(req)}
                onPrimaryAction={() => {
                  if (req.status === 'PENDING') {
                    handleStatusChange(req.id, 'IN_PROGRESS');
                    setActiveChatRoom({ roomNumber: req.roomNo.toString(), requestId: req.id, status: 'IN_PROGRESS', initialMessage: req.rawText || req.summary });
                  } else if (req.status === 'IN_PROGRESS' || req.status === 'ASSIGNED') {
                    handleStatusChange(req.id, 'COMPLETED');
                    setActiveChatRoom(null);
                  } else if (req.status === 'COMPLETED') {
                    setTrainingTarget(req);
                  }
                }}
                onSecondaryAction={
                  req.status === 'COMPLETED' ? () => setActiveChatRoom({ roomNumber: req.roomNo.toString(), requestId: req.id, status: req.status, initialMessage: req.rawText || req.summary }) :
                  undefined
                }
                reverseActions={true}
                onCardClick={() => {
                  setActiveChatRoom({ roomNumber: req.roomNo.toString(), requestId: req.id, status: req.status, initialMessage: req.rawText || req.summary });
                  setDetailTarget(null);
                }}
                // custom props to pass to ChatModal through RequestCard
                requestId={req.id}
                status={req.status}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}
        </div>

        {/* Right Pane: Chat Window */}
        <div className={styles.rightPane}>
          {activeChatRoom ? (
            <ChatPanel
              roomNumber={activeChatRoom.roomNumber}
              requestId={activeChatRoom.requestId}
              status={activeChatRoom.status}
              initialMessage={activeChatRoom.initialMessage}
              onStatusChange={handleStatusChange}
              autoComplete={false}
              onClose={() => setActiveChatRoom(null)}
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-gray-400)' }}>
              대화할 요청을 선택해주세요
            </div>
          )}
        </div>

        {/* Third Pane: Request Detail (요청 상세) */}
        {(activeChatRoom || detailTarget !== null) && (
          <div className={styles.detailPane}>
            <RequestDetailPanel
              requestId={(activeChatRoom ? activeChatRoom.requestId : detailTarget)!}
              onUpdate={() => refetch && refetch()}
              onClose={() => {
                setActiveChatRoom(null);
                setDetailTarget(null);
              }}
            />
          </div>
        )}
      </div>

      {/* 요청 생성 모달 */}
      <CreateRequestModal
        isOpen={activeModal === 'createRequest'}
        onClose={closeModal}
        onSuccess={() => refetch && refetch()}
      />

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

      <RegisterTrainingModal
        isOpen={trainingTarget !== null}
        onClose={() => setTrainingTarget(null)}
        departmentId={trainingTarget?.departmentId}
        summary={trainingTarget?.summary}
        roomNo={trainingTarget?.roomNo?.toString()}
      />
    </div>
  );
}
