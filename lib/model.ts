// Token Radar — the value model (radar-3).
//
// The board ranks pre-token protocols by an implied value computed only from the
// snapshot's own figures. Nothing is keyed to a protocol name: the same function
// scores every row, and the dashboard shows the arithmetic for each row.
//
//   implied = round( tvl_scale(tvl_usd)
//                      x category_multiple(category)
//                      x (1 + clamp(change_7d, -50, 150) / 100 x 0.6)
//                      x (0.55 + min(age_days, 1460) / 1460 x 0.45)
//                      x (1 + 0.03 x min(chains - 1, 4))
//                      x momentum(age_days, change_7d) )
//
//   tvl_scale(tvl) = tvl ^ 0.85, normalised so a $50M protocol keeps its
//   dollar-for-dollar scale: tvl_scale = tvl x (tvl / 50_000_000) ^ -0.15.
//   Markets price size with saturation: a $10B protocol is not worth ten
//   times a $1B one, because the launch that would have to absorb it is
//   itself bounded by the same buyers. Without the exponent the board is
//   a TVL table with a coat of paint; with it, a well-run $200M protocol
//   can outrank a sleepy $2B one, which is the ranking a farmer needs.
//
//   momentum: a young protocol (listed under 180 days) whose TVL is still
//   growing fast is early in its curve, and early is when the farm is
//   cheapest. Up to +12% when growth is strong and the listing is fresh,
//   fading to nothing by 365 days or when growth is flat. It never rescues
//   a shrinking protocol: momentum is 1.00 whenever change_7d is not
//   positive.
//
//   risk_tier: every row carries a Low / Medium / High tier the dashboard
//   can show, from the same three signals a farmer checks by hand — a
//   wild 7d swing, a listing younger than 90 days, a single chain. High
//   means the implied value is the least certain, not that the protocol
//   is bad: the tier is a warning label on the number, never a filter.
//
// Why these terms:
// - category_multiple: markets pay more for a dollar of TVL that earns fees
//   (perpetuals, DEXes, basis trading) than for a dollar that merely sits in a
//   wrapper or a vault. The multiple is a property of the category, read from
//   the snapshot, never of a name. RWA and stablecoin issuers sit low because
//   their TVL is mostly someone else's asset held in custody.
// - growth: a protocol whose TVL grew 7d is worth more than one shrinking at
//   the same size; the clamp keeps one wild week from deciding the board.
// - maturity: a protocol tracked for years with no token on record has a
//   longer, steadier record to price than one listed last month. Age is the
//   time since DefiLlama first listed it; unknown age counts as 365 days.
// - chain breadth: a protocol live on several chains reaches more users and
//   more liquidity than a single-chain one at the same TVL, capped at 5 chains.
//
// "Pre-token" means the record carries no token: mcap, gecko_id and symbol are
// all null. The snapshot's record is not proof, so the board says a protocol
// "records no token", never that it has none.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The model's constants, as the dashboard states them. */
export interface ModelConstants {
  growth_weight: number;
  growth_floor: number;
  growth_cap: number;
  maturity_floor: number;
  maturity_range: number;
  maturity_days: number;
  unknown_age_days: number;
  chain_step: number;
  chain_cap: number;
  default_multiple: number;
  /** The TVL scale's reference size: a protocol at this TVL keeps its raw dollars. */
  tvl_reference_usd: number;
  /** The diminishing-returns exponent on TVL: 1.0 is linear, below 1.0 saturates. */
  tvl_exponent: number;
  /** The youngest a listing may be to earn any momentum. */
  momentum_age_days: number;
  /** The growth a young protocol needs before momentum starts to pay. */
  momentum_growth_pct: number;
  /** The most momentum can ever add. */
  momentum_cap: number;
  /** A 7d swing beyond this, in absolute per cent, flags the row High risk. */
  risk_swing_pct: number;
  /** A listing younger than this flags the row High risk. */
  risk_young_days: number;
}

