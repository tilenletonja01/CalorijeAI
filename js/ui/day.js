// Prikaz enega dneva: obroč kalorij, makrohranila, seznam vnosov.
// Uporablja ga zaslon Danes (in kasneje urejanje dneva v Zgodovini).
import { h, calorieRing, macroBar, macrosInline } from './components.js';
import { openAddEntry, openEditEntry } from './entrySheet.js';
import { sumNutrients } from '../logic/nutrition.js';
import { formatKcal, formatQuantity, roundKcal } from '../logic/numbers.js';
import { formatDayLong, todayISO } from '../logic/dates.js';
import * as db from '../db.js';

export async function renderDay(container, date, { title } = {}) {
  const [entries, settings] = await Promise.all([db.getEntriesForDate(date), db.getSettings()]);
  entries.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  const goals = settings.goals;
  const total = sumNutrients(entries);

  const left = roundKcal(goals.kcal) - roundKcal(total.kcal);
  const over = left < 0;
  const leftText = over ? `${formatKcal(-left)} kcal nad ciljem` : `Še ${formatKcal(left)} kcal`;

  const head = h('header', { class: 'page-head' },
    h('div', {},
      h('h1', {}, title || (date === todayISO() ? 'Danes' : formatDayLong(date))),
      h('div', { class: 'sub' }, formatDayLong(date))));

  const ringCard = h('section', { class: 'card ring-card' },
    calorieRing(total.kcal, goals.kcal),
    h('div', { class: `ring-left num${over ? ' over' : ''}` }, leftText));

  const macroCard = h('section', { class: 'card' },
    macroBar('protein', 'Beljakovine', total.protein, goals.protein),
    macroBar('fat', 'Maščobe', total.fat, goals.fat),
    macroBar('carbs', 'Ogljikovi hidrati', total.carbs, goals.carbs));

  const listTitle = h('h2', { class: 'section-title' },
    h('span', {}, 'Vnosi'),
    entries.length ? h('span', { class: 'num' }, `${entries.length}`) : null);

  const list = entries.length
    ? h('div', { class: 'list' }, ...entries.map((e) =>
      h('button', { class: 'row', type: 'button', onclick: () => openEditEntry(e) },
        h('div', { class: 'main' },
          h('div', { class: 'title' }, e.foodName),
          h('div', { class: 'meta' }, `${formatQuantity(e.quantity)} ${e.unit === 'kos' ? 'kos' : 'g'} · `, macrosInline(e))),
        h('div', { class: 'side' }, h('div', { class: 'kcal num' }, formatKcal(e.kcal), h('small', {}, ' kcal'))))))
    : h('div', { class: 'card empty' },
      h('p', {}, 'Za ta dan še ni vnosov.'),
      h('button', { class: 'btn', type: 'button', onclick: () => openAddEntry(date) }, '+ Dodaj prvi vnos'));

  const fab = entries.length
    ? h('button', { class: 'btn fab', type: 'button', onclick: () => openAddEntry(date) }, '+ Dodaj')
    : null;

  container.replaceChildren(...[head, ringCard, macroCard, listTitle, list, fab].filter(Boolean));
}
