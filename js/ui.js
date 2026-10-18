/* ui.js — kleine Bausteine für die Oberfläche:
   Meldungen (Toast), Dialoge, Pokal-Feier, Vibration, Piepton. */
'use strict';

const UI = {

  /* ---------- kurze Meldung unten ---------- */

  _toastTimer: null,
  toast(msg, ms) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(UI._toastTimer);
    UI._toastTimer = setTimeout(() => el.classList.remove('show'), ms || 2200);
  },

  /* ---------- Dialog ---------- */

  /* Beispiel:
     const wahl = await UI.modal({
       title: 'Wirklich löschen?',
       body: '<p>Das kann nicht rückgängig gemacht werden.</p>',
       actions: [ {label:'Abbrechen', value:null}, {label:'Löschen', cls:'danger', value:true} ]
     });  */
  modal(opts) {
    return new Promise((resolve) => {
      const host = document.getElementById('modal');
      const actions = opts.actions || [{ label: 'OK', value: true, cls: 'primary' }];
      host.innerHTML = `
        <div class="modal-box" role="dialog" aria-modal="true">
          ${opts.title ? `<h2>${Util.esc(opts.title)}</h2>` : ''}
          <div class="modal-body">${opts.body || ''}</div>
          <div class="modal-actions">
            ${actions.map((a, i) => `<button class="btn ${a.cls || 'outline'}" data-i="${i}">${Util.esc(a.label)}</button>`).join('')}
          </div>
        </div>`;
      host.classList.add('show');

      let closed = false;
      const close = (value) => {
        if (closed) return;
        closed = true;
        host.classList.remove('show');
        host.innerHTML = '';
        host.onclick = null;
        resolve(value);
      };

      host.onclick = (e) => {
        if (e.target === host && opts.dismissable !== false) return close(opts.dismissValue ?? null);
        const btn = e.target.closest('button[data-i]');
        if (!btn) return;
        const action = actions[Number(btn.dataset.i)];
        if (action.keepOpen) { action.onClick && action.onClick(host, close); return; }
        const value = opts.read ? opts.read(host, action.value) : action.value;
        close(value);
      };

      if (opts.onOpen) opts.onOpen(host.querySelector('.modal-box'), close);
    });
  },

  async confirm(opts) {
    const r = await UI.modal({
      title: opts.title,
      body: opts.text ? `<p class="muted">${Util.esc(opts.text)}</p>` : '',
      actions: [
        { label: opts.cancelLabel || 'Abbrechen', value: false },
        { label: opts.okLabel || 'OK', value: true, cls: opts.danger ? 'danger' : 'primary' },
      ],
      dismissValue: false,
    });
    return r === true;
  },

  alert(title, text) {
    return UI.modal({
      title: title,
      body: text ? `<p class="muted">${Util.esc(text)}</p>` : '',
      actions: [{ label: 'OK', value: true, cls: 'primary' }],
    });
  },

  /* Eingabe-Dialog. fields: [{key,label,value,type,placeholder,inputmode,step,options}] */
  async form(opts) {
    const fields = opts.fields || [];
    const body = fields.map((f) => {
      if (f.type === 'select') {
        return `<label class="field"><span>${Util.esc(f.label)}</span>
          <select data-k="${Util.esc(f.key)}">${(f.options || []).map((o) =>
            `<option value="${Util.esc(o.value)}"${String(o.value) === String(f.value) ? ' selected' : ''}>${Util.esc(o.label)}</option>`).join('')}
          </select></label>`;
      }
      return `<label class="field"><span>${Util.esc(f.label)}</span>
        <input data-k="${Util.esc(f.key)}" type="${f.type || 'text'}"
          inputmode="${f.inputmode || (f.type === 'number' ? 'decimal' : 'text')}"
          value="${Util.esc(f.value === null || f.value === undefined ? '' : f.value)}"
          placeholder="${Util.esc(f.placeholder || '')}"></label>`;
    }).join('');

    return UI.modal({
      title: opts.title,
      body: (opts.intro ? `<p class="muted small">${Util.esc(opts.intro)}</p>` : '') + body,
      actions: [
        { label: 'Abbrechen', value: null },
        { label: opts.okLabel || 'Speichern', value: 'ok', cls: 'primary' },
      ],
      dismissValue: null,
      onOpen: (box) => {
        const first = box.querySelector('input, select');
        if (first && opts.focus !== false) setTimeout(() => { first.focus(); if (first.select) first.select(); }, 60);
      },
      read: (host, value) => {
        if (value !== 'ok') return null;
        const out = {};
        Util.$$('[data-k]', host).forEach((el) => { out[el.dataset.k] = el.value; });
        return out;
      },
    });
  },

  /* ---------- Pokal ---------- */

  celebrate(title, sub) {
    const el = document.getElementById('celebrate');
    el.innerHTML = `<div class="trophy"><div class="ico">${Icons.get('trophy', 70)}</div>
      <div class="txt">${Util.esc(title)}</div>
      ${sub ? `<div class="sub">${Util.esc(sub)}</div>` : ''}</div>`;
    el.classList.add('show');
    UI.vibrate([18, 60, 18, 60, 40]);
    clearTimeout(UI._celebTimer);
    UI._celebTimer = setTimeout(() => { el.classList.remove('show'); el.innerHTML = ''; }, 1600);
  },

  /* ---------- Vibration & Ton ---------- */

  vibrate(pattern) {
    // iPhone/Safari kann das (noch) nicht – schadet aber nicht.
    if (navigator.vibrate) { try { navigator.vibrate(pattern); } catch (e) { /* egal */ } }
  },

  _audio: null,
  beep(times) {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!UI._audio) UI._audio = new Ctx();
      const ac = UI._audio;
      if (ac.state === 'suspended') ac.resume();
      const n = times || 2;
      for (let i = 0; i < n; i++) {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        const t0 = ac.currentTime + i * 0.22;
        osc.frequency.value = 880;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
        osc.connect(gain).connect(ac.destination);
        osc.start(t0); osc.stop(t0 + 0.2);
      }
    } catch (e) { /* Ton ist nur Zugabe */ }
  },

  // Safari erlaubt Ton erst nach einer Berührung – einmal "aufwecken".
  unlockAudio() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!UI._audio) UI._audio = new Ctx();
      if (UI._audio.state === 'suspended') UI._audio.resume();
    } catch (e) { /* egal */ }
  },

  /* ---------- Bausteine ---------- */

  appbar(title, opts) {
    const o = opts || {};
    return `<div class="appbar">
      ${o.back ? `<button class="iconbtn" data-go="${Util.esc(o.back)}" aria-label="Zurück">${Icons.get('back', 22)}</button>` : ''}
      <div style="flex:1;min-width:0">
        <h1>${Util.esc(title)}</h1>
        ${o.sub ? `<div class="sub">${Util.esc(o.sub)}</div>` : ''}
      </div>
      ${o.action || ''}
    </div>`;
  },

  // icon = Name aus js/icons.js, z. B. 'dumbbell'
  empty(icon, text) {
    return `<div class="empty"><div class="ico">${Icons.get(icon, 40)}</div>${Util.esc(text)}</div>`;
  },
};
