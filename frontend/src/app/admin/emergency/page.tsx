'use client';

import React, { useState } from 'react';
import InputField from '@/components/ui/Inputfield/InputField';
import FilterButton from '@/components/ui/FilterButton/FilterButton';
import RequestCard from '@/components/ui/Card/RequestCard';
import useAdminRequests from '../useAdminRequests';
import styles from './page.module.css';

export default function EmergencyPage() {
  const [searchValue, setSearchValue] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const { requests, loading, error } = useAdminRequests('', searchValue, selectedFilter); // 전체 부서 요청 가져오기

  // 우선순위가 URGENT(긴급)이거나 HIGH(높음)인 것만 필터링
  const emergencyRequests = requests.filter(req => req.priority === 'URGENT');

  const mapStatusText = (status: string): string => {
    if (status === 'PENDING') return '대기 중';
    if (status === 'ASSIGNED') return '배정됨';
    if (status === 'IN_PROGRESS') return '처리 중';
    if (status === 'COMPLETED') return '완료';
    return status;
  };

  return (
    <div className={styles.container}>
      {/* Header Section */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>긴급 대응</h1>
        </div>
        <div className={styles.headerActions}>
          <InputField 
            variant="search" 
            placeholder="검색어를 입력하세요..." 
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
          <FilterButton 
            filterOptions={[
              { label: '전체', value: 'all' }, 
              { label: '최신순', value: 'latest' },
              { label: '오래된순', value: 'oldest' }
            ]}
            selectedFilter={selectedFilter}
            onFilterSelect={(val) => setSelectedFilter(val)}
          />
        </div>
      </div>

      {/* Content Section */}
      <div className={styles.cardList}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-gray-400)' }}>로딩 중...</div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-gray-400)' }}>오류: {error}</div>
        ) : emergencyRequests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-gray-400)' }}>긴급 요청이 없습니다.</div>
        ) : (
          emergencyRequests.map(req => (
            <RequestCard 
              key={req.id}
              roomType="객실"
              roomNumber={req.roomNo} 
              title={req.summary} 
              description={`${req.departmentName} 부서 요청`}
              statusText={mapStatusText(req.status)}
              statusVariant="red"
              createdAt={req.createdAt}
              variant="warning"
              primaryActionText="긴급 대응 시작"
              secondaryActionText="엔지니어 호출"
            />
          ))
        )}
      </div>
    </div>
  );
}

