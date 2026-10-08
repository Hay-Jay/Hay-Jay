import { HOURS_PER_TASK } from './economy.js';
/**
 * Career definitions. A shift is paid only after its tasks were genuinely done. Pay per shift = hourly wage x paid hours,
 * where one task = one paid hour (a 4-task shift is a 4-hour half-day). Hourly wages are 2026 Regina gross rates, in cents;
 * the game has no payroll deductions, so the shift pay is also the deposit. See docs/ECONOMY.md.
 */
const lv = (name, hourly, tasks, xpNeeded) => ({ name, hourly, hours: tasks * HOURS_PER_TASK, wage: hourly * tasks * HOURS_PER_TASK, xpNeeded, tasks });
export const JOBS = {
  retail: {
    id: 'retail', title: 'Retail Associate', employer: 'Prairie Corner Market', contact: 'market',
    blurb: 'Stock shelves and keep the aisles tidy. Carry boxes from the back room to the right shelves.',
    place: 'market', taskVerb: 'Stock shelf', applyDelay: 25,
    levels: [
      lv('Associate',        1650, 4, 0),
      lv('Senior Associate', 1850, 5, 400),
      lv('Shift Lead',       2100, 6, 1200),
    ],
  },
  stylist: {
    id: 'stylist', title: 'Sales Floor Stylist', employer: 'Prairie Threads', contact: 'threads',
    blurb: 'Refold displays and restock racks. Keep the floor looking sharp for customers.',
    place: 'threads', taskVerb: 'Restock rack', applyDelay: 25,
    levels: [
      lv('Floor Stylist',  1700, 4, 0),
      lv('Lead Stylist',   1950, 5, 450),
      lv('Store Manager',  2450, 6, 1400),
    ],
  },
};
export const XP_PER_TASK = 10;
export const MIN_SECONDS_PER_TASK = 6; // anti-exploit: a shift can't be completed faster than this
