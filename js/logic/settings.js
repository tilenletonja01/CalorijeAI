// Privzete nastavitve in ravni aktivnosti.

export const DEFAULT_SETTINGS = {
  goals: { kcal: 2000, protein: 120, fat: 70, carbs: 220 },
  profile: { sex: null, age: null, heightCm: null, activity: null },
  weightGoal: { targetKg: null, rateKgPerWeek: -0.5 },
  tolerancePct: 5,
};

/** Ravni aktivnosti (faktor za Mifflin-St Jeor) z navodili za izbiro. */
export const ACTIVITY_LEVELS = [
  {
    value: 1.2,
    label: 'Sedeč',
    desc: 'Sedeče delo, malo hoje (pod ~5000 korakov na dan), brez rednega treninga.',
  },
  {
    value: 1.375,
    label: 'Rahlo aktiven',
    desc: 'Sedeče delo, a 5000–7500 korakov na dan ali 1–3 lažji treningi na teden.',
  },
  {
    value: 1.55,
    label: 'Zmerno aktiven',
    desc: '7500–10.000 korakov na dan ali 3–5 treningov na teden (npr. fitnes, tek).',
  },
  {
    value: 1.725,
    label: 'Zelo aktiven',
    desc: 'Nad 10.000 korakov na dan in 6–7 treningov na teden ali delo na nogah ves dan.',
  },
  {
    value: 1.9,
    label: 'Izjemno aktiven',
    desc: 'Težko fizično delo in trening ali dva treninga na dan (vrhunski šport).',
  },
];

/** Združi shranjene nastavitve s privzetimi (za manjkajoča polja). */
export function mergeSettings(saved) {
  const s = saved || {};
  return {
    goals: { ...DEFAULT_SETTINGS.goals, ...(s.goals || {}) },
    profile: { ...DEFAULT_SETTINGS.profile, ...(s.profile || {}) },
    weightGoal: { ...DEFAULT_SETTINGS.weightGoal, ...(s.weightGoal || {}) },
    tolerancePct: s.tolerancePct ?? DEFAULT_SETTINGS.tolerancePct,
  };
}
