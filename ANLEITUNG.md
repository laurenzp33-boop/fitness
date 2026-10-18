# Fitness-App – Anleitung

Deine persönliche Trainings-App. Sie läuft im Safari am iPhone, braucht
**kein Internet** und **keinen Login**. Alle Daten bleiben auf deinem Handy.

> **Die App ist bereits online:**
> ### https://laurenzp33-boop.github.io/fitness/
>
> Öffne diese Adresse am iPhone in **Safari** und spring direkt zu
> *Teil 2: Am iPhone installieren*. Teil 1 beschreibt nur, wie das
> Veröffentlichen funktioniert hat – das ist schon erledigt.

---

## Teil 1: Die App gratis online stellen (GitHub Pages)

Du brauchst das nur **einmal**. Danach hast du eine feste Internet-Adresse,
über die du die App am iPhone installierst. Dauert ca. 10 Minuten.

### Schritt 1 – GitHub-Konto anlegen

1. Geh auf **github.com**
2. Klick rechts oben auf **Sign up**
3. E-Mail, Passwort, Benutzername eingeben (merk dir den Benutzernamen!)
4. E-Mail bestätigen

GitHub ist gratis.

### Schritt 2 – Ein Repository anlegen

Ein „Repository" ist einfach ein Ordner im Internet.

1. Klick rechts oben auf das **+** und dann auf **New repository**
2. Bei **Repository name** schreib: `fitness`
3. Wähl **Public** (Öffentlich)
   > Muss öffentlich sein, sonst ist die Gratis-Veröffentlichung gesperrt.
   > Öffentlich ist nur die App selbst – **deine Trainingsdaten nicht**.
   > Die liegen ausschließlich auf deinem iPhone und gehen nie ins Internet.
4. Alles andere leer lassen, unten auf **Create repository** klicken

### Schritt 3 – Die Dateien hochladen

1. Auf der nächsten Seite steht ein Link **uploading an existing file** – draufklicken
   (findest du ihn nicht: **Add file ▸ Upload files**)
2. Öffne am Mac den Ordner `Fitness App`
3. Markiere **den Inhalt** des Ordners – also diese Einträge:

   ```
   index.html
   manifest.webmanifest
   sw.js
   ANLEITUNG.md
   css      (Ordner)
   js       (Ordner)
   icons    (Ordner)
   ```

   > ⚠️ Wichtig: Nicht den Ordner „Fitness App" selbst hochladen,
   > sondern **was drin ist**. Sonst findet GitHub die App nicht.

4. Zieh alles in das Browserfenster
5. Warte, bis alle Dateien in der Liste stehen
6. Klick unten auf den grünen Knopf **Commit changes**

### Schritt 4 – Veröffentlichen einschalten

1. Klick oben im Repository auf **Settings** (Zahnrad)
2. Links in der Leiste auf **Pages**
3. Bei **Source** wähle **Deploy from a branch**
4. Bei **Branch** wähle **main** und daneben **/ (root)**
5. Klick **Save**

Jetzt 1–3 Minuten warten. Dann lade die Seite neu – oben erscheint:

> Your site is live at **https://laurenzp33-boop.github.io/fitness/**

Das ist die Adresse deiner App. Schreib sie dir auf.

---

## Teil 2: Am iPhone installieren

1. Öffne am iPhone **Safari** (nicht Chrome – nur Safari kann das!)
2. Tipp die Adresse ein: `https://laurenzp33-boop.github.io/fitness/`
3. Die App lädt. Tipp unten auf das **Teilen-Symbol** (Quadrat mit Pfeil nach oben)
4. Scroll in der Liste nach unten zu **Zum Home-Bildschirm**
5. Tipp rechts oben auf **Hinzufügen**

Fertig. Jetzt liegt die App als Symbol (🏋️ Hantel) auf deinem Homescreen.

**Ab jetzt immer über dieses Symbol starten**, nicht über Safari. Nur so:
- läuft sie im Vollbild ohne Browser-Leiste
- funktioniert sie ohne Internet
- bleibt der Speicher dauerhaft geschützt

Beim ersten Start einmal kurz mit Internet öffnen, damit sich die App
komplett speichert. Danach brauchst du nie wieder Empfang.

---

## Teil 3: Backups – bitte ernst nehmen

Deine Daten liegen **nur** auf diesem einen iPhone. Weg sind sie, wenn du:
- das Handy verlierst oder es kaputt geht
- in den iPhone-Einstellungen die Safari-Daten löschst
- die App vom Homescreen löschst

Die App erinnert dich alle 14 Tage mit einem gelben Balken auf der Startseite.

**So machst du ein Backup:**
1. In der App unten auf **Mehr**
2. Auf **💾 Backup exportieren**
3. iPhone fragt, wohin – wähl **In „Dateien" sichern** oder schick es dir
   per Mail/WhatsApp an dich selbst

Du bekommst eine Datei wie `fitness-backup-2026-10-18.json`.

**So spielst du ein Backup zurück:**
1. **Mehr ▸ 📂 Backup einlesen**
2. Datei auswählen
3. **Ersetzen** (alles zurücksetzen) oder **Dazumischen** (nur ergänzen)

---

## Teil 4: Die App später ändern

