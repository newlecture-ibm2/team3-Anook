'use client';

import React, { useState } from 'react';
import InputField from '@/components/ui/Inputfield/InputField';
import FilterButton from '@/components/ui/FilterButton/FilterButton';
import TaskColumn from '@/components/ui/TaskBoard/TaskColumn';
import TaskTicket from '@/components/ui/TaskBoard/TaskTicket';
import useAdminRequests from '../useAdminRequests';
import styles from './page.module.css';
import { useTranslation } from '@/app/useTranslation';

const mapPriority = (p: string): 'NORMAL' | 'URGENT' => {
  if (p === 'HIGH' || p === 'URGENT' || p === 'CRITICAL') {
    return 'URGENT';
  }
  return 'NORMAL';
};

const mapStatus = (s: string): 'TODO' | 'IN_PROGRESS' | 'DONE' => {
  if (s === 'COMPLETED' || s === 'CANCELLED') return 'DONE';
  if (s === 'IN_PROGRESS') return 'IN_PROGRESS';
  return 'TODO';
};

export default function HousekeepingPage() {
  const [searchValue, setSearchValue] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const { t } = useTranslation();
  const { pending, inProgress, completed, loading, error } = useAdminRequests('HK', searchValue, selectedFilter);

  if (error) return <div className={styles.container}><p>오류: {error}</p></div>;

  return (
    <div className={styles.container}>
      {/* Header Section */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>{t.adminPage.taskBoard.titles.housekeeping}</h1>
        </div>
        <div className={styles.headerActions}>
          <InputField 
            variant="search" 
            placeholder={t.adminPage.taskBoard.searchPlaceholder} 
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
          <FilterButton 
            filterOptions={[
              { label: t.adminPage.taskBoard.filterAll, value: 'all' }, 
              { label: t.adminPage.taskBoard.filterLatest, value: 'latest' },
              { label: t.adminPage.taskBoard.filterOldest, value: 'oldest' }
            ]}
            selectedFilter={selectedFilter}
            onFilterSelect={(val) => setSelectedFilter(val)}
          />
        </div>
      </div>

      {/* Task Board Section */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-gray-400)' }}>{t.common.loading}</div>
      ) : (
        <div className={styles.board}>
          {/* Column 1: 대기 중 */}
          <div className={styles.columnWrapper}>
            <TaskColumn title={t.adminPage.taskBoard.columns.pending} count={pending.length}>
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
            <TaskColumn title={t.adminPage.taskBoard.columns.inProgress} count={inProgress.length}>
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
            <TaskColumn title={t.adminPage.taskBoard.columns.completed} count={completed.length}>
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
