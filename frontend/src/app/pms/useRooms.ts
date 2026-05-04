'use client';

import { useState, useCallback } from 'react';
import { handleResponse } from '@/lib/api';

interface PmsRoom {
  number: string;
  type: string;
  occupied: boolean;
  guestName: string | null;
}

export default function useRooms() {
  const [rooms, setRooms] = useState<PmsRoom[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/pms/rooms');
      const data = await handleResponse<PmsRoom[]>(res);
      setRooms(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { rooms, loading, error, fetchRooms };
}