export const MODEL: ModelConstants = {
  growth_weight: 0.6,
  growth_floor: -50,
  growth_cap: 150,
  maturity_floor: 0.55,
  maturity_range: 0.45,
  maturity_days: 1460,
  unknown_age_days: 365,
  chain_step: 0.03,
  chain_cap: 4,
  default_multiple: 0.25,
  tvl_reference_usd: 50_000_000,
  tvl_exponent: 0.85,
  momentum_age_days: 365,
  momentum_growth_pct: 10,
  momentum_cap: 0.12,
  risk_swing_pct: 75,
  risk_young_days: 90,
};

/** The model's version label: the dashboard names it. */
export const MODEL_VERSION = 'radar-3';

/**
 * The multiple per category: fee-earning venues score high, custody-like
 * wrappers score low. A category not listed here takes the default multiple.
 */
export const CATEGORY_MULTIPLES: Record<string, number> = {
  'Derivatives': 0.38,
  'Basis Trading': 0.36,
  'Dexs': 0.33,
  'Perpetuals': 0.38,
  'Options': 0.34,
  'Prediction Market': 0.34,
  'Launchpad': 0.42,
  'Lending': 0.28,
  'Uncollateralized Lending': 0.28,
  'CDP': 0.26,
  'CDP Manager': 0.26,
  'Yield': 0.30,
  'Yield Aggregator': 0.30,
  'Leveraged Farming': 0.30,
  'Farm': 0.28,
  'Risk Curators': 0.30,
  'Onchain Capital Allocator': 0.30,
  'Liquidity Manager': 0.30,
  'Collateral Markets': 0.28,
  'Collateral Management': 0.28,
  'Interest Rate Derivatives': 0.32,
  'Synthetics': 0.30,
  'Indexes': 0.24,
  'Staking Pool': 0.22,
  'Restaking': 0.22,
  'RWA': 0.20,
  'Insurance': 0.24,
  'Payments': 0.26,
  'Privacy': 0.26,
  'Decentralized AI': 0.32,
  'AI Agents': 0.32,
  'Governance Incentives': 0.22,
  'NFT Marketplace': 0.26,
  'OTC Marketplace': 0.26,
  'Token Locker': 0.20,
  'Algo-Stables': 0.18,
  'Dual-Token Stablecoin': 0.18,
  'Stablecoin Issuer': 0.18,
  'Decentralized BTC': 0.20,
  'Anchor BTC': 0.20,
  'Cross Chain Bridge': 0.16,
  'Chain': 0.22,
  'DOR': 0.24,
  'Reserve Currency': 0.20,
  'Crypto Card Issuer': 0.24,
  'CeDeFi': 0.22,
  'Options Vault': 0.28,
};

/** How many pre-token protocols below the watchlist floor the early radar carries, by TVL. */
export const EARLY_ROWS = 200;

/** How many live-token protocols the Live token view carries, by market cap. */
export const LIVE_ROWS = 24;

/** A farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** One row of board.json: the ranked board's row. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  age_days: number | null;
  implied_value_usd: number;
  model: {
    category_multiple: number;
    growth_pct: number;
    growth_multiplier: number;
    maturity_multiplier: number;
    chain_multiplier: number;
    momentum_multiplier: number;
    tvl_scaled_usd: number;
    risk_tier: RiskTier;
    age_days: number | null;
  };
  farm_steps: string[];
}

/** The dashboard's compact view of one row, with farm plans generated in the page. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  age_days: number | null;
  implied_value_usd: number;
  category_multiple: number;
  growth_multiplier: number;
  maturity_multiplier: number;
  chain_multiplier: number;
  momentum_multiplier: number;
  risk_tier: RiskTier;
  farm_steps: string[];
}

/** A live-token protocol: it already trades, so the board shows the market's own value, not a model's. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
}

/** Everything the dashboard needs: the board, the live set, and the model it runs. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  category_multiples: Record<string, number>;
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  rows: RadarRow[];
  live: LiveRow[];
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;

/** A finite number, else `fallback`. */
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/** The category multiple for a protocol, from the snapshot's own category field. */
export function categoryMultiple(category: string | null): number {
  if (category === null) return MODEL.default_multiple;
  const m = CATEGORY_MULTIPLES[category];
  return m === undefined ? MODEL.default_multiple : m;
}

