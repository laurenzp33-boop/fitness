/* screen-settings.js — Einstellungen, Backup (Export/Import), Speicher. */
'use strict';

const ScreenSettings = {

  async render(host) {
    const s = App.settings;
    const lastBackup = await DB.getKV('lastBackup', null);
    const storage = await DB.storageStatus();

    host.innerHTML = `
      ${UI.appbar('Einstellungen')}

      <div class="section-title" style="margin-top:0">Pausen-Timer</div>
      <div class="card">
        <label class="switch">
          <input type="checkbox" id="rest-on" ${s.restEnabled ? 'checked' : ''}>
          <span>Pausen-Timer verwenden</span>
        </label>
        <div id="rest-opts" class="${s.restEnabled ? '' : 'hidden'}">
          <hr class="sep" style="margin:12px 0">
          <div class="small muted mb">Dauer: <b id="rest-label" style="color:var(--text)">${Util.fmtDuration(s.restSeconds)} min</b></div>
          <div class="row wrap">
            ${[60, 90, 120, 150, 180, 240].map((v) => `
              <button class="btn small ${v === s.restSeconds ? 'primary' : 'outline'}" data-rest="${v}">
                ${Util.fmtDuration(v)}</button>`).join('')}
          </div>
          <label class="field mt"><span>Eigene Dauer (Sekunden)</span>
            <input type="text" inputmode="numeric" id="rest-custom" value="${s.restSeconds}"></label>
          <label class="switch">
            <input type="checkbox" id="sound-on" ${s.soundEnabled ? 'checked' : ''}>
            <span>Piepton am Ende der Pause</span>
          </label>
        </div>
      </div>

      <div class="section-title">Backup</div>
      <div class="card">
        <p class="small muted">Deine Daten liegen nur auf diesem iPhone. Wenn du das Handy verlierst
        oder Safari-Daten löschst, sind sie weg. Mach deshalb regelmäßig ein Backup.</p>
        <div class="small muted mb">Letztes Backup:
          <b style="color:var(--text)">${lastBackup ? Util.esc(Util.relDate(Util.isoDate(lastBackup))) : 'noch nie'}</b></div>
        <button class="btn primary block" id="do-export">${Icons.get('save', 20)}Backup exportieren</button>
        <button class="btn outline block mt-s" id="do-import">${Icons.get('open', 20)}Backup einlesen</button>
        <input type="file" id="file-input" accept="application/json,.json" class="hidden">
        <label class="field mt"><span>Erinnerung nach wie vielen Tagen?</span>
          <input type="text" inputmode="numeric" id="backup-days" value="${s.backupEveryDays}"></label>
      </div>

      <div class="section-title">Speicher</div>
      <div class="card">
        <div class="row"><span style="color:${storage.persisted ? 'var(--teal)' : 'var(--warn)'}">${storage.persisted ? Icons.get('shield', 22) : Icons.get('warn', 22)}</span>
          <div style="flex:1">
            <div>${storage.persisted ? 'Speicher ist dauerhaft' : 'Speicher ist nicht als dauerhaft markiert'}</div>
            <div class="small muted">${storage.persisted
              ? 'Das System räumt die Daten nicht von selbst weg.'
              : 'Klappt am besten, wenn die App am Homescreen liegt.'}</div>
          </div>
        </div>
        ${storage.usageMB !== null ? `<div class="small muted mt-s">Belegt: ${Util.fmtNum(Math.round(storage.usageMB * 100) / 100)} MB</div>` : ''}
        ${!storage.persisted ? `<button class="btn outline block mt-s" id="do-persist">Dauerhaften Speicher anfordern</button>` : ''}
      </div>

      <div class="section-title">Daten</div>
      <div class="card">
        <div class="row small muted">
          <div style="flex:1">${App.sessions.length} Trainings · ${App.records.length} Rekorde</div>
        </div>
        <button class="btn quiet block mt-s" id="do-wipe" style="color:var(--danger)">
          Alle Daten löschen
        </button>
      </div>

      <p class="small muted center mt" style="opacity:.6">Fitness · läuft ganz ohne Internet</p>
    `;

    ScreenSettings._bind(host);
  },

  _bind(host) {
    /* --- Pausen-Timer --- */
    host.querySelector('#rest-on').addEventListener('change', async (e) => {
      await DB.saveSettings({ restEnabled: e.target.checked });
      await App.reload();
      host.querySelector('#rest-opts').classList.toggle('hidden', !e.target.checked);
      if (!e.target.checked) Timer.rest.stop();
      UI.toast(e.target.checked ? 'Pausen-Timer an' : 'Pausen-Timer aus');
    });

    Util.$$('[data-rest]', host).forEach((b) => b.addEventListener('click', async () => {
      const v = Number(b.dataset.rest);
      await DB.saveSettings({ restSeconds: v });
      await App.reload();
      App.route();
      UI.toast(`Pause: ${Util.fmtDuration(v)} min`);
    }));

    const custom = host.querySelector('#rest-custom');
    if (custom) custom.addEventListener('change', async () => {
      const v = Math.max(5, Math.min(3600, Math.round(Util.parseNum(custom.value) || 90)));
      await DB.saveSettings({ restSeconds: v });
      await App.reload();
      App.route();
      UI.toast(`Pause: ${Util.fmtDuration(v)} min`);
    });

    const sound = host.querySelector('#sound-on');
    if (sound) sound.addEventListener('change', async (e) => {
      await DB.saveSettings({ soundEnabled: e.target.checked });
      await App.reload();
      if (e.target.checked) UI.beep(1);
    });

    host.querySelector('#backup-days').addEventListener('change', async (e) => {
      const v = Math.max(1, Math.round(Util.parseNum(e.target.value) || 14));
      await DB.saveSettings({ backupEveryDays: v });
      await App.reload();
      UI.toast(`Erinnerung nach ${v} Tagen`);
    });

    /* --- Backup --- */
    host.querySelector('#do-export').addEventListener('click', ScreenSettings.exportBackup);
    host.querySelector('#do-import').addEventListener('click', () => host.querySelector('#file-input').click());
    host.querySelector('#file-input').addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      e.target.value = '';
      if (file) ScreenSettings._importFile(file);
    });

    /* --- Speicher --- */
    const persist = host.querySelector('#do-persist');
    if (persist) persist.addEventListener('click', async () => {
      const ok = await DB.requestPersistent();
      UI.toast(ok ? 'Speicher ist jetzt dauerhaft'
                  : 'Hat nicht geklappt – leg die App auf den Homescreen und versuch es dort.');
      App.route();
    });

    /* --- Alles löschen --- */
    host.querySelector('#do-wipe').addEventListener('click', ScreenSettings._wipe);
  },

  /* ---------- Export ---------- */

  async exportBackup() {
    try {
      const data = await DB.exportAll();
      const text = JSON.stringify(data, null, 2);
      const name = `fitness-backup-${Util.isoDate()}.json`;
      const blob = new Blob([text], { type: 'application/json' });

      // Am iPhone ist "Teilen" am bequemsten (landet in Dateien/iCloud).
      const file = new File([blob], name, { type: 'application/json' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'Fitness Backup' });
          await ScreenSettings._markBackup(data);
          return;
        } catch (err) {
          if (err && err.name === 'AbortError') return;   // Nutzer hat abgebrochen
        }
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      await ScreenSettings._markBackup(data);
    } catch (err) {
      console.error(err);
      UI.alert('Export fehlgeschlagen', err.message);
    }
  },

  async _markBackup(data) {
    await DB.setKV('lastBackup', new Date().toISOString());
    await App.reload();
    App.route();
    UI.toast(`Backup erstellt · ${data.sessions.length} Trainings gesichert`);
  },

  /* ---------- Import ---------- */

  async _importFile(file) {
    let data;
    try {
      data = JSON.parse(await file.text());
    } catch (err) {
      UI.alert('Datei nicht lesbar', 'Das ist keine gültige JSON-Datei.');
      return;
    }
    if (!data || data.app !== 'fitness-app') {
      UI.alert('Falsche Datei', 'Das sieht nicht nach einem Backup dieser App aus.');
      return;
    }

    const info = `${(data.sessions || []).length} Trainings · ${(data.records || []).length} Rekorde · ` +
      `${(data.bodyweight || []).length} Gewichtseinträge` +
      (data.exportedAt ? `\nerstellt am ${Util.fmtDate(Util.isoDate(data.exportedAt))}` : '');

    const mode = await UI.modal({
      title: 'Backup einlesen',
      body: `<p class="small muted">${Util.esc(info)}</p>
        <div class="card tight"><b>Ersetzen</b>
          <div class="small muted">Alles Aktuelle wird gelöscht und durch das Backup ersetzt.</div></div>
        <div class="card tight"><b>Dazumischen</b>
          <div class="small muted">Dein jetziger Plan bleibt. Trainings aus dem Backup kommen dazu.</div></div>`,
      actions: [
        { label: 'Abbrechen', value: null },
        { label: 'Dazumischen', value: 'merge' },
        { label: 'Ersetzen', value: 'replace', cls: 'danger' },
      ],
      dismissValue: null,
    });
    if (!mode) return;

    if (mode === 'replace') {
      const ok = await UI.confirm({
        title: 'Wirklich ersetzen?',
        text: 'Alle jetzigen Daten auf diesem Gerät werden überschrieben.',
        okLabel: 'Ersetzen', danger: true,
      });
      if (!ok) return;
    }

    try {
      await DB.importAll(data, mode);
      await DB.setKV('activeWorkout', null);
      await App.reload();
      App.go('#/start');
      UI.toast(`Backup eingelesen · ${(data.sessions || []).length} Trainings`, 3000);
    } catch (err) {
      console.error(err);
      UI.alert('Import fehlgeschlagen', err.message);
    }
  },

  /* ---------- Alles löschen ---------- */

  async _wipe() {
    const first = await UI.confirm({
      title: 'Alle Daten löschen?',
      text: 'Trainings, Rekorde, Körpergewicht und dein Plan werden auf die Startwerte zurückgesetzt.',
      okLabel: 'Weiter', danger: true,
    });
    if (!first) return;

    const second = await UI.confirm({
      title: 'Sicher? Letzte Warnung',
      text: 'Hast du vorher ein Backup gemacht? Danach ist alles unwiderruflich weg.',
      okLabel: 'Endgültig löschen', cancelLabel: 'Nein, abbrechen', danger: true,
    });
    if (!second) return;

    await DB.wipeEverything();
    await App.reload();
    App.go('#/start');
    UI.toast('Alle Daten gelöscht');
  },
};
