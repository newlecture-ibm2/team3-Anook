'use client';

import React, { useState } from 'react';
import InputField from '@/components/ui/Inputfield/InputField';
import FilterButton from '@/components/ui/FilterButton/FilterButton';
import TaskColumn from '@/components/ui/TaskBoard/TaskColumn';
import TaskTicket from '@/components/ui/TaskBoard/TaskTicket';
import RequestDetailModal from '../front-desk/_components/RequestDetailModal/RequestDetailModal';
import useAdminRequests from '../useAdminRequests';
import styles from './page.module.css';
import { useTranslation } from '@/app/useTranslation';

const mapPriority = (p: string): 'NORMAL' | 'URGENT' => {
  if (p === 'HIGH' || p === 'URGENT') {
    return 'URGENT';
  }
  return 'NORMAL';
};

const mapStatus = (s: string): 'TODO' | 'IN_PROGRESS' | 'DONE' => {
  if (s === 'COMPLETED' || s === 'CANCELLED') return 'DONE';
  if (s === 'IN_PROGRESS') return 'IN_PROGRESS';
  return 'TODO';
};

export default function FacilityPage() {
  const [searchValue, setSearchValue] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [detailTarget, setDetailTarget] = useState<number | null>(null);
  const { t } = useTranslation();
  const { pending, inProgress, completed, loading, error, refetch } = useAdminRequests('FACILITY', searchValue, selectedFilter);

  if (error) return <div className={styles.container}><p>오류: {error}</p></div>;

  return (
    <div className={styles.container}>
      {/* Header Section */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>{t.adminPage.taskBoard.titles.facility}</h1>
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
            <TaskColumn title={t.adminPage.taskBoard.columns.pending} count={pending.length} status="TODO">
              {pending.map(req => (
                <div key={req.id} onClick={() => setDetailTarget(req.id)} style={{ cursor: 'pointer' }}>
                <TaskTicket 
                  ticketId={req.id}
                  roomNo={req.roomNo}
                  department={req.departmentName}
                  priority={mapPriority(req.priority)}
                  title={req.summary}
                  description={req.rawText || ''}
                  status={mapStatus(req.status)}
                  isCancelled={req.status === 'CANCELLED'}
                  cancelRequested={req.cancelRequested}
                  createdAt={req.createdAt}
                  entities={req.entities}
                />
                </div>
              ))}
            </TaskColumn>
          </div>

          {/* Column 2: 진행 중 */}
          <div className={styles.columnWrapper}>
            <TaskColumn title={t.adminPage.taskBoard.columns.inProgress} count={inProgress.length} status="IN_PROGRESS">
              {inProgress.map(req => (
                <div key={req.id} onClick={() => setDetailTarget(req.id)} style={{ cursor: 'pointer' }}>
                <TaskTicket 
                  ticketId={req.id}
                  roomNo={req.roomNo}
                  department={req.departmentName}
                  priority={mapPriority(req.priority)}
                  title={req.summary}
                  description={req.assignedStaffName || ''}
                  status={mapStatus(req.status)}
                  isCancelled={req.status === 'CANCELLED'}
                  cancelRequested={req.cancelRequested}
                  createdAt={req.createdAt}
                  updatedAt={req.updatedAt}
                  entities={req.entities}
                />
                </div>
              ))}
            </TaskColumn>
          </div>

          {/* Column 3: 완료됨 */}
          <div className={styles.columnWrapper}>
            <TaskColumn title={t.adminPage.taskBoard.columns.completed} count={completed.length} status="DONE">
              {completed.map(req => (
                <div key={req.id} onClick={() => setDetailTarget(req.id)} style={{ cursor: 'pointer' }}>
                <TaskTicket 
                  ticketId={req.id}
                  roomNo={req.roomNo}
                  department={req.departmentName}
                  priority={mapPriority(req.priority)}
                  title={req.summary}
                  description={req.rawText || ''}
                  status={mapStatus(req.status)}
                  isCancelled={req.status === 'CANCELLED'}
                  cancelRequested={req.cancelRequested}
                  createdAt={req.createdAt}
                  entities={req.entities}
                />
                </div>
              ))}
            </TaskColumn>
          </div>
        </div>
      )}

      {/* 상세 모달 */}
      {detailTarget !== null && (
        <RequestDetailModal
          isOpen={true}
          onClose={() => setDetailTarget(null)}
          requestId={detailTarget}
          onUpdate={() => refetch && refetch()}
        />
      )}
    </div>
  );
}
