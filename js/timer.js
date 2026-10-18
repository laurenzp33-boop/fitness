/* timer.js — zwei Uhren:
   1) die Trainingsdauer (läuft oben mit)
   2) der Pausen-Timer nach jedem Satz (Balken unten)

   Beide rechnen mit festen Zeitstempeln statt herunterzuzählen.
   Grund: iOS hält JavaScript an, wenn der Bildschirm aus ist –
   mit Zeitstempeln stimmt die Zeit beim Aufwecken trotzdem. */
'use strict';

const Timer = (function () {

  const REST_KEY = 'fa_rest_until';
  const listeners = new Set();
  let interval = null;

  function loop() {
    if (interval) return;
    interval = setInterval(() => {
      listeners.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
      rest._tick();
      if (!listeners.size && !rest.isRunning()) { clearInterval(interval); interval = null; }
    }, 250);
  }

  /* ---------- Trainingsdauer ---------- */

  const clock = {
    onTick(fn) { listeners.add(fn); loop(); return () => listeners.delete(fn); },
    clear() { listeners.clear(); },
    elapsed(startedAtMs) { return Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000)); },
  };

  /* ---------- Pausen-Timer ---------- */

  const rest = {
    until: 0,
    total: 0,
    settings: { enabled: true, seconds: 90, sound: true },

    configure(s) {
      rest.settings.enabled = s.restEnabled !== false;
      rest.settings.seconds = s.restSeconds || 90;
      rest.settings.sound = s.soundEnabled !== false;
    },

    isRunning() { return rest.until > Date.now(); },
    remaining() { return Math.max(0, Math.ceil((rest.until - Date.now()) / 1000)); },

    start(seconds) {
      const secs = seconds || rest.settings.seconds;
      if (!rest.settings.enabled || !secs) return;
      rest.total = secs;
      rest.until = Date.now() + secs * 1000;
      try { localStorage.setItem(REST_KEY, JSON.stringify({ until: rest.until, total: secs })); } catch (e) {}
      rest._render();
      loop();
    },

    add(seconds) {
      if (!rest.isRunning()) return;
      rest.until += seconds * 1000;
      rest.total += seconds;
      try { localStorage.setItem(REST_KEY, JSON.stringify({ until: rest.until, total: rest.total })); } catch (e) {}
      rest._render();
    },

    stop() {
      rest.until = 0;
      try { localStorage.removeItem(REST_KEY); } catch (e) {}
      const bar = document.getElementById('restbar');
      bar.classList.remove('show');
      setTimeout(() => { if (!rest.isRunning()) bar.innerHTML = ''; }, 300);
    },

    // Nach App-Neustart eine noch laufende Pause fortsetzen
    restore() {
      try {
        const raw = localStorage.getItem(REST_KEY);
        if (!raw) return;
        const d = JSON.parse(raw);
        if (d && d.until > Date.now()) {
          rest.until = d.until; rest.total = d.total || 90;
          rest._render(); loop();
        } else {
          localStorage.removeItem(REST_KEY);
        }
      } catch (e) { /* egal */ }
    },

    _done: false,
    _tick() {
      if (rest.until && rest.isRunning()) { rest._done = false; rest._render(); return; }
      if (rest.until && !rest._done) {
        rest._done = true;
        if (rest.settings.sound) UI.beep(2);
        UI.vibrate([120, 80, 120]);
        rest._renderFinished();
        setTimeout(() => { if (!rest.isRunning()) rest.stop(); }, 2500);
      }
    },

    _renderFinished() {
      const bar = document.getElementById('restbar');
      // Merker löschen: startet gleich eine neue Pause, muss der Balken
      // wieder als Countdown aufgebaut werden und nicht "Pause vorbei" zeigen.
      delete bar.dataset.live;
      bar.innerHTML = `<div class="restbox done-state">
        <div class="time" style="min-width:auto;display:flex">${Icons.get('check', 26)}</div>
        <div><div style="font-weight:800">Pause vorbei</div>
        <div class="lbl">Nächster Satz</div></div>
      </div>`;
      bar.classList.add('show');
    },

    _render() {
      const bar = document.getElementById('restbar');
      const left = rest.remaining();
      const pct = rest.total ? Math.max(0, left / rest.total) : 0;

      if (!bar.querySelector('.restbox') || !bar.dataset.live) {
        bar.dataset.live = '1';
        bar.innerHTML = `<div class="restbox" style="position:relative">
          <div class="time" id="rest-time">0:00</div>
          <div class="lbl" style="flex:1">Pause</div>
          <button class="btn small" id="rest-plus">+30 s</button>
          <button class="btn small outline" id="rest-skip">Überspringen</button>
          <div class="restprog" id="rest-prog"></div>
        </div>`;
        bar.querySelector('#rest-plus').onclick = () => rest.add(30);
        bar.querySelector('#rest-skip').onclick = () => { rest.until = 0; rest._done = true; rest.stop(); };
      }
      const t = bar.querySelector('#rest-time');
      if (t) t.textContent = Util.fmtDuration(left);
      const p = bar.querySelector('#rest-prog');
      if (p) p.style.transform = `scaleX(${pct})`;
      bar.classList.add('show');
    },
  };

  // Beim Beenden einer Pause den Merker löschen
  const origStop = rest.stop;
  rest.stop = function () { bar_reset(); origStop(); };
  function bar_reset() { const b = document.getElementById('restbar'); if (b) delete b.dataset.live; }

  return { clock, rest };
})();
