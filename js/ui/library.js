// Zaslon Knjižnica: seznam živil z iskanjem.
import { h, searchField } from './components.js';
import { openFoodEditor } from './foodEditor.js';
import { describeFood } from './entrySheet.js';
import { filterFoods } from '../logic/nutrition.js';
import * as db from '../db.js';

let lastQuery = '';

export async function renderLibrary(container) {
  const foods = await db.getFoods();
  foods.sort((a, b) => a.name.localeCompare(b.name, 'sl'));

  const head = h('header', { class: 'page-head' },
    h('div', {}, h('h1', {}, 'Knjižnica'), h('div', { class: 'sub' }, `${foods.length} ${zivil(foods.length)}`)),
    h('button', { class: 'icon-btn', type: 'button', onclick: () => openFoodEditor({ presetName: lastQuery }) }, '+ Novo'));

  const { wrap: searchWrap, input: search } = searchField('Išči po imenu …');
  search.value = lastQuery;

  const list = h('div', { class: 'list' });
  const empty = h('div', { class: 'card empty' });

  const render = () => {
    lastQuery = search.value;
    const q = search.value.trim();
    const matches = q ? filterFoods(foods, q) : foods;
    list.replaceChildren(...matches.map((f) =>
      h('button', { class: 'row', type: 'button', onclick: () => openFoodEditor({ food: f }) },
        h('div', { class: 'main' },
          h('div', { class: 'title' }, f.name),
          h('div', { class: 'meta' }, describeFood(f))),
        h('span', { class: 'chev' }, '›'))));
    list.classList.toggle('hidden', matches.length === 0);
    empty.classList.toggle('hidden', matches.length > 0);
    empty.replaceChildren(
      h('p', {}, foods.length ? `Ni živila »${q}«.` : 'Knjižnica je prazna. Dodaj živila, ki jih pogosto ješ.'),
      h('button', { class: 'btn', type: 'button', onclick: () => openFoodEditor({ presetName: q }) },
        q ? `+ Dodaj »${q}«` : '+ Dodaj živilo'));
  };
  search.addEventListener('input', render);
  render();

  container.replaceChildren(
    head,
    searchWrap,
    list,
    empty,
  );
}

function zivil(n) {
  const m = n % 100;
  if (m === 1) return 'živilo';
  if (m === 2) return 'živili';
  if (m === 3 || m === 4) return 'živila';
  return 'živil';
}
