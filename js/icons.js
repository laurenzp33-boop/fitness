/* icons.js — alle Symbole der App als SVG.
   Keine Emojis: die sehen auf jedem Gerät anders aus und wirken verspielt.
   Diese Icons nehmen immer die Farbe des Textes an, in dem sie stehen. */
'use strict';

const Icons = (function () {

  // Strichzeichnungen auf 24×24, abgerundet – wie in iOS
  const P = {
    home:      '<path d="M3.2 10.5 12 3.6l8.8 6.9"/><path d="M5.5 9.2V20h13V9.2"/><path d="M9.8 20v-5.4h4.4V20"/>',
    chart:     '<path d="M4 19.2V4.8"/><path d="M4 19.2h15.5"/><path d="m7.5 15.2 3.4-4.2 3 2.4 4.1-5.6"/>',
    list:      '<rect x="4.2" y="3.6" width="15.6" height="16.8" rx="3.4"/><path d="M8.2 9h7.6M8.2 12.6h7.6M8.2 16.2h4.6"/>',
    sliders:   '<path d="M5 6.6h14M5 12h14M5 17.4h14"/><circle cx="9.4" cy="6.6" r="2.1" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="2.1" fill="currentColor" stroke="none"/><circle cx="8" cy="17.4" r="2.1" fill="currentColor" stroke="none"/>',

    back:      '<path d="m14.5 5-7 7 7 7"/>',
    forward:   '<path d="m9.5 5 7 7-7 7"/>',
    up:        '<path d="m6 14.5 6-6 6 6"/>',
    down:      '<path d="m6 9.5 6 6 6-6"/>',
    arrowUp:   '<path d="M12 19.5V5"/><path d="m5.8 11 6.2-6.2L18.2 11"/>',
    check:     '<path d="m5 12.6 4.6 4.6L19 7.5"/>',
    plus:      '<path d="M12 5.5v13M5.5 12h13"/>',
    close:     '<path d="m6.5 6.5 11 11M17.5 6.5l-11 11"/>',

    trophy:    '<path d="M7.5 4.5h9v5a4.5 4.5 0 0 1-9 0z"/><path d="M7.5 6H5.2a2.6 2.6 0 0 0 2.6 4.3"/><path d="M16.5 6h2.3a2.6 2.6 0 0 1-2.6 4.3"/><path d="M12 14v3.2"/><path d="M8.6 20h6.8l-.7-2.8H9.3z"/>',
    clock:     '<circle cx="12" cy="12" r="8.2"/><path d="M12 7.4V12l3 1.8"/>',
    save:      '<path d="M12 3.8v10.4"/><path d="m7.6 10 4.4 4.3 4.4-4.3"/><path d="M4.6 16.4v1.8a2 2 0 0 0 2 2h10.8a2 2 0 0 0 2-2v-1.8"/>',
    open:      '<path d="M3.8 7.4a2 2 0 0 1 2-2h3.3l1.8 2.2h7.3a2 2 0 0 1 2 2v1"/><path d="m3.8 9.6 1.7 8a1.8 1.8 0 0 0 1.8 1.4h9.4a1.8 1.8 0 0 0 1.8-1.4l1.5-8z"/>',
    trash:     '<path d="M4.8 6.8h14.4"/><path d="M9.2 6.8V5.2a1.4 1.4 0 0 1 1.4-1.4h2.8a1.4 1.4 0 0 1 1.4 1.4v1.6"/><path d="M6.6 6.8 7.5 19a1.6 1.6 0 0 0 1.6 1.5h5.8a1.6 1.6 0 0 0 1.6-1.5l.9-12.2"/>',
    shield:    '<path d="M12 3.4 5.2 6v5.4c0 4 2.8 7.6 6.8 9.2 4-1.6 6.8-5.2 6.8-9.2V6z"/><path d="m9.2 11.8 2 2 3.6-3.8"/>',
    warn:      '<path d="M12 4.4 2.9 19.6h18.2z"/><path d="M12 10v4"/><circle cx="12" cy="17" r=".9" fill="currentColor" stroke="none"/>',
    scale:     '<circle cx="12" cy="12.6" r="7.8"/><path d="M12 12.6 15.4 8"/><path d="M9.6 4.9a7.8 7.8 0 0 1 4.8 0"/>',
    dumbbell:  '<path d="M3.4 9.6v4.8M6.4 7.6v8.8M17.6 7.6v8.8M20.6 9.6v4.8"/><path d="M6.4 12h11.2"/>',
    spark:     '<path d="M12 3.6 13.9 9l5.5 2-5.5 2L12 18.4 10.1 13l-5.5-2 5.5-2z"/>',
  };

  function get(name, size) {
    const d = P[name];
    if (!d) return '';
    const s = size || 22;
    return `<svg class="ic" viewBox="0 0 24 24" width="${s}" height="${s}" fill="none"
      stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"
      aria-hidden="true" focusable="false">${d}</svg>`;
  }

  return { get, names: Object.keys(P) };
})();
