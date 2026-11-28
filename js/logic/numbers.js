// Razčlenjevanje, validacija in prikaz števil.
// Shranjujemo nezaokrožene vrednosti; zaokrožujemo samo pri prikazu.

/** Prebere število iz niza; sprejme vejico ali piko kot decimalno ločilo. Vrne NaN, če ni veljavno. */
export function parseNumber(input) {
  if (typeof input === 'number') return Number.isFinite(input) ? input : NaN;
  if (input == null) return NaN;
  const s = String(input).trim().replace(/\s+/g, '').replace(',', '.');
  if (!/^[-+]?(\d+\.?\d*|\.\d+)$/.test(s)) return NaN;
  return parseFloat(s);
}

/**
 * Validira vnos števila.
 * @param {string|number|null} input
 * @param {{required?: boolean, min?: number, positive?: boolean, max?: number}} opts
 * @returns {{ok: boolean, value: number|null, error: string|null}}
 */
export function validateNumber(input, opts = {}) {
  const { required = true, min = 0, positive = false, max } = opts;
  const empty = input == null || String(input).trim() === '';
  if (empty) {
    return required
      ? { ok: false, value: null, error: 'Obvezno polje.' }
      : { ok: true, value: null, error: null };
  }
  const value = parseNumber(input);
  if (Number.isNaN(value)) return { ok: false, value: null, error: 'Vpiši število (npr. 12,5).' };
  if (value < 0 && min >= 0) return { ok: false, value: null, error: 'Vrednost ne sme biti negativna.' };
  if (positive && value <= 0) return { ok: false, value: null, error: 'Vrednost mora biti večja od 0.' };
  if (value < min) return { ok: false, value: null, error: `Najmanj ${formatQuantity(min)}.` };
  if (max != null && value > max) return { ok: false, value: null, error: `Največ ${formatQuantity(max)}.` };
  return { ok: true, value, error: null };
}

const noNegZero = (n) => (Object.is(n, -0) ? 0 : n);

/** Kalorije za prikaz: celo število. */
export function roundKcal(n) {
  return noNegZero(Math.round(n || 0));
}

export function formatKcal(n) {
  return String(roundKcal(n));
}

/** Makrohranila za prikaz: 1 decimalka, decimalna vejica. */
export function roundMacro(n) {
  return noNegZero(Math.round((n || 0) * 10) / 10);
}

export function formatMacro(n) {
  return roundMacro(n).toFixed(1).replace('.', ',');
}

/** Količina za prikaz/urejanje: največ 2 decimalki, brez odvečnih ničel. */
export function formatQuantity(n) {
  if (n == null || Number.isNaN(n)) return '';
  const r = noNegZero(Math.round(n * 100) / 100);
  return String(r).replace('.', ',');
}
