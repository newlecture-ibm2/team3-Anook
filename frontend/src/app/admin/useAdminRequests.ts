import { useState, useEffect, useCallback } from 'react';

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
  cancelRequested: boolean;
  cancelRequestedAt: string | null;
}

export default function useAdminRequests(dept?: string, searchQuery: string = '', filterType: string = 'all') {
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
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
  }, [dept]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // 클라이언트 사이드 검색 및 필터링
  let filteredRequests = [...requests];
  
  if (searchQuery) {
    const lowerQ = searchQuery.toLowerCase();
    filteredRequests = filteredRequests.filter(r => 
      (r.summary && r.summary.toLowerCase().includes(lowerQ)) ||
      (r.roomNo && r.roomNo.includes(lowerQ)) ||
      (r.assignedStaffName && r.assignedStaffName.toLowerCase().includes(lowerQ))
    );
  }

  if (filterType === 'oldest') {
    filteredRequests.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  } else if (filterType === 'latest' || filterType === 'all') {
    filteredRequests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  const pending = filteredRequests.filter(r => r.status === 'PENDING');
  const inProgress = filteredRequests.filter(r => (r.status === 'ASSIGNED' || r.status === 'IN_PROGRESS') && !r.cancelRequested);
  const cancelPending = filteredRequests.filter(r => r.cancelRequested);
  const completed = filteredRequests.filter(r => r.status === 'COMPLETED' || r.status === 'CANCELLED');

  return { requests: filteredRequests, pending, inProgress, cancelPending, completed, loading, error, refetch: fetchRequests };
}
