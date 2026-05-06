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

export default function FrontDeskPage() {
  const [activeTab, setActiveTab] = useState('unhandled');
  const { requests, pending, inProgress, loading, error, refetch } = useAdminRequests('FRONT');
  const { createRequest, loading: creating } = useCreateRequest();
  const { detail, fetchDetail, changePriority, changeDepartment, cancelRequest } = useRequestDetail();
  const { escalations, approveEscalation, rejectEscalation } = useEscalations();

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
    if (status === 'PENDING') return '프론트 대기';
    if (status === 'ASSIGNED') return '배정됨';
    if (status === 'IN_PROGRESS') return '처리 중';
    if (status === 'COMPLETED') return '완료';
    if (status === 'ESCALATED') return '승인 대기';
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
  const sectionTitle = activeTab === 'escalation' ? '승인 대기 요청' : '미처리 / 예외 요청';

  return (
    <div className={styles.container}>
      {/* Header Section */}
      <div className={styles.header}>
        <h1 className={styles.title}>프론트 데스크</h1>
        <Button variant="primary" onClick={() => setIsCreateOpen(true)}>
          + 요청 생성
        </Button>
      </div>

      {/* Tabs Section */}
      <div className={styles.tabSection}>
        <Tabs 
          options={[
            { label: '미처리 대기', value: 'unhandled', count: pending.length },
            { label: '처리 중', value: 'inProgress', count: inProgress.length },
            { label: '승인 대기', value: 'escalation', count: escalations.length }
          ]}
          activeValue={activeTab}
          onChange={(val) => setActiveTab(val || 'unhandled')}
        />
      </div>

      {/* Content Section */}
      <div className={styles.contentSection}>
        <h2 className={styles.sectionTitle}>{sectionTitle}</h2>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-gray-400)' }}>로딩 중...</div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-gray-400)' }}>오류: {error}</div>
        ) : filteredRequests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-gray-400)' }}>요청이 없습니다.</div>
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
                primaryActionText={activeTab === 'escalation' ? '승인' : '상담 시작'}
                secondaryActionText={activeTab === 'escalation' ? '반려' : '수동 배정'}
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
