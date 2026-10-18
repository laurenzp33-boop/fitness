/* screen-progress.js — Fortschritt:
   Kurven pro Übung, Rekorde, Körpergewicht, Verlauf. */
'use strict';

const ScreenProgress = {

  tab: 'kurven',
  selectedExercise: null,

  async render(host, args) {
    if (args && args[0]) ScreenProgress.tab = args[0];
    const tab = ScreenProgress.tab;

    host.innerHTML = `
      ${UI.appbar('Fortschritt')}
      <div class="tabs">
        <button data-tab="kurven">Kurven</button>
        <button data-tab="rekorde">Rekorde</button>
        <button data-tab="gewicht">Gewicht</button>
        <button data-tab="verlauf">Verlauf</button>
      </div>
      <div id="p-body"></div>`;

    Util.$$('.tabs button', host).forEach((b) => {
      b.classList.toggle('active', b.dataset.tab === tab);
      b.addEventListener('click', () => { ScreenProgress.tab = b.dataset.tab; App.go('#/fortschritt/' + b.dataset.tab); });
    });

    const body = host.querySelector('#p-body');
    if (tab === 'rekorde') return ScreenProgress._records(body);
    if (tab === 'gewicht') return ScreenProgress._weight(body);
    if (tab === 'verlauf') return ScreenProgress._history(body);
    return ScreenProgress._curves(body);
  },

  /* ---------- Kurven pro Übung ---------- */

  _curves(body) {
    const known = Logic.knownExercises(App.plan, App.sessions)
      .filter((k) => Logic.seriesForExercise(App.sessions, k.id).length > 0)
      .sort((a, b) => a.name.localeCompare(b.name, 'de'));

    if (!known.length) {
      body.innerHTML = UI.empty('chart', 'Noch keine Trainingsdaten. Nach dem ersten Training erscheint hier die Kurve.');
      return;
    }

    if (!ScreenProgress.selectedExercise || !known.some((k) => k.id === ScreenProgress.selectedExercise)) {
      ScreenProgress.selectedExercise = known[0].id;
    }

    body.innerHTML = `
      <label class="field">
        <span>Übung</span>
        <select id="p-ex">
          ${known.map((k) => `<option value="${Util.esc(k.id)}"${k.id === ScreenProgress.selectedExercise ? ' selected' : ''}>
            ${Util.esc(k.name)}${k.inPlan ? '' : ' (gelöscht)'}</option>`).join('')}
        </select>
      </label>
      <div id="p-chart" class="chartbox"></div>
      <div id="p-stats" class="kpis mt"></div>
      <div class="section-title">Alle Einträge</div>
      <div class="list" id="p-rows"></div>`;

    const draw = () => {
      const id = ScreenProgress.selectedExercise;
      const info = known.find((k) => k.id === id);
      const pts = Logic.seriesForExercise(App.sessions, id);
      Chart.line(body.querySelector('#p-chart'), pts, { color: info.color, unit: 'kg' });

      const first = pts[0], last = pts[pts.length - 1];
      const diff = (last.kg || 0) - (first.kg || 0);
      body.querySelector('#p-stats').innerHTML = `
        <div class="kpi"><div class="v">${Util.fmtNum(last.kg)}</div><div class="l">aktuell (kg)</div></div>
        <div class="kpi"><div class="v">${diff > 0 ? '+' : ''}${Util.fmtNum(diff)}</div><div class="l">seit Start</div></div>
        <div class="kpi"><div class="v">${pts.length}</div><div class="l">Trainings</div></div>`;

      body.querySelector('#p-rows').innerHTML = App.sessions
        .filter((s) => (s.exercises || []).some((e) => e.exerciseId === id))
        .map((s) => {
          const e = s.exercises.find((x) => x.exerciseId === id);
          return `<div class="list-item">
            <span class="dot c-${Util.esc(s.color || 'slate')}"></span>
            <div class="main"><div class="t">${Util.esc(Logic.summarizeSets(e.sets))}</div>
              <div class="s">${Util.esc(Util.fmtDate(s.date))} · ${Util.esc(s.workoutName)}</div></div>
          </div>`;
        }).join('');
    };

    body.querySelector('#p-ex').addEventListener('change', (e) => {
      ScreenProgress.selectedExercise = e.target.value;
      draw();
    });
    draw();
  },

  /* ---------- Rekorde ---------- */

  _records(body) {
    const recs = App.records
      .filter((r) => r.kg !== null && r.kg !== undefined)
      .sort((a, b) => a.name.localeCompare(b.name, 'de'));

    if (!recs.length) { body.innerHTML = UI.empty('trophy', 'Noch keine Rekorde.'); return; }

    const inPlan = new Set();
    App.plan.workouts.forEach((w) => w.exercises.forEach((e) => inPlan.add(e.id)));

    body.innerHTML = `<div class="list">${recs.map((r) => `
      <div class="list-item">
        <span class="medal">${Icons.get('trophy', 22)}</span>
        <div class="main">
          <div class="t">${Util.esc(r.name)}${inPlan.has(r.exerciseId) ? '' : ' <span class="small muted">(gelöscht)</span>'}</div>
          <div class="s">${Util.esc(Util.fmtDate(r.date))}${r.reps ? ` · ${r.reps} Wdh.` : ''}</div>
        </div>
        <span class="val">${Util.esc(Util.fmtKg(r.kg))}</span>
      </div>`).join('')}</div>
      <p class="small muted mt">Der Rekord ist das schwerste Gewicht, das du bei dieser Übung in einem Satz geschafft hast.</p>`;
  },

  /* ---------- Körpergewicht ---------- */

  async _weight(body) {
    const rows = await DB.allWeights();

    body.innerHTML = `
      <div class="card">
        <div class="row">
          <input type="text" id="bw-kg" inputmode="decimal" placeholder="z. B. 78,4" style="flex:1">
          <button class="btn primary" id="bw-add">Eintragen</button>
        </div>
        <div class="small muted mt-s" id="bw-date">Für heute, ${Util.fmtDate(Util.isoDate())}</div>
      </div>
      <div id="bw-chart" class="chartbox"></div>
      <div id="bw-kpis" class="kpis mt"></div>
      <div class="list mt" id="bw-list"></div>`;

    const draw = async () => {
      const list = await DB.allWeights();
      Chart.line(body.querySelector('#bw-chart'), list.map((r) => ({ date: r.date, kg: r.kg })),
        { color: 'teal', unit: 'kg', empty: 'Noch kein Körpergewicht eingetragen.' });

      const kpis = body.querySelector('#bw-kpis');
      if (list.length) {
        const last = list[list.length - 1], first = list[0];
        const diff = last.kg - first.kg;
        kpis.innerHTML = `
          <div class="kpi"><div class="v">${Util.fmtNum(last.kg)}</div><div class="l">aktuell (kg)</div></div>
          <div class="kpi"><div class="v">${diff > 0 ? '+' : ''}${Util.fmtNum(Math.round(diff * 10) / 10)}</div><div class="l">seit Start</div></div>
          <div class="kpi"><div class="v">${list.length}</div><div class="l">Einträge</div></div>`;
      } else kpis.innerHTML = '';

      body.querySelector('#bw-list').innerHTML = list.slice().reverse().slice(0, 30).map((r) => `
        <div class="list-item">
          <div class="main"><div class="t">${Util.esc(Util.fmtKg(r.kg))}</div>
            <div class="s">${Util.esc(Util.fmtDate(r.date))}</div></div>
          <button class="iconbtn" data-del-weight="${Util.esc(r.date)}" aria-label="Löschen">${Icons.get('trash', 19)}</button>
        </div>`).join('');

      Util.$$('[data-del-weight]', body).forEach((b) => b.addEventListener('click', async () => {
        const ok = await UI.confirm({ title: 'Eintrag löschen?', okLabel: 'Löschen', danger: true });
        if (!ok) return;
        await DB.deleteWeight(b.dataset.delWeight);
        draw();
      }));
    };

    const add = async () => {
      const input = body.querySelector('#bw-kg');
      const kg = Util.parseNum(input.value);
      if (kg === null || kg <= 0) { UI.toast('Bitte eine Zahl eintragen'); return; }
      await DB.saveWeight(Util.isoDate(), kg);
      input.value = '';
      input.blur();
      UI.toast('Gespeichert');
      draw();
    };

    body.querySelector('#bw-add').addEventListener('click', add);
    body.querySelector('#bw-kg').addEventListener('keydown', (e) => { if (e.key === 'Enter') add(); });

    const today = rows.find((r) => r.date === Util.isoDate());
    if (today) body.querySelector('#bw-date').textContent =
      `Heute schon eingetragen: ${Util.fmtKg(today.kg)} – neuer Wert überschreibt ihn.`;

    draw();
  },

  /* ---------- Verlauf ---------- */

  _history(body) {
    if (!App.sessions.length) { body.innerHTML = UI.empty('list', 'Noch keine Trainings.'); return; }
    body.innerHTML = `<div class="list">${App.sessions.map((s, i) => {
      const vol = Logic.sessionVolume(s);
      return `<div class="list-item" data-session="${i}" style="cursor:pointer">
        <span class="dot c-${Util.esc(s.color || 'slate')}"></span>
        <div class="main"><div class="t">${Util.esc(s.workoutName)}</div>
          <div class="s">${Util.esc(Util.fmtDate(s.date))} · ${vol.sets} Sätze · ${Util.esc(Util.fmtDurationLong(s.durationSec))}</div></div>
        ${Icons.get('forward', 18)}
      </div>`;
    }).join('')}</div>`;

    Util.$$('[data-session]', body).forEach((el) => el.addEventListener('click', () => {
      ScreenProgress._sessionDetail(App.sessions[Number(el.dataset.session)]);
    }));
  },

  async _sessionDetail(s) {
    const r = await UI.modal({
      title: `${s.workoutName} · ${Util.fmtDate(s.date)}`,
      body: `<p class="small muted">${Util.fmtDurationLong(s.durationSec)} · ${Logic.sessionVolume(s).sets} Sätze</p>` +
        (s.exercises || []).map((e) => `<div class="card tight">
          <b>${Util.esc(e.name)}</b>
          <div class="small muted">${Util.esc(Logic.summarizeSets(e.sets))}</div></div>`).join(''),
      actions: [
        { label: 'Training löschen', value: 'del', cls: 'danger' },
        { label: 'Schließen', value: null },
      ],
    });
    if (r !== 'del') return;
    const ok = await UI.confirm({
      title: 'Training löschen?',
      text: 'Dieser Eintrag wird dauerhaft entfernt. Rekorde bleiben bestehen.',
      okLabel: 'Löschen', danger: true,
    });
    if (!ok) return;
    await DB.deleteSession(s.id);
    await App.reload();
    App.route();
    UI.toast('Training gelöscht');
  },
};
