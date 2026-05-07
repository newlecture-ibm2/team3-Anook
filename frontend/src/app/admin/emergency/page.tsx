'use client';

import React, { useState, useEffect } from 'react';
import styles from './page.module.css';
import RequestCard from '@/components/ui/Card/RequestCard';
import InputField from '@/components/ui/Inputfield/InputField';
import FilterButton from '@/components/ui/FilterButton/FilterButton';
import Tabs from '@/components/ui/Tab/Tabs';
import { useUiStore } from '@/stores/useUiStore';
import { useTranslation } from '@/app/useTranslation';

export default function EmergencyPage() {
  const { showToast } = useUiStore();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState('');
  const { t } = useTranslation();
  
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [callingId, setCallingId] = useState<number | null>(null);
  const [completingId, setCompletingId] = useState<number | null>(null);

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/admin/emergency');
      if (!res.ok) throw new Error('긴급 요청 데이터를 불러오지 못했습니다.');
      const data = await res.json();
      setTasks(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    
    // Auto-refresh every 30 seconds for emergency tasks
    const interval = setInterval(fetchTasks, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleStartResponse = async (id: number) => {
    setProcessingId(id);
    try {
      const res = await fetch(`/api/admin/emergency/${id}/start`, { method: 'POST' });
      if (!res.ok) throw new Error('대응을 시작하지 못했습니다.');
      await fetchTasks();
    } catch (err: any) {
      showToast(err.message || '오류가 발생했습니다.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleCallEngineer = async (id: number) => {
    setCallingId(id);
    try {
      const res = await fetch(`/api/admin/emergency/${id}/call-engineer`, { method: 'POST' });
      if (!res.ok) throw new Error('엔지니어를 호출하지 못했습니다.');
      showToast('시설팀 엔지니어가 성공적으로 호출되었습니다.', 'success');
      await fetchTasks();
    } catch (err: any) {
      showToast(err.message || '오류가 발생했습니다.', 'error');
    } finally {
      setCallingId(null);
    }
  };

  const handleCompleteResponse = async (id: number) => {
    setCompletingId(id);
    try {
      const res = await fetch(`/api/admin/emergency/${id}/complete`, { method: 'POST' });
      if (!res.ok) throw new Error('대응을 완료하지 못했습니다.');
      await fetchTasks();
    } catch (err: any) {
      showToast(err.message || '오류가 발생했습니다.', 'error');
    } finally {
      setCompletingId(null);
    }
  };

  const filteredTasks = tasks.filter(task => 
    task.priority === 'CRITICAL' && (
      task.title?.toLowerCase().includes(searchValue.toLowerCase()) || 
      task.description?.toLowerCase().includes(searchValue.toLowerCase()) ||
      task.roomNo?.includes(searchValue)
    )
  );

  const [activeTab, setActiveTab] = useState('unhandled');

  const pendingTasks = filteredTasks.filter(task => task.status === 'PENDING');
  const inProgressTasks = filteredTasks.filter(task => task.status === 'IN_PROGRESS' || task.status === 'ESCALATED');
  const completedTasks = filteredTasks.filter(task => task.status === 'COMPLETED');

  const getFilteredRequestsByTab = () => {
    if (activeTab === 'unhandled') return pendingTasks;
    if (activeTab === 'inProgress') return inProgressTasks;
    if (activeTab === 'completed') return completedTasks;
    return pendingTasks;
  };

  const requestsToShow = getFilteredRequestsByTab();

  const sectionTitle = activeTab === 'unhandled' ? '미처리 대기' : activeTab === 'inProgress' ? '처리 중' : '처리완료';

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <span className={styles.subtitle}>{t.adminPage.taskBoard.titles.emergency} 전용 채널</span>
          <h1 className={styles.title}>{t.adminPage.taskBoard.titles.emergency}</h1>
        </div>
        <div className={styles.actions}>
          <InputField
            variant="search"
            placeholder={t.adminPage.taskBoard.searchPlaceholder}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
          <FilterButton
            filterOptions={[
              { label: t.adminPage.taskBoard.filterAll, value: 'all' },
              { label: 'CRITICAL', value: 'critical' },
              { label: 'URGENT', value: 'urgent' }
            ]}
            selectedFilter="all"
            onFilterSelect={() => {}}
          />
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.tabSection}>
        <Tabs 
          options={[
            { label: '미처리 대기', value: 'unhandled', count: pendingTasks.length },
            { label: '처리 중', value: 'inProgress', count: inProgressTasks.length },
            { label: '처리완료', value: 'completed', count: completedTasks.length }
          ]}
          activeValue={activeTab}
          onChange={(val) => setActiveTab(val || 'unhandled')}
        />
      </div>

      <div className={styles.contentSection}>
        <h2 className={styles.sectionTitle}>{sectionTitle}</h2>
        
        {loading ? (
          <div className={styles.loading}>{t.common.loading}</div>
        ) : requestsToShow.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateIcon}>✅</div>
            <h2>{sectionTitle}인 긴급 요청이 없습니다.</h2>
          </div>
        ) : (
          <div className={styles.cardGrid}>
            {requestsToShow.map(task => (
              <RequestCard
                key={task.id}
                variant={task.status === 'COMPLETED' ? 'default' : 'warning'}
                roomType="객실"
                roomNumber={task.roomNo}
                title={task.title || task.summary}
                description={task.description}
                statusText={sectionTitle}
                statusVariant={task.status === 'COMPLETED' ? 'green' : task.status === 'IN_PROGRESS' ? 'purple' : 'red'}
                createdAt={task.createdAt}
                primaryActionText={
                  task.status === 'COMPLETED' ? '' :
                  processingId === task.id ? '처리중...' : 
                  completingId === task.id ? '완료중...' :
                  (task.status === 'IN_PROGRESS' || task.status === 'ESCALATED') ? '대응 완료' : '긴급 대응 시작'
                }
                secondaryActionText=""
                onPrimaryAction={() => {
                  if (task.status === 'PENDING' && processingId !== task.id) {
                    handleStartResponse(task.id);
                  } else if ((task.status === 'IN_PROGRESS' || task.status === 'ESCALATED') && completingId !== task.id) {
                    handleCompleteResponse(task.id);
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
