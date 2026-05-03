'use client';

import { useEffect, useCallback, useState } from 'react';
import { useWebSocket } from '@/app/useWebSocket';
import { handleResponse } from '@/lib/api';

export interface StaffTask {
  id: number;
  status: 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  departmentId: string;
  summary: string;
  rawText: string;
  roomNumber: string;
  assignedStaffName: string | null;
  confidence: number | null;
  createdAt: string;
}

interface UseTasksReturn {
  tasks: StaffTask[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  acceptTask: (id: number) => Promise<void>;
  completeTask: (id: number) => Promise<void>;
}

export function useTasks(departmentId?: string): UseTasksReturn {
  const [tasks, setTasks] = useState<StaffTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { subscribe } = useWebSocket();

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = departmentId
        ? `/api/staff?action=requests&departmentId=${departmentId}`
        : '/api/staff?action=requests';

      const res = await fetch(url);

      if (res.status === 401) {
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
          return;
        }
      }

      const data = await handleResponse<StaffTask[]>(res);
      setTasks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '요청 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [departmentId]);

  const acceptTask = useCallback(async (id: number) => {
    try {
      const res = await fetch(`/api/staff?action=accept&id=${id}`, {
        method: 'PATCH',
      });
      if (res.status === 401) {
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
          return;
        }
      }
      await handleResponse(res);
      await fetchTasks();
    } catch (err) {
      console.error('Failed to accept task:', err);
      throw err;
    }
  }, [fetchTasks]);

  const completeTask = useCallback(async (id: number) => {
    try {
      const res = await fetch(`/api/staff?action=complete&id=${id}`, {
        method: 'PATCH',
      });
      if (res.status === 401) {
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
          return;
        }
      }
      await handleResponse(res);
      await fetchTasks();
    } catch (err) {
      console.error('Failed to complete task:', err);
      throw err;
    }
  }, [fetchTasks]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    const handleEvent = (data: unknown) => {
      const event = data as { type?: string; payload?: StaffTask };
      if (!event || !event.type) return;

      if (event.type === 'NEW_REQUEST' && event.payload) {
        setTasks((prev) => {
          if (prev.some(t => t.id === event.payload!.id)) return prev;
          // 부서 필터링이 걸려있을 경우, 다른 부서의 새 요청은 무시
          if (departmentId && event.payload!.departmentId !== departmentId) return prev;
          return [event.payload!, ...prev];
        });
      } else if (event.type === 'STATUS_CHANGED' && event.payload) {
        setTasks((prev) =>
          prev.map((t) => (t.id === event.payload!.id ? event.payload! : t))
        );
      }
    };

    const unsubscribeAdmin = subscribe('/topic/admin', handleEvent);

    // 부서 전용 채널 구독 (전달받은 departmentId 사용, 없으면 HK 기본)
    const deptChannel = `/topic/dept/${departmentId || 'HK'}`;
    const unsubscribeDept = subscribe(deptChannel, handleEvent);

    return () => {
      unsubscribeAdmin();
      unsubscribeDept();
    };
  }, [subscribe, departmentId]);

  return { tasks, loading, error, refetch: fetchTasks, acceptTask, completeTask };
}
