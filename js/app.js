// Zagon aplikacije in preklapljanje med zavihki.
import { renderDay } from './ui/day.js';
import { renderLibrary } from './ui/library.js';
import { renderSettings } from './ui/settings.js';
import { renderPlaceholder } from './ui/placeholder.js';
import { todayISO } from './logic/dates.js';

const view = document.getElementById('view');
const tabs = [...document.querySelectorAll('.tab')];

const screens = {
  today: (el) => renderDay(el, todayISO()),
  history: (el) => renderPlaceholder(el, 'Zgodovina', 'Seznam dni s tedenskimi povzetki pride v fazi 2.'),
  weight: (el) => renderPlaceholder(el, 'Teža', 'Vnos teže, trendi in priporočen vnos pridejo v fazi 3.'),
  library: (el) => renderLibrary(el),
  settings: (el) => renderSettings(el),
};

let current = 'today';
let renderedDate = todayISO();

async function show(tab, { keepScroll = false } = {}) {
  current = tab;
  renderedDate = todayISO();
  tabs.forEach((t) => (t.dataset.tab === tab ? t.setAttribute('aria-current', 'page') : t.removeAttribute('aria-current')));
  const y = window.scrollY;
  try {
    await screens[tab](view);
  } catch (e) {
    console.error(e);
    view.textContent = `Napaka: ${e.message}`;
  }
  window.scrollTo(0, keepScroll ? y : 0);
}

tabs.forEach((t) => t.addEventListener('click', () => {
  if (t.dataset.tab === current) window.scrollTo({ top: 0, behavior: 'smooth' });
  else show(t.dataset.tab);
}));

// Ko se podatki spremenijo, osveži trenutni zaslon.
// Nastavitve se urejajo na mestu, zato jih osvežimo le po uvozu.
window.addEventListener('data-changed', (e) => {
  if (current === 'settings' && !e.detail?.reload) return;
  show(current, { keepScroll: true });
});

// Če je aplikacija odprta čez polnoč, ob vrnitvi pokaži nov dan.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && renderedDate !== todayISO() && current === 'today') {
    show('today');
  }
});

show('today');

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((e) => console.warn('Service worker:', e));
  });
}
