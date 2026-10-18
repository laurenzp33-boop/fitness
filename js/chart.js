/* chart.js — selbstgebaute Kurven (SVG). Keine fremde Bibliothek.
   Zeichnet: Gewicht über Zeit. Punkte sind antippbar. */
'use strict';

const Chart = {

  /* points: [{date:'2026-10-18', kg:52.5, reps:8}]  (aufsteigend sortiert)
     opts:   { color:'blue', unit:'kg', empty:'Noch keine Daten' } */
  line(container, points, opts) {
    const o = opts || {};
    const unit = o.unit || 'kg';

    if (!points || !points.length) {
      container.innerHTML = `<div class="chart-empty">${Util.esc(o.empty || 'Noch keine Daten vorhanden.')}</div>`;
      return;
    }

    const W = 340, H = 180;
    const padL = 42, padR = 12, padT = 14, padB = 26;
    const innerW = W - padL - padR;
    const innerH = H - padT - padB;

    const values = points.map((p) => p.kg);
    let min = Math.min.apply(null, values);
    let max = Math.max.apply(null, values);
    if (min === max) { min = min - 1; max = max + 1; }         // flache Linie trotzdem zeigen
    const span = max - min;
    min = min - span * 0.12;
    max = max + span * 0.12;

    // x-Position: nach echtem Datum, damit Pausen sichtbar sind
    const times = points.map((p) => Util.parseISO(p.date).getTime());
    const t0 = times[0];
    const t1 = times[times.length - 1];
    const xOf = (i) => (t1 === t0 ? padL + innerW / 2 : padL + ((times[i] - t0) / (t1 - t0)) * innerW);
    const yOf = (v) => padT + innerH - ((v - min) / (max - min)) * innerH;

    const coords = points.map((p, i) => [xOf(i), yOf(p.kg)]);
    const path = coords.map((c, i) => (i ? 'L' : 'M') + c[0].toFixed(1) + ' ' + c[1].toFixed(1)).join(' ');
    const area = path + ` L ${coords[coords.length - 1][0].toFixed(1)} ${padT + innerH} L ${coords[0][0].toFixed(1)} ${padT + innerH} Z`;

    // drei waagrechte Hilfslinien mit Beschriftung
    const ticks = [max, (max + min) / 2, min].map((v) => ({ v: v, y: yOf(v) }));

    const svg = `
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Kurve">
        ${ticks.map((t) => `
          <line class="chart-grid" x1="${padL}" y1="${t.y.toFixed(1)}" x2="${W - padR}" y2="${t.y.toFixed(1)}"/>
          <text class="chart-lbl" x="${padL - 6}" y="${(t.y + 4).toFixed(1)}" text-anchor="end">${Util.fmtNum(Math.round(t.v * 10) / 10)}</text>`).join('')}
        <path class="chart-area" d="${area}"/>
        <path class="chart-line" d="${path}"/>
        ${coords.map((c, i) => `<circle class="chart-pt" cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="${points.length > 30 ? 2 : 4}"/>`).join('')}
        ${coords.map((c, i) => `<circle cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="14" fill="transparent" data-i="${i}" style="cursor:pointer"/>`).join('')}
        <text class="chart-lbl" x="${padL}" y="${H - 6}" text-anchor="start">${Util.esc(Util.fmtDate(points[0].date).slice(0, 6))}</text>
        <text class="chart-lbl" x="${W - padR}" y="${H - 6}" text-anchor="end">${Util.esc(Util.fmtDate(points[points.length - 1].date).slice(0, 6))}</text>
      </svg>
      <div class="row small" style="justify-content:space-between;padding:8px 4px 2px">
        <span id="ch-read" class="muted"></span>
        <span class="muted">Höchstwert: <b style="color:var(--text)">${Util.fmtNum(Math.max.apply(null, values))} ${Util.esc(unit)}</b></span>
      </div>`;

    container.className = 'chartbox c-' + (o.color || 'blue');
    container.innerHTML = svg;

    const readout = container.querySelector('#ch-read');
    const show = (i) => {
      const p = points[i];
      readout.innerHTML = `${Util.esc(Util.fmtDate(p.date))}: <b style="color:var(--text)">${Util.fmtNum(p.kg)} ${Util.esc(unit)}</b>` +
        (p.reps ? ` × ${p.reps}` : '');
    };
    show(points.length - 1);
    container.querySelectorAll('[data-i]').forEach((c) => {
      c.addEventListener('click', () => show(Number(c.dataset.i)));
    });
  },
};
