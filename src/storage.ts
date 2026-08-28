import type { SessionRecord } from './pace';
import { isSessionRecord, validateSessionRecords } from './session-schema';

const DB_NAME = 'pace-trail';
const DB_VERSION = 1;
const SESSION_STORE = 'sessions';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SESSION_STORE)) db.createObjectStore(SESSION_STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open private session storage.'));
  });
}

export async function saveSession(session: SessionRecord): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(SESSION_STORE, 'readwrite');
    transaction.objectStore(SESSION_STORE).put(session);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not save this session.'));
  });
  db.close();
}

export async function getSessions(): Promise<SessionRecord[]> {
  const db = await openDatabase();
  const sessions = await new Promise<SessionRecord[]>((resolve, reject) => {
    const valid: SessionRecord[] = [];
    const transaction = db.transaction(SESSION_STORE, 'readwrite');
    const request = transaction.objectStore(SESSION_STORE).openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      if (isSessionRecord(cursor.value)) valid.push(cursor.value);
      else cursor.delete();
      cursor.continue();
    };
    transaction.oncomplete = () => resolve(valid);
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not read session history.'));
  });
  db.close();
  return sessions.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export async function importSessions(value: unknown): Promise<number> {
  const sessions = validateSessionRecords(value);
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(SESSION_STORE, 'readwrite');
    const store = transaction.objectStore(SESSION_STORE);
    sessions.forEach((session) => store.put(session));
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error('Could not import session history.'));
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not import session history.'));
  });
  db.close();
  return sessions.length;
}

export async function clearSessions(): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(SESSION_STORE, 'readwrite');
    transaction.objectStore(SESSION_STORE).clear();
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not clear session history.'));
  });
  db.close();
}
