import { test, eq } from './harness.js';
import { mergeSettings, DEFAULT_SETTINGS } from '../js/logic/settings.js';

test('mergeSettings dopolni manjkajoča polja s privzetimi', () => {
  const s = mergeSettings({ goals: { kcal: 1800 }, tolerancePct: 0 });
  eq(s.goals.kcal, 1800);
  eq(s.goals.protein, DEFAULT_SETTINGS.goals.protein);
  eq(s.tolerancePct, 0);
  eq(s.weightGoal.rateKgPerWeek, -0.5);
  eq(mergeSettings(null).goals.kcal, 2000);
});