/**
 * TVL with diminishing returns: `tvl ^ exponent`, rescaled so a protocol at
 * the reference size keeps its raw dollars. A $10B protocol is worth less
 * than ten $1B ones because the launch absorbing it is bounded by the same
 * buyers; the exponent is the model's only defence against the board
 * collapsing into a TVL table.
 */
export function tvlScale(tvlUsd: number, model: ModelConstants): number {
  if (tvlUsd <= 0) return 0;
  return tvlUsd * Math.pow(tvlUsd / model.tvl_reference_usd, model.tvl_exponent - 1);
}

/**
 * The early-momentum bonus: a young protocol whose TVL is still growing
 * fast is early in its curve, and early is when the farm is cheapest.
 * Rises linearly from 1.00 at the growth threshold to 1 + cap at 100%
 * growth, and fades linearly to 1.00 as the listing approaches a year old.
 * Never rescues a flat or shrinking protocol: momentum is 1.00 whenever
 * the clamped 7d growth is not positive.
 */
export function momentumMultiplier(age: number | null, growthPct: number, model: ModelConstants): number {
  if (age === null || growthPct <= 0) return 1;
  if (age >= model.momentum_age_days) return 1;
  const growthPart = Math.min(1, Math.max(0, (growthPct - model.momentum_growth_pct) / (100 - model.momentum_growth_pct)));
  const agePart = 1 - age / model.momentum_age_days;
  return 1 + model.momentum_cap * growthPart * agePart;
}

/** How certain the row's implied value is: Low, Medium or High risk. */
export type RiskTier = 'Low' | 'Medium' | 'High';

/**
 * A warning label on the number, never a filter. High means at least two of
 * the three things a farmer checks by hand look unstable: a wild 7d swing,
 * a listing younger than three months, a single chain. One of them is
 * Medium; none is Low. A protocol with no 7d figure counts as unswung.
 */
export function riskTier(
  age: number | null,
  change7d: number | null,
  chainCount: number,
  model: ModelConstants,
): RiskTier {
  let flags = 0;
  if (change7d !== null && Math.abs(change7d) > model.risk_swing_pct) flags += 1;
  if (age !== null && age < model.risk_young_days) flags += 1;
  if (chainCount < 2) flags += 1;
  if (flags >= 2) return 'High';
  if (flags === 1) return 'Medium';
  return 'Low';
}

