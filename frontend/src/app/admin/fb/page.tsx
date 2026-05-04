'use client';

import React, { useState } from 'react';
import InputField from '@/components/ui/Inputfield/InputField';
import FilterButton from '@/components/ui/FilterButton/FilterButton';
import TaskColumn from '@/components/ui/TaskBoard/TaskColumn';
import TaskTicket from '@/components/ui/TaskBoard/TaskTicket';
import useAdminRequests from '../useAdminRequests';
import styles from './page.module.css';

const mapPriority = (p: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' => {
  const map: Record<string, 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'> = {
    LOW: 'LOW', NORMAL: 'MEDIUM', HIGH: 'HIGH', URGENT: 'URGENT'
  };
  return map[p] || 'MEDIUM';
};

const mapStatus = (s: string): 'TODO' | 'IN_PROGRESS' | 'DONE' => {
  if (s === 'COMPLETED' || s === 'CANCELLED') return 'DONE';
  if (s === 'ASSIGNED' || s === 'IN_PROGRESS') return 'IN_PROGRESS';
  return 'TODO';
};

export default function FbPage() {
  const [searchValue, setSearchValue] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const { pending, inProgress, completed, loading, error } = useAdminRequests('FB', searchValue, selectedFilter);

  if (error) return <div className={styles.container}><p>오류: {error}</p></div>;

  return (
    <div className={styles.container}>
      {/* Header Section */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>식음료</h1>
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

      {/* Task Board Section */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-gray-400)' }}>로딩 중...</div>
      ) : (
        <div className={styles.board}>
          {/* Column 1: 대기 중 */}
          <div className={styles.columnWrapper}>
            <TaskColumn title="대기 중" count={pending.length}>
              {pending.map(req => (
                <TaskTicket 
                  key={req.id}
                  ticketId={req.id}
                  priority={mapPriority(req.priority)}
                  title={req.summary}
                  description={`${req.roomNo}호`}
                  status={mapStatus(req.status)}
                  createdAt={req.createdAt}
                />
              ))}
            </TaskColumn>
          </div>

          {/* Column 2: 진행 중 */}
          <div className={styles.columnWrapper}>
            <TaskColumn title="진행 중" count={inProgress.length}>
              {inProgress.map(req => (
                <TaskTicket 
                  key={req.id}
                  ticketId={req.id}
                  priority={mapPriority(req.priority)}
                  title={req.summary}
                  description={`${req.roomNo}호${req.assignedStaffName ? ` · ${req.assignedStaffName}` : ''}`}
                  status={mapStatus(req.status)}
                  createdAt={req.createdAt}
                  updatedAt={req.updatedAt}
                />
              ))}
            </TaskColumn>
          </div>

          {/* Column 3: 완료됨 */}
          <div className={styles.columnWrapper}>
            <TaskColumn title="완료됨" count={completed.length}>
              {completed.map(req => (
                <TaskTicket 
                  key={req.id}
                  ticketId={req.id}
                  priority={mapPriority(req.priority)}
                  title={req.summary}
                  description={`${req.roomNo}호`}
                  status={mapStatus(req.status)}
                  createdAt={req.createdAt}
                />
              ))}
            </TaskColumn>
          </div>
        </div>
      )}
    </div>
  );
}
