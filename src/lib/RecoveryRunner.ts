import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import Marker from '../engine/Marker';
import Vault from '../engine/Vault';
import Reserve from '../engine/Reserve';
import type IRules from '../interfaces/IRules';

dayjs.extend(utc);
const HOUR = 3_600_000;
const FEAR_PRICE_USD = 0.001;
const FEAR_SELLOFF_HOURS = 24;

// Upper-bound the BTC needed as the price rises, rather than valuing every
// redemption at the crash price. Include the curve's boundaries and minimum.
export function crashRecoveryReserve(circulation: number, target: number, btcValue: number): number {
  const initialRatio = FEAR_PRICE_USD / target;
  if (initialRatio >= 1) return 0;
  const ratios = Array.from({ length: 4097 }, (_, index) =>
    initialRatio * Math.pow(1 / initialRatio, index / 4096));
  ratios.push(...[0.01, 0.9, 0.95, 1].filter(ratio => ratio > initialRatio));
  ratios.sort((a, b) => a - b);
  const capital = circulation * initialRatio;
  let bitcoins = 0;
  for (let index = 1; index < ratios.length; index++) {
    const a = ratios[index - 1], b = ratios[index];
    const burn = capital / a - capital / b;
    const multiplier = Math.min(Vault.calculateUnlockBurnPerBitcoinDollar(a),
      Vault.calculateUnlockBurnPerBitcoinDollar(b));
    bitcoins += burn / (btcValue * multiplier);
  }
  return bitcoins;
}

export const MAX_LOCKED_BITCOINS = 17_500_000;

// Round upward so the editor never selects less than the engine protects.
export function minimumLockedBitcoins(rules: Pick<IRules, 'circulation' | 'usdTargetForArgon' | 'btcPriceOverride'>): number {
  return Math.ceil(crashRecoveryReserve(rules.circulation, rules.usdTargetForArgon,
    rules.btcPriceOverride / rules.usdTargetForArgon));
}

export interface RecoveryRequest {
  startingTime: number;
  endingTime: number;
  startingPrice: number;
  lockedBitcoins: number;
  rules: IRules;
}
export interface RecoveryFrame {
  speculativeStarted?: boolean;
  speculativeCapitalAdded?: number;
  sixMonthSelloff?: boolean;
  reserveStall?: boolean;
  selloffBottom?: boolean;
  time: number;
  elapsedHours: number;
  price: number;
  argonsBurned: number;
  argonsMinted?: number;
  mintedThisFrame?: number;
  miningArgonsMinted?: number;
  bitcoinArgonsMinted?: number;
  bitcoinsAdded?: number;
  bitcoinsUnlocked: number;
  bitcoinsRemaining: number;
  circulation: number;
}
export interface RecoveryResult {
  frames: RecoveryFrame[];
  points: { x: number; y: number }[];
  recovered: boolean;
  elapsedHours: number;
}

