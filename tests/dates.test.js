import { test, eq } from './harness.js';
import { addDays, mondayOf, daysBetween, isValidISODate, formatDayLong, formatDateShort } from '../js/logic/dates.js';

test('mondayOf: tedni od ponedeljka do nedelje', () => {
  eq(mondayOf('2026-11-23'), '2026-11-23'); // ponedeljek
  eq(mondayOf('2026-11-24'), '2026-11-23'); // torek
  eq(mondayOf('2026-11-29'), '2026-11-23'); // nedelja
  eq(mondayOf('2026-11-30'), '2026-11-30'); // naslednji ponedeljek
  eq(mondayOf('2027-01-01'), '2026-12-28'); // čez novo leto
});

test('addDays čez menjavo ure in mesecev', () => {
  eq(addDays('2026-03-28', 1), '2026-03-29');
  eq(addDays('2026-03-29', 1), '2026-03-30'); // poletni čas
  eq(addDays('2026-10-25', 1), '2026-10-26'); // zimski čas
  eq(addDays('2026-02-28', 1), '2026-03-01');
  eq(addDays('2026-01-01', -1), '2025-12-31');
});

test('daysBetween', () => {
  eq(daysBetween('2026-03-01', '2026-04-01'), 31);
  eq(daysBetween('2026-11-24', '2026-11-24'), 0);
  eq(daysBetween('2026-11-24', '2026-11-20'), -4);
});

test('isValidISODate', () => {
  eq(isValidISODate('2026-02-29'), false);
  eq(isValidISODate('2028-02-29'), true);
  eq(isValidISODate('2026-13-01'), false);
  eq(isValidISODate('24.11.2026'), false);
});

test('slovenski zapis datuma', () => {
  eq(formatDayLong('2026-11-24'), 'torek, 24. november');
  eq(formatDateShort('2026-11-24'), '24. 11. 2026');
});
