// Obrazec za dodajanje in urejanje živila.
import { h, field, numberInput, segmented, openSheet, toast } from './components.js';
import { validateFood, normalizeForSearch, BASIS_100G, BASIS_PIECE } from '../logic/nutrition.js';
import { formatQuantity } from '../logic/numbers.js';
import * as db from '../db.js';

let uid = 0;

/**
 * Odpre urejevalnik živila.
 * @param {{food?: object, presetName?: string, onSaved?: (food) => void}} opts
 */
export function openFoodEditor({ food = null, presetName = '', onSaved } = {}) {
  const isEdit = !!food;
  const p = `fe${++uid}`;
  let basis = food?.basis || BASIS_100G;

  const nameInput = h('input', {
    class: 'input', type: 'text', id: `${p}-name`, autocomplete: 'off',
    autocapitalize: 'sentences', enterkeyhint: 'next', placeholder: 'npr. Jajce',
  });
  nameInput.value = food?.name ?? presetName;
  const fName = field('Ime', nameInput, { forId: `${p}-name` });

  const basisLabel = () => (basis === BASIS_PIECE ? 'na 1 kos' : 'na 100 g');
  const basisSeg = segmented(
    [{ value: BASIS_100G, label: 'na 100 g' }, { value: BASIS_PIECE, label: 'na 1 kos' }],
    basis,
    (v) => {
      basis = v;
      updateLabels();
    },
  );
  const fBasis = field('Vrednosti so podane', basisSeg.el);

  const num = (key, suffix) => {
    const { wrap, input } = numberInput({
      value: food ? formatQuantity(food[key]) : '',
      suffix,
      id: `${p}-${key}`,
      placeholder: '',
    });
    return { wrap, input };
  };
  const kcal = num('kcal', 'kcal');
  const protein = num('protein', 'g');
  const fat = num('fat', 'g');
  const carbs = num('carbs', 'g');
  const piece = numberInput({
    value: food?.pieceGrams ? formatQuantity(food.pieceGrams) : '',
    suffix: 'g', id: `${p}-piece`, placeholder: 'neobvezno',
  });

  const fKcal = field('Kalorije', kcal.wrap, { forId: `${p}-kcal` });
  const fProtein = field('Beljakovine', protein.wrap, { forId: `${p}-protein` });
  const fFat = field('Maščobe', fat.wrap, { forId: `${p}-fat` });
  const fCarbs = field('Ogljikovi hidrati', carbs.wrap, { forId: `${p}-carbs` });
  const fPiece = field('Teža enega kosa', piece.wrap, {
    forId: `${p}-piece`,
    hint: 'Neobvezno. Če jo vpišeš, lahko živilo vnašaš v gramih in v kosih (npr. jajce = 60 g).',
  });

  const valuesTitle = h('div', { class: 'section-title', style: 'margin-top:6px' });
  function updateLabels() {
    valuesTitle.textContent = `Hranilne vrednosti ${basisLabel()}`;
  }
  updateLabels();

  const saveBtn = h('button', { class: 'btn block', type: 'button' }, isEdit ? 'Shrani spremembe' : 'Dodaj živilo');
  const deleteBtn = isEdit ? h('button', { class: 'btn danger block', type: 'button' }, 'Izbriši živilo') : null;

  const content = h(
    'div',
    {},
    fName.el,
    fBasis.el,
    valuesTitle,
    fKcal.el,
    h('div', { class: 'grid-2' }, fProtein.el, fFat.el),
    fCarbs.el,
    fPiece.el,
    h('div', { class: 'actions' }, saveBtn, deleteBtn),
  );

  const sheet = openSheet({ title: isEdit ? 'Uredi živilo' : 'Novo živilo', content });
  if (!isEdit) setTimeout(() => nameInput.focus(), 50);

  const fields = { name: fName, kcal: fKcal, protein: fProtein, fat: fFat, carbs: fCarbs, pieceGrams: fPiece, basis: fBasis };

  saveBtn.addEventListener('click', async () => {
    const raw = {
      name: nameInput.value,
      basis,
      kcal: kcal.input.value,
      protein: protein.input.value,
      fat: fat.input.value,
      carbs: carbs.input.value,
      pieceGrams: piece.input.value,
    };
    const res = validateFood(raw);
    const errors = { ...res.errors };

    if (!errors.name) {
      const n = normalizeForSearch(raw.name);
      const all = await db.getFoods();
      if (all.some((f) => f.id !== food?.id && normalizeForSearch(f.name) === n)) {
        errors.name = 'Živilo s tem imenom že obstaja.';
      }
    }
    for (const [k, f] of Object.entries(fields)) f.setError(errors[k]);
    if (Object.keys(errors).length) {
      const firstBad = Object.keys(fields).find((k) => errors[k]);
      fields[firstBad]?.el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }

    const saved = {
      ...(food || {}),
      ...res.food,
      id: food?.id ?? db.newId(),
      createdAt: food?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    };
    await db.put('foods', saved);
    toast(isEdit ? 'Živilo posodobljeno' : 'Živilo dodano');
    sheet.close();
    onSaved?.(saved);
  });

  deleteBtn?.addEventListener('click', async () => {
    const used = await db.countEntriesForFood(food.id);
    const msg = used
      ? `Živilo »${food.name}« je uporabljeno v ${used} ${vnosih(used)} v dnevniku.\n\n` +
        'Pretekli vnosi ostanejo nespremenjeni (hranijo svoje vrednosti), živila pa ne bo več v knjižnici.\n\nIzbrišem?'
      : `Izbrišem živilo »${food.name}«?`;
    if (!confirm(msg)) return;
    await db.remove('foods', food.id);
    toast('Živilo izbrisano');
    sheet.close();
  });
}

function vnosih(n) {
  const m = n % 100;
  if (m === 1) return 'vnosu';
  if (m === 2) return 'vnosih';
  return 'vnosih';
}
