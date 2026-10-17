import { ic } from './icons.mjs';

// The command bar shell. main.js fills the results from js/search-index.js the first time it opens.
export function cmdShell() {
  return `<div class="cmd" id="cmd" hidden>
  <div class="cmd-back" data-cmd-close></div>
  <div class="cmd-box glass" role="dialog" aria-modal="true" aria-label="Search and jump">
    <div class="cmd-in">
      ${ic('search')}
      <input id="cmdQ" type="text" role="combobox" aria-expanded="true" aria-controls="cmdList" aria-autocomplete="list" placeholder="Jump to a page or a piece" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Search pages and products">
      <button class="cmd-x" type="button" data-cmd-close aria-label="Close search">${ic('x')}</button>
    </div>
    <ul class="cmd-list" id="cmdList" role="listbox" aria-label="Results"></ul>
    <p class="cmd-foot mono"><span>UP / DOWN</span><span>ENTER OPEN</span><span>ESC CLOSE</span></p>
  </div>
</div>`;
}
