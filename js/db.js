/* db.js — die Datenbank am Handy (IndexedDB).
   Alles liegt lokal im Browser. Es geht nichts ins Internet. */
'use strict';

const DB = (function () {

  const NAME = 'fitness-app';
  const VERSION = 1;

  // Die vier "Schubladen" der Datenbank
  const KV = 'kv';                 // Plan, Einstellungen, laufendes Training ...
  const SESSIONS = 'sessions';     // abgeschlossene Trainings
  const RECORDS = 'records';       // bestes Gewicht pro Übung
  const WEIGHT = 'bodyweight';     // Körpergewicht pro Tag

  let dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(NAME, VERSION);
      req.onupgradeneeded = (e) => {
        const db = req.result;
        if (!db.objectStoreNames.contains(KV)) db.createObjectStore(KV, { keyPath: 'key' });
        if (!db.objectStoreNames.contains(SESSIONS)) {
          const s = db.createObjectStore(SESSIONS, { keyPath: 'id' });
          s.createIndex('date', 'date');
        }
        if (!db.objectStoreNames.contains(RECORDS)) db.createObjectStore(RECORDS, { keyPath: 'exerciseId' });
        if (!db.objectStoreNames.contains(WEIGHT)) db.createObjectStore(WEIGHT, { keyPath: 'date' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('Datenbank blockiert – bitte andere Tabs der App schließen.'));
    });
    return dbPromise;
  }

  function reqValue(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /* ---------- einfache Grundfunktionen ---------- */

  async function get(store, key) {
    const db = await open();
    return reqValue(db.transaction(store, 'readonly').objectStore(store).get(key));
  }

  async function all(store) {
    const db = await open();
    return reqValue(db.transaction(store, 'readonly').objectStore(store).getAll());
  }

  async function put(store, value) {
    const db = await open();
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(value);
    return new Promise((res, rej) => { tx.oncomplete = () => res(value); tx.onerror = () => rej(tx.error); });
  }

  async function putMany(store, values) {
    if (!values || !values.length) return;
    const db = await open();
    const tx = db.transaction(store, 'readwrite');
    const os = tx.objectStore(store);
    values.forEach((v) => os.put(v));
    return new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
  }

  async function del(store, key) {
    const db = await open();
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).delete(key);
    return new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
  }

  async function clear(store) {
    const db = await open();
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).clear();
    return new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
  }

  /* ---------- Schlüssel/Wert (Plan, Einstellungen, ...) ---------- */

  async function getKV(key, fallback) {
    const row = await get(KV, key);
    return row === undefined ? fallback : row.value;
  }

  function setKV(key, value) {
    return put(KV, { key: key, value: value });
  }

  /* ---------- Plan ---------- */

  async function getPlan() {
    return await getKV('plan', null);
  }

  function savePlan(plan) {
    return setKV('plan', plan);
  }

  /* ---------- Einstellungen ---------- */

  async function getSettings() {
    const saved = await getKV('settings', {});
    return Object.assign({}, SEED.settings, saved || {});
  }

  async function saveSettings(patch) {
    const current = await getSettings();
    const next = Object.assign({}, current, patch);
    await setKV('settings', next);
    return next;
  }

  /* ---------- Trainings ---------- */

  async function allSessions() {
    const list = await all(SESSIONS);
    // neueste zuerst
    return list.sort((a, b) => (a.startedAt === b.startedAt ? 0 : (a.startedAt < b.startedAt ? 1 : -1)));
  }

  function saveSession(session) {
    return put(SESSIONS, session);
  }

  function deleteSession(id) {
    return del(SESSIONS, id);
  }

  /* ---------- Rekorde ---------- */

  function allRecords() { return all(RECORDS); }
  function getRecord(exerciseId) { return get(RECORDS, exerciseId); }
  function saveRecord(rec) { return put(RECORDS, rec); }

  /* ---------- Körpergewicht ---------- */

  async function allWeights() {
    const list = await all(WEIGHT);
    return list.sort((a, b) => (a.date < b.date ? -1 : 1));
  }
  function saveWeight(date, kg) { return put(WEIGHT, { date: date, kg: kg }); }
  function deleteWeight(date) { return del(WEIGHT, date); }

  /* ---------- Erster Start: Startdaten einspielen ---------- */

  async function init() {
    const plan = await getPlan();

    // Allererster Start: Startdaten einspielen
    if (!plan) {
      await savePlan(Util.clone(SEED.plan));
      await putMany(RECORDS, Util.clone(SEED.records));
      await setKV('settings', Util.clone(SEED.settings));
      await setKV('createdAt', new Date().toISOString());
      return;
    }

    /* Der Plan hat eine Versionsnummer. Ist eine ältere gespeichert
       (z. B. noch die getrennten Tage Brust/Rücken/Arme), wird auf den
       neuen Startplan umgestellt – aber NUR, solange noch kein Training
       aufgezeichnet wurde. Sobald Daten da sind, bleibt dein Plan so,
       wie du ihn hast. */
    const stored = plan.version || 1;
    if (stored < (SEED.plan.version || 1)) {
      const sessions = await all(SESSIONS);
      if (!sessions.length) {
        await savePlan(Util.clone(SEED.plan));
      } else {
        plan.version = SEED.plan.version;
        await savePlan(plan);
      }
    }
  }

  /* ---------- Backup ---------- */

  async function exportAll() {
    const [plan, settings, sessions, records, weights, lastBackup, createdAt] = await Promise.all([
      getPlan(), getSettings(), allSessions(), allRecords(), allWeights(),
      getKV('lastBackup', null), getKV('createdAt', null),
    ]);
    return {
      app: 'fitness-app',
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      createdAt: createdAt,
      lastBackup: lastBackup,
      plan: plan,
      settings: settings,
      sessions: sessions,
      records: records,
      bodyweight: weights,
    };
  }

  // mode: 'replace' (alles ersetzen) oder 'merge' (dazumischen)
  async function importAll(data, mode) {
    if (!data || data.app !== 'fitness-app' || !data.plan) {
      throw new Error('Das sieht nicht nach einem Backup dieser App aus.');
    }
    if (mode === 'replace') {
      await Promise.all([clear(SESSIONS), clear(RECORDS), clear(WEIGHT)]);
      await savePlan(data.plan);
      await setKV('settings', Object.assign({}, SEED.settings, data.settings || {}));
    } else {
      // Beim Mischen bleibt der aktuelle Plan bestehen.
      const current = await getPlan();
      if (!current) await savePlan(data.plan);
    }
    await putMany(SESSIONS, data.sessions || []);
    await putMany(WEIGHT, data.bodyweight || []);

    // Rekorde: beim Mischen nur übernehmen, wenn sie besser sind
    const incoming = data.records || [];
    if (mode === 'replace') {
      await putMany(RECORDS, incoming);
    } else {
      for (const rec of incoming) {
        const existing = await getRecord(rec.exerciseId);
        if (!existing || (rec.kg || 0) > (existing.kg || 0)) await saveRecord(rec);
      }
    }
    if (data.createdAt) await setKV('createdAt', data.createdAt);
    return true;
  }

  async function wipeEverything() {
    await Promise.all([clear(KV), clear(SESSIONS), clear(RECORDS), clear(WEIGHT)]);
    await init();
  }

  /* ---------- Dauerhafter Speicher ---------- */

  async function storageStatus() {
    const out = { persisted: false, supported: false, usageMB: null, quotaMB: null };
    if (navigator.storage && navigator.storage.persisted) {
      out.supported = true;
      try { out.persisted = await navigator.storage.persisted(); } catch (e) { /* egal */ }
    }
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const est = await navigator.storage.estimate();
        if (est.usage != null) out.usageMB = est.usage / 1048576;
        if (est.quota != null) out.quotaMB = est.quota / 1048576;
      } catch (e) { /* egal */ }
    }
    return out;
  }

  async function requestPersistent() {
    if (!navigator.storage || !navigator.storage.persist) return false;
    try { return await navigator.storage.persist(); } catch (e) { return false; }
  }

  return {
    STORES: { KV, SESSIONS, RECORDS, WEIGHT },
    init, open,
    get, all, put, putMany, del, clear,
    getKV, setKV,
    getPlan, savePlan,
    getSettings, saveSettings,
    allSessions, saveSession, deleteSession,
    allRecords, getRecord, saveRecord,
    allWeights, saveWeight, deleteWeight,
    exportAll, importAll, wipeEverything,
    storageStatus, requestPersistent,
  };
})();
