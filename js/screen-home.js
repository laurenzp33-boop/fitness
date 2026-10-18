/* screen-home.js — die Startseite mit den Trainings-Kacheln. */
'use strict';

const ScreenHome = {

  async render(host) {
    const active = await DB.getKV('activeWorkout', null);
    const lastBackup = await DB.getKV('lastBackup', null);
    const backupDue = Logic.backupDue(App.settings, lastBackup, App.sessions);

    const tiles = Logic.tileWorkouts(App.plan);
    const week = App.sessions.filter((s) => Util.daysBetween(s.date, Util.isoDate()) < 7).length;
    const nextId = Logic.nextWorkoutId(App.plan, App.sessions);

    host.innerHTML = `
      ${UI.appbar('Training', { sub: ScreenHome._greeting() })}

      ${backupDue ? `<div class="banner">
        ${Icons.get('save', 22)}
        <div>Zeit für ein Backup.<div class="small muted">Deine Daten liegen nur auf diesem Handy.</div></div>
        <button class="btn small primary" data-go="#/einstellungen">Sichern</button>
      </div>` : ''}

      ${active ? `<div class="banner info">
        ${Icons.get('clock', 22)}
        <div>Training läuft: <b>${Util.esc(active.workoutName)}</b>
          <div class="small muted">begonnen ${Util.relDate(active.date)}</div></div>
        <button class="btn small primary" data-go="#/training/${Util.esc(active.workoutId)}">Weiter</button>
      </div>` : ''}

      <div class="tiles ${tiles.length > 2 ? 'two' : ''}">
        ${tiles.map((w) => ScreenHome._tile(w, w.id === nextId)).join('')}
      </div>

      ${tiles.length === 0 ? UI.empty('list', 'Noch keine Trainings im Plan. Lege unter „Plan" eines an.') : ''}

      <div class="kpis mt">
        <div class="kpi"><div class="v">${week}</div><div class="l">diese Woche</div></div>
        <div class="kpi"><div class="v">${App.sessions.length}</div><div class="l">insgesamt</div></div>
        <div class="kpi"><div class="v">${App.records.length}</div><div class="l">Rekorde</div></div>
      </div>

      ${App.sessions.length ? `
        <div class="section-title">Zuletzt</div>
        <div class="list">
          ${App.sessions.slice(0, 4).map((s) => ScreenHome._sessionRow(s)).join('')}
        </div>
        <button class="btn outline block mt-s" data-go="#/fortschritt/verlauf">Ganzen Verlauf zeigen</button>
      ` : ''}
    `;

    host.querySelectorAll('[data-workout]').forEach((el) => {
      el.addEventListener('click', () => App.go('#/training/' + el.dataset.workout));
    });
  },

  _greeting() {
    const h = new Date().getHours();
    if (h < 10) return 'Guten Morgen';
    if (h < 14) return 'Mahlzeit';
    if (h < 18) return 'Guten Tag';
    return 'Guten Abend';
  },

  _tile(w, isNext) {
    const last = App.sessions.find((s) => s.workoutId === w.id);
    const total = Logic.workoutExercises(App.plan, w.id).length;
    return `<button class="tile c-${Util.esc(w.color || 'slate')}${isNext ? ' is-next' : ''}"
            data-workout="${Util.esc(w.id)}">
      ${isNext
        ? `<span class="tile-last next">Anstehend</span>`
        : (last ? `<span class="tile-last">${Util.esc(Util.relDate(last.date))}</span>` : '')}
      <span class="tile-ic">${Icons.get('dumbbell', 30)}</span>
      <span class="tile-name">${Util.esc(w.name)}</span>
      <span class="tile-sub">${total} Übung${total === 1 ? '' : 'en'}${
        last ? ` · zuletzt ${Util.relDate(last.date)}` : ''}</span>
    </button>`;
  },

  _sessionRow(s) {
    const vol = Logic.sessionVolume(s);
    return `<div class="list-item">
      <span class="dot c-${Util.esc(s.color || 'slate')}"></span>
      <div class="main">
        <div class="t">${Util.esc(s.workoutName)}</div>
        <div class="s">${Util.esc(Util.fmtDateShort(s.date))} · ${vol.sets} Sätze</div>
      </div>
      <span class="val small muted">${Util.esc(Util.fmtDurationLong(s.durationSec))}</span>
    </div>`;
  },
};
