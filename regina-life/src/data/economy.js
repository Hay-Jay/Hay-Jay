/**
 * Economy constants + the pacing model (rationale and the full old/new table: docs/ECONOMY.md).
 * Amounts are integer cents of Prairie Dollars (fictional in-game currency, shown as $), calibrated to 2026 Canadian
 * dollars in Regina, SK. "Pacing" values describe REAL PLAY TIME and are used by docs/tests only, never by game rules.
 */
export const STARTING_BALANCE = 40000;     // a newcomer's chequing balance: groceries and a treat, not a furnished flat
/** One shift task = one paid hour, so a 4-task shift is a 4-hour half-day shift: pay = hourly wage x hours (see jobs.js). */
export const HOURS_PER_TASK = 1;
/** Reference minimum wage, Saskatchewan (Oct 2025 rate; the Oct 2026 indexation may add a few cents — unverified). */
export const SK_MIN_WAGE = 1535;
/**
 * Pacing model. taskSeconds: pick-up + carry + stock at a normal walking pace; shiftSetupSeconds: clock in/out chat;
 * efficiency: share of a "working" play-hour actually spent in shifts (walking to work, sleeping, eating, phone).
 * shiftsPerWeek: a casual week (about an hour of shift play spread over ~3 hours of play).
 */
export const PACE = { taskSeconds: 25, shiftSetupSeconds: 20, efficiency: 0.7, shiftsPerWeek: 20, playHoursPerWeek: 3 };
/** Real play minutes one shift of `tasks` tasks takes, including the walking/idle overhead of a working hour. */
export const shiftPlayMinutes = (tasks) => (tasks * PACE.taskSeconds + PACE.shiftSetupSeconds) / 60 / PACE.efficiency;
/** Income of a focused play-hour spent working at `shiftPay` (cents) for a shift of `tasks` tasks. */
export const incomePerPlayHour = (shiftPay, tasks) => Math.round((60 / shiftPlayMinutes(tasks)) * shiftPay);
/** A normal week's income at a given shift pay (cents). */
export const weeklyIncome = (shiftPay) => shiftPay * PACE.shiftsPerWeek;
/** The pacing target for "a first furniture set" (armchair, coffee table, rug, lamp, plant at realistic budget-retail prices). */
export const FIRST_FURNITURE_SET = 75000;
/** Monthly essentials of a single adult in Regina, for the pacing maths only (the game does not charge rent or bills yet). */
export const REFERENCE_MONTHLY = { rent: 110000, groceries: 42000, transit: 8800, phone: 5500, utilities: 12000, insurance: 2000 };
