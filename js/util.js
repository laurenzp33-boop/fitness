/* util.js — kleine Helfer, die überall gebraucht werden */
'use strict';

const Util = {

  /* ---------- Zahlen ---------- */

  // "17,5" oder "17.5" -> 17.5 ; leer/Unsinn -> null
  parseNum(value) {
    if (value === null || value === undefined) return null;
    const s = String(value).trim().replace(',', '.');
    if (s === '') return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  },

  // 17.5 -> "17,5" ; 50 -> "50"
  fmtNum(n) {
    if (n === null || n === undefined || !Number.isFinite(n)) return '';
    return String(Math.round(n * 1000) / 1000).replace('.', ',');
  },

  // 17.5 -> "17,5 kg" ; null -> "–"
  fmtKg(n) {
    if (n === null || n === undefined || !Number.isFinite(n)) return '–';
    return Util.fmtNum(n) + ' kg';
  },

  /* ---------- Datum ---------- */

  // Date -> "2026-10-18" (immer lokale Zeit, nicht UTC)
  isoDate(d) {
    const date = d ? new Date(d) : new Date();
    const p = (x) => String(x).padStart(2, '0');
    return date.getFullYear() + '-' + p(date.getMonth() + 1) + '-' + p(date.getDate());
  },

  // "2026-10-18" -> "18.10.2026"
  fmtDate(iso) {
    if (!iso) return '';
    const [y, m, d] = String(iso).split('-');
    return `${d}.${m}.${y}`;
  },

  // "2026-10-18" -> "Sa, 18.10."
  fmtDateShort(iso) {
    if (!iso) return '';
    const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    const dt = Util.parseISO(iso);
    const [y, m, d] = String(iso).split('-');
    return `${days[dt.getDay()]}, ${d}.${m}.`;
  },

  // "2026-10-18" -> Date (lokal, Mittag, damit Zeitzonen nichts verschieben)
  parseISO(iso) {
    const [y, m, d] = String(iso).split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0);
  },

  // "heute" / "gestern" / "vor 3 Tagen" / "18.10.2026"
  relDate(iso) {
    if (!iso) return '';
    const today = Util.parseISO(Util.isoDate());
    const then = Util.parseISO(iso);
    const days = Math.round((today - then) / 86400000);
    if (days === 0) return 'heute';
    if (days === 1) return 'gestern';
    if (days > 1 && days < 14) return `vor ${days} Tagen`;
    return Util.fmtDate(iso);
  },

  // Tage zwischen zwei ISO-Daten
  daysBetween(isoA, isoB) {
    return Math.round((Util.parseISO(isoB) - Util.parseISO(isoA)) / 86400000);
  },

  /* ---------- Dauer ---------- */

  // 3725 -> "1:02:05" ; 125 -> "2:05"
  fmtDuration(totalSeconds) {
    const s = Math.max(0, Math.floor(totalSeconds || 0));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const p = (x) => String(x).padStart(2, '0');
    return h > 0 ? `${h}:${p(m)}:${p(sec)}` : `${m}:${p(sec)}`;
  },

  // 3725 -> "1 h 2 min" ; 125 -> "2 min"
  fmtDurationLong(totalSeconds) {
    const s = Math.max(0, Math.floor(totalSeconds || 0));
    const h = Math.floor(s / 3600);
    const m = Math.round((s % 3600) / 60);
    if (h > 0) return `${h} h ${m} min`;
    return `${m} min`;
  },

  /* ---------- HTML ---------- */

  // Text sicher in HTML einsetzen (verhindert kaputte Seiten bei < > & " in Namen)
  esc(str) {
    return String(str === null || str === undefined ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  },

  $(sel, root) { return (root || document).querySelector(sel); },
  $$(sel, root) { return Array.from((root || document).querySelectorAll(sel)); },

  /* ---------- Sonstiges ---------- */

  uid(prefix) {
    return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  },

  // Auf 0,25 kg genau runden (vermeidet 52.500000000000004)
  roundKg(n) {
    if (n === null || n === undefined || !Number.isFinite(n)) return null;
    return Math.round(n * 100) / 100;
  },

  clone(obj) { return JSON.parse(JSON.stringify(obj)); },
};
