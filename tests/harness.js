// Minimalno ogrodje za teste, ki deluje v brskalniku in v Node.js.
const tests = [];

export function test(name, fn) {
  tests.push({ name, fn });
}

const show = (v) => JSON.stringify(v);

export function eq(actual, expected, msg = '') {
  if (!Object.is(actual, expected)) {
    throw new Error(`${msg} pričakovano ${show(expected)}, dobljeno ${show(actual)}`.trim());
  }
}

export function near(actual, expected, eps = 1e-9, msg = '') {
  if (!(Math.abs(actual - expected) <= eps)) {
    throw new Error(`${msg} pričakovano ≈${expected} (±${eps}), dobljeno ${actual}`.trim());
  }
}

export function deepEq(actual, expected, msg = '') {
  if (show(actual) !== show(expected)) {
    throw new Error(`${msg} pričakovano ${show(expected)}, dobljeno ${show(actual)}`.trim());
  }
}

export function throws(fn, msg = '') {
  try {
    fn();
  } catch {
    return;
  }
  throw new Error(`${msg} pričakovana napaka, a je ni bilo`.trim());
}

export async function run() {
  const results = [];
  for (const t of tests) {
    try {
      await t.fn();
      results.push({ name: t.name, ok: true });
    } catch (e) {
      results.push({ name: t.name, ok: false, error: e.message });
    }
  }
  return results;
}
