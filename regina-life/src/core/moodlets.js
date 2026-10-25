/**
 * "Why you feel this way" (docs/AMAZING.md G5): the reasons behind your mood, worded like a person would say them, from things the game already
 * knows (needs, your home's comfort, the real Regina weather, your day). Pure; it explains, it does not punish.
 * ctx = { temp, kind, night (0..1), home (true at home), cozy (homeBonuses().mood), paidToday (cents), outfitWarm (bool) }
 */
export function moodlets(s, ctx = {}) {
  const n = s?.needs ?? {}, out = [], add = (icon, text, v) => out.push({ icon, text, v });
  if ((n.hunger ?? 50) < 20) add('🍽️', 'Hungry. Time for a snack.', -4); else if ((n.hunger ?? 50) > 80) add('😋', 'Well fed', 2);
  if ((n.energy ?? 50) < 20) add('🥱', 'Running on empty. A nap would help.', -4); else if ((n.energy ?? 50) > 85) add('⚡', 'Full of energy', 2);
  if ((n.hygiene ?? 50) < 20) add('🚿', 'Could really use a shower', -3);
  if ((n.fun ?? 50) < 20) add('😐', 'Bored. Do something fun!', -3); else if ((n.fun ?? 50) > 80) add('🎉', 'Having a good time', 3);
  if (ctx.home && (ctx.cozy ?? 0) > 0.2) add('🛋️', 'Your place feels cozy', 2 + Math.round(ctx.cozy * 2));
  const t = ctx.temp ?? 10;
  if (ctx.kind === 'clear' && (ctx.night ?? 0) < 0.4 && t > -20) add('☀️', t < -5 ? 'Bright, cold prairie sunshine' : 'A sunny Regina day', 2);
  if (ctx.kind === 'snow' && !ctx.home) add('❄️', 'Snow coming down', 1);
  if (ctx.kind === 'rain' && ctx.home) add('🌧️', 'Cozy inside while it rains', 2);
  if (t <= -15 && !ctx.home) add('🥶', ctx.outfitWarm ? `It's ${t}° but you're bundled up` : `${t}°! You need warmer clothes`, ctx.outfitWarm ? 0 : -3);
  if (t >= 30 && !ctx.home) add('🥵', `${t}° in the shade`, -2);
  if ((ctx.paidToday ?? 0) > 0) add('💵', 'Got paid today', 2);
  if (s?.partner) add('💞', 'Someone special in your life', 2);
  return out.sort((a, b) => Math.abs(b.v) - Math.abs(a.v)).slice(0, 6);
}
