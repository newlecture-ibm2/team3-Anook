'use client';

import React, { useEffect, useState } from 'react';
import { useWebSocket } from '@/app/useWebSocket';
import EmergencyBanner from '@/components/ui/EmergencyBanner/EmergencyBanner';

export default function GlobalEmergencyListener() {
  const { subscribe } = useWebSocket();
  const [emergencyAlert, setEmergencyAlert] = useState<{
    requestId: number;
    roomNo: string;
    summary: string;
    category: string;
  } | null>(null);

  useEffect(() => {
    const handleEvent = (data: unknown) => {
      const event = data as {
        type?: string;
        priority?: string;
        entities?: Record<string, unknown>;
        requestId?: number;
        roomNo?: string;
        summary?: string;
      };

      if (!event || !event.type) return;

      if (
        event.type === 'NEW_REQUEST' &&
        event.priority === 'EMERGENCY' &&
        event.entities &&
        (event.entities.emergency_category || event.entities.intent)
      ) {
        setEmergencyAlert({
          requestId: event.requestId ?? 0,
          roomNo: event.roomNo ?? '',
          summary: event.summary ?? '긴급 상황 발생',
          category: (event.entities.emergency_category || event.entities.intent) as string,
        });
      }
    };

    const unsubscribeAdmin = subscribe('/topic/admin', handleEvent);
    
    return () => {
      unsubscribeAdmin();
    };
  }, [subscribe]);

  if (!emergencyAlert) return null;

  return (
    <EmergencyBanner
      alert={emergencyAlert}
      onDismiss={() => setEmergencyAlert(null)}
      onClick={() => {
        window.location.href = '/admin/front-desk';
      }}
    />
  );
}
