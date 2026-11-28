import { test, eq } from './harness.js';
import {
  parseNumber, validateNumber, formatKcal, formatMacro, formatQuantity, roundKcal, roundMacro,
} from '../js/logic/numbers.js';

test('parseNumber: vejica in pika', () => {
  eq(parseNumber('0,5'), 0.5);
  eq(parseNumber('0.5'), 0.5);
  eq(parseNumber(' 12 '), 12);
  eq(parseNumber('1,'), 1);
  eq(parseNumber(',5'), 0.5);
  eq(parseNumber('1 000'), 1000);
  eq(parseNumber(3.2), 3.2);
});

test('parseNumber: neveljavni vnosi', () => {
  eq(Number.isNaN(parseNumber('')), true);
  eq(Number.isNaN(parseNumber('abc')), true);
  eq(Number.isNaN(parseNumber('1,2,3')), true);
  eq(Number.isNaN(parseNumber('1.2.3')), true);
  eq(Number.isNaN(parseNumber(null)), true);
  eq(Number.isNaN(parseNumber(Infinity)), true);
});

test('validateNumber: obvezno, negativno, neobvezno', () => {
  eq(validateNumber('').ok, false);
  eq(validateNumber('', { required: false }).ok, true);
  eq(validateNumber('', { required: false }).value, null);
  eq(validateNumber('-1').ok, false);
  eq(validateNumber('-1').error, 'Vrednost ne sme biti negativna.');
  eq(validateNumber('0').ok, true);
  eq(validateNumber('0', { positive: true }).ok, false);
  eq(validateNumber('2,5').value, 2.5);
  eq(validateNumber('x').ok, false);
  eq(validateNumber('150', { max: 100 }).ok, false);
});

test('zaokroževanje samo pri prikazu', () => {
  eq(formatKcal(123.5), '124');
  eq(formatKcal(123.49), '123');
  eq(formatMacro(12.345), '12,3');
  eq(formatMacro(12.35), '12,4');
  eq(formatMacro(0), '0,0');
  eq(formatMacro(-0.01), '0,0');
  eq(roundKcal(-0.2), 0);
  eq(roundMacro(7.04), 7);
});

test('formatQuantity', () => {
  eq(formatQuantity(0.5), '0,5');
  eq(formatQuantity(150), '150');
  eq(formatQuantity(1.333333), '1,33');
});
