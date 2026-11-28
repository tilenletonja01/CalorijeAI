// Zaslon Nastavitve. Spremembe se shranijo samodejno.
import { h, numberInput, segmented, toast } from './components.js';
import { ACTIVITY_LEVELS } from '../logic/settings.js';
import { validateNumber, formatQuantity, formatKcal } from '../logic/numbers.js';
import { todayISO } from '../logic/dates.js';
import * as db from '../db.js';

export async function renderSettings(container) {
  const s = await db.getSettings();

  const save = async (msg = 'Shranjeno') => {
    await db.saveSettings(s);
    toast(msg);
  };

  /** Vrstica s številskim poljem; shrani ob zaključku urejanja, če je vrednost veljavna. */
  function numRow({ label, sub, value, suffix, rules, onValid }) {
    const { wrap, input } = numberInput({ value: value == null ? '' : formatQuantity(value), suffix, placeholder: rules.required === false ? '–' : '0' });
    input.setAttribute('aria-label', label);
    const err = h('div', { class: 'err hidden' });
    const row = h('div', { class: 'set-row wrap' },
      h('div', { class: 'label' }, label, sub ? h('small', {}, sub) : null), wrap, err);
    input.addEventListener('input', () => {
      err.classList.add('hidden');
      input.classList.remove('invalid');
    });
    input.addEventListener('change', async () => {
      const r = validateNumber(input.value, rules);
      if (!r.ok) {
        err.textContent = r.error;
        err.classList.remove('hidden');
        input.classList.add('invalid');
        return;
      }
      input.value = r.value == null ? '' : formatQuantity(r.value);
      await onValid(r.value);
    });
    return row;
  }

  // ===== Dnevni cilji =====
  const macroKcal = h('p', { class: 'note num' });
  const updateMacroKcal = () => {
    const g = s.goals;
    const k = g.protein * 4 + g.fat * 9 + g.carbs * 4;
    macroKcal.textContent = `Makrohranila skupaj dajo ${formatKcal(k)} kcal (B × 4 + M × 9 + OH × 4); kalorični cilj je ${formatKcal(g.kcal)} kcal.`;
  };
  updateMacroKcal();
  const goalRow = (key, label, suffix, sub) => numRow({
    label, sub, suffix, value: s.goals[key],
    rules: key === 'kcal' ? { positive: true, max: 10000 } : { max: 1000 },
    onValid: async (v) => {
      s.goals[key] = v;
      updateMacroKcal();
      await save();
    },
  });
  const goals = h('div', { class: 'card' },
    goalRow('kcal', 'Kalorije', 'kcal'),
    goalRow('protein', 'Beljakovine', 'g', 'Pogosto 1,6–2,2 g na kg telesne teže'),
    goalRow('fat', 'Maščobe', 'g'),
    goalRow('carbs', 'Ogljikovi hidrati', 'g'));

  // ===== Osebni podatki =====
  const sexSeg = segmented(
    [{ value: 'm', label: 'Moški' }, { value: 'f', label: 'Ženska' }],
    s.profile.sex,
    async (v) => {
      s.profile.sex = v;
      await save();
    },
  );
  const activityChoices = h('div', {});
  const renderActivity = () => {
    activityChoices.replaceChildren(...ACTIVITY_LEVELS.map((a) =>
      h('button', {
        class: 'choice', type: 'button', 'aria-pressed': String(s.profile.activity === a.value),
        onclick: async () => {
          s.profile.activity = a.value;
          renderActivity();
          await save();
        },
      },
      h('span', { class: 'dot' }),
      h('span', {}, h('b', {}, a.label), h('small', {}, a.desc)),
      h('span', { class: 'factor num' }, `× ${String(a.value).replace('.', ',')}`))));
  };
  renderActivity();

  const activityHelp = h('details', { class: 'help' },
    h('summary', {}, 'Kako izbrati raven aktivnosti?'),
    h('div', {},
      h('p', { style: 'margin-top:0' }, 'Upoštevaj povprečen teden v zadnjem mesecu, ne najboljšega:'),
      h('ul', {},
        h('li', {}, 'Koraki štejejo največ. Povprečje vidiš v aplikaciji Zdravje (Health) → Koraki → T (teden) ali M (mesec).'),
        h('li', {}, 'Trening šteje, če traja vsaj ~45 minut in se oznojiš (fitnes, tek, kolo, nogomet). Sprehod ni trening, je že v korakih.'),
        h('li', {}, 'Če si med dvema ravnema, izberi nižjo. Ljudje aktivnost skoraj vedno precenimo, prenizka ocena pa je pri hujšanju varnejša.')),
      h('p', {}, 'Primeri: pisarna + 6000 korakov + 2 treninga na teden → Rahlo aktiven. Pisarna + 9000 korakov + 4 treningi → Zmerno aktiven. Natakar ali gradbinec → najmanj Zelo aktiven.'),
      h('p', { style: 'margin-bottom:0' }, 'To je samo začetna ocena. Po 2–3 tednih rednega beleženja hrane in teže bo aplikacija porabo izračunala iz tvojih podatkov in izbira tu ne bo več pomembna.')));

  const profile = h('div', { class: 'card' },
    h('div', { class: 'set-row' }, h('div', { class: 'label' }, 'Spol'), h('div', { style: 'width:180px' }, sexSeg.el)),
    numRow({
      label: 'Starost', suffix: 'let', value: s.profile.age, rules: { required: false, min: 14, max: 100 },
      onValid: async (v) => { s.profile.age = v; await save(); },
    }),
    numRow({
      label: 'Višina', suffix: 'cm', value: s.profile.heightCm, rules: { required: false, min: 100, max: 250 },
      onValid: async (v) => { s.profile.heightCm = v; await save(); },
    }),
    h('div', { class: 'set-row stack' },
      h('div', { class: 'label' }, 'Raven aktivnosti', h('small', {}, 'Vsakodnevno gibanje in trening skupaj')),
      activityChoices,
      activityHelp));

  // ===== Cilj teže =====
  const rate = s.weightGoal.rateKgPerWeek ?? 0;
  let direction = rate < 0 ? 'lose' : rate > 0 ? 'gain' : 'keep';
  let amount = Math.abs(rate) || 0.5;
  const applyRate = async () => {
    s.weightGoal.rateKgPerWeek = direction === 'keep' ? 0 : direction === 'lose' ? -amount : amount;
    await save();
  };
  const rateRow = numRow({
    label: 'Tempo', sub: 'Priporočljivo: hujšanje 0,25–0,75 kg, pridobivanje 0,1–0,35 kg na teden',
    suffix: 'kg/t', value: amount, rules: { positive: true, max: 2 },
    onValid: async (v) => { amount = v; await applyRate(); },
  });
  rateRow.classList.toggle('hidden', direction === 'keep');
  const dirSeg = segmented(
    [{ value: 'lose', label: 'Hujšanje' }, { value: 'keep', label: 'Vzdrževanje' }, { value: 'gain', label: 'Pridobivanje' }],
    direction,
    async (v) => {
      direction = v;
      rateRow.classList.toggle('hidden', v === 'keep');
      await applyRate();
    },
  );
  const weightGoal = h('div', { class: 'card' },
    numRow({
      label: 'Ciljna teža', suffix: 'kg', value: s.weightGoal.targetKg, rules: { required: false, min: 30, max: 300 },
      onValid: async (v) => { s.weightGoal.targetKg = v; await save(); },
    }),
    h('div', { class: 'set-row stack' }, h('div', { class: 'label' }, 'Želim'), dirSeg.el),
    rateRow);

  // ===== Toleranca =====
  const tolerance = h('div', { class: 'card' },
    numRow({
      label: 'Toleranca za »cilj dosežen«', sub: 'Teden velja za uspešen, če je povprečje znotraj ± tega odstotka od cilja.',
      suffix: '%', value: s.tolerancePct, rules: { max: 50 },
      onValid: async (v) => { s.tolerancePct = v; await save(); },
    }));

  // ===== Podatki =====
  const fileInput = h('input', { type: 'file', accept: 'application/json,.json', class: 'hidden' });
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const err = db.validateBackup(data);
      if (err) throw new Error(err);
      const n = (k) => (data[k] || []).length;
      const ok = confirm(
        `Uvozim varnostno kopijo?\n\n${n('foods')} živil, ${n('entries')} vnosov, ${n('weights')} meritev teže.\n\n` +
        'POZOR: vsi trenutni podatki v aplikaciji bodo zamenjani.',
      );
      if (!ok) return;
      await db.importAll(data);
      toast('Podatki uvoženi');
    } catch (e) {
      alert(`Uvoz ni uspel: ${e.message}`);
    }
  });

  const persistNote = h('p', { class: 'note' });
  db.requestPersistence().then((p) => {
    persistNote.textContent = p
      ? 'Podatki so shranjeni samo na tej napravi in označeni kot trajni.'
      : 'Podatki so shranjeni samo na tej napravi. iOS lahko podatke spletnih aplikacij izjemoma izbriše, zato redno izvažaj varnostno kopijo (npr. enkrat na teden v Datoteke ali iCloud Drive).';
  });

  const data = h('div', { class: 'card' },
    h('div', { class: 'actions', style: 'margin-top:0' },
      h('button', { class: 'btn secondary block', type: 'button', onclick: exportData }, 'Izvozi podatke (JSON)'),
      h('button', { class: 'btn secondary block', type: 'button', onclick: () => fileInput.click() }, 'Uvozi podatke iz JSON')),
    fileInput,
    persistNote);

  container.replaceChildren(
    h('header', { class: 'page-head' }, h('h1', {}, 'Nastavitve')),
    h('h2', { class: 'section-title' }, 'Dnevni cilji'), goals, macroKcal,
    h('h2', { class: 'section-title' }, 'Osebni podatki'), profile,
    h('p', { class: 'note' }, 'Uporabijo se za začetno oceno porabe (TDEE), dokler ni dovolj tvojih podatkov.'),
    h('h2', { class: 'section-title' }, 'Cilj teže'), weightGoal,
    h('h2', { class: 'section-title' }, 'Toleranca'), tolerance,
    h('h2', { class: 'section-title' }, 'Varnostna kopija'), data,
  );
}

async function exportData() {
  const data = await db.exportAll();
  const json = JSON.stringify(data, null, 2);
  const name = `kalorije-${todayISO()}.json`;
  const file = new File([json], name, { type: 'application/json' });
  // Na iPhonu odpre meni »Deli« (Shrani v Datoteke, AirDrop …).
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name });
      return;
    } catch (e) {
      if (e.name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(file);
  const a = h('a', { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
