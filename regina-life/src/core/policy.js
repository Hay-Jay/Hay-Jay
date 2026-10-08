import { POLICIES } from '../data/policies.js';
/** Active mayoral policy → multipliers. Kept dependency-free so game rules can use it without import cycles. */
export const activePolicyId = (s) => s.politics?.mayor?.policy ?? null;
export const activePolicy = (s) => POLICIES[activePolicyId(s)] ?? null;
/** area: 'groceries' | 'wages' | 'clothing' | 'ads' | 'fitness' */
export const policyMult = (s, area) => activePolicy(s)?.mult?.[area] ?? 1;

export const MAX_CAMPAIGN_POINTS = 6;               // per term
export const CANVASS_COOLDOWN_MS = 30_000;
