/* seed.js — Startdaten: die Übungen deines Trainingsplans.

   Hier stehen bewusst KEINE Gewichte und KEINE Rekorde. Diese Datei liegt
   öffentlich auf GitHub – deine Zahlen gehen niemanden etwas an. Gewichte
   trägst du beim ersten Training ein, danach füllt die App die Felder
   automatisch mit den Werten vom letzten Mal.
   Diese Daten werden EINMAL beim allerersten App-Start in die Datenbank
   geschrieben. Danach gilt nur noch, was in der Datenbank steht –
   Änderungen machst du in der App unter "Plan". */
'use strict';

// Kurzschreibweise, damit die Tabelle unten lesbar bleibt.
// ex(Name, Sätze, Wdh-von, Wdh-bis, Startgewicht, Untergruppe, Steigerungsschritt)
// Das Startgewicht ist überall null – siehe Hinweis oben.
function ex(name, sets, repMin, repMax, startKg, group, step) {
  return {
    id: 'ex_' + name.toLowerCase()
      .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
    name: name,
    sets: sets,
    repMin: repMin,
    repMax: repMax,
    startKg: (startKg === undefined ? null : startKg),
    group: group || null,
    step: (step === undefined || step === null ? 2.5 : step),
  };
}

const SEED = {

  plan: {
    version: 5,
    workouts: [
      {
        // Brust und Rücken an einem Tag, getrennt durch Zwischenüberschriften.
        id: 'w_brust_ruecken', name: 'Brust · Rücken', color: 'blue', finisher: false,
        exercises: [
          ex('Incline Smith Machine', 2, 6, 8, null, 'Brust'),
          ex('Cable Flies oben nach unten', 2, 6, 8, null, 'Brust'),
          ex('Bench Press', 2, 6, 8, null, 'Brust'),

          ex('Brustgestütztes Rudern', 3, 8, 10, null, 'Rücken'),
          ex('Latzug', 2, 8, 10, null, 'Rücken'),
          ex('Stiff Leg Deadlifts', 2, 8, 10, null, 'Rücken'),
        ],
      },
      {
        // Arme als eigener Tag. Die drei Beinübungen laufen hier mit –
        // einen eigenen Beine-Tag gibt es nicht.
        id: 'w_arme', name: 'Arme', color: 'violet', finisher: false,
        exercises: [
          ex('Lateral Raise', 2, 10, 12, null, 'Schultern'),
          ex('Rear Delt Flies', 2, 10, 12, null, 'Schultern'),
          ex('Shoulder Press', 2, 10, 12, null, 'Schultern'),

          ex('Preacher Curls', 2, 6, 9, null, 'Bizeps'),
          ex('Hammer Curls', 2, 6, 9, null, 'Bizeps'),

          ex('Reverse Curls', 2, 12, 15, null, 'Unterarme'),
          ex('Wrist Flexions', 2, 12, 15, null, 'Unterarme'),

          ex('Trizeps Pushdown', 2, 8, 10, null, 'Trizeps'),
          ex('Dip Machine', 2, 8, 10, null, 'Trizeps'),

          ex('Leg Curl', 2, 10, 12, null, 'Beine'),
          ex('Leg Extension', 2, 10, 12, null, 'Beine'),
          ex('Wadendrücken', 2, 12, 15, null, 'Beine'),
        ],
      },
      {
        // finisher: true  ->  hängt sich automatisch ans Ende JEDES Trainings
        // und bekommt deshalb keine eigene Kachel.
        id: 'w_bauch', name: 'Bauch', color: 'teal', finisher: true,
        exercises: [
          ex('Cable Crunches', 2, 12, 15, null),
        ],
      },
    ],
  },

  // Rekorde, die es schon vor der App gab
  // Leer. Rekorde entstehen beim Training – und bleiben damit nur auf
  // deinem Handy. Im Code steht bewusst keine einzige deiner Zahlen.
  records: [],

  settings: {
    restSeconds: 90,      // Pausen-Timer: Dauer
    restEnabled: true,    // Pausen-Timer: an/aus
    soundEnabled: true,   // Piepton am Ende der Pause
    backupEveryDays: 14,  // ab wann die Backup-Erinnerung kommt
    backupEverySessions: 5,
  },
};

// Farben, die im Plan-Editor zur Auswahl stehen
const COLORS = [
  { key: 'violet', label: 'Violett' },
  { key: 'blue',   label: 'Blau' },
  { key: 'teal',   label: 'Türkis' },
  { key: 'indigo', label: 'Indigo' },
  { key: 'sky',    label: 'Himmelblau' },
  { key: 'slate',  label: 'Grau' },
];
