'use client';

import React, { useState } from 'react';
import InputField from '@/components/ui/Inputfield/InputField';
import FilterButton from '@/components/ui/FilterButton/FilterButton';
import TaskColumn from '@/components/ui/TaskBoard/TaskColumn';
import TaskTicket from '@/components/ui/TaskBoard/TaskTicket';
import RequestDetailModal from '../requests/_components/RequestDetailModal/RequestDetailModal';
import useFrontdeskRequests from '../useFrontdeskRequests';
import styles from './page.module.css';
import { useTranslation } from '@/app/useTranslation';

const mapPriority = (p: string): 'NORMAL' => 'NORMAL';

const mapStatus = (s: string): 'TODO' | 'IN_PROGRESS' | 'DONE' => {
  if (s === 'COMPLETED' || s === 'CANCELLED') return 'DONE';
  if (s === 'IN_PROGRESS') return 'IN_PROGRESS';
  return 'TODO';
};

export default function AllRequestsPage() {
  const [searchValue, setSearchValue] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [detailTarget, setDetailTarget] = useState<number | null>(null);
  const { t } = useTranslation();
  const { pending, inProgress, completed, loading, error, refetch } = useFrontdeskRequests('', searchValue, selectedFilter);

  if (error) return <div className={styles.container}><p>오류: {error}</p></div>;

  return (
    <div className={styles.container}>
      {/* Header Section */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>{t.frontdeskPage.taskBoard.titles.allRequests}</h1>
        </div>
        <div className={styles.headerActions}>
          <InputField 
            variant="search" 
            placeholder={t.frontdeskPage.taskBoard.searchPlaceholder} 
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
          <FilterButton 
            filterOptions={[
              { label: t.frontdeskPage.taskBoard.filterAll, value: 'all' }, 
              { label: t.frontdeskPage.taskBoard.filterLatest, value: 'latest' },
              { label: t.frontdeskPage.taskBoard.filterOldest, value: 'oldest' }
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
            <TaskColumn title={t.frontdeskPage.taskBoard.columns.pending} count={pending.length} status="TODO">
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
            <TaskColumn title={t.frontdeskPage.taskBoard.columns.inProgress} count={inProgress.length} status="IN_PROGRESS">
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
            <TaskColumn title={t.frontdeskPage.taskBoard.columns.completed} count={completed.length} status="DONE">
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

