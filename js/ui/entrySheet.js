// Dodajanje vnosa (izbira živila → količina) in urejanje obstoječega vnosa.
import { h, field, numberInput, segmented, openSheet, toast, searchField } from './components.js';
import { openFoodEditor } from './foodEditor.js';
import {
  availableUnits, calculate, buildEntry, filterFoods, hasPieceWeight, nativeUnit,
} from '../logic/nutrition.js';
import { validateNumber, formatKcal, formatMacro, formatQuantity } from '../logic/numbers.js';
import * as db from '../db.js';

const unitLabel = (u) => (u === 'kos' ? 'kos' : 'g');

/** Kratek opis hranilnih vrednosti živila. */
export function describeFood(f) {
  const base = f.basis === 'kos' ? 'na 1 kos' : 'na 100 g';
  let s = `${base}: ${formatKcal(f.kcal)} kcal · B ${formatMacro(f.protein)} · M ${formatMacro(f.fat)} · OH ${formatMacro(f.carbs)}`;
  if (hasPieceWeight(f)) s += ` · 1 kos = ${formatQuantity(f.pieceGrams)} g`;
  return s;
}

/** Odpre dodajanje novega vnosa za dani datum. */
export function openAddEntry(date) {
  const sheet = openSheet({ title: 'Dodaj vnos' });
  showPicker();

  async function showPicker(initialQuery = '') {
    sheet.setTitle('Dodaj vnos');
    sheet.setLeft(null);
    const foods = await db.getFoods();

    const { wrap: searchWrap, input: search } = searchField('Išči živilo …');
    search.value = initialQuery;
    const list = h('div', { class: 'list' });
    const newBtn = h('button', { class: 'btn secondary block', type: 'button', style: 'margin-top:12px' });

    const render = () => {
      const q = search.value.trim();
      const matches = filterFoods(foods, q);
      list.replaceChildren(
        ...matches.slice(0, 100).map((f) =>
          h('button', { class: 'row', type: 'button', onclick: () => showQuantity(f) },
            h('div', { class: 'main' },
              h('div', { class: 'title' }, f.name),
              h('div', { class: 'meta' }, describeFood(f))),
            h('span', { class: 'chev' }, '›'))),
      );
      list.classList.toggle('hidden', matches.length === 0);
      emptyMsg.classList.toggle('hidden', matches.length > 0);
      emptyMsg.textContent = foods.length === 0
        ? 'Knjižnica je prazna. Najprej dodaj živilo.'
        : `Ni živila, ki bi ustrezalo »${q}«.`;
      newBtn.textContent = q ? `+ Novo živilo »${q}«` : '+ Novo živilo';
    };
    const emptyMsg = h('div', { class: 'empty' });
    search.addEventListener('input', render);

    newBtn.addEventListener('click', () => {
      openFoodEditor({
        presetName: search.value.trim(),
        onSaved: (food) => showQuantity(food),
      });
    });

    sheet.body.replaceChildren(
      searchWrap,
      emptyMsg,
      list,
      newBtn,
    );
    render();
    sheet.body.scrollTop = 0;
    // Fokus le, če je knjižnica dovolj velika, da je iskanje potrebno.
    if (foods.length > 8) search.focus();

    function showQuantity(food) {
      quantityStep({
        sheet,
        food,
        title: food.name,
        onBack: () => showPicker(search.value),
        submitLabel: 'Dodaj',
        onSubmit: async (quantity, unit) => {
          const entry = buildEntry({ id: db.newId(), date, food, quantity, unit });
          await db.put('entries', entry);
          await db.put('foods', { ...food, lastUsedAt: Date.now() });
          toast(`Dodano: ${food.name}`);
          sheet.close();
        },
      });
    }
  }
}

/** Odpre urejanje obstoječega vnosa (preračun iz shranjenega posnetka živila). */
export function openEditEntry(entry) {
  const sheet = openSheet({ title: entry.foodName });
  quantityStep({
    sheet,
    food: { ...entry.snapshot, name: entry.foodName },
    title: entry.foodName,
    initialQuantity: entry.quantity,
    initialUnit: entry.unit,
    submitLabel: 'Shrani',
    onSubmit: async (quantity, unit) => {
      const updated = buildEntry({
        id: entry.id, date: entry.date, food: entry.snapshot, foodId: entry.foodId,
        foodName: entry.foodName, quantity, unit, createdAt: entry.createdAt,
      });
      await db.put('entries', updated);
      toast('Vnos posodobljen');
      sheet.close();
    },
    onDelete: async () => {
      if (!confirm(`Izbrišem vnos »${entry.foodName}«?`)) return;
      await db.remove('entries', entry.id);
      toast('Vnos izbrisan');
      sheet.close();
    },
  });
}

