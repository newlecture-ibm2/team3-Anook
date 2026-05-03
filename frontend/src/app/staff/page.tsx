'use client';

import React, { useMemo, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import TaskColumn from '@/components/ui/TaskBoard/TaskColumn';
import TaskTicket from '@/components/ui/TaskBoard/TaskTicket';
import InputField from '@/components/ui/Inputfield/InputField';
import FilterButton from '@/components/ui/FilterButton/FilterButton';
import TaskDetailModal from './_components/TaskDetailModal/TaskDetailModal';
import { useTasks, StaffTask } from './useTasks';
import styles from './page.module.css';

const COLUMN_CONFIG = [
  { id: 'PENDING', title: '대기 중', status: 'TODO' },
  { id: 'IN_PROGRESS', title: '진행 중', status: 'IN_PROGRESS' },
  { id: 'COMPLETED', title: '완료됨', status: 'DONE' },
];

const PRIORITY_OPTIONS = [
  { label: '전체 우선순위', value: 'ALL' },
  { label: '긴급 (URGENT)', value: 'URGENT' },
  { label: '높음 (HIGH)', value: 'HIGH' },
  { label: '일반 (NORMAL)', value: 'NORMAL' },
  { label: '낮음 (LOW)', value: 'LOW' },
];

/**
 * [가이드라인 준수] 스태프 대시보드 메인 페이지
 * - URL: /staff
 * - useSearchParams() 사용을 위해 Suspense 경계를 설정합니다.
 */
export default function StaffDashboardPage() {
  return (
    <Suspense fallback={<div className={styles.loading}>화면을 준비 중입니다...</div>}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const view = searchParams.get('view');
  const { tasks, loading, error, acceptTask, completeTask } = useTasks(view === 'my' ? 'HK' : undefined);

  // 필터 및 모달 상태 관리
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [selectedTask, setSelectedTask] = useState<StaffTask | null>(null);

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (priorityFilter !== 'ALL' && task.priority !== priorityFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return task.roomNumber.toString().includes(query) ||
          task.summary.toLowerCase().includes(query);
      }
      return true;
    });
  }, [tasks, searchQuery, priorityFilter]);

  const boardData = useMemo(() => ({
    TODO: filteredTasks.filter(t => t.status === 'PENDING'),
    IN_PROGRESS: filteredTasks.filter(t => t.status === 'IN_PROGRESS'),
    DONE: filteredTasks.filter(t => t.status === 'COMPLETED'),
  }), [filteredTasks]);

  return (
    <div className={styles.container}>
      <Sidebar role="housekeeping" fakePathname={view === 'my' ? '/staff?view=my' : '/staff'} />

      <main className={styles.mainContent}>
        <div className={styles.headerContainer}>
          <header className={styles.header}>
            <h1 className={styles.title}>하우스키핑 관리</h1>
            <p className={styles.subtitle}>하우스키핑 전용 채널</p>
          </header>

          <div className={styles.toolbar}>
            <div className={styles.searchBox}>
              <InputField
                variant="search"
                placeholder="객실번호 또는 내용 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <FilterButton
              filterOptions={PRIORITY_OPTIONS}
              selectedFilter={priorityFilter}
              onFilterSelect={setPriorityFilter}
            />
          </div>
        </div>

        {loading ? (
          <div className={styles.loading}>데이터를 불러오는 중...</div>
        ) : error ? (
          <div className={styles.error}>데이터를 불러오는 데 실패했습니다. ({error})</div>
        ) : (
          <section className={styles.board}>
            {COLUMN_CONFIG.map(col => {
              const columnTasks = boardData[col.status as keyof typeof boardData];
              return (
                <TaskColumn
                  key={col.id}
                  title={col.title}
                  count={columnTasks.length}
                >
                  <div className={styles.columnContent}>
                    {columnTasks.map(task => (
                      <div 
                        key={`${task.roomNumber}-${task.createdAt}`}
                        className={styles.ticketWrapper}
                        onClick={() => setSelectedTask(task)}
                      >
                        <TaskTicket
                          priority={mapPriority(task.priority)}
                          title={`[${task.roomNumber}호] ${task.summary}`}
                          description={task.rawText}
                          status={col.status as 'TODO' | 'IN_PROGRESS' | 'DONE'}
                          createdAt={task.createdAt}
                        />
                      </div>
                    ))}
                    {columnTasks.length === 0 && (
                      <div className={styles.empty}>해당하는 작업이 없습니다.</div>
                    )}
                  </div>
                </TaskColumn>
              );
            })}
          </section>
        )}
      </main>

      <TaskDetailModal 
        isOpen={selectedTask !== null}
        onClose={() => setSelectedTask(null)}
        task={selectedTask}
        onAccept={acceptTask}
        onComplete={completeTask}
      />
    </div>
  );
}

function mapPriority(p: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' {
  switch (p) {
    case 'URGENT': return 'URGENT';
    case 'HIGH': return 'HIGH';
    case 'LOW': return 'LOW';
    default: return 'MEDIUM';
  }
}
