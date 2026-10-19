# Ultimate Death Spiraling

UDS is an educational simulation of price stabilization in a simplified Argon
economy. Drag the chart's price line below target to explore recovery through
Bitcoin unlocking and other enabled mechanisms, or above target to explore
supply expansion through mining and BTC Liquids. Results reflect the model's
assumptions; they are not predictions of mainnet prices or recovery times.

## Use the model

Open [UDS](https://uds.argon.network/) on a desktop or laptop. The interactive app
requires a viewport at least 1,224 pixels wide.

1. Adjust the header's circulation, locked BTC, and hourly BTC unlocking limit.
   Hover or focus the header stats for explanations.
2. Drag the price line to choose a starting price and date, then release it to
   open the guidance card. This prepares the scenario without running the engine.
3. Select Start to run the scenario. Playback shows price, supply, BTC balances,
   and elapsed time, with pauses explaining important stages.
4. On success, select Done to extend the target-price line across the remaining
   window. `Unachievable` means stabilization was not reached within the modeled
   horizon, rather than a claim that recovery is impossible at any later time.

Each scenario runs for up to 30 simulated days after the selected starting point.
The chart scrolls with playback when needed. A new drag or input edit cancels the
current scenario; a new drag also resets the date window. The Learn More menu
provides FAQs, whitepapers, and Argon documentation.

## Development

Use Node.js 22 or newer and the Yarn 4 version pinned in `package.json`.
Dependencies use a standard `node_modules` install.

```sh
yarn install
yarn dev
yarn test
yarn build
```

Run the focused engine, snapshot, and URL-input tests with:

```sh
yarn test tests/engineCorrections.test.ts tests/recoveryRunner.test.ts tests/miningEngine.test.ts tests/mainnetSnapshot.test.ts tests/argonTarget.test.ts tests/urlInputs.test.ts
```

`yarn build` builds the application; it does not run type-checking.
`yarn deploy` builds the application and then publishes it to GitHub Pages.

Update the historical Bitcoin price series with:

```sh
yarn update:bitcoin
```

This downloads prices into `src/data/bitcoinPrices.json`. Run the tests after
changing input data. Tests tied to historical data may need reviewed updates.

## Mainnet defaults and data updates

```sh
yarn update:argon
```

This downloads the entire published JSON file from
`https://argon.network/data/argonBasics.mainnet.json` and saves it to
`src/data/argonBasics.json`. It validates the snapshot timestamp/block, target price, circulation, and locked BTC before
atomically replacing the file. Failed downloads or validation leave the previous
snapshot intact. No RPC dependency is required.

Starting circulation defaults to `microgonsInCirculation.total / 1,000,000` ARGN,
rounded to a whole token. A valid URL circulation value takes precedence over
saved circulation, but the app clamps the result to at least that rounded mainnet
value. Locked BTC defaults to `vaulting.bitcoinLocked`; a valid URL value overrides
it. Locked BTC edits remain local and are not saved. The target price and
timestamp come from the same snapshot. The data is as current as the publisher's `lastUpdatedAt`, not a live
mainchain read. Run the command explicitly, then reload or rebuild/redeploy.

The target and its timestamp are fixed in each run's rules. Reload the app after
updating (rebuild/redeploy a published site); previous sessions receive the new
snapshot. Refreshes are explicit, not live subscriptions. Recovery results are
held in memory and cleared when their inputs change.

The engine still uses a price ratio: **1.00 means at target**. Dollar displays
multiply that ratio by the snapshot target. Bitcoin prices enter in USD and are
divided by the target for minting and redemption; exported Bitcoin prices and
gains are converted back to USD. At a $1.058 target, $80,000 of Bitcoin represents
about 75,614 ARGN at target.

## Share scenario inputs

External links can initialize the network quantities:

```text
https://uds.argon.network/?circulation=2200000&bitcoinsInLiquidLocks=125.5
```

Values use ARGN and BTC (fractional BTC is supported). Circulation must be
positive; locked BTC may be zero. Valid parameters take precedence on page load,
subject to the circulation minimum described above. Missing, blank, nonnumeric,
negative, and nonfinite inputs are ignored independently. Inputs remain editable after opening the link.

## Below-target recovery

`src/panels/Main.vue` sends the dragged price/date and current inputs to
`src/workers/recovery.ts`, which runs `src/lib/RecoveryRunner.ts`.
The runner initializes a vault with the exact BTC quantity from the UI, valued
at `btcPriceOverride`. The default quantity comes from the bundled mainnet
snapshot. It starts with an empty reserve and advances the shared `Marker`/`Vault` engine in hourly steps until the price reaches
target or the selected timeline ends. It does not calculate starting BTC from
circulation or vault capacity, or replay a fixed Terra outflow pattern.

Recovery results remain in memory. Rules and welcome state are stored in session
storage; locked BTC resets to its URL value or snapshot default on reload.
The Reset control clears saved rules and welcome state, then reloads the page.
URL parameters are reapplied on that reload.

## Protocol comparison baseline

The reference is Argon runtime **158**, release **v1.4.12**, commit
[`f79ac75ee9f0da8a8177d772379897e194b70ff2`](https://github.com/argonprotocol/mainchain/tree/f79ac75ee9f0da8a8177d772379897e194b70ff2).
This is a fixed comparison baseline, not a claim that UDS implements the entire
runtime or that this release is still the latest deployed version.

The piecewise redemption curve in `src/engine/Vault.ts` uses the same coefficients
as the reference runtime. Its input is the Argon market-price/target-price ratio.
See the reference runtime's
[Bitcoin lock implementation](https://github.com/argonprotocol/mainchain/blob/f79ac75ee9f0da8a8177d772379897e194b70ff2/pallets/bitcoin_locks/src/lib.rs).

The surrounding economy remains simplified:

- Price is modeled capital divided by circulating tokens. There is no order book,
  slippage model, or independently calibrated participant response.
- Starting locked BTC is a user assumption, independent of circulation. The
  runtime's complete vault collateral and minting-queue accounting are not simulated.
- Ratcheting uses aggregate positions and pending-value bookkeeping. Treasury
  liquidity, issuance queues, and full collateral accounting are not simulated.
- Unlocking uses a BTC-volume throttle and assumed participant latency, not a
  simulation of Bitcoin confirmations and the runtime release lifecycle.
- Taxable activity and demand responding to tax burns are scenario assumptions.
  They are not guaranteed mainnet activity or profits.
- Shared vault accounting retains simplified ratcheting and replacement methods;
  the interactive runner seeds existing positions and does not add new locks.

Runtime 159's separate Fission lifecycle is not part of this model.

Interactive recovery protects a BTC reserve for a possible $0.001 USD crash.
The reserve estimates the entire return to target with fixed post-crash demand,
using a conservative numerical calculation across the changing redemption curve.
Initial recovery can spend only BTC above that reserve. When this spendable BTC
is exhausted below target, the engine waits `fearSelloffDelayInDays` (default 3
days, editable in Recovery Settings) before a 24-hour fear selloff reduces modeled
demand until the price reaches $0.001. Supply and BTC balances are held during the
selloff; the reserve is released at the bottom and recovery resumes the next
hour. Prior demand-growth history is cleared at the selloff. Latency and hourly BTC limits still apply.
During the wait BTC remains protected and other enabled mechanisms can still
recover the price, avoiding the selloff. Zero delay starts the 24-hour selloff
without an additional wait; fractional days are rounded up to whole simulation hours.
Runs already at or below $0.001 use their BTC immediately. If starting BTC cannot
fund the reserve, Bitcoin-driven recovery is held back and the run is not promised
to recover; other enabled mechanisms may still act. No selloff is triggered with
Bitcoin recovery disabled. This reserve and selloff are scenario assumptions,
not mainchain rules, and a short chart window can end before recovery completes.

## Above-target stabilization

Above-target scenarios use `MiningEngine`: one frame every 24 hours after the
selected starting time. Each frame issues `circulation * (1 - target / price)`
ARGN, following mainchain's price-driven mining budget. Modeled demand stays
fixed while supply increases; issuance stops within the $0.001 price-noise band.
Eligible miners are assumed to exist and per-miner integer rounding is omitted.
Each frame splits new issuance equally between mining and BTC Liquids, assuming
sufficient new BTC participation. BTC added equals the BTC Liquid issuance times
the target USD price divided by the configured BTC USD price. Existing fissioned
BTC is not reused to fund this new issuance. Additional Mining Revenue values only
the mining half at the current price. Bitcoin/Fission mint payout queues and their
10% per-request frame caps are omitted. Playback interpolates daily frames
for animation; the engine itself issues at frame boundaries.

## Units and configuration

The chart and playback display USD prices. Internal recovery accounting uses
market-price/target-price ratios and target-value units as described below.

| Quantity or rule | Unit / interpretation |
| --- | --- |
| `circulation`, circulation changes | Modeled ARGN tokens |
| Marker price, `argonRatioPrice` | Market value divided by target value; target is 1.00 |
| Marker capital, reserve, seigniorage and loss amounts | Target-value units; multiply by `usdTargetForArgon` for USD. Capital / circulation = price ratio |
| Bitcoin quantities | BTC, including fractional BTC |
| `usdTargetForArgon` | Frozen USD per ARGN at target, from the website mainnet snapshot |
| `btcPriceOverride`, Bitcoin price data | Historical/scenario USD per BTC; divided by the frozen target for engine accounting |
| Vault position prices, pending values, internal lock/unlock totals | Target-value units |
| Exported `dollarsPerBitcoinLock/Unlock`, `profitsToDate` | USD at the frozen scenario target |
| `argonsMintedByBitcoins`, `argonBurnCapacity` | ARGN |
| `btcVaultCapacityPct`, `btcRatchetingPct`, `btcRatchetWhenPriceChangePct` | Percentage points: 100 means 100% |
| `maxTransactionsAnnually` | Transactions per year |
| `maxMicropaymentsAnnually` | Annual micropayment value at target; treated as wage-protected value during a depeg |
| `btcReserveTaperPct` | Percent of initially spendable BTC over which the hourly unlock cap tapers proportionally; default 60. Protected reserve remains untouched; taper ends after the death-spiral reserve release. |
| `btcMaxTxnsPerHour` | Despite the name, maximum BTC volume unlocked per hour; not transactions/hour |
| `unvaultLatencyInHours`, certainty/speculative latency bounds | Hours |
| `certaintyGreedLow/High` | Annualized percentage return thresholds attributed to tax burns |
| `speculativeGreedLow/High` | APR percentage thresholds: interval return (%) × 365 × 24 / interval hours (simple annualization) |
| `certaintyMaxDailyIncrease` | Fraction of prior capital per day: **0.5 means 50%** |
| `speculativeStartingDailyInflow` | Starting daily inflow as a fraction of prior-day capital; 0.0001 = 0.01% |
| `speculativeMaxDailyGrowth` | Maximum daily growth of the existing buying rate; 0.1 = 10% |
| `speculativeDailyInflowCeiling` | Daily buying ceiling as a fraction of capital frozen at activation; 0.001 = 0.1% |
| `speculativeDailyTaper` | Fraction of buying rate lost per weak-return day; 0.5 = 50% |
| `speculativeWeakReturnStopHours` | Consecutive hours below minimum APR before buying stops; default 24 |

Certainty demand retains its 100% daily capital cap. Speculative buying starts at
0.01% of prior-day capital per day and grows by up to 10% per day, with hourly
multipliers adjusted for interval duration. Its ceiling is 0.1% of activation-day
capital per day, frozen for each activation. Weak returns halve the buying rate
per day and stop it after 24 consecutive weak hours; restarting requires the
configured qualifying history again. The reserve flatline countdown runs only
while spendable BTC is exhausted and price is no longer recovering.
These are strong behavioral
assumptions, not protocol parameters. `startDateOfTerraCollapse`,
and `dollarInflation` remain legacy configuration
fields; interactive recovery uses the selected chart date and speculative
latency bounds. `btcVaultCapacityPct` applies to shared vault loading methods,
not the explicit BTC initialization in interactive recovery.

| Input file | Behavior |
| --- | --- |
| `src/data/bitcoinPrices.json` | Historical BTC prices for shared vault accounting; interactive recovery uses `btcPriceOverride` |
| `src/data/argonBasics.json` | Full published mainnet snapshot; target, circulation, and locked BTC defaults |

## Accounting details

- Partial redemptions allocate pending ratchet value using the original BTC
  quantity; complete redemption clears the pending value.
- Valuation caches refresh when the simulation date changes, including dated
  profit totals and price-dependent unlock values. Profit dates use UTC, matching
  the simulation timeline regardless of the machine's local timezone.
- Speculative demand uses its own minimum latency rather than certainty latency.