Wenn du etwas an der App selbst ändern willst (nicht am Trainingsplan –
den änderst du direkt in der App unter „Plan"):

1. Geh auf GitHub in dein `fitness`-Repository
2. **Add file ▸ Upload files**, die geänderten Dateien hineinziehen
3. **Commit changes**
4. Am iPhone: App komplett schließen (von unten hochwischen und wegschieben),
   dann **zweimal** öffnen

Beim ersten Öffnen lädt sie im Hintergrund die neue Fassung, beim zweiten
ist sie da. Deine Trainingsdaten bleiben dabei immer erhalten.

---

## Wenn etwas nicht geht

**„404 – There isn't a GitHub Pages site here"**
Noch nicht fertig. 3 Minuten warten und neu laden. Steht es dann immer noch
da: Prüf, ob `index.html` direkt im Repository liegt (nicht in einem
Unterordner) und ob unter Settings ▸ Pages „main / (root)" eingestellt ist.

**Die Seite bleibt leer**
Meist eine Datei fehlt. Im Repository muss stehen: `index.html`,
`manifest.webmanifest`, `sw.js` und die drei Ordner `css`, `js`, `icons`.

**Das Symbol am Homescreen ist ein weißes Blatt**
Der Ordner `icons` fehlt beim Upload. Nachladen, App vom Homescreen löschen
und neu hinzufügen.

**Die App zeigt alte Inhalte**
App schließen und zweimal öffnen (siehe Teil 4).

**Alles ist weg**
Backup einlesen (Teil 3). Deshalb regelmäßig exportieren.

---

## Kurz erklärt: Was macht welche Datei?

| Datei / Ordner | Wofür |
|---|---|
| `index.html` | Das Grundgerüst der App |
| `css/style.css` | Das Aussehen (dunkel, große Tasten) |
| `js/seed.js` | Dein Trainingsplan als Startwerte |
| `js/icons.js` | Alle Symbole als Zeichnung (statt Emojis) |
| `js/db.js` | Speichert alles am Handy |
| `js/logic.js` | Rechnet Steigerung, Rekorde, „Letztes Mal" aus |
| `js/screen-*.js` | Die einzelnen Bildschirme |
| `sw.js` | Sorgt dafür, dass die App offline läuft |
| `manifest.webmanifest` | Macht sie am Homescreen installierbar |
| `icons/` | Das App-Symbol |

Du musst keine davon anfassen. Alles Alltägliche – Übungen, Sätze,
Wiederholungen, Steigerungsschritte, Pausenzeit – stellst du direkt
in der App ein.

---

## Dein Plan in der App

| Kachel | Inhalt |
|---|---|
| **Brust · Rücken** | *Brust:* Incline Smith Machine, Cable Flies oben nach unten, Bench Press<br>*Rücken:* Brustgestütztes Rudern, Latzug, Stiff Leg Deadlifts |
| **Arme** | *Schultern:* Lateral Raise, Rear Delt Flies, Shoulder Press<br>*Bizeps:* Preacher Curls, Hammer Curls<br>*Unterarme:* Reverse Curls, Wrist Flexions<br>*Trizeps:* Trizeps Pushdown, Dip Machine<br>*Beine:* Leg Curl, Leg Extension, Wadendrücken |

**Bauch** (Cable Crunches) hat keine eigene Kachel – die Übung hängt sich
automatisch ans Ende von *jedem* Training.

Einen eigenen Beine-Tag gibt es nicht: die drei Beinübungen laufen beim
Arme-Training mit.

### Deine Gewichte

Im Code stehen **keine Gewichte und keine Rekorde**. Dieses Repository ist
öffentlich – deine Zahlen gehen niemanden etwas an.

Du hast dafür die private Datei **`fitness-startwerte.json`** bekommen. Sie
enthält deine Startgewichte (Bench Press, Dip Machine, Preacher Curls …) und
deinen Bench-Press-Rekord. Einmal einlesen und alles ist da:

1. App öffnen ▸ **Mehr**
2. **Backup einlesen** ▸ die Datei auswählen
3. **Ersetzen**

Diese Datei gehört **nicht** ins Repository. Leg sie dir in die iCloud oder
schick sie dir selbst per Mail – sie ist gleichzeitig dein erstes Backup.

Alternativ kannst du die Gewichte auch einfach beim ersten Training eintippen.
Ab dem zweiten Mal füllt die App die Felder sowieso automatisch mit den
Werten vom letzten Mal.

### „Anstehend"

Auf der Kachel, die als Nächstes dran ist, steht ein weißes Schild
**Anstehend**. Die App nimmt immer das Training, bei dem am längsten nichts
mehr passiert ist:

- Du machst heute **Brust** → danach steht *Anstehend* auf **Rücken · Arme**
- Du machst auch das → *Anstehend* springt zurück auf **Brust**

Du musst nichts einstellen, das läuft von selbst. Antippen kannst du trotzdem
jederzeit beides – das Schild ist nur ein Hinweis, keine Sperre.

### Etwas am Plan ändern

Alles unter **Plan**: Übungen hinzufügen, umbenennen, löschen, mit den Pfeilen
verschieben, Sätze und Wiederholungen ändern, den Steigerungs-Schritt anpassen
(z. B. 1 kg statt 2,5 kg bei Kurzhanteln) oder ein ganzes Training anlegen.

Löschst du eine Übung, **bleiben deine alten Werte erhalten** – sie stehen
weiter im Fortschritt und in den Rekorden, nur eben mit dem Zusatz „(gelöscht)".
