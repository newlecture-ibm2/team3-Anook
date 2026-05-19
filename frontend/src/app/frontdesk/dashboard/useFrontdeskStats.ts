import { useState, useEffect } from 'react';

interface Stats {
  total: number;
  byStatus: Record<string, number>;
  byDepartment: Record<string, number>;
  byPriority: Record<string, number>;
  frequentRequests: Record<string, number>;
  overdueCount: number;
  avgResolutionTimeMins: number;
  resolutionRatePct: number;
  customerSatisfaction: number;
  totalChange: string;
  avgResolutionTimeChange: string;
  resolutionRateChange: string;
  customerSatisfactionChange: string;
}

export default function useFrontdeskStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/frontdesk/requests/stats');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setStats(data);
      } catch (err: any) {
        setError(err.message || '통계 로딩 실패');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return { stats, loading, error };
}
