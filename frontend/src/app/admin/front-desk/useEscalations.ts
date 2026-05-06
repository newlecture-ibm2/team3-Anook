import { useState, useEffect, useCallback } from 'react';

interface EscalatedRequest {
  id: number;
  status: string;
  priority: string;
  departmentId: string;
  departmentName: string;
  summary: string;
  roomNo: string;
  assignedStaffId: number | null;
  assignedStaffName: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function useEscalations() {
  const [escalations, setEscalations] = useState<EscalatedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEscalations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/requests/escalations');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: EscalatedRequest[] = await res.json();
      setEscalations(data);
    } catch (err: any) {
      setError(err.message || '에스컬레이션 목록 로딩 실패');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEscalations();
  }, [fetchEscalations]);

  const approveEscalation = async (id: number, departmentId: string, priority: string) => {
    try {
      const res = await fetch(`/api/admin/requests/${id}/escalate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ departmentId, priority }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchEscalations();
      return true;
    } catch (err: any) {
      setError(err.message || '승인 실패');
      return false;
    }
  };

  const rejectEscalation = async (id: number, reason: string) => {
    try {
      const res = await fetch(`/api/admin/requests/${id}/cancel`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejectionReason: reason }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchEscalations();
      return true;
    } catch (err: any) {
      setError(err.message || '반려 실패');
      return false;
    }
  };

  return { escalations, loading, error, refetch: fetchEscalations, approveEscalation, rejectEscalation };
}