// Orchestrates the existing recovery mechanisms without replaying Terra's shock.
// Prices returned to the UI are USD; engine prices and balances are target ratios/units.
export function runRecovery(request: RecoveryRequest, onProgress?: (frames: RecoveryFrame[]) => void): RecoveryResult {
  const { startingTime, endingTime, startingPrice, lockedBitcoins } = request;
  const rules = { ...request.rules };
  for (const value of [startingTime, endingTime, startingPrice, lockedBitcoins, rules.circulation,
    rules.usdTargetForArgon, rules.btcPriceOverride, rules.btcMaxTxnsPerHour, rules.fearSelloffDelayInDays]) {
    if (!Number.isFinite(value)) throw new Error('Recovery inputs must be finite numbers.');
  }
  if (rules.circulation <= 0 || rules.usdTargetForArgon <= 0 || rules.btcPriceOverride <= 0 ||
    lockedBitcoins < 0 || rules.btcMaxTxnsPerHour < 0 || rules.fearSelloffDelayInDays < 0 || startingPrice < 0 ||
    startingPrice > rules.usdTargetForArgon || endingTime < startingTime) {
    throw new Error('Invalid recovery configuration.');
  }
  const points = [{ x: startingTime, y: startingPrice }];
  const frames: RecoveryFrame[] = [{ time: startingTime, elapsedHours: 0, price: startingPrice,
    argonsBurned: 0, bitcoinsUnlocked: 0, bitcoinsRemaining: lockedBitcoins, circulation: rules.circulation }];
  let pendingFrames = [...frames];
  let reserveStallHour: number | undefined;
  let selloffBottomHour: number | undefined;
  function flush() {
    if (pendingFrames.length) onProgress?.(pendingFrames);
    pendingFrames = [];
  }
  function record(frame: RecoveryFrame) {
    if (frame.elapsedHours === reserveStallHour) frame.reserveStall = true;
    else delete frame.reserveStall;
    if (frame.elapsedHours === selloffBottomHour) frame.selloffBottom = true;
    else delete frame.selloffBottom;
    frames.push(frame);
    pendingFrames.push(frame);
    points.push({ x: frame.time, y: frame.price });
    if (pendingFrames.length >= 32) flush();
  }
  const sixMonthHours = Math.ceil((dayjs.utc(startingTime).add(6, 'month').valueOf() - startingTime) / HOUR);
  const maxHours = Math.floor((endingTime - startingTime) / HOUR);
  if (startingPrice === rules.usdTargetForArgon) {
    flush();
    return { points, frames, recovered: true, elapsedHours: 0 };
  }
  // Zero modeled capital has no positive price from which these recovery equations can operate.
  if (startingPrice === 0) {
    record({ ...frames[0], time: endingTime, elapsedHours: (endingTime - startingTime) / HOUR });
    flush();
    return { points, frames, recovered: false, elapsedHours: maxHours };
  }

  const date = dayjs.utc(startingTime);
  const positionPrice = rules.btcPriceOverride / rules.usdTargetForArgon;
  const ratchetedFraction = Math.max(0, Math.min(1, rules.btcRatchetingPct / 100));
  const vault = Vault.fromJson({
    usdTargetForArgon: rules.usdTargetForArgon,
    currentDate: date.toISOString(),
    pricePerBtcOverride: rules.btcPriceOverride,
    argonsMintedByBitcoins: lockedBitcoins * positionPrice,
    ratchetMintingSpace: 0,
    profitsByDate: {},
    byDate: lockedBitcoins ? { [date.format('YYYY-MM-DD')]: {
      date: date.toISOString(),
      nonRatchetedQty: lockedBitcoins * (1 - ratchetedFraction),
      nonRatchetedPrice: positionPrice,
      ratchetedQty: lockedBitcoins * ratchetedFraction,
      ratchetedPrice: positionPrice,
      pendingRatchetValue: 0,
    } } : {},
  });
  const reserve = new Reserve(0);
  let circulation = rules.circulation;
  let capital = circulation * startingPrice / rules.usdTargetForArgon;
  const history: Marker[] = [];
  const historyLimit = Math.max(24, Math.ceil(rules.certaintyLatencyHigh), Math.ceil(rules.speculativeLatencyHigh));
  let speculativeWasActive = false;
  let lastPrice = startingPrice;
  let argonsBurned = 0;
  const protectedBitcoins = crashRecoveryReserve(circulation, rules.usdTargetForArgon, positionPrice);
  const taperBand = Math.max(0, lockedBitcoins - protectedBitcoins) *
    Math.max(0, Math.min(100, rules.btcReserveTaperPct ?? 60)) / 100;
  let reserveReleased = startingPrice <= FEAR_PRICE_USD;
  const canProtectReserve = lockedBitcoins >= protectedBitcoins;
  let flatlineStartingHour: number | undefined;
  const fearDelayHours = Math.ceil(rules.fearSelloffDelayInDays * 24);
  let selloff: { startingHour: number; startingPrice: number } | undefined;

  for (let hour = 1; hour <= maxHours; hour++) {
    const spendableBitcoins = reserveReleased ? vault.bitcoinCount
      : Math.max(0, vault.bitcoinCount - protectedBitcoins);
    const priceIsRecovering = history.length > 0 &&
      lastPrice > history[history.length - 1].startingPrice * rules.usdTargetForArgon + 1e-10;
    if (!reserveReleased && canProtectReserve && rules.enableBitcoinVaulting && !priceIsRecovering &&
      spendableBitcoins <= Math.max(1e-10, lockedBitcoins * 1e-9)) {
      flatlineStartingHour ??= hour;
      reserveStallHour ??= hour;
    } else {
      flatlineStartingHour = undefined;
    }
    const sixMonthSelloff = !selloff && !reserveReleased && hour === sixMonthHours;
    if (sixMonthSelloff) selloff = { startingHour: hour, startingPrice: lastPrice };
    if (!selloff && flatlineStartingHour !== undefined && hour - flatlineStartingHour >= fearDelayHours) {
      selloff = { startingHour: hour, startingPrice: lastPrice };
    }
    if (selloff) {
      // Model a one-day loss of demand, holding supply and BTC until the bottom.
      const progress = Math.min(1, (hour - selloff.startingHour) / FEAR_SELLOFF_HOURS);
      const eased = progress * progress * (3 - 2 * progress);
      lastPrice = progress === 1 ? FEAR_PRICE_USD
        : selloff.startingPrice + (FEAR_PRICE_USD - selloff.startingPrice) * eased;
      capital = circulation * lastPrice / rules.usdTargetForArgon;
      if (progress === 1) {
        selloffBottomHour = hour;
        reserveReleased = true;
        selloff = undefined;
      }
      speculativeWasActive = false;
      history.length = 0;
      record({ time: startingTime + hour * HOUR, elapsedHours: hour, price: lastPrice, sixMonthSelloff,
        argonsBurned, bitcoinsUnlocked: Math.max(0, lockedBitcoins - vault.bitcoinCount),
        bitcoinsRemaining: vault.bitcoinCount, circulation });
      continue;
    }
    const marker = new Marker(date.add(hour - 1, 'hour'), 1, circulation, capital);
    marker.phase = 'recovery';
    marker.setAnnualTransactions(rules.maxTransactionsAnnually * circulation / rules.circulation);
    marker.setAnnualMicropayments(rules.maxMicropaymentsAnnually);
    marker.setReserve(reserve);
    // Keep the crash reserve intact. Clear the final BTC instead of leaving an infinite tail.
    const taperFactor = !reserveReleased && taperBand > 0 && spendableBitcoins > 1
      ? Math.min(1, spendableBitcoins / taperBand) : 1;
    marker.runRecovery({ ...rules,
      btcMaxTxnsPerHour: Math.min(rules.btcMaxTxnsPerHour, spendableBitcoins) * taperFactor,
      enableBitcoinVaulting: rules.enableBitcoinVaulting && spendableBitcoins > 0 }, history, vault);
    const speculativeCapitalAdded = marker.capitalAddedMap.SpeculativeGreed || 0;
    const speculativeStarted = speculativeCapitalAdded > 0 && !speculativeWasActive;
    speculativeWasActive = speculativeCapitalAdded > 0;
    marker.manageSeigniorageProfits(rules, reserve);
    argonsBurned += marker.circulationRemoved;
    circulation = marker.currentCirculation;
    capital = marker.currentCapital;
    lastPrice = marker.currentPrice * rules.usdTargetForArgon;
    if (!Number.isFinite(lastPrice) || circulation <= 0 || capital < 0) throw new Error('Recovery reached an invalid model state.');
    history.push(marker);
    if (history.length > historyLimit) history.shift();
    const recovered = marker.currentPrice >= 1 - 1e-9;
    // Preserve hourly detail near the shock and daily samples for long runs.
    if (hour <= 720 || hour % 24 === 0 || recovered || hour === maxHours || hour === reserveStallHour || speculativeStarted) {
      record({ time: startingTime + hour * HOUR, elapsedHours: hour,
        speculativeStarted, speculativeCapitalAdded,
        price: recovered ? rules.usdTargetForArgon : lastPrice,
        argonsBurned, bitcoinsUnlocked: Math.max(0, lockedBitcoins - vault.bitcoinCount),
        bitcoinsRemaining: vault.bitcoinCount, circulation });
    }
    if (recovered) {
      flush();
      return { points, frames, recovered: true, elapsedHours: hour };
    }
  }
  if (frames[frames.length - 1].time < endingTime) {
    record({ ...frames[frames.length - 1], time: endingTime, elapsedHours: (endingTime - startingTime) / HOUR, price: lastPrice, speculativeStarted: false, speculativeCapitalAdded: 0, sixMonthSelloff: false });
  }
  flush();
  return { points, frames, recovered: false, elapsedHours: maxHours };
}

// Interpolate between engine samples for smooth accelerated playback, without changing the model.
export function recoveryFrameAt(frames: RecoveryFrame[], hours: number): RecoveryFrame {
  if (!frames.length) throw new Error('Recovery playback requires an initial frame.');
  if (hours <= frames[0].elapsedHours) return { ...frames[0] };
  const last = frames[frames.length - 1];
  if (hours >= last.elapsedHours) return { ...last };
  let low = 0, high = frames.length - 1;
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if (frames[middle].elapsedHours <= hours) low = middle;
    else high = middle;
  }
  const a = frames[low], b = frames[high];
  if (hours === a.elapsedHours) return { ...a };
  const t = (hours - a.elapsedHours) / (b.elapsedHours - a.elapsedHours);
  return Object.fromEntries(Object.keys(a).filter(key => key !== 'speculativeCapitalAdded' && typeof a[key as keyof RecoveryFrame] === 'number').map(key => {
    const field = key as keyof RecoveryFrame;
    return [key, (a[field] as number) + ((b[field] as number) - (a[field] as number)) * t];
  })) as unknown as RecoveryFrame;
}
