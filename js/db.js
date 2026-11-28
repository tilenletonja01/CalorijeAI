// Lokalna shramba (IndexedDB). Vsi podatki ostanejo na telefonu.
import { mergeSettings } from './logic/settings.js';

const DB_NAME = 'kalorije';
const DB_VERSION = 1;
export const STORES = ['foods', 'entries', 'days', 'weights', 'settings'];

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('foods')) db.createObjectStore('foods', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('entries')) {
        const s = db.createObjectStore('entries', { keyPath: 'id' });
        s.createIndex('date', 'date');
        s.createIndex('foodId', 'foodId');
      }
      if (!db.objectStoreNames.contains('days')) db.createObjectStore('days', { keyPath: 'date' });
      if (!db.objectStoreNames.contains('weights')) {
        const s = db.createObjectStore('weights', { keyPath: 'id' });
        s.createIndex('date', 'date');
      }
      if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'key' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('Baza je zaklenjena. Zapri druge zavihke z aplikacijo.'));
  });
  return dbPromise;
}

const promisify = (req) =>
  new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const done = (tx) =>
  new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Transakcija prekinjena'));
  });

async function read(store) {
  const db = await openDB();
  return db.transaction(store).objectStore(store);
}

export function newId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function getAll(store) {
  return promisify((await read(store)).getAll());
}

export async function get(store, key) {
  return promisify((await read(store)).get(key));
}

export async function getAllByIndex(store, index, value) {
  return promisify((await read(store)).index(index).getAll(value));
}

export async function countByIndex(store, index, value) {
  return promisify((await read(store)).index(index).count(value));
}

export async function put(store, value) {
  const db = await openDB();
  const tx = db.transaction(store, 'readwrite');
  tx.objectStore(store).put(value);
  await done(tx);
  notifyChange();
  return value;
}

export async function remove(store, key) {
  const db = await openDB();
  const tx = db.transaction(store, 'readwrite');
  tx.objectStore(store).delete(key);
  await done(tx);
  notifyChange();
}

/** Obvesti zaslone, da so se podatki spremenili. */
function notifyChange(detail = {}) {
  window.dispatchEvent(new CustomEvent('data-changed', { detail }));
}

// ===== Nastavitve =====
export async function getSettings() {
  return mergeSettings(await get('settings', 'settings'));
}

export async function saveSettings(settings) {
  await put('settings', { key: 'settings', ...settings });
}

// ===== Živila in vnosi =====
export const getFoods = () => getAll('foods');
export const getEntriesForDate = (date) => getAllByIndex('entries', 'date', date);
export const countEntriesForFood = (foodId) => countByIndex('entries', 'foodId', foodId);

// ===== Izvoz in uvoz =====
export const EXPORT_APP = 'kalorije';
export const EXPORT_VERSION = 1;

export async function exportAll() {
  const out = { app: EXPORT_APP, version: EXPORT_VERSION, exportedAt: new Date().toISOString() };
  for (const s of STORES) out[s] = await getAll(s);
  return out;
}

/** Preveri strukturo varnostne kopije. Vrne opis napake ali null. */
export function validateBackup(data) {
  if (!data || typeof data !== 'object') return 'Datoteka ni veljaven JSON objekt.';
  if (data.app !== EXPORT_APP) return 'To ni varnostna kopija te aplikacije.';
  if (typeof data.version !== 'number' || data.version > EXPORT_VERSION) {
    return 'Varnostna kopija je iz novejše različice aplikacije.';
  }
  for (const s of STORES) {
    if (data[s] != null && !Array.isArray(data[s])) return `Neveljaven del »${s}«.`;
  }
  const keyOf = { foods: 'id', entries: 'id', days: 'date', weights: 'id', settings: 'key' };
  for (const s of STORES) {
    for (const item of data[s] || []) {
      if (!item || typeof item !== 'object' || item[keyOf[s]] == null) return `Neveljaven zapis v »${s}«.`;
    }
  }
  return null;
}

/** Zamenja vse podatke z vsebino varnostne kopije (v eni transakciji). */
export async function importAll(data) {
  const err = validateBackup(data);
  if (err) throw new Error(err);
  const db = await openDB();
  const tx = db.transaction(STORES, 'readwrite');
  for (const s of STORES) {
    const store = tx.objectStore(s);
    store.clear();
    for (const item of data[s] || []) store.put(item);
  }
  await done(tx);
  notifyChange({ reload: true });
}

/** Zaprosi brskalnik, naj podatkov ne briše samodejno. */
export async function requestPersistence() {
  try {
    if (!navigator.storage?.persist) return null;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return null;
  }
}
