import type { SessionRecord } from './pace';

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
    const request = db.transaction(SESSION_STORE, 'readonly').objectStore(SESSION_STORE).getAll();
    request.onsuccess = () => resolve(request.result as SessionRecord[]);
    request.onerror = () => reject(request.error ?? new Error('Could not read session history.'));
  });
  db.close();
  return sessions.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export async function importSessions(sessions: SessionRecord[]): Promise<number> {
  const valid = sessions.filter((s) => s && typeof s.id === 'string' && Array.isArray(s.samples));
  for (const session of valid) await saveSession(session);
  return valid.length;
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
