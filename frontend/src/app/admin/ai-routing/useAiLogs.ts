import { useState, useEffect } from 'react';

export interface AiLogSummary {
  averageLatencyMs: number;
  totalTokens: number;
  routingSuccessRate: number;
  fallbackRate: number;
}

export interface AiLogDetail {
  id: number;
  rawPrompt: string;
  rawResponse: string;
  modelName: string;
  totalTokens: number;
  latencyMs: number;
  isFallback: boolean;
  createdAt: string;
}

export default function useAiLogs() {
  const [summary, setSummary] = useState<AiLogSummary | null>(null);
  const [logs, setLogs] = useState<AiLogDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAiLogs = async () => {
      setLoading(true);
      try {
        const [summaryRes, listRes] = await Promise.all([
          fetch('/api/admin/ai-logs/summary'),
          fetch('/api/admin/ai-logs')
        ]);
        
        if (!summaryRes.ok || !listRes.ok) {
          throw new Error('데이터를 불러오는데 실패했습니다.');
        }

        const summaryData = await summaryRes.json();
        const listData = await listRes.json();

        setSummary(summaryData);
        // Pageable response has 'content' array
        setLogs(listData.content || []);
      } catch (err: any) {
        setError(err.message || '알 수 없는 오류');
      } finally {
        setLoading(false);
      }
    };

    fetchAiLogs();
  }, []);

  return { summary, logs, loading, error };
}
