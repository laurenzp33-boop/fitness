/* screen-workout.js — das laufende Training.

   Ablauf: Kachel antippen -> hier landen -> pro Satz kg und Wdh. eintragen
   (oder einfach ✓ tippen, dann gelten die vorausgefüllten Werte) ->
   Pause läuft -> am Ende "Training beenden".

   Der Zwischenstand wird nach JEDER Änderung gespeichert. Wenn das iPhone
   die App wegräumt, ist beim nächsten Öffnen alles noch da. */
'use strict';

const ScreenWorkout = {

  state: null,        // das laufende Training
  stopClock: null,

  /* ---------- Aufbau ---------- */

  async render(host, args) {
    const workoutId = args[0];
    const workout = Logic.findWorkout(App.plan, workoutId);
    if (!workout) {
      host.innerHTML = UI.empty('warn', 'Dieses Training gibt es nicht mehr.') +
        `<button class="btn primary block" data-go="#/start">Zur Startseite</button>`;
      return;
    }

    let active = await DB.getKV('activeWorkout', null);

    if (active && active.workoutId !== workoutId) {
      const keep = await UI.confirm({
        title: 'Anderes Training läuft noch',
        text: `„${active.workoutName}" ist noch offen. Soll es verworfen und „${workout.name}" gestartet werden?`,
        okLabel: 'Neu starten', cancelLabel: 'Zurück', danger: true,
      });
      if (!keep) { App.go('#/training/' + active.workoutId); return; }
      active = null;
    }

    if (!active) active = await ScreenWorkout._create(workout);
    ScreenWorkout.state = active;
    await ScreenWorkout._save();

    ScreenWorkout._paint(host, workout);
  },

  /* Ein neues Training vorbereiten: Übungen einsammeln (inkl. Bauch am Ende),
     Felder mit den Werten vom letzten Mal vorausfüllen. */
  async _create(workout) {
    const list = Logic.workoutExercises(App.plan, workout.id);
    const exercises = list.map((ex) => {
      const last = Logic.lastEntryFor(App.sessions, ex.id);
      return {
        exerciseId: ex.id,
        name: ex.name,
        group: ex.group,
        color: ex.color,
        planSets: ex.sets,
        repMin: ex.repMin,
        repMax: ex.repMax,
        step: ex.step,
        lastText: last ? Logic.summarizeSets(last.entry.sets) : '',
        prog: Logic.progression(ex, last),
        sets: Logic.prefillSets(ex, last),
        bestKg: null,
      };
    });

    return {
      workoutId: workout.id,
      workoutName: workout.name,
      color: workout.color,
      date: Util.isoDate(),
      startedAt: Date.now(),
      exercises: exercises,
    };
  },

  _save() {
    return DB.setKV('activeWorkout', ScreenWorkout.state);
  },

  /* ---------- Zeichnen ---------- */

  _paint(host, workout) {
    const st = ScreenWorkout.state;
    let lastGroup = null;
    const cards = st.exercises.map((ex, i) => {
      const group = ex.group || null;
      let head = '';
      if (group !== lastGroup) {
        lastGroup = group;
        if (group) head = `<div class="group-head">${Util.esc(group)}</div>`;
      }
      return head + ScreenWorkout._card(ex, i);
    }).join('');

    host.innerHTML = `
      <div id="w-root">
      <div class="workout-head c-${Util.esc(workout.color)}">
        <button class="iconbtn ghost" data-go="#/start" aria-label="Zurück">${Icons.get('back', 22)}</button>
        <div style="flex:1;min-width:0">
          <h1>${Util.esc(workout.name)}</h1>
          <div class="sub small muted">
            <span class="clock" id="w-clock">0:00</span> · <span id="w-progress"></span>
          </div>
        </div>
        <button class="btn small ok" id="w-finish-top">Beenden</button>
      </div>

      ${cards}

      <button class="btn ok block mt">Training beenden</button>
      <button class="btn quiet block small mt-s" id="w-discard">Training verwerfen</button>
      </div>
    `;

    ScreenWorkout._bind(host.querySelector('#w-root'));
    ScreenWorkout._updateProgress();

    // Uhr für die Trainingsdauer
    const clockEl = host.querySelector('#w-clock');
    const tick = () => { clockEl.textContent = Util.fmtDuration(Timer.clock.elapsed(st.startedAt)); };
    tick();
    ScreenWorkout.stopClock = Timer.clock.onTick(tick);
  },

  _card(ex, i) {
    const doneCount = ex.sets.filter((s) => s.done).length;
    const allDone = doneCount === ex.sets.length && doneCount > 0;
    const range = ex.repMin === ex.repMax ? `${ex.repMin}` : `${ex.repMin}–${ex.repMax}`;

    return `
    <div class="ex-card c-${Util.esc(ex.color || 'gray')} ${allDone ? 'done' : ''}" data-ex="${i}">
      <div class="ex-title">
        <h3>${Util.esc(ex.name)}</h3>
        <span class="ex-count" data-count>${doneCount}/${ex.sets.length}</span>
      </div>
      <div class="ex-meta">${ex.planSets} Sätze · ${range} Wdh.</div>
      ${ex.lastText ? `<div class="ex-last">Letztes Mal: ${Util.esc(ex.lastText)}</div>`
                    : `<div class="ex-last">Erstes Mal – trag ein, was du schaffst.</div>`}

      ${ex.prog && ex.prog.due ? `
        <div class="chip-up">
          ${Icons.get('arrowUp', 18)}
          <span>Steigerung: ${Util.esc(Util.fmtKg(ex.prog.kg))}</span>
          <button class="btn small" data-apply="${i}">Übernehmen</button>
        </div>` : ''}

      <div class="setlist">
        ${ex.sets.map((s, j) => ScreenWorkout._setRow(i, j, s)).join('')}
      </div>
      <button class="btn small outline mt-s" data-addset="${i}">${Icons.get('plus', 17)}Satz</button>
    </div>`;
  },

  _setRow(i, j, s) {
    return `<div class="setrow ${s.done ? 'done' : ''}" data-set="${i}-${j}">
      <span class="sn">${j + 1}</span>
      <div class="unit" data-unit="kg">
        <input type="text" inputmode="decimal" data-kg placeholder="–"
               value="${s.kg === null || s.kg === undefined ? '' : Util.fmtNum(s.kg)}">
      </div>
      <div class="unit" data-unit="Wdh.">
        <input type="text" inputmode="numeric" data-reps placeholder="–"
               value="${s.reps === null || s.reps === undefined ? '' : s.reps}">
      </div>
      <button class="check" data-check aria-label="Satz erledigt">${Icons.get('check', 24)}</button>
    </div>`;
  },

  /* ---------- Bedienung ---------- */

  // Die Listener hängen an #w-root. Das Element wird bei jedem Aufbau neu
  // erzeugt, deshalb kann sich nichts doppelt ansammeln.
  _bind(root) {
    // Satz abhaken / wieder öffnen
    root.addEventListener('click', async (e) => {
      const check = e.target.closest('[data-check]');
      if (check) { await ScreenWorkout._toggleSet(check.closest('.setrow')); return; }

      const apply = e.target.closest('[data-apply]');
      if (apply) { ScreenWorkout._applySuggestion(Number(apply.dataset.apply)); return; }

      const add = e.target.closest('[data-addset]');
      if (add) { await ScreenWorkout._addSet(Number(add.dataset.addset)); return; }
    });

    // Eingaben merken (auch ohne ✓), damit nichts verloren geht
    root.addEventListener('change', (e) => {
      const input = e.target.closest('[data-kg], [data-reps]');
      if (input) ScreenWorkout._readRow(input.closest('.setrow'));
    });

    Util.$$('.btn.ok', root).forEach((b) => b.addEventListener('click', ScreenWorkout._finish));
    root.querySelector('#w-discard').addEventListener('click', ScreenWorkout._discard);
  },

  _rowIndex(row) {
    const [i, j] = row.dataset.set.split('-').map(Number);
    return { i, j, ex: ScreenWorkout.state.exercises[i], set: ScreenWorkout.state.exercises[i].sets[j] };
  },

  // Werte aus den Feldern in den Zwischenstand übernehmen
  _readRow(row) {
    const { set } = ScreenWorkout._rowIndex(row);
    set.kg = Util.parseNum(row.querySelector('[data-kg]').value);
    set.reps = Util.parseNum(row.querySelector('[data-reps]').value);
    if (set.reps !== null) set.reps = Math.round(set.reps);
    ScreenWorkout._save();
  },

  async _toggleSet(row) {
    const { i, ex, set } = ScreenWorkout._rowIndex(row);
    ScreenWorkout._readRow(row);

    set.done = !set.done;
    row.classList.toggle('done', set.done);
    row.querySelectorAll('input').forEach((el) => el.blur());

    if (set.done) {
      // Rekord? Gefeiert wird nur, wenn ein bestehender Rekord geschlagen wird.
      // Beim allerersten Mal gibt es nichts zu schlagen – das wird still
      // als Ausgangswert gespeichert.
      const record = App.recordFor(ex.exerciseId);
      const hadRecord = record && record.kg !== null && record.kg !== undefined;
      const bestBefore = Math.max(hadRecord ? record.kg : 0, ex.bestKg || 0);
      if (hadRecord && set.kg !== null && set.kg !== undefined && set.kg > bestBefore) {
        ex.bestKg = set.kg;
        UI.celebrate('Neuer Rekord!', `${ex.name} · ${Util.fmtKg(set.kg)}`);
      } else {
        if (set.kg !== null && set.kg !== undefined && set.kg > (ex.bestKg || 0)) ex.bestKg = set.kg;
        UI.vibrate(25);
      }
      Timer.rest.start();
    }

    ScreenWorkout._refreshCard(i);
    ScreenWorkout._updateProgress();
    await ScreenWorkout._save();
  },

  _applySuggestion(i) {
    const ex = ScreenWorkout.state.exercises[i];
    if (!ex.prog || !ex.prog.due) return;
    ex.sets.forEach((s) => { if (!s.done) s.kg = ex.prog.kg; });
    const card = document.querySelector(`.ex-card[data-ex="${i}"]`);
    card.querySelectorAll('.setrow').forEach((row, j) => {
      if (!ex.sets[j].done) row.querySelector('[data-kg]').value = Util.fmtNum(ex.prog.kg);
    });
    UI.toast(`${Util.fmtKg(ex.prog.kg)} eingetragen`);
    ScreenWorkout._save();
  },

  async _addSet(i) {
    const ex = ScreenWorkout.state.exercises[i];
    const prev = ex.sets[ex.sets.length - 1] || { kg: null, reps: ex.repMin };
    ex.sets.push({ kg: prev.kg, reps: prev.reps, done: false });
    ScreenWorkout._refreshCard(i);
    ScreenWorkout._updateProgress();
    await ScreenWorkout._save();
  },

  // Nur eine Karte neu zeichnen (damit Scrollposition und Tastatur ruhig bleiben)
  _refreshCard(i) {
    const ex = ScreenWorkout.state.exercises[i];
    const card = document.querySelector(`.ex-card[data-ex="${i}"]`);
    if (!card) return;
    const doneCount = ex.sets.filter((s) => s.done).length;
    card.querySelector('[data-count]').textContent = `${doneCount}/${ex.sets.length}`;
    card.classList.toggle('done', doneCount === ex.sets.length && doneCount > 0);

    const list = card.querySelector('.setlist');
    if (list.children.length !== ex.sets.length) {
      list.innerHTML = ex.sets.map((s, j) => ScreenWorkout._setRow(i, j, s)).join('');
    }
  },

  _updateProgress() {
    const st = ScreenWorkout.state;
    let done = 0, total = 0;
    st.exercises.forEach((ex) => ex.sets.forEach((s) => { total++; if (s.done) done++; }));
    const el = document.getElementById('w-progress');
    if (el) el.textContent = `${done} von ${total} Sätzen`;
  },

  /* ---------- Beenden ---------- */

  async _finish() {
    const st = ScreenWorkout.state;
    const durationSec = Math.round((Date.now() - st.startedAt) / 1000);

    const exercises = st.exercises
      .map((ex) => ({
        exerciseId: ex.exerciseId,
        name: ex.name,
        sets: ex.sets.filter((s) => s.done).map((s) => ({ kg: s.kg, reps: s.reps, done: true })),
      }))
      .filter((ex) => ex.sets.length > 0);

    const setCount = exercises.reduce((n, ex) => n + ex.sets.length, 0);

    if (setCount === 0) {
      const d = await UI.confirm({
        title: 'Nichts eingetragen',
        text: 'Es ist kein Satz abgehakt. Training verwerfen?',
        okLabel: 'Verwerfen', danger: true,
      });
      if (d) await ScreenWorkout._reallyDiscard();
      return;
    }

    const ok = await UI.confirm({
      title: 'Training beenden?',
      text: `${Util.fmtDurationLong(durationSec)} · ${setCount} Sätze · ${exercises.length} Übungen`,
      okLabel: 'Beenden & speichern',
    });
    if (!ok) return;

    const session = {
      id: new Date(st.startedAt).toISOString() + '_' + st.workoutId,
      workoutId: st.workoutId,
      workoutName: st.workoutName,
      color: st.color,
      date: st.date,
      startedAt: new Date(st.startedAt).toISOString(),
      endedAt: new Date().toISOString(),
      durationSec: durationSec,
      exercises: exercises,
    };

    await DB.saveSession(session);
    const newRecords = await ScreenWorkout._updateRecords(session);
    await DB.setKV('activeWorkout', null);

    if (ScreenWorkout.stopClock) ScreenWorkout.stopClock();
    Timer.rest.stop();
    ScreenWorkout.state = null;

    await App.reload();
    App.go('#/start');
    UI.toast(newRecords.length
      ? `Gespeichert · ${newRecords.length} neue${newRecords.length === 1 ? 'r' : ''} Rekord${newRecords.length === 1 ? '' : 'e'}`
      : `Training gespeichert · ${Util.fmtDurationLong(durationSec)}`, 3000);
  },

  /* Rekorde nachführen. Zurückgegeben werden nur die ECHT geschlagenen –
     ein erster Eintrag ist nur der Ausgangswert und keine Meldung wert. */
  async _updateRecords(session) {
    const beaten = [];
    for (const ex of session.exercises) {
      const best = Logic.bestSet(ex.sets);
      if (!best) continue;
      const current = await DB.getRecord(ex.exerciseId);
      if (Logic.isNewRecord(current, best.kg)) {
        const hadOne = current && current.kg !== null && current.kg !== undefined;
        await DB.saveRecord({
          exerciseId: ex.exerciseId, name: ex.name,
          kg: best.kg, reps: best.reps, date: session.date,
        });
        if (hadOne) beaten.push(ex.name);
      }
    }
    return beaten;
  },

  async _discard() {
    const ok = await UI.confirm({
      title: 'Training verwerfen?',
      text: 'Die Eingaben dieses Trainings werden gelöscht.',
      okLabel: 'Verwerfen', danger: true,
    });
    if (ok) await ScreenWorkout._reallyDiscard();
  },

  async _reallyDiscard() {
    await DB.setKV('activeWorkout', null);
    if (ScreenWorkout.stopClock) ScreenWorkout.stopClock();
    Timer.rest.stop();
    ScreenWorkout.state = null;
    App.go('#/start');
    UI.toast('Training verworfen');
  },
};
