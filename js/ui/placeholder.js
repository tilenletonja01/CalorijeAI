// Začasni zasloni za funkcije iz poznejših faz.
import { h } from './components.js';

export function renderPlaceholder(container, title, text) {
  container.replaceChildren(
    h('header', { class: 'page-head' }, h('h1', {}, title)),
    h('div', { class: 'card placeholder' }, h('h2', {}, 'Kmalu'), h('p', {}, text)),
  );
}
