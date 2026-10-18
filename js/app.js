/* app.js — hält alles zusammen: lädt die Daten, wechselt die Bildschirme,
   meldet den Service Worker an und bittet um dauerhaften Speicher. */
'use strict';

const App = {

  // Zwischenspeicher, damit nicht bei jedem Tippen die Datenbank gelesen wird
  plan: null,
  settings: null,
  sessions: [],
  records: [],

  /* ---------- Daten laden ---------- */

  async reload() {
    const [plan, settings, sessions, records] = await Promise.all([
      DB.getPlan(), DB.getSettings(), DB.allSessions(), DB.allRecords(),
    ]);
    App.plan = plan;
    App.settings = settings;
    App.sessions = sessions;     // neueste zuerst
    App.records = records;
    Timer.rest.configure(settings);
  },

  recordFor(exerciseId) {
    return App.records.find((r) => r.exerciseId === exerciseId) || null;
  },

  /* ---------- Navigation ---------- */

  go(hash) {
    if (location.hash === hash) App.route();
    else location.hash = hash;
  },

  parseHash() {
    const raw = (location.hash || '#/start').replace(/^#\/?/, '');
    const parts = raw.split('/').filter(Boolean);
    return { name: parts[0] || 'start', args: parts.slice(1) };
  },

  async route() {
    const { name, args } = App.parseHash();
    const host = document.getElementById('app');

    // Untere Leiste im Training ausblenden (mehr Platz, kein Vertippen)
    document.body.classList.toggle('no-nav', name === 'training');

    const screens = {
      start: ScreenHome,
      training: ScreenWorkout,
      fortschritt: ScreenProgress,
      plan: ScreenPlan,
      einstellungen: ScreenSettings,
    };
    const screen = screens[name] || ScreenHome;

    Timer.clock.clear();      // Uhren des alten Bildschirms abmelden
    host.scrollTop = 0;
    window.scrollTo(0, 0);

    try {
      await screen.render(host, args);
    } catch (err) {
      console.error(err);
      host.innerHTML = `<div class="empty"><div class="ico">${Icons.get('warn', 40)}</div>
        Es ist ein Fehler aufgetreten.<br><span class="small">${Util.esc(err && err.message)}</span></div>`;
    }

    // aktiven Knopf unten markieren
    const map = { start: '#/start', fortschritt: '#/fortschritt', plan: '#/plan', einstellungen: '#/einstellungen' };
    Util.$$('#nav button').forEach((b) => b.classList.toggle('active', b.dataset.go === map[name]));
  },

  /* ---------- Start ---------- */

  async boot() {
    await DB.init();
    await App.reload();

    // Überall: Knöpfe mit data-go wechseln den Bildschirm
    document.addEventListener('click', (e) => {
      const el = e.target.closest('[data-go]');
      if (!el) return;
      e.preventDefault();
      App.go(el.dataset.go);
    });

    window.addEventListener('hashchange', App.route);

    // Ton beim ersten Antippen freischalten (Safari-Regel)
    document.addEventListener('pointerdown', function once() {
      UI.unlockAudio();
      document.removeEventListener('pointerdown', once);
    }, { once: true });

    Timer.rest.restore();
    await App.route();

    // Dauerhaften Speicher anfordern (damit iOS die Daten nicht wegräumt)
    App.ensurePersistentStorage();
    App.registerServiceWorker();
  },

  async ensurePersistentStorage() {
    try {
      const status = await DB.storageStatus();
      if (status.supported && !status.persisted) {
        const ok = await DB.requestPersistent();
        if (ok) console.log('Speicher ist jetzt dauerhaft.');
      }
    } catch (e) { /* nicht schlimm */ }
  },

  registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'http:' && location.protocol !== 'https:') return;
    navigator.serviceWorker.register('sw.js').catch((e) => console.warn('Service Worker:', e.message));
  },
};

window.addEventListener('DOMContentLoaded', () => {
  App.boot().catch((err) => {
    console.error(err);
    document.getElementById('app').innerHTML =
      `<div class="empty"><div class="ico">${Icons.get('warn', 40)}</div>
         Die App konnte nicht starten.<br>
         <span class="small">${Util.esc(err && err.message)}</span>
       </div>
       <button class="btn primary block" onclick="location.reload()">Nochmal versuchen</button>
       <p class="small muted center mt">Deine gespeicherten Trainings sind davon nicht betroffen.</p>`;
  });
});
