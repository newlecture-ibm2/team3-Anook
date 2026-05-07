import { useState } from 'react';

interface RequestDetail {
  id: number;
  status: string;
  priority: string;
  departmentId: string;
  departmentName: string;
  entities: Record<string, any> | null;
  rawText: string;
  summary: string;
  confidence: number;
  roomNo: string;
  assignedStaffId: number | null;
  assignedStaffName: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  cancelRequested: boolean;
  cancelRequestedAt: string | null;
}

export default function useRequestDetail() {
  const [detail, setDetail] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/requests/${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: RequestDetail = await res.json();
      setDetail(data);
      return data;
    } catch (err: any) {
      setError(err.message || '상세 조회 실패');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const changePriority = async (id: number, priority: string) => {
    try {
      const res = await fetch(`/api/admin/requests/${id}/priority`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return true;
    } catch (err: any) {
      setError(err.message || '우선순위 변경 실패');
      return false;
    }
  };

  const assignStaff = async (id: number, staffId: number) => {
    try {
      const res = await fetch(`/api/admin/requests/${id}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return true;
    } catch (err: any) {
      setError(err.message || '담당자 변경 실패');
      return false;
    }
  };

  const cancelRequest = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/requests/${id}/cancel`, {
        method: 'PATCH',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return true;
    } catch (err: any) {
      setError(err.message || '요청 취소 실패');
      return false;
    }
  };

  const changeDepartment = async (id: number, departmentId: string) => {
    try {
      const res = await fetch(`/api/admin/requests/${id}/department`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ departmentId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return true;
    } catch (err: any) {
      setError(err.message || '부서 변경 실패');
      return false;
    }
  };

  const approveCancellation = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/requests/${id}/cancellation/approve`, {
        method: 'PATCH',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return true;
    } catch (err: any) {
      setError(err.message || '취소 승인 실패');
      return false;
    }
  };

  const rejectCancellation = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/requests/${id}/cancellation/reject`, {
        method: 'PATCH',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return true;
    } catch (err: any) {
      setError(err.message || '취소 반려 실패');
      return false;
    }
  };

  return { detail, fetchDetail, changePriority, assignStaff, changeDepartment, cancelRequest, approveCancellation, rejectCancellation, loading, error };
}
