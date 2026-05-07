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
  assignedStaffId: number | null;
  confidence: number | null;
  createdAt: string;
  version: number;
}

interface UseTasksReturn {
  tasks: StaffTask[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  acceptTask: (id: number, version: number) => Promise<void>;
  completeTask: (id: number, version: number) => Promise<void>;
  transferTask: (id: number, version: number, toDepartmentId: string, reason: string) => Promise<void>;
}

export function useTasks(view?: 'my' | 'dept'): UseTasksReturn {
  const [tasks, setTasks] = useState<StaffTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { subscribe } = useWebSocket();

  const fetchTasks = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    setError(null);
    try {
      const url = view
        ? `/api/staff?action=requests&view=${view}`
        : '/api/staff?action=requests';

      const res = await fetch(url);
      const data = await handleResponse<StaffTask[]>(res);
      setTasks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '요청 목록을 불러오지 못했습니다.');
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [view]);

  const acceptTask = useCallback(async (id: number, version: number) => {
    try {
      const res = await fetch(`/api/staff?action=accept&id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version })
      });
      await handleResponse(res);
      await fetchTasks(true);
    } catch (err) {
      console.error('Failed to accept task:', err);
      fetchTasks(true);
      throw err;
    }
  }, [fetchTasks]);

  const completeTask = useCallback(async (id: number, version: number) => {
    try {
      const res = await fetch(`/api/staff?action=complete&id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version })
      });
      await handleResponse(res);
      await fetchTasks(true);
    } catch (err) {
      console.error('Failed to complete task:', err);
      fetchTasks(true);
      throw err;
    }
  }, [fetchTasks]);

  const transferTask = useCallback(async (id: number, version: number, toDepartmentId: string, reason: string) => {
    try {
      const res = await fetch(`/api/staff?action=transfer&id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version, toDepartmentId, reason })
      });
      await handleResponse(res);
      await fetchTasks(true);
    } catch (err) {
      console.error('Failed to transfer task:', err);
      fetchTasks(true);
      throw err;
    }
  }, [fetchTasks]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const derivedDepartmentId = tasks.length > 0 ? tasks[0].departmentId : 'HK';
  useEffect(() => {
    const handleEvent = (data: unknown) => {
      const event = data as { type?: string };
      if (!event || !event.type) return;

      if (event.type === 'NEW_REQUEST' || event.type === 'STATUS_CHANGED') {
        fetchTasks(true);
      }
    };

    const unsubscribeAdmin = subscribe('/topic/admin', handleEvent);
    const deptChannel = `/topic/dept/${derivedDepartmentId}`;
    const unsubscribeDept = subscribe(deptChannel, handleEvent);

    return () => {
      unsubscribeAdmin();
      unsubscribeDept();
    };
  }, [subscribe, fetchTasks, derivedDepartmentId]);

  return { tasks, loading, error, refetch: fetchTasks, acceptTask, completeTask, transferTask };
}
