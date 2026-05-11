'use client';

import React, { useMemo, useState, useEffect, Suspense } from 'react';
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
  { label: '일반 (NORMAL)', value: 'NORMAL' },
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
  const { tasks, loading, error, acceptTask, completeTask, transferTask, approveCancellation, rejectCancellation } = useTasks(view === 'my' ? 'my' : 'dept');

  // 필터 및 모달 상태 관리
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [selectedTask, setSelectedTask] = useState<StaffTask | null>(null);

  const [departmentName, setDepartmentName] = useState('부서');
  const [departmentRole, setDepartmentRole] = useState<any>('housekeeping');

  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        if (data.departmentId) {
          // Sidebar Role 매핑
          const roleMap: Record<string, string> = {
            'HK': 'housekeeping',
            'FACILITY': 'facility',
            'FB': 'fb',
            'CONCIERGE': 'concierge'
          };
          setDepartmentRole(roleMap[data.departmentId] || 'housekeeping');

          // 화면 타이틀 이름 매핑 (요청하신 정확한 명칭으로 고정)
          const nameMap: Record<string, string> = {
            'HK': '하우스키핑',
            'FACILITY': 'Facility',
            'FB': 'FB',
            'CONCIERGE': '컨시어지'
          };
          setDepartmentName(nameMap[data.departmentId] || data.department || '부서');
        } else if (data.department) {
          setDepartmentName(data.department);
        }
      })
      .catch(console.error);
  }, []);

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
    DONE: filteredTasks.filter(t => t.status === 'COMPLETED' || t.status === 'CANCELLED'),
  }), [filteredTasks]);

  return (
    <div className={styles.container}>
      <Sidebar role={departmentRole} fakePathname={view === 'my' ? '/staff?view=my' : '/staff'} />

      <main className={styles.mainContent}>
        <div className={styles.headerContainer}>
          <header className={styles.header}>
            <h1 className={styles.title}>{departmentName} 관리</h1>
            <p className={styles.subtitle}>{departmentName} 전용 채널</p>
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
                          department={task.departmentId}
                          priority={mapPriority(task.priority)}
                          title={`[${task.roomNumber}호] ${task.summary}`}
                          description={(() => {
                            if (!task.rawText) return '';
                            const main = task.rawText.split('\n|||TRANSFER_REASON|||')[0];
                            const customer = main.split('[주문 상세]')[0].trim();
                            const detail = main.includes('[주문 상세]') ? main.split('[주문 상세]').slice(1).join('').trim() : '';
                            return customer ? (detail ? `${customer}\n${detail}` : customer) : detail;
                          })()}
                          status={col.status as 'TODO' | 'IN_PROGRESS' | 'DONE'}
                          createdAt={task.createdAt}
                          cancelRequested={task.cancelRequested}
                          isCancelled={task.status === 'CANCELLED'}
                          onAccept={col.status === 'TODO' ? (e) => {
                            e.stopPropagation();
                            acceptTask(task.id, task.version);
                          } : undefined}
                          onComplete={col.status === 'IN_PROGRESS' && !task.cancelRequested ? (e) => {
                            e.stopPropagation();
                            completeTask(task.id, task.version);
                          } : undefined}
                          entities={task.entities}
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
        onTransfer={transferTask}
        onApproveCancellation={approveCancellation}
        onRejectCancellation={rejectCancellation}
      />
    </div>
  );
}

function mapPriority(p: string): 'NORMAL' | 'URGENT' {
  if (p === 'HIGH' || p === 'URGENT') return 'URGENT';
  return 'NORMAL';
}
