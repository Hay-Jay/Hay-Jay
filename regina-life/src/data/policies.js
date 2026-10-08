/** Mayoral platforms — every policy has a concrete gameplay effect. Candidates and parties are entirely fictional. */
export const POLICIES = {
  cheap_groceries: { name: 'Prairie Food Fund', icon: '🧺', effect: 'Groceries cost 12% less', mult: { groceries: 0.88 } },
  fair_wages:      { name: 'Fair Wages Act', icon: '💼', effect: 'Shift pay is 10% higher', mult: { wages: 1.1 } },
  wardrobe_rebate: { name: 'Main Street Rebate', icon: '👕', effect: 'Clothing costs 10% less', mult: { clothing: 0.9 } },
  open_signs:      { name: 'Open Skies Signage Plan', icon: '📢', effect: 'Billboards cost 20% less', mult: { ads: 0.8 } },
  fit_city:        { name: 'Fit City Initiative', icon: '💪', effect: 'Workouts build Fitness 25% faster', mult: { fitness: 1.25 } },
};
export const CANDIDATES = [
  { id: 'lafontaine', name: 'Maggie Beaudry', emoji: '🧣', party: 'Prairie First', policy: 'cheap_groceries', slogan: 'Fill the fridge, fix the city.', base: 0.34 },
  { id: 'thompson',   name: 'Pat Thompson',   emoji: '🧢', party: 'Working Together', policy: 'fair_wages', slogan: 'A fair day, a fair wage.', base: 0.33 },
  { id: 'singh',      name: 'Harpreet Singh', emoji: '🧵', party: 'Main Street Alliance', policy: 'wardrobe_rebate', slogan: 'Back local. Dress local.', base: 0.3 },
  { id: 'okafor',     name: 'Ngozi Okafor',   emoji: '📣', party: 'Open Skies', policy: 'open_signs', slogan: 'Let businesses be seen.', base: 0.31 },
  { id: 'gill',       name: 'Dr. Ryan Gill',  emoji: '🏃', party: 'Healthy Regina', policy: 'fit_city', slogan: 'A city on the move.', base: 0.32 },
  { id: 'whitford',   name: 'Colleen Whitford', emoji: '🌾', party: 'Grain & Grit', policy: 'cheap_groceries', slogan: 'Honest food prices. Honest politics.', base: 0.3 },
];
export const CANDIDATE_BY_ID = Object.fromEntries(CANDIDATES.map((c) => [c.id, c]));
