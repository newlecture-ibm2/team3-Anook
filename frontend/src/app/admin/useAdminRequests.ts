import { useState, useEffect } from 'react';

interface AdminRequest {
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

export default function useAdminRequests(dept?: string) {
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setLoading(true);
        const url = dept
          ? `/api/admin/requests?dept=${dept}`
          : '/api/admin/requests';
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: AdminRequest[] = await res.json();
        setRequests(data);
      } catch (err: any) {
        setError(err.message || '요청 목록 로딩 실패');
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, [dept]);

  const pending = requests.filter(r => r.status === 'PENDING');
  const inProgress = requests.filter(r => r.status === 'ASSIGNED' || r.status === 'IN_PROGRESS');
  const completed = requests.filter(r => r.status === 'COMPLETED' || r.status === 'CANCELLED');

  return { requests, pending, inProgress, completed, loading, error };
}
