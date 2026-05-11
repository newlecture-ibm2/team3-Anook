import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'aneuk-offline-db';
const DB_VERSION = 1;
const STORE_NAME = 'sync-queue';

export interface SyncOperation {
  id: string; // unique ID
  endpoint: string; // e.g. '/api/tasks/1/memo'
  method: 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  payload: unknown;
  timestamp: number;
}

// 1. DB 초기화
export async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    },
  });
}

// 2. 큐에 추가 (오프라인일 때 호출)
export async function addToSyncQueue(operation: Omit<SyncOperation, 'id' | 'timestamp'>) {
  const db = await getDB();
  const fullOperation: SyncOperation = {
    ...operation,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  };
  await db.add(STORE_NAME, fullOperation);
  console.log('Saved to offline sync queue:', fullOperation);
}

// 3. 큐에서 모두 가져오기 (시간순 정렬)
export async function getSyncQueue(): Promise<SyncOperation[]> {
  const db = await getDB();
  const all = await db.getAll(STORE_NAME);
  return all.sort((a, b) => a.timestamp - b.timestamp);
}

// 4. 큐에서 특정 항목 삭제 (서버 전송 성공 후 호출)
export async function removeFromSyncQueue(id: string) {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
}

// 5. 큐 전체 비우기
export async function clearSyncQueue() {
  const db = await getDB();
  await db.clear(STORE_NAME);
}
