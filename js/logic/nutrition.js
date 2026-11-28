// Izračun hranilnih vrednosti živil in vnosov.
import { validateNumber } from './numbers.js';

export const NUTRIENTS = ['kcal', 'protein', 'fat', 'carbs'];
export const BASIS_100G = '100g';
export const BASIS_PIECE = 'kos';

export function hasPieceWeight(food) {
  return Number.isFinite(food?.pieceGrams) && food.pieceGrams > 0;
}

/** Enota, v kateri so podane vrednosti živila. */
export function nativeUnit(food) {
  return food.basis === BASIS_PIECE ? 'kos' : 'g';
}

/** Razpoložljive enote za vnos. Brez teže kosa je na voljo samo osnovna enota. */
export function availableUnits(food) {
  const native = nativeUnit(food);
  if (!hasPieceWeight(food)) return [native];
  return [native, native === 'g' ? 'kos' : 'g'];
}

/** Množitelj, s katerim pomnožimo shranjene vrednosti živila. */
export function factorFor(food, quantity, unit) {
  if (!Number.isFinite(quantity) || quantity < 0) throw new Error('Neveljavna količina');
  if (!availableUnits(food).includes(unit)) throw new Error(`Enota »${unit}« ni na voljo za to živilo`);
  if (food.basis === BASIS_PIECE) {
    const pieces = unit === 'kos' ? quantity : quantity / food.pieceGrams;
    return pieces;
  }
  const grams = unit === 'g' ? quantity : quantity * food.pieceGrams;
  return grams / 100;
}

/** Količina v gramih, če jo je mogoče izračunati, sicer null. */
export function gramsFor(food, quantity, unit) {
  if (unit === 'g') return quantity;
  return hasPieceWeight(food) ? quantity * food.pieceGrams : null;
}

/** Izračunane (nezaokrožene) vrednosti za dano količino. */
export function calculate(food, quantity, unit) {
  const f = factorFor(food, quantity, unit);
  return {
    kcal: food.kcal * f,
    protein: food.protein * f,
    fat: food.fat * f,
    carbs: food.carbs * f,
  };
}

/** Posnetek hranilnih vrednosti živila, ki se shrani z vnosom. */
export function snapshotOf(food) {
  return {
    basis: food.basis,
    kcal: food.kcal,
    protein: food.protein,
    fat: food.fat,
    carbs: food.carbs,
    pieceGrams: hasPieceWeight(food) ? food.pieceGrams : null,
  };
}

/** Sestavi zapis vnosa z izračunanimi vrednostmi in posnetkom živila. */
export function buildEntry({ id, date, food, foodId, foodName, quantity, unit, createdAt }) {
  const snapshot = snapshotOf(food);
  return {
    id,
    date,
    foodId: foodId ?? food.id ?? null,
    foodName: foodName ?? food.name,
    quantity,
    unit,
    snapshot,
    ...calculate(snapshot, quantity, unit),
    createdAt: createdAt ?? Date.now(),
  };
}

/** Seštevek hranil seznama vnosov. */
export function sumNutrients(items) {
  const total = { kcal: 0, protein: 0, fat: 0, carbs: 0 };
  for (const it of items) for (const k of NUTRIENTS) total[k] += it[k] || 0;
  return total;
}

/**
 * Validira podatke živila iz obrazca (vrednosti so lahko nizi z vejico).
 * @returns {{ok: boolean, food: object|null, errors: Record<string,string>}}
 */
export function validateFood(raw) {
  const errors = {};
  const name = String(raw.name ?? '').trim();
  if (!name) errors.name = 'Vpiši ime živila.';
  const basis = raw.basis === BASIS_PIECE ? BASIS_PIECE : raw.basis === BASIS_100G ? BASIS_100G : null;
  if (!basis) errors.basis = 'Izberi osnovo vrednosti.';
  const out = { name, basis };
  for (const k of NUTRIENTS) {
    const r = validateNumber(raw[k], { required: true });
    if (!r.ok) errors[k] = r.error;
    else out[k] = r.value;
  }
  const pw = validateNumber(raw.pieceGrams, { required: false, positive: true });
  if (!pw.ok) errors.pieceGrams = pw.error;
  else out.pieceGrams = pw.value;
  const ok = Object.keys(errors).length === 0;
  return { ok, food: ok ? out : null, errors };
}

/** Normalizira niz za iskanje (brez velikih črk in strešic: »cesen« najde »Česen«). */
export function normalizeForSearch(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** Filtrira in razvrsti živila po iskalnem nizu. Najprej zadetki na začetku imena, nato nedavno uporabljena. */
export function filterFoods(foods, query) {
  const q = normalizeForSearch(query);
  const byRecent = (a, b) =>
    (b.lastUsedAt || 0) - (a.lastUsedAt || 0) || a.name.localeCompare(b.name, 'sl');
  if (!q) return [...foods].sort(byRecent);
  const scored = [];
  for (const f of foods) {
    const n = normalizeForSearch(f.name);
    const idx = n.indexOf(q);
    if (idx === -1) continue;
    const wordStart = idx === 0 || /\s/.test(n[idx - 1]);
    scored.push({ f, rank: idx === 0 ? 0 : wordStart ? 1 : 2 });
  }
  scored.sort((a, b) => a.rank - b.rank || byRecent(a.f, b.f));
  return scored.map((s) => s.f);
}
