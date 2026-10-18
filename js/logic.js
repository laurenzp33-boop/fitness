/* logic.js — die Rechenregeln der App.
   Hier steht KEINE Bildschirm-Ausgabe, nur reine Logik:
   Welche Übungen gehören zu einem Training? Was war letztes Mal?
   Ist eine Steigerung fällig? Was ist der Rekord? */
'use strict';

const Logic = {

  /* Alle Übungen eines Trainings – inklusive der "immer anhängen"-Trainings
     (bei dir: Bauch) am Ende. */
  workoutExercises(plan, workoutId) {
    if (!plan) return [];
    const w = plan.workouts.find((x) => x.id === workoutId);
    if (!w) return [];

    const out = [];
    const add = (src, exercise) => {
      out.push(Object.assign({}, exercise, {
        fromWorkoutId: src.id,
        fromWorkoutName: src.name,
        color: src.color,
        group: exercise.group || (src.id === w.id ? null : src.name),
      }));
    };

    w.exercises.forEach((e) => add(w, e));
    if (!w.finisher) {
      plan.workouts
        .filter((x) => x.finisher && x.id !== w.id)
        .forEach((f) => f.exercises.forEach((e) => add(f, e)));
    }
    return out;
  },

  /* Die Trainings, die auf der Startseite als Kachel erscheinen
     (alles außer den "immer anhängen"-Trainings). */
  tileWorkouts(plan) {
    return plan ? plan.workouts.filter((w) => !w.finisher) : [];
  },

  findWorkout(plan, id) {
    return plan ? plan.workouts.find((w) => w.id === id) || null : null;
  },

  /* Welches Training ist als Nächstes dran?
     Regel: das, bei dem am längsten nichts mehr passiert ist –
     noch nie trainierte kommen zuerst. Machst du heute Brust, steht
     danach automatisch "Rücken · Arme" als anstehend da. */
  nextWorkoutId(plan, sessions) {
    const tiles = Logic.tileWorkouts(plan);
    if (tiles.length < 2) return null;      // bei nur einem Training sagt es nichts aus

    let best = null;
    tiles.forEach((w) => {
      // sessions sind neueste zuerst sortiert -> das erste Treffer ist das letzte Mal
      const last = sessions.find((s) => s.workoutId === w.id);
      const key = last ? last.startedAt : '';   // noch nie trainiert -> kommt zuerst
      if (best === null || key < best.key) best = { id: w.id, key: key };
    });
    return best ? best.id : null;
  },

  /* ---------- Was war letztes Mal? ---------- */

  // sessions müssen neueste-zuerst sortiert sein
  lastEntryFor(sessions, exerciseId) {
    for (const s of sessions) {
      const e = (s.exercises || []).find((x) => x.exerciseId === exerciseId);
      if (e && (e.sets || []).some((st) => st.done)) return { session: s, entry: e };
    }
    return null;
  },

  doneSets(entry) {
    return entry ? (entry.sets || []).filter((s) => s.done) : [];
  },

  // -> "50 kg × 8, 8"  oder  "50 kg × 8 · 52,5 kg × 6"  oder  "8, 8 Wdh."
  summarizeSets(sets) {
    const done = (sets || []).filter((s) => s.done);
    if (!done.length) return '';
    const groups = [];
    done.forEach((s) => {
      const kg = (s.kg === null || s.kg === undefined) ? null : s.kg;
      const last = groups[groups.length - 1];
      if (last && last.kg === kg) last.reps.push(s.reps);
      else groups.push({ kg: kg, reps: [s.reps] });
    });
    return groups.map((g) => {
      const reps = g.reps.map((r) => (r === null || r === undefined ? '?' : r)).join(', ');
      return g.kg === null ? `${reps} Wdh.` : `${Util.fmtKg(g.kg)} × ${reps}`;
    }).join(' · ');
  },

  /* ---------- Steigerungs-Vorschlag ---------- */

  /* Regel: Wurden in ALLEN geplanten Sätzen die oberen Wiederholungen
     geschafft, schlägt die App beim nächsten Mal mehr Gewicht vor. */
  progression(exercise, last) {
    const none = { due: false, kg: null, fromKg: null };
    if (!last) return none;

    const done = Logic.doneSets(last.entry);
    if (!done.length) return none;
    if (done.length < (exercise.sets || 1)) return none;          // nicht alle Sätze gemacht
    if (done.some((s) => s.reps === null || s.reps === undefined)) return none;
    if (done.some((s) => s.reps < exercise.repMax)) return none;  // oberes Ende nicht überall erreicht

    const weights = done.map((s) => s.kg).filter((k) => k !== null && k !== undefined);
    if (weights.length !== done.length) return none;              // ohne Gewicht kein Vorschlag

    const fromKg = Math.max.apply(null, weights);
    const step = (exercise.step === null || exercise.step === undefined) ? 2.5 : exercise.step;
    if (!step) return none;
    return { due: true, kg: Util.roundKg(fromKg + step), fromKg: fromKg };
  },

  /* ---------- Felder vorausfüllen ---------- */

  /* Pro Satz die Werte vom letzten Mal. Gibt es noch keine Historie,
     wird das Startgewicht und das untere Ende des Wdh.-Bereichs genommen. */
  prefillSets(exercise, last) {
    const n = Math.max(1, exercise.sets || 1);
    const prev = last ? Logic.doneSets(last.entry) : [];
    const rows = [];
    for (let i = 0; i < n; i++) {
      const src = prev[i] || prev[prev.length - 1] || null;
      rows.push({
        kg: src ? src.kg : (exercise.startKg === undefined ? null : exercise.startKg),
        reps: src ? src.reps : (exercise.repMin || null),
        done: false,
      });
    }
    return rows;
  },

  /* ---------- Rekorde ---------- */

  // Bester Satz eines Eintrags: schwerstes Gewicht, bei Gleichstand mehr Wdh.
  bestSet(sets) {
    let best = null;
    (sets || []).filter((s) => s.done && s.kg !== null && s.kg !== undefined).forEach((s) => {
      if (!best || s.kg > best.kg || (s.kg === best.kg && (s.reps || 0) > (best.reps || 0))) best = s;
    });
    return best;
  },

  isNewRecord(record, kg) {
    if (kg === null || kg === undefined) return false;
    if (!record || record.kg === null || record.kg === undefined) return true;
    return kg > record.kg;
  },

  /* ---------- Kurven ---------- */

  /* Pro Trainingstag das schwerste Gewicht dieser Übung.
     Ergebnis aufsteigend nach Datum. */
  seriesForExercise(sessions, exerciseId) {
    const pts = [];
    sessions.forEach((s) => {
      const e = (s.exercises || []).find((x) => x.exerciseId === exerciseId);
      if (!e) return;
      const best = Logic.bestSet(e.sets);
      if (!best) return;
      pts.push({ date: s.date, kg: best.kg, reps: best.reps });
    });
    pts.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    return pts;
  },

  /* Alle Übungen, für die es Daten gibt – auch solche, die aus dem Plan
     gelöscht wurden (deren alte Trainings bleiben ja erhalten). */
  knownExercises(plan, sessions) {
    const map = new Map();
    (plan ? plan.workouts : []).forEach((w) => w.exercises.forEach((e) => {
      map.set(e.id, { id: e.id, name: e.name, inPlan: true, workout: w.name, color: w.color });
    }));
    sessions.forEach((s) => (s.exercises || []).forEach((e) => {
      if (!map.has(e.exerciseId)) {
        map.set(e.exerciseId, {
          id: e.exerciseId, name: e.name, inPlan: false,
          workout: s.workoutName, color: s.color || 'gray',
        });
      }
    }));
    return Array.from(map.values());
  },

  /* ---------- Backup-Erinnerung ---------- */

  backupDue(settings, lastBackup, sessions) {
    if (!sessions.length) return false;
    const sinceCount = lastBackup
      ? sessions.filter((s) => s.startedAt > lastBackup).length
      : sessions.length;
    if (sinceCount === 0) return false;
    if (sinceCount >= (settings.backupEverySessions || 5)) return true;

    const refIso = lastBackup
      ? Util.isoDate(lastBackup)
      : sessions[sessions.length - 1].date;      // ältestes Training
    const days = Util.daysBetween(refIso, Util.isoDate());
    return days >= (settings.backupEveryDays || 14);
  },

  /* ---------- Kleine Statistik ---------- */

  sessionVolume(session) {
    let kg = 0, sets = 0;
    (session.exercises || []).forEach((e) => (e.sets || []).forEach((s) => {
      if (!s.done) return;
      sets++;
      if (s.kg && s.reps) kg += s.kg * s.reps;
    }));
    return { kg: Math.round(kg), sets: sets };
  },
};
