// Prints the live pacing tables used in docs/ECONOMY.md (run: node scripts/economy-report.mjs). Read-only; no browser needed.
import { JOBS } from '../src/data/jobs.js';
import { PACE, shiftPlayMinutes, incomePerPlayHour, weeklyIncome, STARTING_BALANCE, FIRST_FURNITURE_SET, REFERENCE_MONTHLY } from '../src/data/economy.js';
import { AD_TIERS, BILLBOARDS } from '../src/data/billboards.js';
import { PACKS, packRate } from '../src/data/packs.js';
import { DESTINATIONS } from '../src/data/destinations.js';
import { cabFare } from '../src/core/travel.js';

const $ = (c) => '$' + (c / 100).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const entry = JOBS.retail.levels[0].wage, week = weeklyIncome(entry);
console.log(`Pace: ${PACE.taskSeconds}s/task, ${PACE.efficiency * 100}% efficiency, ${PACE.shiftsPerWeek} shifts per casual week. Start ${$(STARTING_BALANCE)}.\n`);
console.log('JOBS');
for (const j of Object.values(JOBS)) for (const l of j.levels) {
  const min = shiftPlayMinutes(l.tasks);
  console.log(`  ${j.id.padEnd(8)} ${l.name.padEnd(17)} ${$(l.hourly)}/h x ${l.hours}h = ${$(l.wage).padStart(8)} | ${min.toFixed(1)} min | ${$(incomePerPlayHour(l.wage, l.tasks)).padStart(9)}/play-hour | week ${$(weeklyIncome(l.wage)).padStart(9)} | xp ${l.xpNeeded}`);
}
const need = Math.ceil((FIRST_FURNITURE_SET - STARTING_BALANCE) / entry);
console.log(`\nFirst furniture set ${$(FIRST_FURNITURE_SET)}: ${need} entry shifts (~${Math.round(need * shiftPlayMinutes(4))} min of play).`);
const monthly = Object.values(REFERENCE_MONTHLY).reduce((a, b) => a + b, 0), weekly = (monthly * 12) / 52;
console.log(`Essentials ${$(monthly)}/month = ${$(weekly)}/week = ${(weekly / entry).toFixed(1)} entry shifts (${Math.round((weekly / week) * 100)}% of a casual week).`);
console.log('\nAD TIERS (7 days)');
for (const t of Object.values(AD_TIERS)) console.log(`  ${t.id.padEnd(9)} ${$(t.price).padStart(10)} | ${(t.price / week).toFixed(1)} entry weeks | CA$${t.realMoney.cents / 100} real | rotation ${t.maxRotation} | boards: ${BILLBOARDS.filter((b) => b.adTier === t.id).map((b) => b.id).join(', ')}`);
console.log('\nPACKS');
for (const p of PACKS) console.log(`  ${p.id.padEnd(10)} ${$(p.amount).padStart(10)} for CA$${(p.priceCad / 100).toFixed(2).padStart(5)} | ${packRate(p).toFixed(1)} PD/CAD | ${(p.amount / week).toFixed(2)} entry weeks`);
console.log('\nTRIPS (return)');
for (const d of DESTINATIONS) for (const [m, v] of Object.entries(d.modes)) console.log(`  ${d.name.padEnd(10)} ${m.padEnd(7)} ${$(v.fare).padStart(8)} | ${(v.fare / entry).toFixed(1)} entry shifts`);
console.log(`\nQuick Cab: 1 km ${$(cabFare(1000))}, 5 km ${$(cabFare(5000))}, 10 km ${$(cabFare(10000))}`);
