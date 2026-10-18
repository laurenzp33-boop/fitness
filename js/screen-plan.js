/* screen-plan.js — Plan bearbeiten:
   Trainings und Übungen anlegen, ändern, verschieben, löschen.
   Wichtig: Alte Trainingsdaten bleiben IMMER erhalten – auch wenn du
   eine Übung oder ein ganzes Training aus dem Plan nimmst. */
'use strict';

const ScreenPlan = {

  async render(host, args) {
    if (args && args[0]) return ScreenPlan._workout(host, args[0]);
    return ScreenPlan._overview(host);
  },

  async _savePlan() {
    await DB.savePlan(App.plan);
    await App.reload();
  },

  /* ---------- Übersicht ---------- */

  _overview(host) {
    const ws = App.plan.workouts;
    host.innerHTML = `
      ${UI.appbar('Plan', { sub: 'Trainings und Übungen bearbeiten' })}
      <div class="list">
        ${ws.map((w, i) => `
          <div class="list-item" data-open="${Util.esc(w.id)}" style="cursor:pointer">
            <span class="dot c-${Util.esc(w.color || 'gray')}"></span>
            <div class="main">
              <div class="t">${Util.esc(w.name)}</div>
              <div class="s">${w.exercises.length} Übung${w.exercises.length === 1 ? '' : 'en'}${
                w.finisher ? ' · hängt überall an' : ''}</div>
            </div>
            <button class="iconbtn" data-up="${i}" aria-label="Nach oben">${Icons.get('up', 19)}</button>
            <button class="iconbtn" data-down="${i}" aria-label="Nach unten">${Icons.get('down', 19)}</button>
            ${Icons.get('forward', 18)}
          </div>`).join('')}
      </div>
      <button class="btn outline block mt" id="add-workout">${Icons.get('plus', 19)}Training hinzufügen</button>
      <p class="small muted mt">Ein Training mit „hängt überall an" (bei dir: Bauch) erscheint automatisch
      am Ende jedes anderen Trainings und bekommt keine eigene Kachel.</p>`;

    Util.$$('[data-open]', host).forEach((el) => el.addEventListener('click', (e) => {
      if (e.target.closest('[data-up],[data-down]')) return;
      App.go('#/plan/' + el.dataset.open);
    }));
    Util.$$('[data-up]', host).forEach((b) => b.addEventListener('click', () => ScreenPlan._moveWorkout(Number(b.dataset.up), -1)));
    Util.$$('[data-down]', host).forEach((b) => b.addEventListener('click', () => ScreenPlan._moveWorkout(Number(b.dataset.down), 1)));
    host.querySelector('#add-workout').addEventListener('click', ScreenPlan._addWorkout);
  },

  async _moveWorkout(i, dir) {
    const ws = App.plan.workouts;
    const j = i + dir;
    if (j < 0 || j >= ws.length) return;
    [ws[i], ws[j]] = [ws[j], ws[i]];
    await ScreenPlan._savePlan();
    App.route();
  },

  async _addWorkout() {
    const data = await UI.form({
      title: 'Neues Training',
      fields: [
        { key: 'name', label: 'Name', value: '', placeholder: 'z. B. Ganzkörper' },
        { key: 'color', label: 'Farbe', type: 'select', value: 'green',
          options: COLORS.map((c) => ({ value: c.key, label: c.label })) },
      ],
    });
    if (!data || !data.name.trim()) return;
    App.plan.workouts.push({
      id: Util.uid('w'), name: data.name.trim(), color: data.color,
      finisher: false, exercises: [],
    });
    await ScreenPlan._savePlan();
    App.route();
    UI.toast('Training angelegt');
  },

  /* ---------- Ein Training ---------- */

  _workout(host, workoutId) {
    const w = Logic.findWorkout(App.plan, workoutId);
    if (!w) { host.innerHTML = UI.empty('warn', 'Dieses Training gibt es nicht mehr.'); return; }

    let lastGroup = null;
    const rows = w.exercises.map((ex, i) => {
      const group = ex.group || null;
      let head = '';
      if (group !== lastGroup) { lastGroup = group; if (group) head = `<div class="group-head">${Util.esc(group)}</div>`; }
      const range = ex.repMin === ex.repMax ? `${ex.repMin}` : `${ex.repMin}–${ex.repMax}`;
      return head + `
        <div class="list-item">
          <div class="main" data-edit="${i}" style="cursor:pointer">
            <div class="t">${Util.esc(ex.name)}</div>
            <div class="s">${ex.sets} Sätze · ${range} Wdh. · +${Util.fmtNum(ex.step)} kg
              ${ex.startKg !== null && ex.startKg !== undefined ? ` · Start ${Util.fmtKg(ex.startKg)}` : ''}</div>
          </div>
          <button class="iconbtn" data-up="${i}" aria-label="Nach oben">${Icons.get('up', 19)}</button>
          <button class="iconbtn" data-down="${i}" aria-label="Nach unten">${Icons.get('down', 19)}</button>
        </div>`;
    }).join('');

    host.innerHTML = `
      ${UI.appbar(w.name, { back: '#/plan', sub: `${w.exercises.length} Übungen` })}
      ${rows || UI.empty('dumbbell', 'Noch keine Übungen.')}
      <button class="btn outline block mt" id="add-ex">${Icons.get('plus', 19)}Übung hinzufügen</button>
      <hr class="sep">
      <button class="btn outline block mt-s" id="edit-workout">Training umbenennen / Farbe</button>
      <button class="btn quiet block mt-s" id="del-workout" style="color:var(--danger)">
        Training löschen
      </button>
      <p class="small muted mt">Beim Löschen bleiben alle bereits absolvierten Trainings
      im Fortschritt und im Kalender erhalten.</p>`;

    Util.$$('[data-edit]', host).forEach((el) => el.addEventListener('click', () => ScreenPlan._editExercise(w, Number(el.dataset.edit))));
    Util.$$('[data-up]', host).forEach((b) => b.addEventListener('click', () => ScreenPlan._moveExercise(w, Number(b.dataset.up), -1)));
    Util.$$('[data-down]', host).forEach((b) => b.addEventListener('click', () => ScreenPlan._moveExercise(w, Number(b.dataset.down), 1)));
    host.querySelector('#add-ex').addEventListener('click', () => ScreenPlan._editExercise(w, -1));
    host.querySelector('#edit-workout').addEventListener('click', () => ScreenPlan._editWorkout(w));
    host.querySelector('#del-workout').addEventListener('click', () => ScreenPlan._deleteWorkout(w));
  },

  async _moveExercise(w, i, dir) {
    const j = i + dir;
    if (j < 0 || j >= w.exercises.length) return;
    [w.exercises[i], w.exercises[j]] = [w.exercises[j], w.exercises[i]];
    await ScreenPlan._savePlan();
    App.route();
  },

  /* index -1 = neue Übung */
  async _editExercise(w, index) {
    const isNew = index < 0;
    const ex = isNew
      ? { name: '', sets: 2, repMin: 8, repMax: 10, startKg: null, step: 2.5, group: null }
      : w.exercises[index];

    const groups = Array.from(new Set(w.exercises.map((e) => e.group).filter(Boolean)));

    const data = await UI.modal({
      title: isNew ? 'Neue Übung' : 'Übung bearbeiten',
      body: `
        <label class="field"><span>Name</span>
          <input data-k="name" type="text" value="${Util.esc(ex.name)}" placeholder="z. B. Latzug"></label>
        <div class="row">
          <label class="field" style="flex:1"><span>Sätze</span>
            <input data-k="sets" type="text" inputmode="numeric" value="${ex.sets}"></label>
          <label class="field" style="flex:1"><span>Wdh. von</span>
            <input data-k="repMin" type="text" inputmode="numeric" value="${ex.repMin}"></label>
          <label class="field" style="flex:1"><span>bis</span>
            <input data-k="repMax" type="text" inputmode="numeric" value="${ex.repMax}"></label>
        </div>
        <div class="row">
          <label class="field" style="flex:1"><span>Startgewicht (kg)</span>
            <input data-k="startKg" type="text" inputmode="decimal"
              value="${ex.startKg === null || ex.startKg === undefined ? '' : Util.fmtNum(ex.startKg)}" placeholder="leer = ohne"></label>
          <label class="field" style="flex:1"><span>Steigerung (kg)</span>
            <input data-k="step" type="text" inputmode="decimal" value="${Util.fmtNum(ex.step)}"></label>
        </div>
        <label class="field"><span>Zwischenüberschrift (optional)</span>
          <input data-k="group" type="text" value="${Util.esc(ex.group || '')}"
            placeholder="z. B. Schultern" list="grouplist">
          <datalist id="grouplist">${groups.map((g) => `<option value="${Util.esc(g)}">`).join('')}</datalist>
        </label>`,
      actions: isNew
        ? [{ label: 'Abbrechen', value: null }, { label: 'Hinzufügen', value: 'ok', cls: 'primary' }]
        : [{ label: 'Löschen', value: 'del', cls: 'danger' },
           { label: 'Abbrechen', value: null },
           { label: 'Speichern', value: 'ok', cls: 'primary' }],
      dismissValue: null,
      read: (hostEl, value) => {
        if (value !== 'ok') return value;
        const out = {};
        Util.$$('[data-k]', hostEl).forEach((el) => { out[el.dataset.k] = el.value; });
        return out;
      },
    });

    if (data === null) return;

    if (data === 'del') {
      const ok = await UI.confirm({
        title: `„${ex.name}" löschen?`,
        text: 'Die Übung verschwindet aus dem Plan. Deine bisherigen Werte bleiben im Fortschritt erhalten.',
        okLabel: 'Löschen', danger: true,
      });
      if (!ok) return;
      w.exercises.splice(index, 1);
      await ScreenPlan._savePlan();
      App.route();
      UI.toast('Übung gelöscht');
      return;
    }

    const name = (data.name || '').trim();
    if (!name) { UI.toast('Bitte einen Namen eingeben'); return; }

    const sets = Math.max(1, Math.round(Util.parseNum(data.sets) || 1));
    let repMin = Math.max(1, Math.round(Util.parseNum(data.repMin) || 1));
    let repMax = Math.max(1, Math.round(Util.parseNum(data.repMax) || repMin));
    if (repMax < repMin) [repMin, repMax] = [repMax, repMin];

    const patch = {
      name: name,
      sets: sets,
      repMin: repMin,
      repMax: repMax,
      startKg: Util.parseNum(data.startKg),
      step: Util.parseNum(data.step) || 2.5,
      group: (data.group || '').trim() || null,
    };

    if (isNew) {
      w.exercises.push(Object.assign({ id: Util.uid('ex') }, patch));
      ScreenPlan._placeInGroup(w, w.exercises.length - 1);
    } else {
      Object.assign(w.exercises[index], patch);
      ScreenPlan._placeInGroup(w, index);
    }

    await ScreenPlan._savePlan();
    App.route();
    UI.toast(isNew ? 'Übung hinzugefügt' : 'Gespeichert');
  },

  /* Eine Übung mit Zwischenüberschrift soll bei ihrer Gruppe stehen und nicht
     am Ende der Liste. Steht sie schon neben einer Übung derselben Gruppe,
     bleibt sie, wo sie ist. */
  _placeInGroup(w, index) {
    const ex = w.exercises[index];
    if (!ex || !ex.group) return index;
    const prev = w.exercises[index - 1];
    const next = w.exercises[index + 1];
    if ((prev && prev.group === ex.group) || (next && next.group === ex.group)) return index;

    let last = -1;
    w.exercises.forEach((e, i) => { if (i !== index && e.group === ex.group) last = i; });
    if (last < 0) return index;

    w.exercises.splice(index, 1);
    const target = last < index ? last + 1 : last;
    w.exercises.splice(target, 0, ex);
    return target;
  },

  async _editWorkout(w) {
    const data = await UI.modal({
      title: 'Training bearbeiten',
      body: `
        <label class="field"><span>Name</span>
          <input data-k="name" type="text" value="${Util.esc(w.name)}"></label>
        <label class="field"><span>Farbe</span>
          <select data-k="color">${COLORS.map((c) =>
            `<option value="${c.key}"${c.key === w.color ? ' selected' : ''}>${c.label}</option>`).join('')}</select></label>
        <label class="switch">
          <input type="checkbox" data-k="finisher" ${w.finisher ? 'checked' : ''}>
          <span>Hängt automatisch an jedes andere Training an
            <div class="small muted">Dann keine eigene Kachel auf der Startseite.</div></span>
        </label>`,
      actions: [{ label: 'Abbrechen', value: null }, { label: 'Speichern', value: 'ok', cls: 'primary' }],
      dismissValue: null,
      read: (hostEl, value) => {
        if (value !== 'ok') return null;
        const out = {};
        Util.$$('[data-k]', hostEl).forEach((el) => { out[el.dataset.k] = el.type === 'checkbox' ? el.checked : el.value; });
        return out;
      },
    });
    if (!data) return;
    if (!String(data.name).trim()) { UI.toast('Bitte einen Namen eingeben'); return; }
    w.name = String(data.name).trim();
    w.color = data.color;
    w.finisher = !!data.finisher;
    await ScreenPlan._savePlan();
    App.route();
    UI.toast('Gespeichert');
  },

  async _deleteWorkout(w) {
    const ok = await UI.confirm({
      title: `„${w.name}" löschen?`,
      text: 'Das Training verschwindet aus dem Plan. Bereits absolvierte Trainings bleiben erhalten.',
      okLabel: 'Löschen', danger: true,
    });
    if (!ok) return;
    App.plan.workouts = App.plan.workouts.filter((x) => x.id !== w.id);
    await ScreenPlan._savePlan();
    App.go('#/plan');
    UI.toast('Training gelöscht');
  },
};
