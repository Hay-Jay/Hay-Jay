// Inline SVG sprite, referenced as <svg class="ic"><use href="#i-ne"/></svg>
export const sprite = `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
  <symbol id="i-ne" viewBox="0 0 24 24"><path d="M7 17 17 7M8.5 7H17v8.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"/></symbol>
  <symbol id="i-up" viewBox="0 0 24 24"><path d="M12 20V4M5.5 10.5 12 4l6.5 6.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"/></symbol>
  <symbol id="i-down" viewBox="0 0 24 24"><path d="M12 4v16M5.5 13.5 12 20l6.5-6.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"/></symbol>
  <symbol id="i-left" viewBox="0 0 24 24"><path d="M20 12H4M10.5 5.5 4 12l6.5 6.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"/></symbol>
  <symbol id="i-right" viewBox="0 0 24 24"><path d="M4 12h16M13.5 5.5 20 12l-6.5 6.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"/></symbol>
  <symbol id="i-x" viewBox="0 0 24 24"><path d="M5 5l14 14M19 5 5 19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"/></symbol>
  <symbol id="i-search" viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M15 15l5.5 5.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"/></symbol>
  <symbol id="i-star" viewBox="0 0 24 24"><path d="M12 0Q13 11 24 12Q13 13 12 24Q11 13 0 12Q11 11 12 0Z" fill="currentColor"/></symbol>
</svg>`;

export const ic = (name, cls = '') => `<svg class="ic${cls ? ' ' + cls : ''}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
