import { useEffect } from 'react';
import { useNetworkStore } from '@/stores/useNetworkStore';
import { useUiStore } from '@/stores/useUiStore';
import { getSyncQueue, removeFromSyncQueue } from '@/lib/indexedDB';

export const useNetworkStatus = () => {
  const { isOnline, setOnline } = useNetworkStore();
  const { showToast } = useUiStore();

  useEffect(() => {
    // SSR 방어
    if (typeof window === 'undefined') return;

    // 백그라운드 동기화 매니저
    const processSyncQueue = async () => {
      try {
        const queue = await getSyncQueue();
        if (queue.length === 0) return;

        let successCount = 0;
        
        for (const op of queue) {
          try {
            const response = await fetch(op.endpoint, {
              method: op.method,
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(op.payload),
            });
            
            if (response.ok) {
              await removeFromSyncQueue(op.id);
              successCount++;
            }
          } catch (e) {
            console.error('Failed to sync operation:', op, e);
          }
        }
        
        if (successCount > 0) {
          showToast(`오프라인에서 작성된 데이터 ${successCount}건이 서버와 동기화되었습니다.`, 'success');
        }
      } catch (e) {
        console.error('Error processing sync queue:', e);
      }
    };

    const handleOnline = () => {
      setOnline(true);
      showToast('네트워크 연결이 복구되었습니다.', 'success');
      processSyncQueue(); // 온라인 복구 시 즉시 동기화
    };

    const handleOffline = () => {
      setOnline(false);
      showToast('네트워크 연결이 끊어졌습니다. 오프라인 모드로 동작합니다.', 'error');
    };

    // 초기 상태 동기화
    setOnline(navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 마운트 시 인터넷이 연결되어 있으면 밀린 큐 처리
    if (navigator.onLine) {
      processSyncQueue();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnline, showToast]);

  return isOnline;
};
