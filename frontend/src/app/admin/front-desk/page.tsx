'use client';

import React, { useState } from 'react';
import Tabs from '@/components/ui/Tab/Tabs';
import RequestCard from '@/components/ui/Card/RequestCard';
import Button from '@/components/ui/Button/Button';
import useAdminRequests from '../useAdminRequests';
import useAssignRequest from './useAssignRequest';
import useCreateRequest from './useCreateRequest';
import AssignModal from './_components/AssignModal/AssignModal';
import CreateRequestModal from './_components/CreateRequestModal/CreateRequestModal';
import styles from './page.module.css';

export default function FrontDeskPage() {
  const [activeTab, setActiveTab] = useState('unhandled');
  const { requests, pending, loading, error, refetch } = useAdminRequests('FRONT');
  const { staffList, assignRequest, loading: assigning } = useAssignRequest();
  const { createRequest, loading: creating } = useCreateRequest();

  // 수동 배정 모달 상태
  const [assignTarget, setAssignTarget] = useState<{ id: number; summary: string; roomNo: string } | null>(null);
  // 요청 생성 모달 상태
  const [isCreateOpen, setIsCreateOpen] = useState(false);

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
    return status;
  };

  // 탭에 따른 필터링
  const filteredRequests = activeTab === 'all'
    ? requests
    : activeTab === 'unhandled'
      ? pending
      : requests.filter(r => r.status === 'ASSIGNED' || r.status === 'IN_PROGRESS');

  const handleAssign = async (staffId: number) => {
    if (!assignTarget) return false;
    const success = await assignRequest(assignTarget.id, staffId);
    if (success && refetch) refetch();
    return success;
  };

  const handleCreate = async (payload: any) => {
    const success = await createRequest(payload);
    if (success && refetch) refetch();
    return success;
  };

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
            { label: '전체 요청', value: 'all' },
            { label: '미처리 대기', value: 'unhandled', count: pending.length },
            { label: '예외 발생', value: 'exception', count: 0 }
          ]}
          activeValue={activeTab}
          onChange={(val) => setActiveTab(val || 'unhandled')}
        />
      </div>

      {/* Content Section */}
      <div className={styles.contentSection}>
        <h2 className={styles.sectionTitle}>미처리 / 예외 요청</h2>
        
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
                primaryActionText="상담 시작"
                secondaryActionText="수동 배정"
                onSecondaryAction={() => setAssignTarget({ id: req.id, summary: req.summary, roomNo: req.roomNo })}
              />
            ))}
          </div>
        )}
      </div>

      {/* 수동 배정 모달 */}
      <AssignModal
        isOpen={assignTarget !== null}
        onClose={() => setAssignTarget(null)}
        onAssign={handleAssign}
        staffList={staffList}
        requestSummary={assignTarget?.summary ?? ''}
        roomNo={assignTarget?.roomNo ?? ''}
        loading={assigning}
      />

      {/* 요청 생성 모달 */}
      <CreateRequestModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreate={handleCreate}
        loading={creating}
      />
    </div>
  );
}