/** Korak vnosa količine z izbiro enote in predogledom izračuna. */
function quantityStep({ sheet, food, title, onBack, initialQuantity, initialUnit, submitLabel, onSubmit, onDelete }) {
  sheet.setTitle(title);
  sheet.setLeft(onBack ? h('button', { class: 'link-btn', type: 'button', onclick: onBack }, '‹ Nazaj') : null);

  const units = availableUnits(food);
  let unit = initialUnit && units.includes(initialUnit) ? initialUnit : units[0];
  const startQty = initialQuantity != null ? formatQuantity(initialQuantity) : unit === 'kos' ? '1' : '';

  const { wrap, input } = numberInput({ value: startQty, suffix: unitLabel(unit), id: 'qty', placeholder: '0' });
  const suffixEl = wrap.querySelector('.suffix');
  const fQty = field('Količina', wrap, { forId: 'qty' });

  const unitSeg = units.length > 1
    ? segmented(units.map((u) => ({ value: u, label: u === 'g' ? 'grami (g)' : 'kosi' })), unit, (u) => {
      // Ob menjavi enote preračunaj količino, da ostane enaka porcija.
      const v = validateNumber(input.value, { positive: true });
      if (v.ok && hasPieceWeight(food)) {
        const q = u === 'g' ? v.value * food.pieceGrams : v.value / food.pieceGrams;
        input.value = formatQuantity(q);
      }
      unit = u;
      suffixEl.textContent = unitLabel(u);
      update();
    })
    : null;

  const unitNote = units.length === 1
    ? h('div', { class: 'food-info' },
      `Vnos samo v ${nativeUnit(food) === 'g' ? 'gramih' : 'kosih'}. Za drugo enoto v knjižnici dodaj težo enega kosa.`)
    : null;

  const preview = h('div', { class: 'preview empty-preview' });
  const submit = h('button', { class: 'btn block', type: 'button' }, submitLabel);
  const del = onDelete ? h('button', { class: 'btn danger block', type: 'button', onclick: onDelete }, 'Izbriši vnos') : null;

  function cell(v, k, cls = '') {
    return h('div', { class: cls }, h('div', { class: 'v num' }, v), h('div', { class: 'k' }, k));
  }

  function update() {
    const v = validateNumber(input.value, { positive: true });
    const showErr = input.value.trim() !== '' && !v.ok;
    fQty.setError(showErr ? v.error : null);
    submit.disabled = !v.ok;
    const r = v.ok ? calculate(food, v.value, unit) : { kcal: 0, protein: 0, fat: 0, carbs: 0 };
    preview.classList.toggle('empty-preview', !v.ok);
    preview.replaceChildren(
      cell(formatKcal(r.kcal), 'kcal'),
      cell(formatMacro(r.protein), 'beljak. (g)', 'p'),
      cell(formatMacro(r.fat), 'maščobe (g)'),
      cell(formatMacro(r.carbs), 'OH (g)'),
    );
  }
  input.addEventListener('input', update);

  submit.addEventListener('click', async () => {
    const v = validateNumber(input.value, { positive: true });
    if (!v.ok) return fQty.setError(v.error);
    submit.disabled = true;
    try {
      await onSubmit(v.value, unit);
    } catch (e) {
      submit.disabled = false;
      alert(`Shranjevanje ni uspelo: ${e.message}`);
    }
  });

  sheet.body.replaceChildren(...[
    h('div', { class: 'food-info' }, describeFood(food)),
    unitSeg ? h('div', { class: 'field' }, unitSeg.el) : null,
    unitNote,
    fQty.el,
    h('div', { class: 'section-title', style: 'margin-top:0' }, 'Predogled'),
    preview,
    h('div', { class: 'actions' }, submit, del),
  ].filter(Boolean));
  sheet.body.scrollTop = 0;
  update();
  input.focus();
  // Postavi kazalec na konec (iOS).
  const len = input.value.length;
  try { input.setSelectionRange(len, len); } catch { /* ignore */ }
}
