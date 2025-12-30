import type { PictureData, UserProgress } from './types';

const DB_NAME = 'fillit-db';
const DB_VERSION = 2;

let db: IDBDatabase | null = null;

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function getUserId(): string {
  let userId = localStorage.getItem('fillit-user-id');
  if (!userId) {
    userId = generateUUID();
    localStorage.setItem('fillit-user-id', userId);
  }
  return userId;
}

export async function initDB(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains('pictures')) {
        database.createObjectStore('pictures', { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains('progress')) {
        database.createObjectStore('progress', { keyPath: 'pictureId' });
      }
      if (!database.objectStoreNames.contains('settings')) {
        database.createObjectStore('settings', { keyPath: 'ownerId' });
      }
    };
  });
}

export async function savePicture(picture: PictureData): Promise<void> {
  const database = await initDB();
  const userId = getUserId();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('pictures', 'readwrite');
    tx.objectStore('pictures').put({ ...picture, ownerId: userId });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPictures(): Promise<PictureData[]> {
  const database = await initDB();
  const userId = getUserId();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('pictures', 'readonly');
    const request = tx.objectStore('pictures').getAll();
    request.onsuccess = () => {
      const all = request.result as (PictureData & { ownerId?: string })[];
      resolve(all.filter(p => p.ownerId === userId));
    };
    request.onerror = () => reject(request.error);
  });
}

export async function deletePicture(id: string): Promise<void> {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(['pictures', 'progress'], 'readwrite');
    tx.objectStore('pictures').delete(id);
    tx.objectStore('progress').delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveProgress(pictureId: string, filledRegions: number[]): Promise<void> {
  const database = await initDB();
  const userId = getUserId();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('progress', 'readwrite');
    tx.objectStore('progress').put({ pictureId, filledRegions, ownerId: userId });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getProgress(pictureId: string): Promise<number[]> {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('progress', 'readonly');
    const request = tx.objectStore('progress').get(pictureId);
    request.onsuccess = () => resolve(request.result?.filledRegions || []);
    request.onerror = () => reject(request.error);
  });
}

export interface UserSettings {
  apiKey: string;
}

export async function saveSettings(settings: UserSettings): Promise<void> {
  const database = await initDB();
  const ownerId = getUserId();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('settings', 'readwrite');
    tx.objectStore('settings').put({ ...settings, ownerId });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getSettings(): Promise<UserSettings | null> {
  const database = await initDB();
  const ownerId = getUserId();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('settings', 'readonly');
    const request = tx.objectStore('settings').get(ownerId);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}
