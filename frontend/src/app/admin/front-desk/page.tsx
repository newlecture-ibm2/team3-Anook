'use client';

import React, { useState } from 'react';
import Tabs from '@/components/ui/Tab/Tabs';
import RequestCard from '@/components/ui/Card/RequestCard';
import useAdminRequests from '../useAdminRequests';
import styles from './page.module.css';

export default function FrontDeskPage() {
  const [activeTab, setActiveTab] = useState('unhandled');
  const { requests, pending, loading, error } = useAdminRequests('FRONT');

  const mapStatusVariant = (status: string): 'red' | 'purple' | 'green' | 'gray' => {
    if (status === 'PENDING') return 'red';
    if (status === 'IN_PROGRESS') return 'green';
    return 'gray';
  };

  const mapStatusText = (status: string): string => {
    if (status === 'PENDING') return '프론트 대기';
    if (status === 'IN_PROGRESS') return '처리 중';
    if (status === 'COMPLETED') return '완료';
    return status;
  };

  // 탭에 따른 필터링
  const filteredRequests = activeTab === 'all'
    ? requests
    : activeTab === 'unhandled'
      ? pending
      : requests.filter(r => r.status === 'IN_PROGRESS');

  return (
    <div className={styles.container}>
      {/* Header Section */}
      <div className={styles.header}>
        <h1 className={styles.title}>프론트 데스크</h1>
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
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
