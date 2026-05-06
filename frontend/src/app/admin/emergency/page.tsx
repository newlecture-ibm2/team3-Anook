'use client';

import React, { useState, useEffect } from 'react';
import styles from './page.module.css';
import EmergencyCard from '@/components/ui/EmergencyCard/EmergencyCard';
import InputField from '@/components/ui/Inputfield/InputField';
import FilterButton from '@/components/ui/FilterButton/FilterButton';

export default function EmergencyPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState('');
  
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [callingId, setCallingId] = useState<number | null>(null);

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
      alert(err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleCallEngineer = async (id: number) => {
    setCallingId(id);
    try {
      const res = await fetch(`/api/admin/emergency/${id}/call-engineer`, { method: 'POST' });
      if (!res.ok) throw new Error('엔지니어를 호출하지 못했습니다.');
      alert('시설팀 엔지니어가 성공적으로 호출되었습니다.');
      await fetchTasks();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCallingId(null);
    }
  };

  const filteredTasks = tasks.filter(task => 
    task.title?.toLowerCase().includes(searchValue.toLowerCase()) || 
    task.description?.toLowerCase().includes(searchValue.toLowerCase()) ||
    task.roomNo?.includes(searchValue)
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <span className={styles.subtitle}>긴급 대응 전용 채널</span>
          <h1 className={styles.title}>긴급 요청</h1>
        </div>
        <div className={styles.actions}>
          <InputField
            variant="search"
            placeholder="객실번호 또는 내용 검색..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
          <FilterButton
            filterOptions={[
              { label: '전체', value: 'all' },
              { label: 'CRITICAL', value: 'critical' },
              { label: 'URGENT', value: 'urgent' }
            ]}
            selectedFilter="all"
            onFilterSelect={() => {}}
          />
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {loading ? (
        <div className={styles.loading}>긴급 대응 데이터를 불러오는 중입니다...</div>
      ) : filteredTasks.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyStateIcon}>✅</div>
          <h2>현재 처리해야 할 긴급 요청이 없습니다.</h2>
          <p>모든 상황이 안전하게 관리되고 있습니다.</p>
        </div>
      ) : (
        <div>
          {filteredTasks.map(task => (
            <EmergencyCard
              key={task.id}
              id={task.id}
              roomNumber={task.roomNo}
              title={task.title || task.summary}
              description={task.description}
              status={task.status}
              priority={task.priority}
              createdAt={task.createdAt}
              onStartResponse={handleStartResponse}
              onCallEngineer={handleCallEngineer}
              isStarting={processingId === task.id}
              isCalling={callingId === task.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
