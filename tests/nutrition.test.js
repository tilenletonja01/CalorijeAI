import { test, eq, near, deepEq, throws } from './harness.js';
import {
  availableUnits, calculate, buildEntry, sumNutrients, validateFood, filterFoods, normalizeForSearch, gramsFor,
} from '../js/logic/nutrition.js';

// Jajce: na 100 g 143 kcal, 12,6 B, 9,5 M, 0,7 OH; kos = 60 g
const egg100 = { basis: '100g', kcal: 143, protein: 12.6, fat: 9.5, carbs: 0.7, pieceGrams: 60 };
// Banana: na kos 105 kcal, 1,3 B, 0,4 M, 27 OH; kos = 120 g
const bananaPiece = { basis: 'kos', kcal: 105, protein: 1.3, fat: 0.4, carbs: 27, pieceGrams: 120 };
const rice = { basis: '100g', kcal: 130, protein: 2.7, fat: 0.3, carbs: 28, pieceGrams: null };
const bar = { basis: 'kos', kcal: 200, protein: 20, fat: 7, carbs: 15, pieceGrams: null };

test('na 100 g, vnos v gramih', () => {
  const r = calculate(egg100, 150, 'g');
  near(r.kcal, 214.5);
  near(r.protein, 18.9);
  near(r.fat, 14.25);
  near(r.carbs, 1.05);
});

test('na 100 g, vnos v kosih (grami = kosi × teža kosa)', () => {
  const r = calculate(egg100, 2, 'kos'); // 120 g
  near(r.kcal, 171.6);
  near(r.protein, 15.12);
  eq(gramsFor(egg100, 2, 'kos'), 120);
});

test('na kos, vnos v kosih', () => {
  const r = calculate(bananaPiece, 1.5, 'kos');
  near(r.kcal, 157.5);
  near(r.carbs, 40.5);
});

test('na kos, vnos v gramih (kosi = grami / teža kosa)', () => {
  const r = calculate(bananaPiece, 60, 'g'); // pol banane
  near(r.kcal, 52.5);
  near(r.protein, 0.65);
});

test('decimalne količine', () => {
  near(calculate(egg100, 0.5, 'kos').kcal, 42.9);
});

test('brez teže kosa je na voljo samo osnovna enota', () => {
  deepEq(availableUnits(rice), ['g']);
  deepEq(availableUnits(bar), ['kos']);
  deepEq(availableUnits(egg100), ['g', 'kos']);
  deepEq(availableUnits(bananaPiece), ['kos', 'g']);
  throws(() => calculate(rice, 1, 'kos'));
  throws(() => calculate(bar, 50, 'g'));
});

test('negativna količina ni dovoljena', () => {
  throws(() => calculate(rice, -5, 'g'));
});

test('vnos hrani posnetek; sprememba živila ne spremeni vnosa', () => {
  const food = { id: 'f1', name: 'Riž', ...rice };
  const e = buildEntry({ id: 'e1', date: '2026-11-24', food, quantity: 200, unit: 'g' });
  near(e.kcal, 260);
  eq(e.foodName, 'Riž');
  eq(e.snapshot.kcal, 130);
  food.kcal = 999; // kasnejša sprememba v knjižnici
  eq(e.snapshot.kcal, 130);
  near(e.kcal, 260);
  near(calculate(e.snapshot, 100, 'g').kcal, 130); // urejanje količine uporabi posnetek
});

test('seštevek hranil', () => {
  const s = sumNutrients([
    { kcal: 100.4, protein: 10.04, fat: 1, carbs: 2 },
    { kcal: 50.4, protein: 5.04, fat: 0, carbs: 3 },
  ]);
  near(s.kcal, 150.8);
  near(s.protein, 15.08);
  near(s.carbs, 5);
});

test('validateFood: obvezna polja, negativne vrednosti, vejica', () => {
  const ok = validateFood({ name: ' Jajce ', basis: '100g', kcal: '143', protein: '12,6', fat: '9.5', carbs: '0,7', pieceGrams: '60' });
  eq(ok.ok, true);
  eq(ok.food.name, 'Jajce');
  eq(ok.food.protein, 12.6);
  eq(ok.food.pieceGrams, 60);

  const bad = validateFood({ name: '', basis: '100g', kcal: '-5', protein: '', fat: '1', carbs: '1', pieceGrams: '0' });
  eq(bad.ok, false);
  eq(!!bad.errors.name, true);
  eq(!!bad.errors.kcal, true);
  eq(!!bad.errors.protein, true);
  eq(!!bad.errors.pieceGrams, true);
  eq(bad.errors.fat, undefined);

  const noPiece = validateFood({ name: 'Riž', basis: '100g', kcal: '130', protein: '2,7', fat: '0,3', carbs: '28', pieceGrams: '' });
  eq(noPiece.ok, true);
  eq(noPiece.food.pieceGrams, null);
});

test('iskanje: brez strešic in velikih črk, najprej začetek imena', () => {
  eq(normalizeForSearch('Česen ŠKAMPI'), 'cesen skampi');
  const foods = [
    { name: 'Kruh polnozrnati' },
    { name: 'Polnozrnati riž' },
    { name: 'Česen' },
  ];
  deepEq(filterFoods(foods, 'poln').map((f) => f.name), ['Polnozrnati riž', 'Kruh polnozrnati']);
  deepEq(filterFoods(foods, 'cesen').map((f) => f.name), ['Česen']);
  eq(filterFoods(foods, 'xyz').length, 0);
});

test('iskanje brez niza: nedavno uporabljena najprej', () => {
  const foods = [
    { name: 'A', lastUsedAt: 1 },
    { name: 'B', lastUsedAt: 5 },
    { name: 'C' },
  ];
  deepEq(filterFoods(foods, '').map((f) => f.name), ['B', 'A', 'C']);
});
