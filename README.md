# Ultimate Death Spiral (UDS) Model

SAM is an educational simulation of recovery in a simplified Argon economy.
Drag the chart's price line below target to model a shock and simulate recovery
from the selected date using the configured circulation, locked BTC, and mechanisms. Results describe the assumptions in
this model; they are not predictions of mainnet prices or recovery times.

## Run locally and test

Use Node.js 22 or newer and the Yarn 4 version pinned in `package.json`.
Dependencies use a standard `node_modules` install.

```sh
yarn install
yarn dev
yarn test
yarn build
```

Run the focused recovery and accounting tests with:

```sh
yarn test tests/engineCorrections.test.ts tests/recoveryRunner.test.ts tests/argonTarget.test.ts
```

`yarn build` builds the application; it does not run type-checking.
`yarn deploy` builds the application and then publishes it to GitHub Pages.

Update the historical Bitcoin price series with:

```sh
yarn update:bitcoin
```

This downloads prices into `src/data/bitcoinPrices.json`. Run the tests after
changing input data. Tests tied to historical data may need reviewed updates.

## Mainnet snapshot

```sh
yarn update:argon
```

This downloads the entire published JSON file from
`https://argon.network/data/argonBasics.mainnet.json` and saves it to
`src/data/argonBasics.json`, matching EGP's snapshot workflow. It validates the
snapshot timestamp/block, target price, circulation, and locked BTC before
atomically replacing the file. Failed downloads or validation leave the previous
snapshot intact. No RPC dependency is required.

Starting Circulation defaults to `microgonsInCirculation.total / 1,000,000` ARGN.
BTC In Liquid Locks defaults to `vaulting.bitcoinLocked` BTC. Valid URL inputs
and saved circulation edits override those defaults; locked BTC edits remain
local and are not saved. The target price and timestamp come from the same
snapshot. The data is as current as the publisher's `lastUpdatedAt`, not a live
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

## Interactive recovery

External links can initialize the network quantities:

```text
https://uds.argon.network/?circulation=2200000&bitcoinsInLiquidLocks=125.5
```

Values use ARGN and BTC (fractional BTC is supported). Circulation must be
positive; locked BTC may be zero. Valid parameters override saved settings and
defaults on page load. Missing, blank, nonnumeric, negative, and nonfinite inputs
are ignored independently. Inputs remain editable after opening the link.

`src/panels/Main.vue` sends the dragged price/date and current inputs to
`src/workers/recovery.ts`, which runs `src/lib/RecoveryRunner.ts`.
The runner initializes a vault with the exact BTC quantity from the UI (default
1,600,000 BTC), valued at `btcPriceOverride`. It starts with an empty reserve and
advances the shared `Marker`/`Vault` engine in hourly steps until the price reaches
target or the selected timeline ends. It does not calculate starting BTC from
circulation or vault capacity, or replay a fixed Terra outflow pattern.

The old scenario runner, scenario cache, bundled-result generator, and CPI
comparison are removed. Recovery runs do not read or write scenario results in
IndexedDB. Configuration remains in session storage; the BTC quantity resets to
its UI default on reload.

## Protocol comparison baseline

The reference is Argon runtime **158**, release **v1.4.12**, commit
[`f79ac75ee9f0da8a8177d772379897e194b70ff2`](https://github.com/argonprotocol/mainchain/tree/f79ac75ee9f0da8a8177d772379897e194b70ff2).
This is a fixed comparison baseline, not a claim that SAM implements the entire
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
days, editable in Recovery Settings) before a fear selloff reduces modeled demand to produce a
$0.001 price; the next hour releases the reserve for recovery. Prior demand-growth
history is cleared at the selloff. Latency and hourly BTC limits still apply.
During the wait BTC remains protected and other enabled mechanisms can still
recover the price, avoiding the selloff. Zero delay triggers the selloff immediately;
fractional days are rounded up to whole simulation hours.
Runs already at or below $0.001 use their BTC immediately. If starting BTC cannot
fund the reserve, Bitcoin-driven recovery is held back and the run is not promised
to recover; other enabled mechanisms may still act. No selloff is triggered with
Bitcoin recovery disabled. This reserve and selloff are scenario assumptions,
not mainchain rules, and a short chart window can end before recovery completes.

## Units and historical inputs

Releasing a price drag opens a guidance card without running an engine. Start
begins playback, with an elapsed-time and supply-change card following the marker.
On success the line pauses at stabilization until Done is clicked; only then does
the final target-price line animate across the remaining window. Unsuccessful
runs show a dismissible Unachievable card. A new drag or an input edit cancels
the guidance flow and its current run.

Both interactive engines run for up to one chart width (30 days) after the
dragged-price point. Playback scrolls the date window once its marker passes the
original right edge, keeping the marker at the right edge until the dragged-price
point reaches the left edge. If stabilization has not occurred by then, playback
ends with `Unachievable`, meaning not achieved within this simulation horizon.
Starting a new drag resets the date window.

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

Existing numeric representations, rule names, and default values are preserved.

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
| `btcMaxTxnsPerHour` | Despite the name, maximum BTC volume unlocked per hour; not transactions/hour |
| `unvaultLatencyInHours`, certainty/speculative latency bounds | Hours |
| `certaintyGreedLow/High` | Annualized percentage return thresholds attributed to tax burns |
| `speculativeGreedLow/High` | Percentage return thresholds over modeled marker intervals |
| `certaintyMaxDailyIncrease`, `speculativeMaxDailyIncrease` | Fractions of prior capital per day: **0.5 means 50%, not 0.5%** |

The 50% daily growth caps are strong behavioral assumptions, retained for
compatibility. They are not protocol parameters. `startDateOfTerraCollapse`,
`dollarInflation`, and `speculativeGreedWithinHours` remain legacy configuration
fields; interactive recovery uses the selected chart date and speculative
latency bounds. `btcVaultCapacityPct` applies to shared vault loading methods,
not the explicit BTC initialization in interactive recovery.

| Input file | Behavior |
| --- | --- |
| `src/data/bitcoinPrices.json` | Historical BTC prices for shared vault accounting; interactive recovery uses `btcPriceOverride` |
| `src/data/argonBasics.json` | Full published mainnet snapshot; target, circulation, and locked BTC defaults |

## Accounting corrections

- Partial redemptions allocate pending ratchet value using the original BTC
  quantity; complete redemption clears the pending value.
- Valuation caches refresh when the simulation date changes, including dated
  profit totals and price-dependent unlock values. Profit dates use UTC, matching
  the simulation timeline regardless of the machine's local timezone.
- Speculative demand uses its own minimum latency rather than certainty latency.

Public copy, full configuration/export, mobile presentation, and more faithful
protocol economics remain separate follow-up work.
