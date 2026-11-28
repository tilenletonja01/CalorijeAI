// Skupni gradniki uporabniškega vmesnika.
import { formatKcal, formatMacro } from '../logic/numbers.js';

/** Ustvari element: h('div', {class: 'x', onclick: fn}, 'besedilo', otrok) */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

/** Iskalno polje z ikono lupe. */
export function searchField(placeholder) {
  const input = h('input', {
    class: 'input', type: 'search', placeholder,
    autocomplete: 'off', autocorrect: 'off', enterkeyhint: 'search', 'aria-label': placeholder,
  });
  const icon = h('span', {
    class: 'ico',
    html: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M15.5 15.5L20 20" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  });
  return { wrap: h('div', { class: 'input-wrap search' }, icon, input), input };
}

/** Polje za vnos števil: na iPhonu odpre numerično tipkovnico z decimalno vejico. */
export function numberInput({ value = '', placeholder = '', suffix = '', id, decimal = true } = {}) {
  const input = h('input', {
    class: `input num${suffix ? ' has-suffix' : ''}`,
    type: 'text',
    inputmode: decimal ? 'decimal' : 'numeric',
    autocomplete: 'off',
    autocorrect: 'off',
    spellcheck: 'false',
    enterkeyhint: 'done',
    placeholder,
    id,
  });
  input.value = value;
  // Tipka »Končano« zapre tipkovnico.
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') input.blur();
  });
  const wrap = h('div', { class: 'input-wrap' }, input, suffix ? h('span', { class: 'suffix' }, suffix) : null);
  return { wrap, input };
}

/** Polje z oznako, namigom in sporočilom o napaki. */
export function field(label, control, { hint, forId } = {}) {
  const error = h('span', { class: 'error hidden' });
  const el = h(
    'div',
    { class: 'field' },
    h(forId ? 'label' : 'span', { class: 'label', for: forId }, label),
    control,
    hint ? h('span', { class: 'hint' }, hint) : null,
    error,
  );
  const setError = (msg) => {
    error.textContent = msg || '';
    error.classList.toggle('hidden', !msg);
    el.querySelector('.input')?.classList.toggle('invalid', !!msg);
  };
  return { el, setError };
}

/** Segmentni izbirnik (npr. g / kos). */
export function segmented(options, value, onChange) {
  const el = h('div', { class: 'seg', role: 'group' });
  let current = value;
  const buttons = options.map((o) =>
    h('button', {
      type: 'button',
      'aria-pressed': String(o.value === current),
      onclick: () => {
        if (o.value === current) return;
        current = o.value;
        buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(options[i].value === current)));
        onChange(current);
      },
    }, o.label),
  );
  el.append(...buttons);
  return { el, get value() { return current; } };
}

/** Obroč napredka za kalorije. */
export function calorieRing(consumed, goal) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const ratio = goal > 0 ? consumed / goal : 0;
  const over = goal > 0 && consumed > goal;
  // Ob preseženju se obroč zapolni in spremeni barvo.
  const offset = c * (1 - Math.min(ratio, 1));
  const svg = `
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <circle class="track" cx="60" cy="60" r="${r}" fill="none" stroke-width="11"/>
      <circle class="bar" cx="60" cy="60" r="${r}" fill="none" stroke-width="11"
        stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${offset}"/>
    </svg>`;
  return h(
    'div',
    { class: `ring${over ? ' over' : ''}`, role: 'img', 'aria-label': `Zaužito ${formatKcal(consumed)} od ${formatKcal(goal)} kcal` },
    h('div', { html: svg, style: 'width:100%;height:100%' }),
    h(
      'div',
      { class: 'center' },
      h('div', { class: 'big num' }, formatKcal(consumed)),
      h('div', { class: 'of num' }, `/ ${formatKcal(goal)} kcal`),
    ),
  );
}

/** Vrstica napredka za makrohranilo. */
export function macroBar(kind, label, consumed, goal) {
  const pct = goal > 0 ? Math.min(100, (consumed / goal) * 100) : 0;
  return h(
    'div',
    { class: `macro ${kind}` },
    h('span', { class: 'name' }, label),
    h('span', { class: 'val num' }, h('b', {}, formatMacro(consumed)), ` / ${formatMacro(goal).replace(/,0$/, '')} g`),
    h('div', { class: 'pbar' }, h('i', { style: `width:${pct}%` })),
  );
}

/** Kratek zapis makrohranil: B 12,3 · M 4,0 · OH 20,1 */
export function macrosInline(v) {
  return h(
    'span',
    { class: 'macros-inline num' },
    h('span', { class: 'p' }, `B ${formatMacro(v.protein)}`),
    ' · ',
    h('span', {}, `M ${formatMacro(v.fat)}`),
    ' · ',
    h('span', {}, `OH ${formatMacro(v.carbs)}`),
  );
}

// ===== Spodnji list =====
let openSheets = 0;

/**
 * Odpre spodnji list.
 * @returns {{close: () => void, body: HTMLElement, setTitle: (t: string) => void, setLeft: (el) => void}}
 */
export function openSheet({ title, content, onClose, left } = {}) {
  const root = document.getElementById('sheet-root');
  const overlay = h('div', { class: 'sheet-overlay' });
  const titleEl = h('h2', {}, title || '');
  const leftSlot = h('div', { class: 'left' });
  const body = h('div', { class: 'sheet-body' });
  const closeBtn = h('button', { class: 'link-btn right', type: 'button' }, 'Zapri');
  const sheet = h(
    'div',
    { class: 'sheet', role: 'dialog', 'aria-modal': 'true' },
    h('div', { class: 'sheet-head' }, leftSlot, titleEl, closeBtn),
    body,
  );
  if (left) leftSlot.append(left);
  if (content) body.append(content);
  root.append(overlay, sheet);
  openSheets++;
  document.body.classList.add('sheet-open');
  requestAnimationFrame(() => {
    overlay.classList.add('open');
    sheet.classList.add('open');
  });

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    document.activeElement?.blur?.();
    overlay.classList.remove('open');
    sheet.classList.remove('open');
    setTimeout(() => {
      overlay.remove();
      sheet.remove();
      openSheets--;
      if (!openSheets) document.body.classList.remove('sheet-open');
    }, 280);
    onClose?.();
  };
  overlay.addEventListener('click', close);
  closeBtn.addEventListener('click', close);
  return {
    close,
    body,
    setTitle: (t) => (titleEl.textContent = t),
    setLeft: (el) => leftSlot.replaceChildren(...(el ? [el] : [])),
  };
}

// Višina tipkovnice (iOS) – da je vsebina lista vedno nad njo.
if (window.visualViewport) {
  const update = () => {
    const kb = Math.max(0, window.innerHeight - window.visualViewport.height);
    document.documentElement.style.setProperty('--kb', `${kb}px`);
  };
  window.visualViewport.addEventListener('resize', update);
}

// ===== Obvestilo =====
let toastTimer;
export function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
}