/** The four multipliers and the implied value one protocol gets under `model`. */
export function impliedValue(
  protocol: SnapshotProtocol,
  asOf: string,
  model: ModelConstants,
): { implied: number; catMult: number; growthPct: number; growthMult: number; maturityMult: number; chainMult: number; momentumMult: number; tvlScaled: number; risk: RiskTier; age: number | null } {
  const age = ageDays(asOf, protocol.listed_at);
  const rawGrowth = finite(protocol.change_7d, 0);
  const growthPct = Math.min(model.growth_cap, Math.max(model.growth_floor, rawGrowth));
  const growthMult = 1 + (growthPct / 100) * model.growth_weight;
  const ageForModel = age ?? model.unknown_age_days;
  const maturityMult =
    model.maturity_floor +
    (Math.min(Math.max(ageForModel, 0), model.maturity_days) / model.maturity_days) * model.maturity_range;
  const chainCount = Math.max(1, protocol.chains.length);
  const chainMult = 1 + model.chain_step * Math.min(chainCount - 1, model.chain_cap);
  const catMult = categoryMultiple(protocol.category);
  const momentumMult = momentumMultiplier(age, growthPct, model);
  const tvlScaled = tvlScale(protocol.tvl_usd, model);
  const risk = riskTier(age, protocol.change_7d, chainCount, model);
  const implied = Math.max(1, Math.round(tvlScaled * catMult * growthMult * maturityMult * chainMult * momentumMult));
  return { implied, catMult, growthPct, growthMult, maturityMult, chainMult, momentumMult, tvlScaled, risk, age };
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;

/** A whole wrapped / staked / staking word anywhere in the name. */
const WRAPPED_OR_STAKED = /\b(wrapped|staked|staking)\b/i;

/** An exchange's name at the start of the protocol name. */
const EXCHANGE_PREFIX = /^(binance|coinbase|bybit|kraken|bitget|okx|bitfinex|gemini)\b/i;

/** Categories that are a product of a token that already trades, per the watchlist rule. */
const WRAPPER_CATEGORIES = new Set([
  'Bridge',
  'Canonical Bridge',
  'Liquid Staking',
  'Liquid Restaking',
  'Restaked BTC',
  'Stablecoin Wrapper',
  'CEX',
]);

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/**
 * Whether a protocol is one the board may rank: pre-token, and not a wrapped,
 * staked or bridged product of a protocol whose token already trades — the
 * watchlist's own rule, applied to the early rows too.
 */
export function isRankable(p: SnapshotProtocol): boolean {
  if (!isPreToken(p)) return false;
  if (p.category !== null && WRAPPER_CATEGORIES.has(p.category)) return false;
  if (VERSIONED.test(p.name)) return false;
  if (WRAPPED_OR_STAKED.test(p.name)) return false;
  if (EXCHANGE_PREFIX.test(p.name)) return false;
  return true;
}

/** The snapshot's protocol by slug. */
function bySlug(protocols: SnapshotProtocol[]): Map<string, SnapshotProtocol> {
  return new Map(protocols.map((p) => [p.slug, p]));
}

/** The protocols the board ranks, strongest first, with ranks 1..n. */
export function buildBoard(snapshot: Snapshot, model: ModelConstants = MODEL): BoardRow[] {
  const index = bySlug(snapshot.protocols);
  const chosen = new Map<string, SnapshotProtocol>();
  // The watchlist is the floor: every slug it names, even one the snapshot no
  // longer carries (it cannot, but coverage is the gate's row and is never
  // gambled on a missing record).
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p !== undefined) chosen.set(slug, p);
  }
  // The early radar: rankable pre-token protocols below the watchlist floor,
  // by TVL, capped. Never a replacement for a watchlist row.
  const early = snapshot.protocols
    .filter((p) => !chosen.has(p.slug) && isRankable(p) && p.tvl_usd < snapshot.floor_usd)
    .sort((a, b) => b.tvl_usd - a.tvl_usd || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0))
    .slice(0, EARLY_ROWS);
  for (const p of early) chosen.set(p.slug, p);

  const scored = [...chosen.values()].map((p) => {
    const v = impliedValue(p, snapshot.as_of, model);
    return { p, ...v };
  });
  scored.sort((a, b) => b.implied - a.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  return scored.map((s, i) => ({
    rank: i + 1,
    slug: s.p.slug,
    name: s.p.name,
    category: s.p.category,
    chains: s.p.chains,
    tvl_usd: s.p.tvl_usd,
    change_7d: s.p.change_7d,
    mcap_usd: s.p.mcap_usd,
    listed_at: s.p.listed_at,
    gecko_id: s.p.gecko_id,
    symbol: s.p.symbol,
    token_status: 'pre-token',
    age_days: s.age,
    implied_value_usd: s.implied,
    model: {
      category_multiple: s.catMult,
      growth_pct: s.growthPct,
      growth_multiplier: round4(s.growthMult),
      maturity_multiplier: round4(s.maturityMult),
      chain_multiplier: round4(s.chainMult),
      momentum_multiplier: round4(s.momentumMult),
      tvl_scaled_usd: Math.round(s.tvlScaled),
      risk_tier: s.risk,
      age_days: s.age,
    },
    farm_steps: farmSteps(s.p, s.age).map(stepText),
  }));
}

