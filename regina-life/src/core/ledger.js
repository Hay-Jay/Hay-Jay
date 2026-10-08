/**
 * Ledger — the single place money moves.
 *
 * Written as pure, dependency-free rules so the *same file* can run on an authoritative server later.
 * Until the backend exists the browser hosts it locally; the client UI never mutates balances directly.
 * Amounts are integer cents of Prairie Dollars (fictional in-game currency, no real-world value).
 */
export const MAX_TX = 100_000_000; // 1,000,000.00 per transaction
export const MAX_BALANCE = 10_000_000_000;
export const RATE_LIMIT = { count: 25, windowMs: 10_000 };

export const fmtMoney = (cents) => {
  const neg = cents < 0;
  const v = Math.abs(cents) / 100;
  return (neg ? '-' : '') + '$' + v.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export class Ledger {
  /** @param {{balance:number, history:any[]}} bank mutable bank slice of the save state */
  constructor(bank, { now = () => Date.now() } = {}) {
    this.bank = bank;
    this.now = now;
    this._recent = [];
  }
  get balance() { return this.bank.balance; }

  _validate(amount, memo) {
    if (!Number.isSafeInteger(amount)) return 'Invalid amount';
    if (amount <= 0) return 'Amount must be positive';
    if (amount > MAX_TX) return 'Amount exceeds transaction limit';
    if (typeof memo !== 'string' || !memo.trim()) return 'A description is required';
    const t = this.now();
    this._recent = this._recent.filter((x) => t - x < RATE_LIMIT.windowMs);
    if (this._recent.length >= RATE_LIMIT.count) return 'Too many transactions — slow down';
    return null;
  }
  _dupe(ref) { return ref && this.bank.history.some((h) => h.ref === ref); }
  _push(type, amount, memo, category, ref) {
    const tx = { id: `tx_${this.now().toString(36)}_${this.bank.history.length}`, t: this.now(), type, amount, memo: memo.slice(0, 80), category, ref: ref || null, balanceAfter: this.bank.balance };
    this.bank.history.unshift(tx);
    if (this.bank.history.length > 200) this.bank.history.length = 200;
    this._recent.push(this.now());
    return tx;
  }
  credit(amount, memo, { category = 'income', ref = null } = {}) {
    const err = this._validate(amount, memo);
    if (err) return { ok: false, error: err };
    if (this._dupe(ref)) return { ok: false, error: 'Duplicate transaction' };
    if (this.bank.balance + amount > MAX_BALANCE) return { ok: false, error: 'Balance limit reached' };
    this.bank.balance += amount;
    return { ok: true, tx: this._push('credit', amount, memo, category, ref) };
  }
  debit(amount, memo, { category = 'purchase', ref = null } = {}) {
    const err = this._validate(amount, memo);
    if (err) return { ok: false, error: err };
    if (this._dupe(ref)) return { ok: false, error: 'Duplicate transaction' };
    if (amount > this.bank.balance) return { ok: false, error: 'Insufficient funds' };
    this.bank.balance -= amount;
    return { ok: true, tx: this._push('debit', amount, memo, category, ref) };
  }
}
