import dayjs, { type Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import BtcPrices from "./BtcPrices";
import { addCommas, cleanRound, divide } from "./Utils";
import IRules from "../interfaces/IRules";

dayjs.extend(utc);

interface IVaultItem {
  date: Dayjs;
  nonRatchetedQty: number, 
  nonRatchetedPrice: number, 
  ratchetedQty: number, 
  ratchetedPrice: number;
  pendingRatchetValue: number; // this allows us to keep track of bitcoins that would be ratcheted except there is no minting space (i.e., bitcoins cannot mint more than half)
}

export default class Vault {
  public argonsMintedByBitcoins: number = 0;
  public byDate: { [date: string]: IVaultItem } = {};  
  
  private ratchetMintingSpace: number = 0;

  private cache: {
    pricePerBtc?: number;
    bitcoinCount?: number;
    dollarsPerBitcoinUnlock?: number;
    profitsToDate?: number;
    totalLockValue?: number;
    totalUnlockValue?: number;
  } = {};

  private currentDate: Dayjs;
  private pricePerBtcOverride: number | undefined;
  private profitsByDate: { [date: string]: number } = {};

  private btcPrices = new BtcPrices();

  constructor(currentDate: Dayjs = dayjs.utc()) {
    this.currentDate = currentDate;
  }

  public get pricePerBtc() {
    // Cache the historical lookup alongside its dependent valuations. Refreshing
    // the date must not rescan the price series for every position in the vault.
    return this.cache.pricePerBtc ??= this.pricePerBtcOverride ?? (this.btcPrices.getByDate(this.currentDate).price || this.btcPrices.getLatest().price);
  }

  public get bitcoinCount() {
    this.cache.bitcoinCount = this.cache.bitcoinCount ?? Object.values(this.byDate).reduce((value, item) => {
      return value + item.ratchetedQty + item.nonRatchetedQty;
    }, 0);
    return this.cache.bitcoinCount;
  }

  public get dollarsPerBitcoinUnlock(): number {
    this.cache.dollarsPerBitcoinUnlock = this.cache.dollarsPerBitcoinUnlock ?? (this.bitcoinCount ? divide(this.getTotalUnlockValue(), this.bitcoinCount) : 0);
    return this.cache.dollarsPerBitcoinUnlock;
  }

  public get profitsToDate() {
    this.cache.profitsToDate = this.cache.profitsToDate ?? Object.entries(this.profitsByDate).reduce((value, [date, profit]) => {
      return dayjs.utc(date).isAfter(this.currentDate) ? value : value + profit;
    }, 0);
    return this.cache.profitsToDate;
  }

  public setPricePerBtcOverride(price: number | undefined) {
    this.pricePerBtcOverride = price;
    this.clearCache();
  }

  public setDate(date: Dayjs) {
    this.currentDate = date;
    this.clearCache();
  }

  public loadForDate(currentCirculation: number, currentDate: Dayjs, rules: IRules) {
    if (!currentDate.isValid()) throw new Error('Invalid load date');

    const vaultCapacityDec = rules.btcVaultCapacityPct / 100;
    const ratchetingDec = rules.btcRatchetingPct / 100;
    const maxMintingCapacity = cleanRound(divide(currentCirculation, 2) * (vaultCapacityDec), 2);

    this.setDate(currentDate);
    this.cleanupOldItems();
    this.updateRatchets(maxMintingCapacity, rules);
    this.clearCache();

    const pricePerBtc = this.pricePerBtc;
    const availableMintingSpace = Math.max(maxMintingCapacity - this.argonsMintedByBitcoins, 0);
    if (availableMintingSpace <= 0) return;

    const nonRatchetedQty = divide(availableMintingSpace, pricePerBtc) * (1 - ratchetingDec);
    const ratchetedQty = divide(availableMintingSpace, pricePerBtc) * ratchetingDec;

    const item = this.byDate[currentDate.format('YYYY-MM-DD')] ??= {
      date: currentDate,
      nonRatchetedQty: 0,
      nonRatchetedPrice: pricePerBtc,
      ratchetedQty: 0,
      ratchetedPrice: pricePerBtc,
      pendingRatchetValue: 0,
    };
    item.nonRatchetedQty += nonRatchetedQty;
    item.ratchetedQty += ratchetedQty;
    
    this.argonsMintedByBitcoins += (nonRatchetedQty + ratchetedQty) * pricePerBtc;
    this.clearCache();
  }

  public getTotalLockValue() {
    this.cache.totalLockValue = this.cache.totalLockValue ?? Object.values(this.byDate).reduce((value, item) => {
      const ratchetedValue = (item.ratchetedQty * item.ratchetedPrice) - item.pendingRatchetValue;
      const nonRatchetedValue = item.nonRatchetedQty * item.nonRatchetedPrice;
      return value + ratchetedValue + nonRatchetedValue;
    }, 0);
    return this.cache.totalLockValue;
  }

  public getTotalUnlockValue() {
    this.cache.totalUnlockValue = this.cache.totalUnlockValue ?? Object.values(this.byDate).reduce((value, item) => value + this.getUnlockValue(item), 0);
    return this.cache.totalUnlockValue;
  }

  private getUnlockValue(item: IVaultItem) {
    const ratchetedValue = (item.ratchetedQty * Math.min(item.ratchetedPrice, this.pricePerBtc)) - item.pendingRatchetValue;
    const nonRatchetedValue = item.nonRatchetedQty * Math.min(item.nonRatchetedPrice, this.pricePerBtc);
    return ratchetedValue + nonRatchetedValue;
  }

  public getTotalPendingRatchetValue() {
    return Object.values(this.byDate).reduce((value, item) => {
      return value + item.pendingRatchetValue;
    }, 0);
  }

  public burnCirculation(circulationToBurn: number, argonRatioPrice: number, maxBitcoinsToUnlock: number): number {
    const argonsNeededPerBitcoinDollar = Vault.calculateUnlockBurnPerBitcoinDollar(argonRatioPrice);

    let dollarsRemaining = divide(circulationToBurn, argonsNeededPerBitcoinDollar, 20);
    let totalBitcoinsUnlocked = 0;
    let circulationBurned = 0;
    let lossAmountAverted = 0;
    let savingsFromUnlock = 0;

    for (const item of Object.values(this.byDate) as IVaultItem[]) {
      const response = this.burnCirculationFrom(item, argonRatioPrice, totalBitcoinsUnlocked, dollarsRemaining, maxBitcoinsToUnlock, argonsNeededPerBitcoinDollar);
      savingsFromUnlock += response.savingsFromUnlock;
      lossAmountAverted += response.lossAmountAverted;
      circulationBurned += response.circulationBurned;
      dollarsRemaining = response.dollarsRemaining;
      totalBitcoinsUnlocked = response.totalBitcoinsUnlocked;

      if (response.shouldDelete) {
        delete this.byDate[item.date.format('YYYY-MM-DD')];
      }

      if (totalBitcoinsUnlocked >= maxBitcoinsToUnlock || dollarsRemaining <= 0) break;
    }

    if (lossAmountAverted) {
      this.recordProfit(lossAmountAverted);
    }

    if (savingsFromUnlock) {
      this.recordProfit(savingsFromUnlock);
    }

    this.clearCache();

    return circulationBurned;
  }

  private burnCirculationFrom(item: IVaultItem, argonRatioPrice: number, totalBitcoinsUnlocked: number, dollarsRemaining: number, maxBitcoinsToUnlock: number, argonsNeededPerBitcoinDollar: number) {
    let savingsFromUnlock = 0;
    let lossAmountAverted = 0;
    let circulationBurned = 0;
    
    for (const type of ['nonRatcheted', 'ratcheted']) {
      if (totalBitcoinsUnlocked >= maxBitcoinsToUnlock || dollarsRemaining <= 0) break;

      const bitcoinsToUnlock = maxBitcoinsToUnlock - totalBitcoinsUnlocked;

      const qty = type === 'ratcheted' ? item.ratchetedQty : item.nonRatchetedQty;
      if (qty <= 0) continue;
      
      let lockPrice = type === 'ratcheted' ? item.ratchetedPrice : item.nonRatchetedPrice;
      if (type === 'ratcheted' && item.pendingRatchetValue > 0) {
        lockPrice -= divide(item.pendingRatchetValue, item.ratchetedQty, 20);
      }
      const unlockPrice = Math.min(lockPrice, this.pricePerBtc);
  
      const dollarValueOfUnlock = Math.min(qty * unlockPrice, bitcoinsToUnlock * unlockPrice, dollarsRemaining);
      const bitcoinsUnlocked = divide(dollarValueOfUnlock, unlockPrice, 20);
      const argonsNeededForUnlock = dollarValueOfUnlock * argonsNeededPerBitcoinDollar;
      const purchasePriceOfArgons = argonsNeededForUnlock * argonRatioPrice;

      savingsFromUnlock += dollarValueOfUnlock - purchasePriceOfArgons;
      lossAmountAverted += Math.max(unlockPrice - this.pricePerBtc, 0) * totalBitcoinsUnlocked;
      circulationBurned += argonsNeededForUnlock;
      dollarsRemaining -= dollarValueOfUnlock;
      totalBitcoinsUnlocked += bitcoinsUnlocked;
      this.argonsMintedByBitcoins = Math.max(this.argonsMintedByBitcoins - argonsNeededForUnlock, 0);

      if (type === 'ratcheted') {
        item.ratchetedQty -= bitcoinsUnlocked;
        if (item.ratchetedQty <= 0.00000000001) {
          item.ratchetedQty = 0;
        }
        if (item.pendingRatchetValue > 0) {
          item.pendingRatchetValue = item.ratchetedQty === 0 ? 0 : Math.max(
            item.pendingRatchetValue - divide(item.pendingRatchetValue, qty, 20) * bitcoinsUnlocked,
            0,
          );
        }
      } else {
        item.nonRatchetedQty -= bitcoinsUnlocked;
        if (item.nonRatchetedQty <= 0.00000000001) {
          item.nonRatchetedQty = 0;
        }
      }
    }

    return {
      savingsFromUnlock,
      lossAmountAverted,
      circulationBurned,
      dollarsRemaining,
      totalBitcoinsUnlocked,
      shouldDelete: item.nonRatchetedQty <= 0 && item.ratchetedQty <= 0,
    }
  }

  public argonsNeededToUnlock(bitcoinsToUnlock: number, agonRatioPrice: number, ) {
    const unlockBurnPerBitcoinDollar = Vault.calculateUnlockBurnPerBitcoinDollar(agonRatioPrice);
    return this.pricePerBtc * bitcoinsToUnlock * unlockBurnPerBitcoinDollar;
  }

  public exportMeta(argonRatioPrice: number): IVaultMeta {
    const bitcoinCount = this.bitcoinCount;
    const argonsBurnedPerBitcoinDollar = Vault.calculateUnlockBurnPerBitcoinDollar(argonRatioPrice);
    const dollarsPerBitcoinUnlock = this.dollarsPerBitcoinUnlock;
    const dollarsPerBitcoinLock = this.bitcoinCount ? divide(this.getTotalLockValue(), this.bitcoinCount) : 0;
    const argonBurnCapacity = bitcoinCount * dollarsPerBitcoinUnlock * argonsBurnedPerBitcoinDollar;
    
    return {
      bitcoinCount,
      dollarsPerBitcoinLock,
      dollarsPerBitcoinUnlock,
      argonsBurnedPerBitcoinDollar,
      argonBurnCapacity,
      profitsToDate: this.profitsToDate,
      argonRatioPrice,
      argonsMintedByBitcoins: this.argonsMintedByBitcoins,
    }
  }

  public toJson(): IVaultToJson {    
    return {
      argonsMintedByBitcoins: this.argonsMintedByBitcoins,
      byDate: Object.fromEntries(Object.entries(this.byDate).map(([date, item]) => [date, { ...item, date: item.date.format('YYYY-MM-DD') }])),
      ratchetMintingSpace: this.ratchetMintingSpace,
      currentDate: this.currentDate.format('YYYY-MM-DD'),
      pricePerBtcOverride: this.pricePerBtcOverride,
      profitsByDate: this.profitsByDate,
    }
  }

  private clearCache() {
    this.cache = {};
  }

  private cleanupOldItems() {
    for (const item of Object.values(this.byDate)) {
      if (item.date.isBefore(this.currentDate.subtract(1, 'year'))) {
        const unlockValue = this.getUnlockValue(item);
        this.argonsMintedByBitcoins -= unlockValue;
        delete this.byDate[item.date.format('YYYY-MM-DD')];
      }
    }
  }

  private updateRatchets(maxMintingCapacity: number, rules: IRules) {
    const ratchetWhenPriceChangeDec = rules.btcRatchetWhenPriceChangePct / 100;
    const pricePerBtc = this.pricePerBtc;

    // We're running the ratcheting code before running the new bitcoin vaulting code. In order to ensure
    // an even distribution, we will throttle the ratcheting space.
    let availableMintingSpace = Math.max(maxMintingCapacity - this.argonsMintedByBitcoins, 0) / 2;
    let mintingSpaceToReleaseAfterRatcheting = 0;

    for (const item of Object.values(this.byDate)) {
      const changeDec = Math.abs(calculateProfit(item.ratchetedPrice, pricePerBtc));
      if (changeDec >= ratchetWhenPriceChangeDec) {
        const totalValueBefore = (item.ratchetedQty * item.ratchetedPrice);
        item.ratchetedPrice = pricePerBtc;

        const totalValueAfter = (item.ratchetedQty * item.ratchetedPrice);
        const pendingRatchetValue = totalValueAfter - totalValueBefore;

        if (pendingRatchetValue >= availableMintingSpace) {
          // the user is wanting to mint more than we have space for
          const argonsToMint = availableMintingSpace;
          this.recordProfit(argonsToMint);
          this.argonsMintedByBitcoins += argonsToMint;
          this.ratchetMintingSpace += argonsToMint;
          item.pendingRatchetValue += pendingRatchetValue - argonsToMint;
          availableMintingSpace = 0;
        } else if (pendingRatchetValue > 0) {
          // we can mint everything the user wants
          const argonsToMint = pendingRatchetValue;
          this.recordProfit(argonsToMint);
          this.argonsMintedByBitcoins += argonsToMint;
          this.ratchetMintingSpace += argonsToMint;
          availableMintingSpace -= pendingRatchetValue;
        } else {
          // the user is down ratcheting, so no new minting. We only need to update the pending ratchet value
          item.pendingRatchetValue = Math.max(item.pendingRatchetValue + pendingRatchetValue, 0);
          
          // Vaulting/ratcheting works differently in real-life than this modeled scenario, and we must
          // do an offset to account for this. In real-life, an equal number of argons are locked in vault
          // security during ratcheting, which takes them out of circulation and also frees up minting space.
          // This this._ratchetMintingSpace does something similar, although it's not exact.
          mintingSpaceToReleaseAfterRatcheting = Math.min(mintingSpaceToReleaseAfterRatcheting + Math.abs(pendingRatchetValue), this.ratchetMintingSpace);
        }
      }
    }

    this.argonsMintedByBitcoins -= mintingSpaceToReleaseAfterRatcheting;
    this.ratchetMintingSpace -= mintingSpaceToReleaseAfterRatcheting;
  }

  private recordProfit(profit: number) {
    if (profit <= 0) return;
    this.profitsByDate[this.currentDate.format('YYYY-MM-DD')] ??= 0;
    this.profitsByDate[this.currentDate.format('YYYY-MM-DD')] += profit;  
  }

  public static calculateUnlockBurnPerBitcoinDollar(argonRatioPrice: number): number {
    const r = argonRatioPrice;
    const b = 1;
    if (argonRatioPrice >= 1.00) {
      return b;
    } else if (r >= 0.90) {
      return 20 * Math.pow(r, 2) - 38 * r + 19;
    } else if (r >= 0.01) {
      return divide(0.5618 * r + 0.3944, r);
    } else {
      return divide(b, r) * (0.576 * r + 0.40);
    }
  }

  public static fromJson(data: IVaultToJson) {
    const vault = new Vault(dayjs.utc(data.currentDate));
    vault.argonsMintedByBitcoins = data.argonsMintedByBitcoins;
    vault.byDate = Object.fromEntries(Object.entries(data.byDate).map(([date, item]) => [date, { ...item, date: dayjs.utc(date) }]));
    vault.ratchetMintingSpace = data.ratchetMintingSpace;
    vault.pricePerBtcOverride = data.pricePerBtcOverride;
    vault.profitsByDate = data.profitsByDate;
    return vault;
  }
}

function calculateProfit(buyPrice: number, sellPrice: number): number {
  return divide((sellPrice - buyPrice), buyPrice);
}

export interface IVaultToJson {
  argonsMintedByBitcoins: number;
  byDate: { [date: string]: IVaultItemToJson };
  ratchetMintingSpace: number;
  currentDate: string;
  pricePerBtcOverride: number | undefined;
  profitsByDate: { [date: string]: number };
}

export interface IVaultItemToJson extends Omit<IVaultItem, 'date'> {
  date: string;
}

export interface IVaultMeta {
  bitcoinCount: number;
  dollarsPerBitcoinLock: number;
  dollarsPerBitcoinUnlock: number;
  argonsBurnedPerBitcoinDollar: number;
  argonBurnCapacity: number;
  profitsToDate: number;
  argonRatioPrice: number;
  argonsMintedByBitcoins: number;
}