const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/** The first chain a protocol names, or a neutral phrase. */
function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** How much capital one farm position needs, from the protocol's own TVL. */
function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 5_000_000_000) return 250;
  if (p.tvl_usd >= 1_000_000_000) return 150;
  if (p.tvl_usd >= 100_000_000) return 100;
  return 50;
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 30;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

/** The category's main farming action, in words a farmer can follow. */
function actionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) {
    return `Supply $${capital} of USDC to ${name} on ${chain} and borrow a small amount against it, then repay it.`;
  }
  if (c.includes('dex')) return `Provide $${capital} of liquidity to ${name}'s deepest pool on ${chain} and keep the position open.`;
  if (c.includes('yield') || c.includes('leveraged farm') || c.includes('farm')) {
    return `Deposit $${capital} into ${name}'s highest-yield vault on ${chain} and keep the shares.`;
  }
  if (c.includes('bridge')) return `Bridge $${capital} of USDC to ${chain} through ${name} and use the bridged funds in its app.`;
  if (c.includes('staking') || c.includes('restak')) {
    return `Stake $${capital} of the chain's staking asset through ${name} and keep the receipt token.`;
  }
  if (c.includes('perpetual') || c.includes('derivative') || c.includes('options')) {
    return `Deposit $${capital} of USDC as margin on ${name} and open one small hedged position.`;
  }
  if (c.includes('prediction')) return `Fund $${capital} and place one market position on ${name}, then settle it.`;
  if (c.includes('curator') || c.includes('allocator') || c.includes('liquidity manager')) {
    return `Deposit $${capital} into a ${name} vault on ${chain} and keep the shares.`;
  }
  if (c.includes('stable') || c.includes('algo-stable')) {
    return `Mint or deposit $${capital} of the stable asset through ${name} on ${chain} and hold it.`;
  }
  if (c.includes('rwa')) return `Mint $${capital} of the protocol's yield-bearing asset on ${chain} and hold it.`;
  if (c.includes('insurance')) return `Buy $${capital} of cover from ${name} on ${chain} and keep the policy active.`;
  if (c.includes('basis')) return `Deposit $${capital} into ${name}'s basis vault on ${chain} and keep the position open.`;
  if (c.includes('launchpad')) return `Stake $${capital} in ${name}'s launchpad pool on ${chain} and join one sale.`;
  if (c.includes('payment')) return `Pay $${capital} through ${name} on ${chain} and keep the receipt for the record.`;
  return `Deposit $${capital} of USDC into ${name} on ${chain} and keep the position open.`;
}

/** The category's weekly qualifying action, so the position stays active. */
function weeklyActionFor(p: SnapshotProtocol): string {
  const c = (p.category ?? '').toLowerCase();
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) {
    return 'Adjust the supplied amount or repay and re-borrow a small sum.';
  }
  if (c.includes('dex') || c.includes('yield') || c.includes('farm')) {
    return 'Add a small amount to the position or claim and re-stake the rewards.';
  }
  if (c.includes('perpetual') || c.includes('derivative') || c.includes('options')) {
    return 'Close and reopen a small position, or adjust the margin.';
  }
  if (c.includes('prediction')) return 'Place one small market position each week.';
  if (c.includes('bridge')) return 'Bridge a small amount back and forth through the protocol.';
  if (c.includes('launchpad')) return 'Vote in one governance poll or join one sale round.';
  return 'Make one qualifying action, such as a deposit, a swap or a vote.';
}

/**
 * A protocol's farm plan: six steps, each an action with a cost and a time.
 * The plan is derived from the protocol's own record (category, chains, TVL
 * and age), never from a hand-written list of names.
 */
