// Collects everything the emulator, linter and tags want to complain about. Nothing is silent: render.mjs and serve.mjs
// print the list at the end, `--strict` turns warnings into a non-zero exit code.

const ORDER = { error: 0, warn: 1, info: 2 };
const ICON = { error: 'ERROR', warn: 'WARN ', info: 'info ' };

export class Warnings {
  constructor() { this.map = new Map(); this.ignored = new Set(); }
  ignore(...cats) { cats.flat().forEach(c => this.ignored.add(c)); return this; }
  add(level, category, message, loc = {}) {
    if (this.ignored.has(category)) return;
    const file = loc.file || '';
    const line = loc.line || 0;
    const key = `${level}|${category}|${message}|${file}|${line}`;
    const prev = this.map.get(key);
    if (prev) { prev.count++; return prev; }
    const item = { level, category, message, file, line, count: 1, hint: loc.hint || '' };
    this.map.set(key, item);
    return item;
  }
  error(category, message, loc) { return this.add('error', category, message, loc); }
  warn(category, message, loc) { return this.add('warn', category, message, loc); }
  info(category, message, loc) { return this.add('info', category, message, loc); }
  get list() { return [...this.map.values()].sort((a, b) => ORDER[a.level] - ORDER[b.level] || a.category.localeCompare(b.category) || a.file.localeCompare(b.file) || a.line - b.line); }
  get errors() { return this.list.filter(w => w.level === 'error'); }
  get warnings() { return this.list.filter(w => w.level === 'warn'); }
  count(level) { return this.list.filter(w => w.level === level).length; }
  clear() { this.map.clear(); }
  /** non-zero when there is an error, or (strict) any warning */
  exitCode(strict = false) { return this.count('error') || (strict && this.count('warn')) ? 1 : 0; }
  format({ info = false } = {}) {
    const items = this.list.filter(w => info || w.level !== 'info');
    if (!items.length) return 'No warnings.';
    const lines = [];
    for (const w of items) {
      const loc = w.file ? ` ${w.file}${w.line ? ':' + w.line : ''}` : '';
      lines.push(`${ICON[w.level]} [${w.category}]${loc}  ${w.message}${w.count > 1 ? `  (x${w.count})` : ''}${w.hint ? `\n        hint: ${w.hint}` : ''}`);
    }
    const e = this.count('error'), wn = this.count('warn');
    lines.push(`-- ${e} error${e === 1 ? '' : 's'}, ${wn} warning${wn === 1 ? '' : 's'}${info ? `, ${this.count('info')} info` : ''}`);
    return lines.join('\n');
  }
  toJSON() { return this.list; }
}