export function farmSteps(p: SnapshotProtocol, age: number | null): FarmStep[] {
  const chain = chainOf(p);
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
  const action = actionFor(p, capital, chain);
  const weekly = weeklyActionFor(p);
  return [
    {
      text: `Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.`,
      cost: 'under $3 of gas for the first transaction',
      time: '5 minutes',
    },
    {
      text: action,
      cost: `$${capital} of capital and about $${capital >= 150 ? 8 : 4} of gas`,
      time: '15 minutes to set up',
    },
    {
      text: `${weekly} Do it once a week so the wallet shows steady activity.`,
      cost: 'about $2 of gas a week',
      time: '10 minutes a week',
    },
    {
      text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`,
      cost: `the $${capital} stays in the position`,
      time: `${hold} days`,
    },
    {
      text: `Before you withdraw, open the protocol's own points or rewards page and claim only from the link it publishes.`,
      cost: 'no fee to check, and never pay to claim',
      time: '10 minutes',
    },
    {
      text: `Write the wallet, the dates and every transaction in a farm log so you can repeat the position or unwind it.`,
      cost: 'nothing but the log',
      time: '5 minutes',
    },
  ];
}

/** The live-token protocols, by market cap, for the dashboard's Live token view. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, LIVE_ROWS)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
    }));
}

/** A board row's compact form for data.js, with the farm plan generated in the page. */
export function radarRow(row: BoardRow): RadarRow {
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    mcap_usd: row.mcap_usd,
    listed_at: row.listed_at,
    age_days: row.age_days,
    implied_value_usd: row.implied_value_usd,
    category_multiple: row.model.category_multiple,
    growth_multiplier: row.model.growth_multiplier,
    maturity_multiplier: row.model.maturity_multiplier,
    chain_multiplier: row.model.chain_multiplier,
    momentum_multiplier: row.model.momentum_multiplier,
    risk_tier: row.model.risk_tier,
    farm_steps: row.farm_steps,
  };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot, model: ModelConstants = MODEL): { board: BoardRow[]; radar: RadarData } {
  const board = buildBoard(snapshot, model);
  const live = liveRows(snapshot);
  const early = board.filter((r) => !snapshot.watchlist.includes(r.slug)).length;
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    category_multiples: CATEGORY_MULTIPLES,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: early,
    live_size: live.length,
    rows: board.map(radarRow),
    live,
  };
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    if (p.tvl_usd < 0) throw new SnapshotError(`snapshot.json's protocol ${i} (${p.slug}) has a negative TVL`);
    if (typeof p.slug !== 'string' || p.slug.length === 0 || /\s/.test(p.slug)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} has a bad slug`);
    }
    // A chain named twice is one chain: dedupe so the chain multiplier
    // never pays for a copy-paste of the same chain.
    const chains = Array.isArray(p.chains)
      ? [...new Set(p.chains.filter((c): c is string => typeof c === 'string' && c.length > 0))]
      : [];
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains,
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  // A slug twice in the snapshot is two records for one protocol: the
  // board would rank it twice and the watchlist check could pass on a
  // duplicate. Refuse the snapshot instead of silently picking one.
  const seenSlugs = new Set<string>();
  for (const p of protocols) {
    if (seenSlugs.has(p.slug)) throw new SnapshotError(`snapshot.json lists the slug ${p.slug} twice`);
    seenSlugs.add(p.slug);
  }
  const watchlist = o.watchlist as string[];
  if (new Set(watchlist).size !== watchlist.length) throw new SnapshotError('snapshot.json lists a watchlist slug twice');
  const missingWatchlist = watchlist.filter((s) => !seenSlugs.has(s));
  if (missingWatchlist.length > 0) {
    throw new SnapshotError(`snapshot.json's watchlist names ${missingWatchlist.length} slug${missingWatchlist.length === 1 ? '' : 's'} with no protocol record: ${missingWatchlist.slice(0, 5).join(', ')}`);
  }
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist,
  };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared implied value, and farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) if (s.length < 20 || s.length > 600) return `${r.slug} has a farm step of ${s.length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
